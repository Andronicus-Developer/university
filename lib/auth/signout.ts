import { createClient } from "@/lib/supabase/client";

/**
 * Universal, watertight client-side sign-out utility.
 *
 * Ensures:
 * 1. The server invalidates the session and emits Set-Cookie deletion headers for all auth cookies.
 * 2. Supabase Auth terminates the session globally.
 * 3. All document cookies matching auth/session are purged across all path/domain permutations.
 * 4. LocalStorage and SessionStorage tokens are completely wiped.
 * 5. The browser is forcibly redirected to the login page via window.location.replace() to prevent
 *    the Back button or memory cache from displaying protected pages.
 */
export async function signOutUser(redirectPath: string = "/login") {
  try {
    // 1. Invoke server-side signout endpoint to delete all HttpOnly and server-set cookies
    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }).catch(() => {});

    // 2. Invoke client-side Supabase signOut
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // ignore network errors if offline
    }

    // 3. Purge all document.cookie entries accessible via JavaScript
    if (typeof document !== "undefined") {
      const cookies = document.cookie.split(";");
      const host = window.location.hostname;
      const domains = ["", host, `.${host}`, "localhost", ".localhost"];
      const paths = ["/", ""];

      for (const rawCookie of cookies) {
        const eqPos = rawCookie.indexOf("=");
        const name = (eqPos > -1 ? rawCookie.substring(0, eqPos) : rawCookie).trim();
        if (!name) continue;

        for (const p of paths) {
          for (const d of domains) {
            const domainAttr = d ? `domain=${d};` : "";
            const pathAttr = p ? `path=${p};` : "";
            document.cookie = `${name}=; ${pathAttr} max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${domainAttr}`;
          }
        }
      }
    }

    // 4. Purge all browser storage (localStorage & sessionStorage)
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (
            k &&
            (k.startsWith("sb-") ||
              k.includes("auth-token") ||
              k.includes("supabase") ||
              k.includes("session") ||
              k.includes("user"))
          ) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }

      try {
        sessionStorage.clear();
      } catch {
        // ignore
      }
    }
  } finally {
    // 5. Hard redirect with replace to prevent back-forward navigation into the protected view
    if (typeof window !== "undefined") {
      window.location.replace(redirectPath);
    }
  }
}
