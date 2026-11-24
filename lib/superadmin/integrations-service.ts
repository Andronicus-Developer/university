import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import {
  CUSTOM_INTEGRATION_FIELDS,
  DEFAULT_INTEGRATIONS,
  getDefaultIntegrationBySlug,
  maskSecretValue,
  type IntegrationDefinition,
  type IntegrationFieldDef,
  type IntegrationMode,
  type IntegrationStatus,
  type SafeIntegrationRecord,
} from "@/lib/superadmin/integrations-catalog";

interface StoredIntegrationRow {
  id?: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  is_custom?: boolean;
  is_enabled?: boolean;
  mode?: IntegrationMode;
  status?: IntegrationStatus;
  config?: Record<string, any>;
  secrets?: Record<string, any>;
  last_synced_at?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaveIntegrationInput {
  slug: string;
  isEnabled: boolean;
  mode: IntegrationMode;
  config: Record<string, string | boolean>;
  secretUpdates: Record<string, string>;
  clearedSecrets?: string[];
  updatedBy?: string | null;
}

export interface CreateCustomIntegrationInput {
  name: string;
  category: string;
  description: string;
  updatedBy?: string | null;
}

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("integrations-service must only execute on the server.");
  }
}

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "").trim();
  const message = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

function deriveIntegrationStatus(
  fields: IntegrationFieldDef[],
  config: Record<string, string | boolean>,
  secrets: Record<string, string>,
  isEnabled: boolean
): IntegrationStatus {
  const requiredFields = fields.filter((f) => f.required);
  const allRequiredPresent = requiredFields.every((field) => {
    const val = field.isSecret ? secrets[field.key] : config[field.key];
    if (typeof val === "boolean") return true;
    return String(val ?? "").trim().length > 0;
  });

  if (!isEnabled) {
    return allRequiredPresent ? "disabled" : "not_configured";
  }
  return allRequiredPresent ? "connected" : "not_configured";
}

function buildSafeRecord(
  def: IntegrationDefinition,
  row?: StoredIntegrationRow | null
): SafeIntegrationRecord {
  const fields = def.fields;
  const rawConfig = (row?.config && typeof row.config === "object" ? row.config : {}) as Record<
    string,
    any
  >;
  const rawSecrets = (row?.secrets && typeof row.secrets === "object" ? row.secrets : {}) as Record<
    string,
    any
  >;

  const config: Record<string, string | boolean> = {};
  const maskedSecrets: Record<string, string> = {};
  const hasSecrets: Record<string, boolean> = {};
  const secretValuesForStatus: Record<string, string> = {};

  for (const field of fields) {
    if (field.isSecret || field.type === "secret") {
      const secretVal = String(rawSecrets[field.key] || "").trim();
      const configured = secretVal.length > 0;
      hasSecrets[field.key] = configured;
      maskedSecrets[field.key] = configured ? maskSecretValue(secretVal) : "";
      secretValuesForStatus[field.key] = secretVal;
    } else if (field.type === "toggle") {
      const val = rawConfig[field.key];
      config[field.key] =
        typeof val === "boolean"
          ? val
          : typeof field.defaultValue === "boolean"
          ? field.defaultValue
          : false;
    } else {
      const val = rawConfig[field.key];
      config[field.key] =
        val !== undefined && val !== null
          ? String(val)
          : String(field.defaultValue ?? "");
    }
  }

  const isEnabled = row ? Boolean(row.is_enabled) : false;
  const mode: IntegrationMode = row?.mode === "live" ? "live" : "test";
  const status: IntegrationStatus = row
    ? deriveIntegrationStatus(fields, config, secretValuesForStatus, isEnabled)
    : "not_configured";

  return {
    slug: def.slug,
    name: row?.name || def.name,
    category: row?.category || def.category,
    description: row?.description || def.description,
    docsHint: def.docsHint,
    webhookPath: def.webhookPath,
    isCustom: Boolean(def.isCustom || row?.is_custom),
    isEnabled,
    mode,
    status,
    config,
    maskedSecrets,
    hasSecrets,
    lastSyncedAt: row?.last_synced_at || null,
    updatedAt: row?.updated_at || null,
    fields,
  };
}

