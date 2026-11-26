"use client";

import { createClient } from "@/lib/supabase/client";
import { resolveSchoolCountry } from "@/lib/africanCountries";

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
      country: string;
      countryCode: string;
      currency: string;
      currencySymbol: string;
      isSuperAdmin: boolean;
    };

const TENANT_CONTEXT_CACHE_TTL_MS = 30_000;
let cachedTenantResolution: ClientTenantResolution | null = null;
let cachedTenantAt = 0;
let inFlightTenantPromise: Promise<ClientTenantResolution> | null = null;

export function clearClientTenantContextCache() {
  cachedTenantResolution = null;
  cachedTenantAt = 0;
  inFlightTenantPromise = null;
}

/**
 * Resolves the authenticated user (with `/api/auth/me` fallback) and then
 * resolves their strict multi-tenant school info from `/api/settings/institution`.
 * Never falls back to legacy `institution_info` or hardcoded default school names.
 * Deduplicates simultaneous layout/page calls via in-flight promise sharing and a short 30s TTL.
 */
export async function resolveClientTenantContext(
  forceRefresh = false
): Promise<ClientTenantResolution> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedTenantResolution &&
    cachedTenantResolution.status === "ok" &&
    now - cachedTenantAt < TENANT_CONTEXT_CACHE_TTL_MS
  ) {
    return cachedTenantResolution;
  }

  if (!forceRefresh && inFlightTenantPromise) {
    return inFlightTenantPromise;
  }

  const promise = (async (): Promise<ClientTenantResolution> => {
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

      const resolvedCountry = resolveSchoolCountry({
        country: data?.country,
        countryCode: data?.country_code,
        address: data?.address,
      });

      const okResult: ClientTenantResolution = {
        status: "ok",
        user: currentUser,
        schoolId,
        schoolName: String(data?.name || ""),
        schoolAbbr: String(data?.abbreviation || data?.code || ""),
        schoolLogo: String(data?.logo_url || ""),
        schoolType: String(data?.school_type || data?.institution_type || ""),
        country: resolvedCountry.country,
        countryCode: resolvedCountry.countryCode,
        currency: String(data?.currency || ""),
        currencySymbol: String(data?.currency_symbol || ""),
        isSuperAdmin,
      };
      cachedTenantResolution = okResult;
      cachedTenantAt = Date.now();
      return okResult;
    } catch {
      return {
        status: "unlinked",
        user: currentUser,
        error: "Unable to verify your school assignment. Please refresh or sign out and retry.",
      };
    }
  })().finally(() => {
    if (inFlightTenantPromise === promise) {
      inFlightTenantPromise = null;
    }
  });

  inFlightTenantPromise = promise;
  return promise;
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
