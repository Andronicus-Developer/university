import { createDirectAdminClient } from "@/lib/supabase/admin";
import type { PortalSchoolType } from "@/config/schoolPortalConfig";
import {
  DEFAULT_PREFIX_BY_ENTITY,
  VALID_ID_ENTITY_TYPES,
  formatIdFromRule,
  getIdCategoriesForSchoolType,
  sanitizeNextNumber,
  sanitizePaddingLength,
  sanitizeSeparator,
  sanitizeYearFormat,
  type IdEntityType,
  type IdSequenceRule,
  type IdSequenceRuleInput,
} from "./config";

function isMissingSequencesTableOrRpc(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || "").trim();
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST205" ||
    code === "PGRST202" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the function")
  );
}

/**
 * Loads configured ID rules for a school merged with school-type defaults.
 */
export async function getSchoolIdSequences(
  schoolId: string,
  schoolType: PortalSchoolType,
  currentYear: number = new Date().getFullYear()
): Promise<{
  rules: IdSequenceRule[];
  previewMap: Record<string, string>;
  migrationMissing: boolean;
}> {
  const categories = getIdCategoriesForSchoolType(schoolType);
  const directAdmin = createDirectAdminClient() as any;

  let savedRows: any[] = [];
  let migrationMissing = false;

  try {
    const { data, error } = await directAdmin
      .from("school_id_sequences")
      .select(
        "entity_type, prefix, separator, include_year, year_format, padding_length, next_number"
      )
      .eq("school_id", schoolId);

    if (error) {
      if (isMissingSequencesTableOrRpc(error)) {
        migrationMissing = true;
      } else {
        console.warn("[getSchoolIdSequences] query error:", error.message);
      }
    } else if (Array.isArray(data)) {
      savedRows = data;
    }
  } catch (err) {
    if (isMissingSequencesTableOrRpc(err)) {
      migrationMissing = true;
    }
  }

  const savedByType = new Map<string, any>(
    savedRows.map((row) => [String(row.entity_type).toLowerCase(), row])
  );

  const previewMap: Record<string, string> = {};
  const rules: IdSequenceRule[] = categories.map((cat) => {
    const saved = savedByType.get(cat.entity_type);
    const ruleBase: IdSequenceRuleInput = {
      entity_type: cat.entity_type,
      prefix:
        saved && typeof saved.prefix === "string"
          ? saved.prefix.trim().toUpperCase()
          : cat.defaultPrefix,
      separator: sanitizeSeparator(saved?.separator ?? "-"),
      include_year:
        typeof saved?.include_year === "boolean" ? saved.include_year : true,
      year_format: sanitizeYearFormat(saved?.year_format ?? "YYYY"),
      padding_length: sanitizePaddingLength(saved?.padding_length ?? 4),
      next_number: sanitizeNextNumber(saved?.next_number ?? 1),
    };
    const preview = formatIdFromRule(ruleBase, currentYear);
    previewMap[cat.entity_type] = preview;

    return {
      ...ruleBase,
      label: cat.label,
      description: cat.description,
      preview,
    };
  });

  return { rules, previewMap, migrationMissing };
}

/**
 * Persists custom ID numbering rules for a school into `public.school_id_sequences`.
 */
export async function saveSchoolIdSequences(
  schoolId: string,
  rules: IdSequenceRuleInput[]
): Promise<{ ok: boolean; error?: string; migrationMissing?: boolean }> {
  const directAdmin = createDirectAdminClient() as any;
  const nowIso = new Date().toISOString();

  const sanitizedRows = rules
    .filter((r) => VALID_ID_ENTITY_TYPES.includes(r.entity_type))
    .map((r) => ({
      school_id: schoolId,
      entity_type: r.entity_type,
      prefix: String(r.prefix || "")
        .trim()
        .toUpperCase()
        .slice(0, 24),
      separator: sanitizeSeparator(r.separator),
      include_year: Boolean(r.include_year),
      year_format: sanitizeYearFormat(r.year_format),
      padding_length: sanitizePaddingLength(r.padding_length),
      next_number: sanitizeNextNumber(r.next_number),
      updated_at: nowIso,
    }));

  if (sanitizedRows.length === 0) {
    return { ok: false, error: "No valid ID categories were provided." };
  }

  const { error } = await directAdmin
    .from("school_id_sequences")
    .upsert(sanitizedRows, { onConflict: "school_id,entity_type" });

  if (error) {
    if (isMissingSequencesTableOrRpc(error)) {
      return {
        ok: false,
        migrationMissing: true,
        error:
          "The school_id_sequences table is not created yet. Run migration 20261124000014_school_id_sequences.sql in Supabase first.",
      };
    }
    return { ok: false, error: error.message || "Failed to save ID rules." };
  }

  return { ok: true };
}

async function fallbackGenerateNextId(
  directAdmin: any,
  schoolId: string,
  entityType: IdEntityType,
  opts?: {
    checkTable?: "students" | "staff_profiles";
    idColumn?: "student_number" | "staff_number";
  }
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = DEFAULT_PREFIX_BY_ENTITY[entityType] || "STF";
  const matchPrefix = `${prefix}-${year}-`;

  let maxSeq = 0;
  if (opts?.checkTable && opts?.idColumn) {
    try {
      const { data: rows } = await directAdmin
        .from(opts.checkTable)
        .select(opts.idColumn)
        .eq("school_id", schoolId)
        .ilike(opts.idColumn, `${matchPrefix}%`);

      for (const row of rows || []) {
        const val = String(row?.[opts.idColumn] || "").toUpperCase();
        if (val.startsWith(matchPrefix)) {
          const tail = parseInt(val.slice(matchPrefix.length), 10);
          if (!Number.isNaN(tail) && tail > maxSeq) maxSeq = tail;
        }
      }
    } catch {
      // ignore fallback scan errors
    }
  }

  return formatIdFromRule(
    {
      prefix,
      separator: "-",
      include_year: true,
      year_format: "YYYY",
      padding_length: 4,
      next_number: maxSeq + 1,
    },
    year
  );
}

/**
 * Generates the next unique ID for a given `(school_id, entity_type)` atomically via
 * `public.generate_next_school_id`. Skips past any pre-existing legacy IDs when
 * `checkTable` + `idColumn` are specified, and falls back gracefully if the SQL
 * migration has not yet been applied.
 */
export async function generateNextSchoolId(
  schoolId: string,
  entityType: IdEntityType,
  opts?: {
    checkTable?: "students" | "staff_profiles";
    idColumn?: "student_number" | "staff_number";
  }
): Promise<string> {
  const directAdmin = createDirectAdminClient() as any;

  for (let attempt = 0; attempt < 15; attempt++) {
    const { data, error } = await directAdmin.rpc("generate_next_school_id", {
      p_school_id: schoolId,
      p_entity_type: entityType,
    });

    if (error) {
      if (isMissingSequencesTableOrRpc(error)) {
        return fallbackGenerateNextId(directAdmin, schoolId, entityType, opts);
      }
      throw new Error(
        error.message || `Failed to generate atomic ID for ${entityType}`
      );
    }

    const candidate = String(data || "").trim().toUpperCase();
    if (!candidate) continue;

    if (opts?.checkTable && opts?.idColumn) {
      const { data: existing } = await directAdmin
        .from(opts.checkTable)
        .select("id")
        .eq("school_id", schoolId)
        .eq(opts.idColumn, candidate)
        .maybeSingle();

      if (existing?.id) {
        continue;
      }
    }

    return candidate;
  }

  return fallbackGenerateNextId(directAdmin, schoolId, entityType, opts);
}
