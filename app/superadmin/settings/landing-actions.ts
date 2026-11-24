"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { verifySuperAdminServerSession } from "@/lib/superadmin/server-auth";
import {
  DEFAULT_LANDING_PAGE_CONTENT,
  LANDING_SECTION_KEYS,
  isValidLandingSectionKey,
  mergeLandingContentRows,
  type LandingDbRow,
  type LandingPageContent,
  type LandingSectionKey,
} from "@/lib/landing/default-content";
import {
  LANDING_CONTENT_CACHE_TAG,
  isTableMissingError,
} from "@/lib/landing/landing-content-service";

export type LandingActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function revalidateAllLandingPaths() {
  updateTag(LANDING_CONTENT_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/superadmin/settings");
  revalidatePath("/super-admin/settings");
  revalidatePath("/superadmin/settings/landing-page");
  revalidatePath("/super-admin/settings/landing-page");
}

/**
 * Loads all landing page sections for the Super Admin editor and seeds any
 * missing section rows non-destructively using SUPABASE_SERVICE_ROLE_KEY.
 */
export async function getLandingEditorDataAction(): Promise<
  LandingActionResult<{
    content: LandingPageContent;
    updatedAtMap: Record<LandingSectionKey, string | null>;
    tableMissing: boolean;
  }>
> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const directAdmin = createDirectAdminClient();
    const { data, error } = await (directAdmin as any)
      .from("landing_page_content")
      .select("section_key, content, is_visible, updated_at");

    if (error) {
      if (isTableMissingError(error)) {
        const { content, updatedAtMap } = mergeLandingContentRows([]);
        return {
          ok: true,
          data: { content, updatedAtMap, tableMissing: true },
        };
      }
      return {
        ok: false,
        error: error.message || "Failed to load landing page content.",
      };
    }

    let rows: LandingDbRow[] = Array.isArray(data) ? data : [];
    const existingKeys = new Set(rows.map((r) => String(r.section_key)));
    const missingKeys = LANDING_SECTION_KEYS.filter((k) => !existingKeys.has(k));

    if (missingKeys.length > 0) {
      const seedPayload = missingKeys.map((sectionKey) => ({
        section_key: sectionKey,
        content: DEFAULT_LANDING_PAGE_CONTENT[sectionKey],
        is_visible: DEFAULT_LANDING_PAGE_CONTENT.visibility[sectionKey],
        updated_by: auth.user?.id || null,
      }));

      const { error: seedError } = await (directAdmin as any)
        .from("landing_page_content")
        .upsert(seedPayload, {
          onConflict: "section_key",
          ignoreDuplicates: true,
        });

      if (!seedError) {
        const { data: refreshed } = await (directAdmin as any)
          .from("landing_page_content")
          .select("section_key, content, is_visible, updated_at");
        if (Array.isArray(refreshed)) {
          rows = refreshed;
        }
      }
    }

    const { content, updatedAtMap } = mergeLandingContentRows(rows);
    return {
      ok: true,
      data: { content, updatedAtMap, tableMissing: false },
    };
  } catch (err: any) {
    console.error("getLandingEditorDataAction error:", err);
    return {
      ok: false,
      error: err?.message || "Failed to fetch landing page configuration.",
    };
  }
}

/**
 * Persists edits for a single landing page section and immediately invalidates `/` cache.
 */
export async function saveLandingSectionAction<K extends LandingSectionKey>(payload: {
  sectionKey: K;
  sectionContent: LandingPageContent[K];
  isVisible: boolean;
}): Promise<
  LandingActionResult<{
    sectionKey: K;
    sectionContent: LandingPageContent[K];
    isVisible: boolean;
    updatedAt: string;
  }>
> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  if (!isValidLandingSectionKey(String(payload?.sectionKey || ""))) {
    return { ok: false, error: "Invalid landing page section key." };
  }

  try {
    const directAdmin = createDirectAdminClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await (directAdmin as any)
      .from("landing_page_content")
      .upsert(
        {
          section_key: payload.sectionKey,
          content: payload.sectionContent ?? {},
          is_visible: Boolean(payload.isVisible),
          updated_by: auth.user?.id || null,
          updated_at: nowIso,
        },
        { onConflict: "section_key" }
      )
      .select("section_key, content, is_visible, updated_at")
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        return {
          ok: false,
          error:
            "Table `public.landing_page_content` is not created yet. Run migration 20261124000005_landing_page_content.sql in Supabase SQL Editor first.",
        };
      }
      return {
        ok: false,
        error: error.message || "Failed to save landing section.",
      };
    }

    revalidateAllLandingPaths();

    return {
      ok: true,
      data: {
        sectionKey: payload.sectionKey,
        sectionContent: (data?.content || payload.sectionContent) as LandingPageContent[K],
        isVisible:
          typeof data?.is_visible === "boolean"
            ? data.is_visible
            : Boolean(payload.isVisible),
        updatedAt: String(data?.updated_at || nowIso),
      },
    };
  } catch (err: any) {
    console.error("saveLandingSectionAction error:", err);
    return {
      ok: false,
      error: err?.message || "Unexpected error saving landing section.",
    };
  }
}

/**
 * Restores a landing page section back to factory default copy and visibility.
 */
export async function resetLandingSectionAction<K extends LandingSectionKey>(payload: {
  sectionKey: K;
}): Promise<
  LandingActionResult<{
    sectionKey: K;
    sectionContent: LandingPageContent[K];
    isVisible: boolean;
    updatedAt: string;
  }>
> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  if (!isValidLandingSectionKey(String(payload?.sectionKey || ""))) {
    return { ok: false, error: "Invalid landing page section key." };
  }

  const defaultSectionContent = JSON.parse(
    JSON.stringify(DEFAULT_LANDING_PAGE_CONTENT[payload.sectionKey])
  ) as LandingPageContent[K];
  const defaultVisible =
    DEFAULT_LANDING_PAGE_CONTENT.visibility[payload.sectionKey];

  try {
    const directAdmin = createDirectAdminClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await (directAdmin as any)
      .from("landing_page_content")
      .upsert(
        {
          section_key: payload.sectionKey,
          content: defaultSectionContent,
          is_visible: defaultVisible,
          updated_by: auth.user?.id || null,
          updated_at: nowIso,
        },
        { onConflict: "section_key" }
      )
      .select("section_key, content, is_visible, updated_at")
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        return {
          ok: true,
          data: {
            sectionKey: payload.sectionKey,
            sectionContent: defaultSectionContent,
            isVisible: defaultVisible,
            updatedAt: nowIso,
          },
        };
      }
      return {
        ok: false,
        error: error.message || "Failed to reset landing section.",
      };
    }

    revalidateAllLandingPaths();

    return {
      ok: true,
      data: {
        sectionKey: payload.sectionKey,
        sectionContent: (data?.content || defaultSectionContent) as LandingPageContent[K],
        isVisible:
          typeof data?.is_visible === "boolean"
            ? data.is_visible
            : defaultVisible,
        updatedAt: String(data?.updated_at || nowIso),
      },
    };
  } catch (err: any) {
    console.error("resetLandingSectionAction error:", err);
    return {
      ok: false,
      error: err?.message || "Unexpected error resetting landing section.",
    };
  }
}
