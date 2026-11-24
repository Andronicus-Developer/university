"use server";

import { revalidatePath } from "next/cache";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { verifySuperAdminServerSession } from "@/lib/superadmin/server-auth";
import {
  listResolvedFeatureFlags,
  resetSchoolFeatureFlagOverride,
  setPlatformFeatureFlag,
} from "@/lib/superadmin/feature-flags-service";
import type { ResolvedFeatureFlag } from "@/lib/superadmin/feature-flags-catalog";

export interface FeatureFlagSchoolOption {
  id: string;
  name: string;
  slug: string;
  school_type: string;
}

export type FeatureFlagActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function revalidateAllFeatureFlagPaths() {
  revalidatePath("/superadmin/modules");
  revalidatePath("/superadmin/feature-flags");
  revalidatePath("/super-admin/feature-flags");
  revalidatePath("/login");
}

export async function getFeatureFlagsAdminAction(
  schoolId?: string | null
): Promise<
  FeatureFlagActionResult<{
    flags: ResolvedFeatureFlag[];
    schools: FeatureFlagSchoolOption[];
  }>
> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const directAdmin = createDirectAdminClient();
    const [flags, schoolsRes] = await Promise.all([
      listResolvedFeatureFlags(schoolId),
      (directAdmin as any)
        .from("schools")
        .select("id, name, slug, school_type")
        .order("name", { ascending: true }),
    ]);

    const schools: FeatureFlagSchoolOption[] = Array.isArray(schoolsRes?.data)
      ? schoolsRes.data.map((s: any) => ({
          id: String(s.id),
          name: String(s.name || "Unnamed School"),
          slug: String(s.slug || ""),
          school_type: String(s.school_type || "university"),
        }))
      : [];

    return { ok: true, data: { flags, schools } };
  } catch (error: any) {
    console.error("getFeatureFlagsAdminAction error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to load platform feature flags.",
    };
  }
}

export async function toggleFeatureFlagAction(payload: {
  portalKey: string;
  isEnabled: boolean;
  schoolId?: string | null;
}): Promise<FeatureFlagActionResult<ResolvedFeatureFlag>> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const updated = await setPlatformFeatureFlag({
      portalKey: payload.portalKey,
      isEnabled: payload.isEnabled,
      schoolId: payload.schoolId || null,
      updatedBy: auth.user?.id || null,
    });

    revalidateAllFeatureFlagPaths();
    return { ok: true, data: updated };
  } catch (error: any) {
    console.error("toggleFeatureFlagAction error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to update feature flag.",
    };
  }
}

export async function resetSchoolFeatureFlagAction(payload: {
  portalKey: string;
  schoolId: string;
}): Promise<FeatureFlagActionResult<ResolvedFeatureFlag>> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const reset = await resetSchoolFeatureFlagOverride({
      portalKey: payload.portalKey,
      schoolId: payload.schoolId,
    });

    revalidateAllFeatureFlagPaths();
    return { ok: true, data: reset };
  } catch (error: any) {
    console.error("resetSchoolFeatureFlagAction error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to reset school override.",
    };
  }
}
