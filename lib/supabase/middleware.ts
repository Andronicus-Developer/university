import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/database.types";
import {
  extractUserFromCookies,
  hasProjectAuthCookie,
  isFallbackSessionInCookies,
  isSessionStillFresh,
  supabaseFetchWithRetry,
} from "@/lib/supabase/fetch";

/**
 * Updates Supabase session tokens in Next.js request/response cycle.
 * Strictly scopes cookie lookups to this Supabase project's storage key so other
 * localhost projects' cookies never collide or cause false RBAC rejections.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Snapshot incoming cookies BEFORE @supabase/ssr can mutate or clear them
  const initialCookies = request.cookies.getAll().map((c) => ({
    name: c.name,
    value: c.value,
  }));

  if (!hasProjectAuthCookie(initialCookies, supabaseUrl)) {
    return { supabaseResponse, user: null, supabase: null };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    const cookieUser = extractUserFromCookies(initialCookies);
    return { supabaseResponse, user: cookieUser, supabase: null };
  }

  let pendingCookies: { name: string; value: string; options?: Record<string, any> }[] = [];

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
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

  // Fast-path: if session is a local fallback session or still fresh (not near expiry),
  // resolve directly from this project's cookie without blocking on external network calls
  if (
    isFallbackSessionInCookies(initialCookies) ||
    isSessionStillFresh(initialCookies, 60)
  ) {
    const cookieUser = extractUserFromCookies(initialCookies);
    if (cookieUser) {
      return {
        supabaseResponse,
        user: cookieUser,
        supabase: isFallbackSessionInCookies(initialCookies) ? null : supabase,
      };
    }
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      const fallbackUser = extractUserFromCookies(initialCookies);
      return { supabaseResponse, user: fallbackUser, supabase };
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
