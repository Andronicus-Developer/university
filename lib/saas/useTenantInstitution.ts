"use client";

import { createClient } from "@/lib/supabase/client";

export type ClientTenantResolution =
  | { status: "unauthenticated" }
  | { status: "unlinked"; user: any; error: string }
  | {
      status: "ok";
      user: any;
      schoolId: string;
      schoolName: string;
      schoolAbbr: string;
      schoolLogo: string;
      schoolType: string;
      currency: string;
      currencySymbol: string;
      isSuperAdmin: boolean;
    };

/**
 * Resolves the authenticated user (with `/api/auth/me` fallback) and then
 * resolves their strict multi-tenant school info from `/api/settings/institution`.
 * Never falls back to legacy `institution_info` or hardcoded default school names.
 */
export async function resolveClientTenantContext(): Promise<ClientTenantResolution> {
  const supabase = createClient();

  let currentUser: any = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUser = user;
  } catch {
    // fallback handled below
  }

  if (!currentUser) {
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.authenticated && meData?.user) {
          currentUser = meData.user;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!currentUser) {
    return { status: "unauthenticated" };
  }

  try {
    const res = await fetch("/api/settings/institution", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        status: "unlinked",
        user: currentUser,
        error:
          data?.error ||
          "Your account is not linked to a registered school. Contact your Super Administrator.",
      };
    }

    const schoolId = String(data?.school_id || data?.id || "");
    const isSuperAdmin = Boolean(data?.is_super_admin);

    if (!schoolId && !isSuperAdmin) {
      return {
        status: "unlinked",
        user: currentUser,
        error:
          "Your account is not linked to a registered school. Contact your Super Administrator.",
      };
    }

    return {
      status: "ok",
      user: currentUser,
      schoolId,
      schoolName: String(data?.name || ""),
      schoolAbbr: String(data?.abbreviation || data?.code || ""),
      schoolLogo: String(data?.logo_url || ""),
      schoolType: String(data?.school_type || data?.institution_type || ""),
      currency: String(data?.currency || ""),
      currencySymbol: String(data?.currency_symbol || ""),
      isSuperAdmin,
    };
  } catch {
    return {
      status: "unlinked",
      user: currentUser,
      error: "Unable to verify your school assignment. Please refresh or sign out and retry.",
    };
  }
}

export function formatSchoolMonogram(schoolAbbr: string, schoolName: string): string {
  const candidate =
    schoolAbbr?.trim() ||
    schoolName
      .trim()
      .split(/\s+/)
      .map((w) => w[0] || "")
      .join("") ||
    "—";
  return candidate.toUpperCase().slice(0, 4);
}
