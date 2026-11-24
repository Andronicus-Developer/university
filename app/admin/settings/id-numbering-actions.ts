"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndSchool } from "@/lib/auth/getCurrentUserAndSchool";
import {
  getSchoolIdSequences,
  saveSchoolIdSequences,
} from "@/lib/id-numbering/service";
import type {
  IdSequenceRule,
  IdSequenceRuleInput,
} from "@/lib/id-numbering/config";
import type { PortalSchoolType } from "@/config/schoolPortalConfig";

const ALLOWED_SETTINGS_ROLES = new Set([
  "superadmin",
  "system_admin",
  "school_admin",
  "admin",
  "administrator",
  "registrar",
]);

async function authorizeSchoolAdmin() {
  const ctx = await getCurrentUserAndSchool();
  if (!ctx) {
    return { ok: false as const, error: "Authentication required." };
  }

  const isAuthorized =
    ctx.isSuperAdmin ||
    ctx.roles.some((r) => ALLOWED_SETTINGS_ROLES.has(r.toLowerCase()));

  if (!isAuthorized) {
    return {
      ok: false as const,
      error: "Administrator privileges are required to manage ID numbering.",
    };
  }

  if (!ctx.schoolId) {
    return {
      ok: false as const,
      error: "Your account is not linked to a registered school.",
    };
  }

  return { ok: true as const, ctx };
}

export async function getSchoolIdNumberingConfigAction(): Promise<
  | {
      ok: true;
      schoolId: string;
      schoolName: string;
      schoolType: PortalSchoolType;
      rules: IdSequenceRule[];
      migrationMissing: boolean;
    }
  | { ok: false; error: string }
> {
  const auth = await authorizeSchoolAdmin();
  if (!auth.ok) return auth;

  const { ctx } = auth;
  const { rules, migrationMissing } = await getSchoolIdSequences(
    ctx.schoolId!,
    ctx.schoolType
  );

  return {
    ok: true,
    schoolId: ctx.schoolId!,
    schoolName: ctx.schoolName,
    schoolType: ctx.schoolType,
    rules,
    migrationMissing,
  };
}

export async function saveSchoolIdNumberingConfigAction(
  rules: IdSequenceRuleInput[]
): Promise<
  | {
      ok: true;
      rules: IdSequenceRule[];
    }
  | { ok: false; error: string; migrationMissing?: boolean }
> {
  const auth = await authorizeSchoolAdmin();
  if (!auth.ok) return auth;

  const { ctx } = auth;
  const saveRes = await saveSchoolIdSequences(ctx.schoolId!, rules);
  if (!saveRes.ok) {
    return {
      ok: false,
      error: saveRes.error || "Failed to save ID configuration.",
      migrationMissing: saveRes.migrationMissing,
    };
  }

  const refreshed = await getSchoolIdSequences(ctx.schoolId!, ctx.schoolType);

  revalidatePath("/admin/settings");
  revalidatePath("/admin/students");
  revalidatePath("/admin/teachers");
  revalidatePath("/admin/staff");
  revalidatePath("/registrar/admissions");

  return {
    ok: true,
    rules: refreshed.rules,
  };
}
