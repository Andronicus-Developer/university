import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/database.types";
import {
  extractUserFromCookies,
  isFallbackSessionInCookies,
  isSessionStillFresh,
  supabaseFetchWithRetry,
} from "@/lib/supabase/fetch";

/**
 * Updates Supabase session tokens in Next.js request/response cycle.
 * Resolves fresh or fallback cookies in Edge Runtime without external latency,
 * and only triggers upstream token refresh when the access token is near expiry.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Snapshot incoming cookies BEFORE @supabase/ssr can mutate or clear them
  const initialCookies = request.cookies.getAll().map((c) => ({
    name: c.name,
    value: c.value,
  }));

  const hasAuthCookie = initialCookies.some(
    (c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name) && Boolean(c.value)
  );

  if (!hasAuthCookie) {
    return { supabaseResponse, user: null, supabase: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fast-path: if session is still fresh (not near expiry) or is a local fallback session,
  // resolve directly from cookie in <1ms without blocking on external Wi-Fi/Cloudflare calls
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    isFallbackSessionInCookies(initialCookies) ||
    isSessionStillFresh(initialCookies, 60)
  ) {
    const cookieUser = extractUserFromCookies(initialCookies);
    if (cookieUser) {
      return { supabaseResponse, user: cookieUser, supabase: null };
    }
  }

  let pendingCookies: { name: string; value: string; options?: Record<string, any> }[] = [];

  try {
    const supabase = createServerClient<Database>(
      supabaseUrl!,
      supabaseAnonKey!,
      {
        global: {
          fetch: (input, init) => supabaseFetchWithRetry(input, init, 1, 5000),
        },
        cookies: {
          getAll() {
            return initialCookies;
          },
          setAll(cookiesToSet) {
            pendingCookies = cookiesToSet;
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      const fallbackUser = extractUserFromCookies(initialCookies);
      return { supabaseResponse, user: fallbackUser, supabase: null };
    }

    if (pendingCookies.length > 0) {
      pendingCookies.forEach(({ name, value }) => request.cookies.set(name, value));
      supabaseResponse = NextResponse.next({
        request,
      });
      pendingCookies.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options)
      );
    }

    return { supabaseResponse, user, supabase };
  } catch (err) {
    console.warn("Supabase updateSession fallback used:", err instanceof Error ? err.message : err);
    const fallbackUser = extractUserFromCookies(initialCookies);
    return { supabaseResponse, user: fallbackUser, supabase: null };
  }
}
