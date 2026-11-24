import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import {
  buildDefaultEnabledMap,
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlagDefinition,
  SUPER_ADMIN_EXEMPT_KEYS,
  type FeatureFlagDefinition,
  type ResolvedFeatureFlag,
} from "@/lib/superadmin/feature-flags-catalog";

export interface StoredFeatureFlagRow {
  id?: string;
  portal_key: string;
  scope_type: "global" | "school";
  school_id: string | null;
  scope_key: string;
  category: "portal" | "module";
  label: string;
  description: string;
  target_roles: string[];
  route_prefixes: string[];
  is_enabled: boolean;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "").trim();
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

function toGlobalSeedRow(
  def: FeatureFlagDefinition,
  nowIso: string
): StoredFeatureFlagRow {
  return {
    portal_key: def.portal_key,
    scope_type: "global",
    school_id: null,
    scope_key: "global",
    category: def.category,
    label: def.label,
    description: def.description,
    target_roles: def.target_roles,
    route_prefixes: def.route_prefixes,
    is_enabled: def.default_enabled,
    updated_by: null,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

async function fetchStoredFlagRows(): Promise<{
  rows: StoredFeatureFlagRow[];
  liveTableAvailable: boolean;
}> {
  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();

  let liveTableAvailable = false;
  let liveRows: StoredFeatureFlagRow[] = [];

  try {
    const { data, error } = await (directAdmin as any)
      .from("platform_feature_flags")
      .select("*");

    if (!error) {
      liveTableAvailable = true;
      liveRows = Array.isArray(data) ? data : [];
    } else if (!isMissingTableError(error)) {
      console.warn("Live platform_feature_flags query error:", error.message || error);
    }
  } catch (err) {
    console.warn("Could not query live platform_feature_flags table:", err);
  }

  let virtualRows: StoredFeatureFlagRow[] = [];
  try {
    const { data, error } = await (virtualAdmin as any)
      .from("platform_feature_flags")
      .select("*");

    if (!error && Array.isArray(data)) {
      virtualRows = data;
    }
  } catch (err) {
    console.warn("Could not query virtual platform_feature_flags table:", err);
  }

  const byCompositeKey = new Map<string, StoredFeatureFlagRow>();
  for (const r of virtualRows) {
    if (r?.portal_key) {
      const sk = r.scope_key || (r.school_id ? String(r.school_id) : "global");
      byCompositeKey.set(`${r.portal_key}::${sk}`, r);
    }
  }
  if (liveTableAvailable) {
    for (const r of liveRows) {
      if (r?.portal_key) {
        const sk = r.scope_key || (r.school_id ? String(r.school_id) : "global");
        byCompositeKey.set(`${r.portal_key}::${sk}`, r);
      }
    }
  }

  return {
    rows: Array.from(byCompositeKey.values()),
    liveTableAvailable,
  };
}

/**
 * Ensures all 13 default portals/modules exist in storage with default `is_enabled = true`
 * without overwriting any flags already customized by the Super Admin.
 */
export async function ensureDefaultFeatureFlagsSeeded(): Promise<{
  rows: StoredFeatureFlagRow[];
  liveTableAvailable: boolean;
}> {
  const initial = await fetchStoredFlagRows();
  const existingGlobalKeys = new Set(
    initial.rows
      .filter((r) => (r.scope_key || "global") === "global")
      .map((r) => String(r.portal_key).toLowerCase())
  );

  const missingDefs = DEFAULT_FEATURE_FLAGS.filter(
    (def) => !existingGlobalKeys.has(def.portal_key)
  );

  if (missingDefs.length === 0) {
    return initial;
  }

  const nowIso = new Date().toISOString();
  const seedPayload = missingDefs.map((def) => toGlobalSeedRow(def, nowIso));

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();

  if (initial.liveTableAvailable) {
    try {
      await (directAdmin as any)
        .from("platform_feature_flags")
        .upsert(seedPayload, {
          onConflict: "portal_key,scope_key",
          ignoreDuplicates: true,
        });
    } catch (err) {
      console.warn("Failed seeding live platform_feature_flags:", err);
    }
  }

  try {
    await (virtualAdmin as any)
      .from("platform_feature_flags")
      .upsert(seedPayload, { onConflict: "portal_key,scope_key" });
  } catch (err) {
    console.warn("Failed seeding virtual platform_feature_flags:", err);
  }

  return fetchStoredFlagRows();
}

export async function listResolvedFeatureFlags(
  schoolId?: string | null
): Promise<ResolvedFeatureFlag[]> {
  const cleanSchoolId = schoolId ? String(schoolId).trim() : null;
  const { rows } = await ensureDefaultFeatureFlagsSeeded();

  const globalMap = new Map<string, StoredFeatureFlagRow>();
  const schoolMap = new Map<string, StoredFeatureFlagRow>();

  for (const row of rows) {
    const key = String(row.portal_key || "").toLowerCase();
    const sk = String(row.scope_key || (row.school_id ? row.school_id : "global"));
    if (sk === "global") {
      globalMap.set(key, row);
    } else if (cleanSchoolId && sk === cleanSchoolId) {
      schoolMap.set(key, row);
    }
  }

  return DEFAULT_FEATURE_FLAGS.map((def) => {
    const gRow = globalMap.get(def.portal_key);
    const sRow = cleanSchoolId ? schoolMap.get(def.portal_key) : undefined;
    const globalEnabled = gRow ? Boolean(gRow.is_enabled) : def.default_enabled;
    const effectiveEnabled = sRow ? Boolean(sRow.is_enabled) : globalEnabled;

    return {
      ...def,
      is_enabled: effectiveEnabled,
      global_enabled: globalEnabled,
      has_school_override: Boolean(sRow),
      school_id: cleanSchoolId,
      updated_at: sRow?.updated_at || gRow?.updated_at || null,
    };
  });
}

export async function getEffectiveFeatureFlagMap(
  schoolId?: string | null
): Promise<Record<string, boolean>> {
  try {
    const resolved = await listResolvedFeatureFlags(schoolId);
    const map: Record<string, boolean> = {};
    for (const flag of resolved) {
      map[flag.portal_key] = flag.is_enabled;
    }
    return map;
  } catch (err) {
    console.warn("getEffectiveFeatureFlagMap fallback to defaults:", err);
    return buildDefaultEnabledMap();
  }
}

export async function setPlatformFeatureFlag(input: {
  portalKey: string;
  isEnabled: boolean;
  schoolId?: string | null;
  updatedBy?: string | null;
}): Promise<ResolvedFeatureFlag> {
  const portalKey = String(input.portalKey || "").trim().toLowerCase();

  if (SUPER_ADMIN_EXEMPT_KEYS.has(portalKey)) {
    throw new Error(
      "Super Admin portal is permanently active and cannot be disabled."
    );
  }

  const def = getFeatureFlagDefinition(portalKey);
  if (!def) {
    throw new Error(`Unknown portal or module key: "${portalKey}".`);
  }

  const cleanSchoolId = input.schoolId ? String(input.schoolId).trim() : null;
  const scopeType: "global" | "school" = cleanSchoolId ? "school" : "global";
  const scopeKey = cleanSchoolId || "global";
  const nowIso = new Date().toISOString();

  const upsertRow: StoredFeatureFlagRow = {
    portal_key: def.portal_key,
    scope_type: scopeType,
    school_id: cleanSchoolId,
    scope_key: scopeKey,
    category: def.category,
    label: def.label,
    description: def.description,
    target_roles: def.target_roles,
    route_prefixes: def.route_prefixes,
    is_enabled: Boolean(input.isEnabled),
    updated_by: input.updatedBy || null,
    updated_at: nowIso,
  };

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();
  let liveTableMissing = false;

  try {
    const { error } = await (directAdmin as any)
      .from("platform_feature_flags")
      .upsert(upsertRow, { onConflict: "portal_key,scope_key" });

    if (error) {
      if (isMissingTableError(error)) {
        liveTableMissing = true;
      } else {
        throw new Error(error.message || "Failed to update feature flag.");
      }
    }
  } catch (err: any) {
    if (!liveTableMissing) {
      if (isMissingTableError(err)) {
        liveTableMissing = true;
      } else {
        throw err;
      }
    }
  }

  try {
    await (virtualAdmin as any)
      .from("platform_feature_flags")
      .upsert(upsertRow, { onConflict: "portal_key,scope_key" });
  } catch (vErr) {
    if (liveTableMissing) {
      throw vErr;
    }
    console.warn("Could not mirror feature flag to virtual store:", vErr);
  }

  const list = await listResolvedFeatureFlags(cleanSchoolId);
  const updated = list.find((f) => f.portal_key === portalKey);
  if (!updated) {
    throw new Error("Updated feature flag could not be reloaded.");
  }
  return updated;
}

export async function resetSchoolFeatureFlagOverride(input: {
  portalKey: string;
  schoolId: string;
}): Promise<ResolvedFeatureFlag> {
  const portalKey = String(input.portalKey || "").trim().toLowerCase();
  const schoolId = String(input.schoolId || "").trim();

  if (!portalKey || !schoolId) {
    throw new Error("Portal key and school ID are required.");
  }

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();

  try {
    const { error } = await (directAdmin as any)
      .from("platform_feature_flags")
      .delete()
      .eq("portal_key", portalKey)
      .eq("scope_key", schoolId);

    if (error && !isMissingTableError(error)) {
      throw new Error(error.message || "Failed to remove school override.");
    }
  } catch (err: any) {
    if (!isMissingTableError(err)) {
      throw err;
    }
  }

  try {
    await (virtualAdmin as any)
      .from("platform_feature_flags")
      .delete()
      .eq("portal_key", portalKey)
      .eq("scope_key", schoolId);
  } catch (vErr) {
    console.warn("Could not remove school override from virtual store:", vErr);
  }

  const list = await listResolvedFeatureFlags(schoolId);
  const resolved = list.find((f) => f.portal_key === portalKey);
  if (!resolved) {
    throw new Error("Feature flag not found after reset.");
  }
  return resolved;
}
