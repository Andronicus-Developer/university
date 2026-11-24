import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import { getSchoolTypeLabel } from "@/lib/academics/school-terminology";

/**
 * Verified live Supabase tenant tables scoped strictly by `school_id`
 * (`profiles` additionally checked via `university_id`).
 */
export const LIVE_TENANT_BACKUP_TABLES = [
  "profiles",
  "school_memberships",
  "user_role_assignments",
  "roles",
  "departments",
  "programmes",
  "academic_years",
  "terms",
  "class_groups",
  "students",
  "staff_profiles",
  "attendance_sessions",
  "attendance_records",
  "invoices",
  "payments",
  "school_events",
] as const;

/**
 * Extended multi-tenant tables queried safely across live Postgres and the
 * cloud-synced virtual store; absent Postgres tables are skipped cleanly.
 */
export const EXTENDED_TENANT_BACKUP_TABLES = [
  "campuses",
  "faculties",
  "courses",
  "course_offerings",
  "course_enrolments",
  "staff",
  "teaching_assignments",
  "assessment_components",
  "assessment_marks",
  "published_results",
  "grade_scales",
  "fee_items",
  "fee_schedules",
  "student_invoices",
  "invoice_lines",
  "receipts",
  "scholarships",
  "waivers",
  "refund_requests",
  "timetable_events",
  "announcements",
  "notifications",
  "admission_cycles",
  "applications",
  "residences",
  "hostel_rooms",
  "library_items",
  "loans",
  "transport_routes",
  "transport_vehicles",
  "leave_requests",
  "support_cases",
] as const;

export interface BackupLogEntry {
  last_backup_at: string;
  total_records: number;
  exported_by?: string;
}

export interface BackupSchoolRow {
  id: string;
  name: string;
  slug: string;
  school_type: string;
  school_type_label: string;
  status: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_backup_at: string | null;
  last_backup_total_records: number | null;
  record_summary: {
    profiles: number;
    students: number;
    departments: number;
    programmes: number;
  };
}

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("backups-service must only execute on the server.");
  }
}

