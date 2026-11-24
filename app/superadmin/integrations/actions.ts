"use server";

import { revalidatePath } from "next/cache";
import { verifySuperAdminServerSession } from "@/lib/superadmin/server-auth";
import {
  createCustomPlatformIntegration,
  getPlatformIntegrationBySlug,
  listPlatformIntegrations,
  savePlatformIntegration,
} from "@/lib/superadmin/integrations-service";
import type {
  IntegrationMode,
  SafeIntegrationRecord,
} from "@/lib/superadmin/integrations-catalog";

export type ActionResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function getIntegrationsAction(): Promise<
  ActionResponse<SafeIntegrationRecord[]>
> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const list = await listPlatformIntegrations();
    return { ok: true, data: list };
  } catch (error: any) {
    console.error("getIntegrationsAction error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to load platform integrations.",
    };
  }
}

export async function getIntegrationDetailAction(
  slug: string
): Promise<ActionResponse<SafeIntegrationRecord>> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const record = await getPlatformIntegrationBySlug(slug);
    if (!record) {
      return { ok: false, error: "Integration provider not found." };
    }
    return { ok: true, data: record };
  } catch (error: any) {
    console.error(`getIntegrationDetailAction(${slug}) error:`, error);
    return {
      ok: false,
      error: error?.message || "Failed to load integration configuration.",
    };
  }
}

export async function saveIntegrationConfigAction(payload: {
  slug: string;
  isEnabled: boolean;
  mode: IntegrationMode;
  config: Record<string, string | boolean>;
  secretUpdates: Record<string, string>;
  clearedSecrets?: string[];
}): Promise<ActionResponse<SafeIntegrationRecord>> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const saved = await savePlatformIntegration({
      ...payload,
      updatedBy: auth.user?.id || null,
    });

    revalidatePath("/superadmin/integrations");
    revalidatePath("/super-admin/integrations");
    revalidatePath(`/superadmin/integrations/${saved.slug}`);
    revalidatePath(`/super-admin/integrations/${saved.slug}`);

    return { ok: true, data: saved };
  } catch (error: any) {
    console.error("saveIntegrationConfigAction error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to save integration configuration.",
    };
  }
}

export async function createCustomIntegrationAction(payload: {
  name: string;
  category: string;
  description: string;
}): Promise<ActionResponse<SafeIntegrationRecord>> {
  const auth = await verifySuperAdminServerSession();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const created = await createCustomPlatformIntegration({
      ...payload,
      updatedBy: auth.user?.id || null,
    });

    revalidatePath("/superadmin/integrations");
    revalidatePath("/super-admin/integrations");

    return { ok: true, data: created };
  } catch (error: any) {
    console.error("createCustomIntegrationAction error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to create custom integration.",
    };
  }
}
