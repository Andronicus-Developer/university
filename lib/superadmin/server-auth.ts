import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createDirectAdminClient, getAdminClient } from "@/lib/supabase/admin";
import {
  extractUserFromCookies,
  hasProjectAuthCookie,
  isFallbackSessionInCookies,
  isSessionStillFresh,
} from "@/lib/supabase/fetch";

export type SuperAdminServerSessionResult =
  | { ok: true; user: any }
  | { ok: false; error: string };

/**
 * Verifies inside Next.js Server Actions / Server Components that the caller
 * holds a valid authenticated Super Admin session.
 */
export async function verifySuperAdminServerSession(): Promise<SuperAdminServerSessionResult> {
  try {
    const cookieStore = await cookies();
    const cookieList = cookieStore.getAll().map((c) => ({
      name: c.name,
      value: c.value,
    }));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!hasProjectAuthCookie(cookieList, supabaseUrl)) {
      return { ok: false, error: "Authentication required." };
    }

    let user: any = null;
    if (isFallbackSessionInCookies(cookieList)) {
      user = extractUserFromCookies(cookieList);
    } else {
      try {
        const supabase = await createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        user = authUser;
      } catch {
        // Fallback to validated fresh cookie if network call is interrupted
      }

      if (!user && isSessionStillFresh(cookieList, 60)) {
        user = extractUserFromCookies(cookieList);
      }
    }

    if (!user) {
      return { ok: false, error: "Authentication required." };
    }

    const email = String(user.email || "").trim().toLowerCase();
    const appRole = String(
      user.app_metadata?.role || user.app_metadata?.default_role || ""
    ).toLowerCase();

    let isSuperAdmin =
      email === "superadmin@university.edu.gh" || appRole === "superadmin";

    if (!isSuperAdmin) {
      try {
        const adminClient = getAdminClient();
        const { data: dbRoles } = await adminClient.rpc("get_user_roles", {
          p_user_id: user.id,
        });
        if (Array.isArray(dbRoles)) {
          isSuperAdmin = dbRoles.some(
            (r: any) => String(r?.role_code || "").toLowerCase() === "superadmin"
          );
        }
      } catch {
        // Ignore and verify against live profiles next
      }
    }

    if (!isSuperAdmin) {
      try {
        const directAdmin = createDirectAdminClient();
        const { data: profileRow } = await (directAdmin as any)
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (
          String(profileRow?.role || "")
            .trim()
            .toLowerCase() === "superadmin"
        ) {
          isSuperAdmin = true;
        }
      } catch {
        // Ignore
      }
    }

    if (!isSuperAdmin) {
      return {
        ok: false,
        error: "Forbidden: Super Admin privileges are required.",
      };
    }

    return { ok: true, user };
  } catch (error: any) {
    console.error("verifySuperAdminServerSession failed:", error);
    return { ok: false, error: "Failed to verify Super Admin session." };
  }
}