async function fetchAllStoredRows(): Promise<{
  rows: StoredIntegrationRow[];
  liveTableAvailable: boolean;
}> {
  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();

  let liveRows: StoredIntegrationRow[] = [];
  let liveTableAvailable = false;

  try {
    const { data, error } = await (directAdmin as any)
      .from("platform_integrations")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error) {
      liveTableAvailable = true;
      liveRows = Array.isArray(data) ? data : [];
    } else if (!isMissingTableError(error)) {
      console.error("Live platform_integrations query error:", error);
    }
  } catch (err) {
    console.warn("Could not query live platform_integrations table:", err);
  }

  let virtualRows: StoredIntegrationRow[] = [];
  try {
    const { data, error } = await (virtualAdmin as any)
      .from("platform_integrations")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(data)) {
      virtualRows = data;
    }
  } catch (err) {
    console.warn("Could not query fallback platform_integrations table:", err);
  }

  const bySlug = new Map<string, StoredIntegrationRow>();
  for (const row of virtualRows) {
    if (row?.slug) bySlug.set(String(row.slug).toLowerCase(), row);
  }
  if (liveTableAvailable) {
    for (const row of liveRows) {
      if (row?.slug) bySlug.set(String(row.slug).toLowerCase(), row);
    }
  }

  return {
    rows: Array.from(bySlug.values()),
    liveTableAvailable,
  };
}

async function fetchStoredRowBySlug(slug: string): Promise<{
  row: StoredIntegrationRow | null;
  liveTableAvailable: boolean;
}> {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();

  let liveTableAvailable = false;
  let liveRow: StoredIntegrationRow | null = null;

  try {
    const { data, error } = await (directAdmin as any)
      .from("platform_integrations")
      .select("*")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (!error) {
      liveTableAvailable = true;
      liveRow = data || null;
    } else if (!isMissingTableError(error)) {
      console.error(`Live platform_integrations lookup error for ${normalizedSlug}:`, error);
    }
  } catch (err) {
    console.warn(`Could not query live platform_integrations for ${normalizedSlug}:`, err);
  }

  if (liveRow) {
    return { row: liveRow, liveTableAvailable: true };
  }

  try {
    const { data, error } = await (virtualAdmin as any)
      .from("platform_integrations")
      .select("*")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (!error && data) {
      return { row: data, liveTableAvailable };
    }
  } catch (err) {
    console.warn(`Could not query fallback platform_integrations for ${normalizedSlug}:`, err);
  }

  return { row: null, liveTableAvailable };
}

export async function listPlatformIntegrations(): Promise<SafeIntegrationRecord[]> {
  assertServerSide();
  const { rows } = await fetchAllStoredRows();
  const rowMap = new Map<string, StoredIntegrationRow>();
  for (const r of rows) {
    rowMap.set(String(r.slug).toLowerCase(), r);
  }

  const builtInSlugs = new Set(DEFAULT_INTEGRATIONS.map((d) => d.slug));
  const results: SafeIntegrationRecord[] = DEFAULT_INTEGRATIONS.map((def) =>
    buildSafeRecord(def, rowMap.get(def.slug) || null)
  );

  for (const row of rows) {
    const key = String(row.slug).toLowerCase();
    if (!builtInSlugs.has(key)) {
      const customDef: IntegrationDefinition = {
        slug: row.slug,
        name: row.name,
        category: row.category || "Custom",
        description:
          row.description || "Custom platform API & webhook integration.",
        docsHint:
          "Configure the base HTTPS endpoint URL and API secret keys provided by your external service.",
        webhookPath: `/api/webhooks/${row.slug}`,
        fields: CUSTOM_INTEGRATION_FIELDS,
        isCustom: true,
      };
      results.push(buildSafeRecord(customDef, row));
    }
  }

  return results;
}

