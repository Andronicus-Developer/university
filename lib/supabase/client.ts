import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

/**
 * Creates a browser-side Supabase client using @supabase/ssr.
 * Routes browser HTTP requests through our local Next.js proxy (/api/supabase/*)
 * to eliminate direct cross-origin connection drops (net::ERR_CONNECTION_CLOSED)
 * while preserving the standard @supabase/ssr cookie storage key.
 */
export function createClient() {
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wcpwzyikenlzqlrrwcvu.supabase.co"
  ).replace(/\/+$/, "");
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Warning: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Please ensure your .env.local file is configured."
    );
  }

  const browserSupabaseFetch: typeof fetch = async (input, init) => {
    let urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    // Rewrite browser requests aimed at the remote Supabase host to our same-origin proxy
    if (typeof window !== "undefined" && supabaseUrl && urlStr.startsWith(supabaseUrl)) {
      const relativePath = urlStr.slice(supabaseUrl.length);
      urlStr = `${window.location.origin}/api/supabase${
        relativePath.startsWith("/") ? relativePath : `/${relativePath}`
      }`;
    }

    // If `input` was a Request instance, preserve its properties when rewriting URL
    const requestInit: RequestInit =
      typeof input === "object" && !(input instanceof URL)
        ? {
            method: input.method,
            headers: input.headers,
            ...init,
          }
        : init || {};

    return fetch(urlStr, requestInit);
  };

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: browserSupabaseFetch,
    },
  });
}
