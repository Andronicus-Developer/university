import { cacheLife, cacheTag } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_LANDING_PAGE_CONTENT,
  mergeLandingContentRows,
  type LandingDbRow,
  type LandingPageContent,
  type LandingSectionKey,
} from "@/lib/landing/default-content";

export const LANDING_CONTENT_CACHE_TAG = "landing-page-content";

export interface LandingFetchResult {
  content: LandingPageContent;
  updatedAtMap: Record<LandingSectionKey, string | null>;
  tableMissing: boolean;
  rowCount: number;
}

function emptyUpdatedAtMap(): Record<LandingSectionKey, string | null> {
  return {
    navbar: null,
    hero: null,
    features: null,
    school_types: null,
    results_spotlight: null,
    about_stats: null,
    pricing: null,
    testimonials: null,
    faq: null,
    cta_banner: null,
    footer: null,
    seo: null,
  };
}

export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "").trim();
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

/**
 * Queries `public.landing_page_content` directly without reading request cookies
 * or headers so public visitors and Next.js 16 Cache Components prerendering work
 * seamlessly, gracefully falling back to DEFAULT_LANDING_PAGE_CONTENT if empty.
 */
export async function fetchLandingPageContentFromDb(): Promise<LandingFetchResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !publicKey) {
    return {
      content: DEFAULT_LANDING_PAGE_CONTENT,
      updatedAtMap: emptyUpdatedAtMap(),
      tableMissing: false,
      rowCount: 0,
    };
  }

  try {
    const client = createSupabaseClient(supabaseUrl, publicKey, {
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.timeout(4500),
          }),
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await (client as any)
      .from("landing_page_content")
      .select("section_key, content, is_visible, updated_at");

    if (error) {
      return {
        content: DEFAULT_LANDING_PAGE_CONTENT,
        updatedAtMap: emptyUpdatedAtMap(),
        tableMissing: isTableMissingError(error),
        rowCount: 0,
      };
    }

    const rows = Array.isArray(data) ? (data as LandingDbRow[]) : [];
    const { content, updatedAtMap } = mergeLandingContentRows(rows);

    return {
      content,
      updatedAtMap,
      tableMissing: false,
      rowCount: rows.length,
    };
  } catch (err) {
    console.warn("fetchLandingPageContentFromDb fallback to defaults:", err);
    return {
      content: DEFAULT_LANDING_PAGE_CONTENT,
      updatedAtMap: emptyUpdatedAtMap(),
      tableMissing: false,
      rowCount: 0,
    };
  }
}

/**
 * Cached public reader for `app/page.tsx`, tagged for immediate invalidation
 * via `updateTag("landing-page-content")` + `revalidatePath("/")`.
 */
export async function getCachedLandingPageContent(): Promise<LandingPageContent> {
  "use cache";
  cacheTag(LANDING_CONTENT_CACHE_TAG);
  cacheLife("hours");

  const result = await fetchLandingPageContentFromDb();
  return result.content;
}

const FALLBACK_LAST_MODIFIED = "2026-11-26T00:00:00.000Z";

/**
 * Cached metadata + newest `updated_at` timestamp across landing & SEO sections
 * for `sitemap.xml` and `generateMetadata`.
 */
export async function getCachedLandingPageMeta(): Promise<{
  content: LandingPageContent;
  lastModified: string;
}> {
  "use cache";
  cacheTag(LANDING_CONTENT_CACHE_TAG);
  cacheLife("hours");

  const result = await fetchLandingPageContentFromDb();
  let newestMs = 0;
  let newestIso = FALLBACK_LAST_MODIFIED;
  for (const val of Object.values(result.updatedAtMap)) {
    if (!val) continue;
    const ms = Date.parse(val);
    if (Number.isFinite(ms) && ms > newestMs) {
      newestMs = ms;
      newestIso = new Date(ms).toISOString();
    }
  }
  return {
    content: result.content,
    lastModified: newestIso,
  };
}