export async function getPlatformIntegrationBySlug(
  slug: string
): Promise<SafeIntegrationRecord | null> {
  assertServerSide();
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!normalizedSlug) return null;

  const builtInDef = getDefaultIntegrationBySlug(normalizedSlug);
  const { row } = await fetchStoredRowBySlug(normalizedSlug);

  if (!builtInDef && !row) {
    return null;
  }

  const def: IntegrationDefinition = builtInDef || {
    slug: row!.slug,
    name: row!.name,
    category: row!.category || "Custom",
    description:
      row!.description || "Custom platform API & webhook integration.",
    docsHint:
      "Configure the base HTTPS endpoint URL and API secret keys provided by your external service.",
    webhookPath: `/api/webhooks/${row!.slug}`,
    fields: CUSTOM_INTEGRATION_FIELDS,
    isCustom: true,
  };

  return buildSafeRecord(def, row);
}

export async function savePlatformIntegration(
  input: SaveIntegrationInput
): Promise<SafeIntegrationRecord> {
  assertServerSide();
  const normalizedSlug = String(input.slug || "").trim().toLowerCase();
  if (!normalizedSlug) {
    throw new Error("Integration slug is required.");
  }

  const builtInDef = getDefaultIntegrationBySlug(normalizedSlug);
  const { row: existingRow } = await fetchStoredRowBySlug(normalizedSlug);

  if (!builtInDef && !existingRow) {
    throw new Error("Integration provider not found.");
  }

  const def: IntegrationDefinition = builtInDef || {
    slug: existingRow!.slug,
    name: existingRow!.name,
    category: existingRow!.category || "Custom",
    description:
      existingRow!.description || "Custom platform API & webhook integration.",
    docsHint:
      "Configure the base HTTPS endpoint URL and API secret keys provided by your external service.",
    webhookPath: `/api/webhooks/${existingRow!.slug}`,
    fields: CUSTOM_INTEGRATION_FIELDS,
    isCustom: true,
  };

  const existingSecrets = (
    existingRow?.secrets && typeof existingRow.secrets === "object"
      ? existingRow.secrets
      : {}
  ) as Record<string, string>;

  const clearedSet = new Set(
    Array.isArray(input.clearedSecrets) ? input.clearedSecrets : []
  );

  const mergedConfig: Record<string, string | boolean> = {};
  const mergedSecrets: Record<string, string> = {};

  for (const field of def.fields) {
    if (field.isSecret || field.type === "secret") {
      if (clearedSet.has(field.key)) {
        mergedSecrets[field.key] = "";
      } else {
        const submitted = String(input.secretUpdates?.[field.key] ?? "").trim();
        if (!submitted || submitted.startsWith("••••")) {
          // Preserve existing stored secret untouched
          const prev = String(existingSecrets[field.key] || "").trim();
          if (prev) mergedSecrets[field.key] = prev;
        } else {
          mergedSecrets[field.key] = submitted;
        }
      }
    } else if (field.type === "toggle") {
      const rawVal = input.config?.[field.key];
      mergedConfig[field.key] =
        typeof rawVal === "boolean"
          ? rawVal
          : rawVal === "true"
          ? true
          : rawVal === "false"
          ? false
          : typeof field.defaultValue === "boolean"
          ? field.defaultValue
          : false;
    } else {
      const rawVal = input.config?.[field.key];
      mergedConfig[field.key] =
        rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
    }
  }

  const mode: IntegrationMode = input.mode === "live" ? "live" : "test";
  const isEnabled = Boolean(input.isEnabled);
  const status = deriveIntegrationStatus(
    def.fields,
    mergedConfig,
    mergedSecrets,
    isEnabled
  );

  const nowIso = new Date().toISOString();
  const upsertPayload: StoredIntegrationRow = {
    slug: def.slug,
    name: existingRow?.name || def.name,
    category: existingRow?.category || def.category,
    description: existingRow?.description || def.description,
    is_custom: Boolean(def.isCustom || existingRow?.is_custom),
    is_enabled: isEnabled,
    mode,
    status,
    config: mergedConfig,
    secrets: mergedSecrets,
    last_synced_at:
      status === "connected" ? nowIso : existingRow?.last_synced_at || null,
    updated_by: input.updatedBy || null,
    updated_at: nowIso,
  };

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();
  let savedRow: StoredIntegrationRow | null = null;
  let liveTableMissing = false;

  try {
    const { data, error } = await (directAdmin as any)
      .from("platform_integrations")
      .upsert(upsertPayload, { onConflict: "slug" })
      .select("*")
      .single();

    if (!error && data) {
      savedRow = data;
    } else if (isMissingTableError(error)) {
      liveTableMissing = true;
    } else if (error) {
      console.error("Failed to save integration to live Supabase:", error);
      throw new Error(error.message || "Failed to save integration configuration.");
    }
  } catch (err: any) {
    if (!liveTableMissing) {
      throw err;
    }
  }

  try {
    const { data: vData, error: vErr } = await (virtualAdmin as any)
      .from("platform_integrations")
      .upsert(upsertPayload, { onConflict: "slug" })
      .select("*")
      .single();

    if (!savedRow && !vErr && vData) {
      savedRow = vData;
    }
  } catch (vErr) {
    if (liveTableMissing && !savedRow) {
      throw vErr;
    }
  }

  return buildSafeRecord(def, savedRow || upsertPayload);
}

