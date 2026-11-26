import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  toPortalSchoolType,
  type PortalSchoolType,
} from "@/config/schoolPortalConfig";
import { resolveSchoolCountry } from "@/lib/africanCountries";

export interface CurrentUserAndSchool {
  user: any;
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  roles: string[];
  primaryRole: string;
  isSuperAdmin: boolean;
  schoolId: string | null;
  schoolName: string;
  schoolAbbr: string;
  schoolLogo: string;
  schoolType: PortalSchoolType;
  country: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
  academicSettings: Record<string, any>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function currencySymbolFor(currency: string): string {
  const c = currency.toUpperCase();
  if (c === "GHS") return "GH₵";
  if (c === "NGN") return "₦";
  if (c === "GBP") return "£";
  if (c === "EUR") return "€";
  if (c === "KES") return "KSh";
  return "$";
}

/**
 * Request-scoped deduplicated loader for the authenticated user, their roles,
 * avatar, and authoritative multi-tenant `school_id` / `school_type`.
 *
 * Uses React `cache()` (never `"use cache"`) so multiple Server Components
 * (e.g. a portal layout and nested pages) share a single Supabase lookup per request
 * without risking cross-user cookie caching.
 */
export const getCurrentUserAndSchool = cache(
  async (): Promise<CurrentUserAndSchool | null> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const userId = user.id;
      const email = String(user.email || "")
        .trim()
        .toLowerCase();

      const rolesSet = new Set<string>();
      const pushRole = (val: unknown) => {
        if (typeof val === "string" && val.trim()) {
          rolesSet.add(val.trim().toLowerCase());
        }
      };

      const isRootSuperAdmin =
        email === "superadmin@university.edu.gh" ||
        user.app_metadata?.role === "superadmin" ||
        user.app_metadata?.default_role === "superadmin";

      pushRole(user.app_metadata?.role);
      pushRole(user.app_metadata?.default_role);

      const userMetaRole =
        user.user_metadata?.role || user.user_metadata?.default_role;
      if (
        typeof userMetaRole === "string" &&
        (userMetaRole.toLowerCase() !== "superadmin" || isRootSuperAdmin)
      ) {
        pushRole(userMetaRole);
      }

      const directAdmin = createDirectAdminClient() as any;

      const [profRes, memRes, staffRes, studentRes, parentRes] =
        await Promise.all([
          directAdmin
            .from("profiles")
            .select(
              "id, email, full_name, phone, role, school_id, university_id, avatar_url, account_status"
            )
            .eq("id", userId)
            .maybeSingle()
            .then((r: any) => r, () => ({ data: null })),
          directAdmin
            .from("school_memberships")
            .select("school_id, role, status")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .then((r: any) => r, () => ({ data: [] })),
          directAdmin
            .from("staff_profiles")
            .select("id, school_id, role_code, first_name, last_name")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle()
            .then((r: any) => r, () => ({ data: null })),
          directAdmin
            .from("students")
            .select("id, school_id, profile_id")
            .or(`profile_id.eq.${userId},id.eq.${userId}`)
            .limit(1)
            .maybeSingle()
            .then((r: any) => r, () => ({ data: null })),
          (email
            ? directAdmin
                .from("parent_guardians")
                .select("id, school_id")
                .or(`user_id.eq.${userId},email.ilike.${email}`)
                .limit(1)
                .maybeSingle()
            : directAdmin
                .from("parent_guardians")
                .select("id, school_id")
                .eq("user_id", userId)
                .limit(1)
                .maybeSingle()
          ).then((r: any) => r, () => ({ data: null })),
        ]);

      const profile = profRes?.data || null;
      const memberships: any[] = Array.isArray(memRes?.data) ? memRes.data : [];
      const staff = staffRes?.data || null;
      const student = studentRes?.data || null;
      const parent = parentRes?.data || null;

      pushRole(profile?.role);
      for (const m of memberships) {
        pushRole(m?.role);
      }
      pushRole(staff?.role_code);

      const isSuperAdmin = isRootSuperAdmin || rolesSet.has("superadmin");

      let schoolId: string | null =
        profile?.school_id ||
        profile?.university_id ||
        memberships.find((m) => m?.school_id)?.school_id ||
        staff?.school_id ||
        student?.school_id ||
        parent?.school_id ||
        user.app_metadata?.school_id ||
        user.app_metadata?.university_id ||
        user.user_metadata?.school_id ||
        user.user_metadata?.university_id ||
        null;

      if (schoolId) {
        schoolId = String(schoolId);
      }

      let schoolRow: any = null;
      if (schoolId && UUID_REGEX.test(schoolId)) {
        const resWithCountry = await directAdmin
          .from("schools")
          .select(
            "id, name, short_name, slug, tenant_slug, school_type, country, country_code, address, currency, logo_url, status, academic_settings"
          )
          .eq("id", schoolId)
          .maybeSingle()
          .then((r: any) => r, (err: any) => ({ data: null, error: err }));

        if (
          resWithCountry?.error &&
          (resWithCountry.error.code === "42703" ||
            resWithCountry.error.code === "PGRST204" ||
            String(resWithCountry.error.message || "").includes("column"))
        ) {
          const fallbackRes = await directAdmin
            .from("schools")
            .select(
              "id, name, short_name, slug, tenant_slug, school_type, address, currency, logo_url, status, academic_settings"
            )
            .eq("id", schoolId)
            .maybeSingle()
            .then((r: any) => r, () => ({ data: null }));
          schoolRow = fallbackRes?.data || null;
        } else {
          schoolRow = resWithCountry?.data || null;
        }
      }

      const resolvedCountry = resolveSchoolCountry({
        country: schoolRow?.country,
        countryCode: schoolRow?.country_code,
        address: schoolRow?.address,
      });

      const currency = String(schoolRow?.currency || "USD");
      const schoolName = String(schoolRow?.name || "");
      const schoolAbbr = String(
        schoolRow?.short_name ||
          schoolRow?.tenant_slug ||
          schoolRow?.slug ||
          ""
      ).toUpperCase();

      const staffName = staff
        ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim()
        : "";
      const fullName =
        staffName ||
        String(
          profile?.full_name ||
            user.user_metadata?.full_name ||
            email ||
            "User"
        );

      const roles = Array.from(rolesSet);

      return {
        user,
        userId,
        email,
        fullName,
        avatarUrl: String(
          profile?.avatar_url || user.user_metadata?.avatar_url || ""
        ),
        roles,
        primaryRole: roles[0] || "",
        isSuperAdmin,
        schoolId,
        schoolName,
        schoolAbbr,
        schoolLogo: String(schoolRow?.logo_url || ""),
        schoolType: toPortalSchoolType(schoolRow?.school_type),
        country: resolvedCountry.country,
        countryCode: resolvedCountry.countryCode,
        currency,
        currencySymbol: currencySymbolFor(currency),
        academicSettings:
          schoolRow?.academic_settings &&
          typeof schoolRow.academic_settings === "object"
            ? schoolRow.academic_settings
            : {},
      };
    } catch {
      return null;
    }
  }
);