export function slugifySchoolFilename(nameOrSlug: string): string {
  const cleaned = String(nameOrSlug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "school";
}

function isMissingRelationError(error: any): boolean {
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

async function getSchoolHeadCount(
  directAdmin: ReturnType<typeof createDirectAdminClient>,
  table: string,
  schoolId: string
): Promise<number> {
  try {
    let query = (directAdmin as any)
      .from(table)
      .select("*", { count: "exact", head: true });

    if (table === "profiles") {
      query = query.or(`school_id.eq.${schoolId},university_id.eq.${schoolId}`);
    } else {
      query = query.eq("school_id", schoolId);
    }

    const { count, error } = await query;
    if (error) {
      if (!isMissingRelationError(error)) {
        console.warn(`Count warning on ${table} for school ${schoolId}:`, error.message);
      }
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function listSchoolsForBackup(): Promise<BackupSchoolRow[]> {
  assertServerSide();
  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();

  const { data: liveSchools, error: schoolsError } = await (directAdmin as any)
    .from("schools")
    .select(
      "id, name, slug, tenant_slug, school_type, status, email, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (schoolsError) {
    console.error("Failed to fetch live public.schools for backups:", schoolsError);
    throw new Error(schoolsError.message || "Failed to fetch live schools list.");
  }

  let backupLogs: Record<string, BackupLogEntry> = {};
  try {
    const { data: logsRow } = await (virtualAdmin as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "school_backup_logs")
      .maybeSingle();

    if (logsRow?.setting_value && typeof logsRow.setting_value === "object") {
      backupLogs = logsRow.setting_value;
    }
  } catch (logErr) {
    console.warn("Could not read school_backup_logs setting:", logErr);
  }

  const schools = Array.isArray(liveSchools) ? liveSchools : [];
  const enriched = await Promise.all(
    schools.map(async (s: any) => {
      const schoolId = String(s.id);
      const [profilesCount, studentsCount, departmentsCount, programmesCount] =
        await Promise.all([
          getSchoolHeadCount(directAdmin, "profiles", schoolId),
          getSchoolHeadCount(directAdmin, "students", schoolId),
          getSchoolHeadCount(directAdmin, "departments", schoolId),
          getSchoolHeadCount(directAdmin, "programmes", schoolId),
        ]);

      const logEntry = backupLogs[schoolId] || null;
      const slug = String(s.slug || s.tenant_slug || slugifySchoolFilename(s.name));
      const schoolType = String(s.school_type || "university");

      return {
        id: schoolId,
        name: String(s.name || "Unnamed School"),
        slug,
        school_type: schoolType,
        school_type_label: getSchoolTypeLabel(schoolType),
        status: String(s.status || "active"),
        email: String(s.email || ""),
        created_at: String(s.created_at || ""),
        updated_at: String(s.updated_at || s.created_at || ""),
        last_backup_at: logEntry?.last_backup_at || null,
        last_backup_total_records:
          typeof logEntry?.total_records === "number"
            ? logEntry.total_records
            : null,
        record_summary: {
          profiles: profilesCount,
          students: studentsCount,
          departments: departmentsCount,
          programmes: programmesCount,
        },
      } satisfies BackupSchoolRow;
    })
  );

  return enriched;
}

function rowBelongsStrictlyToSchool(row: any, schoolId: string): boolean {
  if (!row || typeof row !== "object") return false;
  return (
    String(row.school_id || "") === schoolId ||
    String(row.university_id || "") === schoolId
  );
}

function deduplicateRows(rows: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const key = row.id ? String(row.id) : JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(row);
    }
  }
  return out;
}

async function queryTenantTableRows(
  directAdmin: ReturnType<typeof createDirectAdminClient>,
  virtualAdmin: ReturnType<typeof createAdminClient>,
  table: string,
  schoolId: string,
  requiredLiveTable: boolean
): Promise<{ rows: any[]; presentInLive: boolean }> {
  let liveRows: any[] = [];
  let presentInLive = false;

  try {
    let query = (directAdmin as any).from(table).select("*");
    if (table === "profiles") {
      query = query.or(`school_id.eq.${schoolId},university_id.eq.${schoolId}`);
    } else {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;
    if (!error) {
      presentInLive = true;
      liveRows = Array.isArray(data)
        ? data.filter((r) => rowBelongsStrictlyToSchool(r, schoolId))
        : [];
    } else if (!isMissingRelationError(error)) {
      const msg = `Failed to export ${table} for school ${schoolId}: ${error.message}`;
      if (requiredLiveTable) {
        throw new Error(msg);
      }
      console.warn(msg);
    }
  } catch (err: any) {
    if (requiredLiveTable) throw err;
    console.warn(`Extended table export skipped (${table}):`, err?.message || err);
  }

  let virtualRows: any[] = [];
  try {
    let vQuery = (virtualAdmin as any)
      .from(table)
      .select("*", { headers: { "x-tenant-school-id": schoolId } });

    if (table === "profiles") {
      vQuery = vQuery.or(`school_id.eq.${schoolId},university_id.eq.${schoolId}`);
    } else {
      vQuery = vQuery.eq("school_id", schoolId);
    }

    const { data, error } = await vQuery;
    if (!error && Array.isArray(data)) {
      virtualRows = data.filter((r) => rowBelongsStrictlyToSchool(r, schoolId));
    }
  } catch {
    // Virtual mirror optional
  }

  return {
    rows: deduplicateRows([...liveRows, ...virtualRows]),
    presentInLive,
  };
}

export async function generateSchoolBackupPayload(
  schoolId: string,
  exportedBy: string
): Promise<{ filename: string; payload: Record<string, any> }> {
  assertServerSide();
  const cleanSchoolId = String(schoolId || "").trim();
  if (!cleanSchoolId) {
    throw new Error("School ID is required.");
  }

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();

  const { data: schoolRow, error: schoolErr } = await (directAdmin as any)
    .from("schools")
    .select("*")
    .eq("id", cleanSchoolId)
    .maybeSingle();

  if (schoolErr) {
    console.error("Error loading school row for backup:", schoolErr);
    throw new Error(schoolErr.message || "Failed to look up target school.");
  }
  if (!schoolRow) {
    throw new Error("School not found.");
  }

  const exportedAt = new Date().toISOString();
  const dataMap: Record<string, any[]> = {
    schools: [schoolRow],
  };
  const recordCounts: Record<string, number> = {
    schools: 1,
  };

  // Query all verified live tenant tables
  const liveResults = await Promise.all(
    LIVE_TENANT_BACKUP_TABLES.map(async (table) => {
      const res = await queryTenantTableRows(
        directAdmin,
        virtualAdmin,
        table,
        cleanSchoolId,
        true
      );
      return { table, ...res };
    })
  );

  for (const item of liveResults) {
    dataMap[item.table] = item.rows;
    recordCounts[item.table] = item.rows.length;
  }

  // Query extended multi-tenant tables safely (include populated or existing tables)
  const extendedResults = await Promise.all(
    EXTENDED_TENANT_BACKUP_TABLES.map(async (table) => {
      const res = await queryTenantTableRows(
        directAdmin,
        virtualAdmin,
        table,
        cleanSchoolId,
        false
      );
      return { table, ...res };
    })
  );

  for (const item of extendedResults) {
    if (item.presentInLive || item.rows.length > 0) {
      dataMap[item.table] = item.rows;
      recordCounts[item.table] = item.rows.length;
    }
  }

  const tablesIncluded = Object.keys(dataMap);
  const totalRecords = Object.values(recordCounts).reduce((sum, n) => sum + n, 0);

  const schoolSlug = slugifySchoolFilename(
    schoolRow.slug || schoolRow.tenant_slug || schoolRow.name
  );
  const datePart = exportedAt.slice(0, 10);
  const filename = `backup-${schoolSlug}-${datePart}.json`;

  const payload = {
    backup_metadata: {
      version: "1.0.0",
      platform: "Erudian360",
      exported_at: exportedAt,
      exported_by: exportedBy,
      school_id: cleanSchoolId,
      school_name: schoolRow.name,
      school_slug: schoolSlug,
      school_type: schoolRow.school_type || "university",
      total_records: totalRecords,
      tables_included: tablesIncluded,
      record_counts: recordCounts,
    },
    school: schoolRow,
    data: dataMap,
  };

  // Persist last backup metadata in system_settings so the table displays updated timestamps
  try {
    const { data: logsRow } = await (virtualAdmin as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "school_backup_logs")
      .maybeSingle();

    const existingLogs =
      logsRow?.setting_value && typeof logsRow.setting_value === "object"
        ? logsRow.setting_value
        : {};

    await (virtualAdmin as any).from("system_settings").upsert(
      {
        setting_key: "school_backup_logs",
        setting_value: {
          ...existingLogs,
          [cleanSchoolId]: {
            last_backup_at: exportedAt,
            total_records: totalRecords,
            exported_by: exportedBy,
          },
        },
        category: "superadmin",
        description: "Per-school JSON backup download timestamps and record counts",
        is_sensitive: false,
        updated_at: exportedAt,
      },
      { onConflict: "setting_key" }
    );
  } catch (logSaveErr) {
    console.warn("Could not record school_backup_logs:", logSaveErr);
  }

  return { filename, payload };
}