function slugifyIntegrationName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createCustomPlatformIntegration(
  input: CreateCustomIntegrationInput
): Promise<SafeIntegrationRecord> {
  assertServerSide();
  const cleanName = String(input.name || "").trim();
  const cleanCategory = String(input.category || "Custom").trim() || "Custom";
  const cleanDescription =
    String(input.description || "").trim() ||
    "Custom platform API & webhook integration.";

  if (!cleanName) {
    throw new Error("Integration name is required.");
  }

  const slug = slugifyIntegrationName(cleanName);
  if (!slug) {
    throw new Error("Integration name must include alphanumeric characters.");
  }

  const builtIn = getDefaultIntegrationBySlug(slug);
  const { row: existing } = await fetchStoredRowBySlug(slug);
  if (builtIn || existing) {
    throw new Error(
      `An integration with identifier "${slug}" already exists.`
    );
  }

  const nowIso = new Date().toISOString();
  const insertPayload: StoredIntegrationRow = {
    slug,
    name: cleanName,
    category: cleanCategory,
    description: cleanDescription,
    is_custom: true,
    is_enabled: false,
    mode: "test",
    status: "not_configured",
    config: {},
    secrets: {},
    last_synced_at: null,
    updated_by: input.updatedBy || null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();
  let createdRow: StoredIntegrationRow | null = null;
  let liveTableMissing = false;

  try {
    const { data, error } = await (directAdmin as any)
      .from("platform_integrations")
      .insert(insertPayload)
      .select("*")
      .single();

    if (!error && data) {
      createdRow = data;
    } else if (isMissingTableError(error)) {
      liveTableMissing = true;
    } else if (error) {
      throw new Error(error.message || "Failed to create custom integration.");
    }
  } catch (err: any) {
    if (!liveTableMissing) {
      throw err;
    }
  }

  try {
    const { data: vData, error: vErr } = await (virtualAdmin as any)
      .from("platform_integrations")
      .insert(insertPayload)
      .select("*")
      .single();

    if (!createdRow && !vErr && vData) {
      createdRow = vData;
    }
  } catch (vErr) {
    if (liveTableMissing && !createdRow) {
      throw vErr;
    }
  }

  const def: IntegrationDefinition = {
    slug,
    name: cleanName,
    category: cleanCategory,
    description: cleanDescription,
    docsHint:
      "Configure the base HTTPS endpoint URL and API secret keys provided by your external service.",
    webhookPath: `/api/webhooks/${slug}`,
    fields: CUSTOM_INTEGRATION_FIELDS,
    isCustom: true,
  };

  return buildSafeRecord(def, createdRow || insertPayload);
}
