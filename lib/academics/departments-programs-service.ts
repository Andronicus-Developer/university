import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import { isValidUuid, scopeQueryBySchool } from "@/lib/admin/tenant-provisioning";
import { getUniversities } from "@/lib/superadmin/service";
import {
  CanonicalSchoolType,
  getSchoolTerminology,
  normalizeSchoolType,
} from "@/lib/academics/school-terminology";

if (typeof window !== "undefined") {
  throw new Error("departments-programs-service must only run on the server.");
}

export interface SchoolSummary {
  id: string;
  name: string;
  code: string;
  school_type: CanonicalSchoolType;
}

export interface DepartmentRecord {
  id: string;
  school_id: string;
  school_name: string;
  school_code: string;
  school_type: CanonicalSchoolType;
  code: string;
  name: string;
  head_of_department: string;
  description: string;
  is_active: boolean;
  programs_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProgramRecord {
  id: string;
  school_id: string;
  school_name: string;
  school_code: string;
  school_type: CanonicalSchoolType;
  department_id: string | null;
  code: string;
  name: string;
  degree_level: string;
  duration_years: number;
  total_credits: number;
  is_active: boolean;
  department_name: string;
  department_code: string;
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  linkedProgramsCount: number;
  withHeadCount: number;
}

export interface ProgramStats {
  totalPrograms: number;
  activePrograms: number;
  undergraduateCount: number;
  postgraduateCount: number;
  diplomaCount: number;
}

class AcademicServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err || "");
  return (
    err.code === "PGRST205" ||
    msg.includes("Could not find the table") ||
    msg.includes("does not exist")
  );
}

/**
 * Merges live `public.schools` and virtual directory institutions into a normalized school map.
 */
async function listSchoolsMap(): Promise<{
  schools: SchoolSummary[];
  byId: Map<string, SchoolSummary>;
}> {
  const directAdmin = createDirectAdminClient();
  const byId = new Map<string, SchoolSummary>();

  const [univs, liveSchoolsRes] = await Promise.all([
    getUniversities().catch(() => []),
    (directAdmin as any)
      .from("schools")
      .select("id, name, slug, tenant_slug, status, school_type")
      .then((r: any) => r, () => ({ data: [] })),
  ]);

  for (const s of liveSchoolsRes?.data || []) {
    if (!s?.id || s.status === "deleted") continue;
    byId.set(String(s.id).toLowerCase(), {
      id: String(s.id),
      name: String(s.name || ""),
      code: String(s.tenant_slug || s.slug || "SCH").toUpperCase(),
      school_type: normalizeSchoolType(s.school_type),
    });
  }

  for (const u of univs) {
    if (!u?.id || u.status === "deleted") continue;
    const key = String(u.id).toLowerCase();
    const existing = byId.get(key);
    const rawUnivType = u.school_type || u.institution_type;
    byId.set(key, {
      id: existing?.id || String(u.id),
      name: u.name || existing?.name || "",
      code: (u.code || existing?.code || "SCH").toUpperCase(),
      school_type:
        existing?.school_type ||
        (rawUnivType ? normalizeSchoolType(rawUnivType) : "university"),
    });
  }

  const schools = Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return { schools, byId };
}

export async function resolveSchoolTypeById(
  schoolId?: string | null
): Promise<CanonicalSchoolType> {
  if (!schoolId) return "university";
  const { byId } = await listSchoolsMap();
  return byId.get(schoolId.trim().toLowerCase())?.school_type || "university";
}

function normalizeRowSchoolId(row: any): string {
  return String(row?.school_id || row?.university_id || "").trim();
}

function matchesSchool(row: any, schoolIdFilter?: string | null): boolean {
  if (!schoolIdFilter) return true;
  const rowSchool = normalizeRowSchoolId(row);
  return rowSchool.toLowerCase() === schoolIdFilter.trim().toLowerCase();
}

async function fetchMergedRawDepartments(schoolIdFilter?: string | null): Promise<any[]> {
  const virtualAdmin = createAdminClient();
  const directAdmin = createDirectAdminClient();

  const [vRes, liveRes] = await Promise.all([
    scopeQueryBySchool(
      (virtualAdmin as any).from("departments").select("*"),
      schoolIdFilter || null
    ),
    scopeQueryBySchool(
      (directAdmin as any).from("departments").select("*"),
      schoolIdFilter && isValidUuid(schoolIdFilter) ? schoolIdFilter : null
    ).then((r: any) => r, () => ({ data: [], error: null })),
  ]);

  const byId = new Map<string, any>();
  for (const row of vRes?.data || []) {
    if (row?.id && matchesSchool(row, schoolIdFilter)) {
      byId.set(String(row.id), row);
    }
  }
  if (!liveRes?.error || isMissingTableError(liveRes.error)) {
    for (const row of liveRes?.data || []) {
      if (row?.id && matchesSchool(row, schoolIdFilter)) {
        const prev = byId.get(String(row.id)) || {};
        byId.set(String(row.id), { ...prev, ...row });
      }
    }
  }

  return Array.from(byId.values());
}

async function fetchMergedRawPrograms(schoolIdFilter?: string | null): Promise<any[]> {
  const virtualAdmin = createAdminClient();
  const directAdmin = createDirectAdminClient();

  const [vRes, liveRes] = await Promise.all([
    scopeQueryBySchool(
      (virtualAdmin as any).from("programmes").select("*"),
      schoolIdFilter || null
    ),
    scopeQueryBySchool(
      (directAdmin as any).from("programmes").select("*"),
      schoolIdFilter && isValidUuid(schoolIdFilter) ? schoolIdFilter : null
    ).then((r: any) => r, () => ({ data: [], error: null })),
  ]);

  const byId = new Map<string, any>();
  for (const row of vRes?.data || []) {
    if (row?.id && matchesSchool(row, schoolIdFilter)) {
      byId.set(String(row.id), row);
    }
  }
  if (!liveRes?.error || isMissingTableError(liveRes.error)) {
    for (const row of liveRes?.data || []) {
      if (row?.id && matchesSchool(row, schoolIdFilter)) {
        const prev = byId.get(String(row.id)) || {};
        byId.set(String(row.id), { ...prev, ...row });
      }
    }
  }

  return Array.from(byId.values());
}

function formatDepartment(
  row: any,
  schoolById: Map<string, SchoolSummary>,
  progCountByDeptId: Map<string, number>
): DepartmentRecord {
  const sId = normalizeRowSchoolId(row);
  const school = schoolById.get(sId.toLowerCase());
  return {
    id: String(row.id),
    school_id: sId,
    school_name: school?.name || "Unassigned School",
    school_code: school?.code || "—",
    school_type: school?.school_type || "university",
    code: String(row.code || "").toUpperCase(),
    name: String(row.name || ""),
    head_of_department: String(row.head_of_department || ""),
    description: String(row.description || ""),
    is_active: row.is_active !== false,
    programs_count: progCountByDeptId.get(String(row.id)) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatProgram(
  row: any,
  deptById: Map<string, any>,
  schoolById: Map<string, SchoolSummary>
): ProgramRecord {
  const sId = normalizeRowSchoolId(row);
  const school = schoolById.get(sId.toLowerCase());
  const dept = row.department_id ? deptById.get(String(row.department_id)) : null;

  return {
    id: String(row.id),
    school_id: sId,
    school_name: school?.name || "Unassigned School",
    school_code: school?.code || "—",
    school_type: school?.school_type || "university",
    department_id: row.department_id ? String(row.department_id) : null,
    code: String(row.code || "").toUpperCase(),
    name: String(row.name || ""),
    degree_level: String(row.degree_level || "undergraduate"),
    duration_years: Number(row.duration_years) || 4,
    total_credits: Number(row.total_credits_required || row.total_credits) || 120,
    is_active: row.is_active !== false,
    department_name: dept?.name || "Unassigned / General",
    department_code: dept?.code || "GEN",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ============================================================================
// DEPARTMENTS CRUD
// ============================================================================

export async function listDepartments(schoolIdFilter?: string | null): Promise<{
  departments: DepartmentRecord[];
  schools: SchoolSummary[];
  stats: DepartmentStats;
  school_type: CanonicalSchoolType | null;
}> {
  const [{ schools, byId: schoolById }, rawDepts, rawProgs] = await Promise.all([
    listSchoolsMap(),
    fetchMergedRawDepartments(schoolIdFilter),
    fetchMergedRawPrograms(schoolIdFilter),
  ]);

  const progCountByDept = new Map<string, number>();
  for (const p of rawProgs) {
    if (p?.department_id) {
      const k = String(p.department_id);
      progCountByDept.set(k, (progCountByDept.get(k) || 0) + 1);
    }
  }

  const departments = rawDepts
    .map((d) => formatDepartment(d, schoolById, progCountByDept))
    .sort((a, b) => a.name.localeCompare(b.name));

  const stats: DepartmentStats = {
    totalDepartments: departments.length,
    activeDepartments: departments.filter((d) => d.is_active).length,
    linkedProgramsCount: departments.reduce((sum, d) => sum + d.programs_count, 0),
    withHeadCount: departments.filter((d) => d.head_of_department.trim().length > 0).length,
  };

  const schoolType = schoolIdFilter
    ? schoolById.get(schoolIdFilter.trim().toLowerCase())?.school_type || "university"
    : null;

  return { departments, schools, stats, school_type: schoolType };
}

export async function createDepartment(input: {
  school_id: string;
  code: string;
  name: string;
  head_of_department?: string | null;
  description?: string | null;
  is_active?: boolean;
}): Promise<DepartmentRecord> {
  const schoolId = String(input.school_id || "").trim();
  const cleanCode = String(input.code || "").trim().toUpperCase();
  const cleanName = String(input.name || "").trim();

  if (!schoolId || !cleanCode || !cleanName) {
    throw new AcademicServiceError(
      "School, department code, and department name are required.",
      400
    );
  }

  const { byId: schoolById } = await listSchoolsMap();
  const matchedSchool = schoolById.get(schoolId.toLowerCase());
  if (!matchedSchool) {
    throw new AcademicServiceError("Selected school was not found.", 404);
  }

  const terminology = getSchoolTerminology(matchedSchool.school_type);
  if (!terminology.departments.allowed) {
    throw new AcademicServiceError(
      `Cannot assign a Department to ${matchedSchool.name} because it is a High School. High Schools manage Classes under Programs.`,
      400
    );
  }

  const existingDepts = await fetchMergedRawDepartments(matchedSchool.id);
  if (existingDepts.some((d) => String(d.code || "").toUpperCase() === cleanCode)) {
    throw new AcademicServiceError(
      `Department code "${cleanCode}" already exists in ${matchedSchool.name}.`,
      409
    );
  }

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();
  const now = new Date().toISOString();

  const livePayload = {
    school_id: matchedSchool.id,
    code: cleanCode,
    name: cleanName,
    head_of_department: input.head_of_department?.trim() || null,
    description: input.description?.trim() || null,
    is_active: input.is_active ?? true,
    created_at: now,
    updated_at: now,
  };

  let createdId: string | null = null;
  if (isValidUuid(matchedSchool.id)) {
    const { data: liveRow, error: liveErr } = await (directAdmin as any)
      .from("departments")
      .insert(livePayload)
      .select("id")
      .single();

    if (liveErr) {
      if (!isMissingTableError(liveErr)) {
        const status = liveErr.code === "23505" ? 409 : 400;
        throw new AcademicServiceError(liveErr.message, status);
      }
    } else if (liveRow?.id) {
      createdId = String(liveRow.id);
    }
  }

  const newId = createdId || crypto.randomUUID();
  const virtualPayload = {
    id: newId,
    school_id: matchedSchool.id,
    university_id: matchedSchool.id,
    code: cleanCode,
    name: cleanName,
    head_of_department: livePayload.head_of_department,
    description: livePayload.description,
    is_active: livePayload.is_active,
    created_at: now,
    updated_at: now,
  };

  await (virtualAdmin as any)
    .from("departments")
    .upsert(virtualPayload, { onConflict: "id" });

  try {
    await (virtualAdmin as any).from("audit_events").insert({
      action: "DEPARTMENT_CREATED",
      entity_type: "department",
      entity_id: newId,
      school_id: matchedSchool.id,
      outcome: "success",
      metadata: {
        code: cleanCode,
        name: cleanName,
        school_id: matchedSchool.id,
      },
    });
  } catch {}

  return formatDepartment(virtualPayload, schoolById, new Map());
}

export async function updateDepartment(
  id: string,
  input: {
    school_id?: string;
    code?: string;
    name?: string;
    head_of_department?: string | null;
    description?: string | null;
    is_active?: boolean;
  },
  restrictToSchoolId?: string | null
): Promise<DepartmentRecord> {
  if (!id) {
    throw new AcademicServiceError("Department ID is required.", 400);
  }

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();

  const [allDepts, { byId: schoolById }] = await Promise.all([
    fetchMergedRawDepartments(null),
    listSchoolsMap(),
  ]);

  const existing = allDepts.find((d) => String(d.id) === String(id));
  if (!existing) {
    throw new AcademicServiceError("Department not found.", 404);
  }

  const currentSchoolId = normalizeRowSchoolId(existing);
  if (
    restrictToSchoolId &&
    currentSchoolId.toLowerCase() !== restrictToSchoolId.trim().toLowerCase()
  ) {
    throw new AcademicServiceError(
      "Forbidden: Cannot modify a department belonging to another school.",
      403
    );
  }

  const targetSchoolId = input.school_id?.trim() || currentSchoolId;
  const targetSchool = schoolById.get(targetSchoolId.toLowerCase());
  if (!targetSchool) {
    throw new AcademicServiceError("Assigned school was not found.", 404);
  }

  if (
    restrictToSchoolId &&
    targetSchool.id.toLowerCase() !== restrictToSchoolId.trim().toLowerCase()
  ) {
    throw new AcademicServiceError(
      "Forbidden: School Admins cannot reassign a department to another school.",
      403
    );
  }

  const terminology = getSchoolTerminology(targetSchool.school_type);
  if (!terminology.departments.allowed) {
    throw new AcademicServiceError(
      `Cannot assign a Department to ${targetSchool.name} because it is a High School. High Schools manage Classes under Programs.`,
      400
    );
  }

  const nextCode =
    input.code !== undefined
      ? String(input.code).trim().toUpperCase()
      : String(existing.code || "").toUpperCase();
  const nextName =
    input.name !== undefined ? String(input.name).trim() : String(existing.name || "");

  if (!nextCode || !nextName) {
    throw new AcademicServiceError("Department code and name are required.", 400);
  }

  const targetSchoolDepts = await fetchMergedRawDepartments(targetSchool.id);
  const conflict = targetSchoolDepts.find(
    (d) =>
      String(d.id) !== String(id) &&
      String(d.code || "").toUpperCase() === nextCode
  );
  if (conflict) {
    throw new AcademicServiceError(
      `Department code "${nextCode}" already exists in ${targetSchool.name}.`,
      409
    );
  }

  const now = new Date().toISOString();
  const updates = {
    school_id: targetSchool.id,
    code: nextCode,
    name: nextName,
    head_of_department:
      input.head_of_department !== undefined
        ? input.head_of_department?.trim() || null
        : existing.head_of_department || null,
    description:
      input.description !== undefined
        ? input.description?.trim() || null
        : existing.description || null,
    is_active:
      input.is_active !== undefined ? Boolean(input.is_active) : existing.is_active ?? true,
    updated_at: now,
  };

  if (isValidUuid(targetSchool.id) && isValidUuid(id)) {
    const { error: liveErr } = await (directAdmin as any)
      .from("departments")
      .upsert({ id, ...updates }, { onConflict: "id" });

    if (liveErr && !isMissingTableError(liveErr)) {
      const status = liveErr.code === "23505" ? 409 : 400;
      throw new AcademicServiceError(liveErr.message, status);
    }
  }

  await (virtualAdmin as any)
    .from("departments")
    .upsert(
      {
        ...existing,
        ...updates,
        id,
        university_id: targetSchool.id,
      },
      { onConflict: "id" }
    );

  // If the department changed schools, detach programmes from other schools so no cross-school link persists
  if (currentSchoolId && currentSchoolId.toLowerCase() !== targetSchool.id.toLowerCase()) {
    const progs = await fetchMergedRawPrograms(null);
    for (const p of progs) {
      if (
        String(p.department_id) === String(id) &&
        normalizeRowSchoolId(p).toLowerCase() !== targetSchool.id.toLowerCase()
      ) {
        if (isValidUuid(p.id)) {
          const { error: pLiveErr } = await (directAdmin as any)
            .from("programmes")
            .update({ department_id: null, updated_at: now })
            .eq("id", p.id);
          if (pLiveErr && !isMissingTableError(pLiveErr)) {
            console.warn("Could not detach cross-school programme in live DB:", pLiveErr);
          }
        }
        await (virtualAdmin as any)
          .from("programmes")
          .update({ department_id: null, updated_at: now })
          .eq("id", p.id);
      }
    }
  }

  try {
    await (virtualAdmin as any).from("audit_events").insert({
      action: "DEPARTMENT_UPDATED",
      entity_type: "department",
      entity_id: id,
      school_id: targetSchool.id,
      outcome: "success",
      metadata: {
        code: nextCode,
        name: nextName,
        school_id: targetSchool.id,
      },
    });
  } catch {}

  const progs = await fetchMergedRawPrograms(targetSchool.id);
  const count = progs.filter((p) => String(p.department_id) === String(id)).length;
  return formatDepartment({ ...existing, ...updates, id }, schoolById, new Map([[id, count]]));
}

export async function deleteDepartment(
  id: string,
  restrictToSchoolId?: string | null
): Promise<{ success: boolean; deletedId: string }> {
  if (!id) {
    throw new AcademicServiceError("Department ID is required.", 400);
  }

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();
  const allDepts = await fetchMergedRawDepartments(null);
  const existing = allDepts.find((d) => String(d.id) === String(id));

  if (!existing) {
    throw new AcademicServiceError("Department not found.", 404);
  }

  const ownerSchoolId = normalizeRowSchoolId(existing);
  if (
    restrictToSchoolId &&
    ownerSchoolId.toLowerCase() !== restrictToSchoolId.trim().toLowerCase()
  ) {
    throw new AcademicServiceError(
      "Forbidden: Cannot delete a department belonging to another school.",
      403
    );
  }

  // Unlink programmes before deleting so programmes stay intact cleanly
  if (isValidUuid(id)) {
    const { error: unlinkLiveErr } = await (directAdmin as any)
      .from("programmes")
      .update({ department_id: null, updated_at: new Date().toISOString() })
      .eq("department_id", id);
    if (unlinkLiveErr && !isMissingTableError(unlinkLiveErr)) {
      console.warn("Could not unlink programmes on live DB:", unlinkLiveErr);
    }

    const { error: delLiveErr } = await (directAdmin as any)
      .from("departments")
      .delete()
      .eq("id", id);
    if (delLiveErr && !isMissingTableError(delLiveErr)) {
      throw new AcademicServiceError(delLiveErr.message, 400);
    }
  }

  await (virtualAdmin as any)
    .from("programmes")
    .update({ department_id: null, updated_at: new Date().toISOString() })
    .eq("department_id", id);
  await (virtualAdmin as any).from("departments").delete().eq("id", id);

  try {
    await (virtualAdmin as any).from("audit_events").insert({
      action: "DEPARTMENT_DELETED",
      entity_type: "department",
      entity_id: id,
      school_id: ownerSchoolId || restrictToSchoolId || null,
      outcome: "success",
      metadata: { code: existing.code, name: existing.name },
    });
  } catch {}

  return { success: true, deletedId: id };
}

// ============================================================================
// PROGRAMS CRUD
// ============================================================================

export async function listPrograms(schoolIdFilter?: string | null): Promise<{
  programs: ProgramRecord[];
  departments: DepartmentRecord[];
  schools: SchoolSummary[];
  stats: ProgramStats;
  school_type: CanonicalSchoolType | null;
}> {
  const [{ schools, byId: schoolById }, rawProgs, deptResult] = await Promise.all([
    listSchoolsMap(),
    fetchMergedRawPrograms(schoolIdFilter),
    listDepartments(schoolIdFilter),
  ]);

  const deptById = new Map<string, any>();
  for (const d of deptResult.departments) {
    deptById.set(String(d.id), d);
  }

  const programs = rawProgs
    .map((p) => formatProgram(p, deptById, schoolById))
    .sort((a, b) => a.code.localeCompare(b.code));

  const stats: ProgramStats = {
    totalPrograms: programs.length,
    activePrograms: programs.filter((p) => p.is_active).length,
    undergraduateCount: programs.filter((p) =>
      ["undergraduate", "bachelor"].includes(String(p.degree_level).toLowerCase())
    ).length,
    postgraduateCount: programs.filter((p) =>
      ["postgraduate", "master", "doctorate"].includes(String(p.degree_level).toLowerCase())
    ).length,
    diplomaCount: programs.filter((p) =>
      ["diploma", "certificate"].includes(String(p.degree_level).toLowerCase())
    ).length,
  };

  const schoolType = schoolIdFilter
    ? schoolById.get(schoolIdFilter.trim().toLowerCase())?.school_type || "university"
    : null;

  return {
    programs,
    departments: deptResult.departments,
    schools,
    stats,
    school_type: schoolType,
  };
}

export async function createProgram(input: {
  school_id: string;
  code: string;
  name: string;
  department_id?: string | null;
  degree_level?: string;
  duration_years?: number;
  total_credits?: number;
  is_active?: boolean;
}): Promise<ProgramRecord> {
  const schoolId = String(input.school_id || "").trim();
  const cleanCode = String(input.code || "").trim().toUpperCase();
  const cleanName = String(input.name || "").trim();

  if (!schoolId || !cleanCode || !cleanName) {
    throw new AcademicServiceError(
      "School, program code, and program name are required.",
      400
    );
  }

  const { byId: schoolById } = await listSchoolsMap();
  const matchedSchool = schoolById.get(schoolId.toLowerCase());
  if (!matchedSchool) {
    throw new AcademicServiceError("Selected school was not found.", 404);
  }

  const terminology = getSchoolTerminology(matchedSchool.school_type);
  if (!terminology.programs.allowed) {
    throw new AcademicServiceError(
      `Cannot assign a Program to ${matchedSchool.name} because it is a Vocational School. Vocational Schools manage Classes under Departments.`,
      400
    );
  }

  const [schoolProgs, schoolDepts] = await Promise.all([
    fetchMergedRawPrograms(matchedSchool.id),
    fetchMergedRawDepartments(matchedSchool.id),
  ]);

  if (schoolProgs.some((p) => String(p.code || "").toUpperCase() === cleanCode)) {
    throw new AcademicServiceError(
      `Program code "${cleanCode}" already exists in ${matchedSchool.name}.`,
      409
    );
  }

  const deptById = new Map<string, any>();
  for (const d of schoolDepts) deptById.set(String(d.id), d);

  let targetDeptId: string | null = input.department_id?.trim() || null;
  if (!terminology.programs.showDepartmentField) {
    targetDeptId = null;
  } else if (targetDeptId) {
    if (!deptById.has(targetDeptId)) {
      throw new AcademicServiceError(
        "Selected department does not belong to the chosen school.",
        400
      );
    }
  } else if (schoolDepts.length > 0) {
    targetDeptId = String(schoolDepts[0].id);
  }

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();
  const now = new Date().toISOString();
  const durationNum = Math.max(1, Number(input.duration_years) || 4);
  const creditsNum = Math.max(1, Number(input.total_credits) || 120);
  const degreeLevel = input.degree_level || "undergraduate";

  const livePayload = {
    school_id: matchedSchool.id,
    department_id: targetDeptId && isValidUuid(targetDeptId) ? targetDeptId : null,
    code: cleanCode,
    name: cleanName,
    degree_level: degreeLevel,
    duration_years: durationNum,
    total_credits_required: creditsNum,
    total_credits: creditsNum,
    is_active: input.is_active ?? true,
    created_at: now,
    updated_at: now,
  };

  let createdId: string | null = null;
  if (isValidUuid(matchedSchool.id)) {
    const { data: liveRow, error: liveErr } = await (directAdmin as any)
      .from("programmes")
      .insert(livePayload)
      .select("id")
      .single();

    if (liveErr) {
      if (!isMissingTableError(liveErr)) {
        const status = liveErr.code === "23505" ? 409 : 400;
        throw new AcademicServiceError(liveErr.message, status);
      }
    } else if (liveRow?.id) {
      createdId = String(liveRow.id);
    }
  }

  const newId = createdId || crypto.randomUUID();
  const virtualPayload = {
    id: newId,
    school_id: matchedSchool.id,
    university_id: matchedSchool.id,
    department_id: targetDeptId,
    code: cleanCode,
    name: cleanName,
    degree_level: degreeLevel,
    duration_years: durationNum,
    total_credits_required: creditsNum,
    total_credits: creditsNum,
    is_active: livePayload.is_active,
    created_at: now,
    updated_at: now,
  };

  await (virtualAdmin as any)
    .from("programmes")
    .upsert(virtualPayload, { onConflict: "id" });

  try {
    await (virtualAdmin as any).from("audit_events").insert({
      action: "PROGRAM_CREATED",
      entity_type: "programme",
      entity_id: newId,
      school_id: matchedSchool.id,
      outcome: "success",
      metadata: { code: cleanCode, name: cleanName, school_id: matchedSchool.id },
    });
  } catch {}

  return formatProgram(virtualPayload, deptById, schoolById);
}

export async function updateProgram(
  id: string,
  input: {
    school_id?: string;
    code?: string;
    name?: string;
    department_id?: string | null;
    degree_level?: string;
    duration_years?: number;
    total_credits?: number;
    is_active?: boolean;
  },
  restrictToSchoolId?: string | null
): Promise<ProgramRecord> {
  if (!id) {
    throw new AcademicServiceError("Program ID is required for update.", 400);
  }

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();

  const [allProgs, { byId: schoolById }] = await Promise.all([
    fetchMergedRawPrograms(null),
    listSchoolsMap(),
  ]);

  const existing = allProgs.find((p) => String(p.id) === String(id));
  if (!existing) {
    throw new AcademicServiceError("Program not found.", 404);
  }

  const currentSchoolId = normalizeRowSchoolId(existing);
  if (
    restrictToSchoolId &&
    currentSchoolId.toLowerCase() !== restrictToSchoolId.trim().toLowerCase()
  ) {
    throw new AcademicServiceError(
      "Forbidden: Cannot modify a program belonging to another school.",
      403
    );
  }

  const targetSchoolId = input.school_id?.trim() || currentSchoolId;
  const targetSchool = schoolById.get(targetSchoolId.toLowerCase());
  if (!targetSchool) {
    throw new AcademicServiceError("Assigned school was not found.", 404);
  }

  if (
    restrictToSchoolId &&
    targetSchool.id.toLowerCase() !== restrictToSchoolId.trim().toLowerCase()
  ) {
    throw new AcademicServiceError(
      "Forbidden: School Admins cannot reassign a program to another school.",
      403
    );
  }

  const terminology = getSchoolTerminology(targetSchool.school_type);
  if (!terminology.programs.allowed) {
    throw new AcademicServiceError(
      `Cannot assign a Program to ${targetSchool.name} because it is a Vocational School. Vocational Schools manage Classes under Departments.`,
      400
    );
  }

  const nextCode =
    input.code !== undefined
      ? String(input.code).trim().toUpperCase()
      : String(existing.code || "").toUpperCase();
  const nextName =
    input.name !== undefined ? String(input.name).trim() : String(existing.name || "");

  if (!nextCode || !nextName) {
    throw new AcademicServiceError("Program code and program name are required.", 400);
  }

  const [targetSchoolProgs, targetSchoolDepts] = await Promise.all([
    fetchMergedRawPrograms(targetSchool.id),
    fetchMergedRawDepartments(targetSchool.id),
  ]);

  const conflict = targetSchoolProgs.find(
    (p) =>
      String(p.id) !== String(id) &&
      String(p.code || "").toUpperCase() === nextCode
  );
  if (conflict) {
    throw new AcademicServiceError(
      `Program code "${nextCode}" already exists in ${targetSchool.name}.`,
      409
    );
  }

  const deptById = new Map<string, any>();
  for (const d of targetSchoolDepts) deptById.set(String(d.id), d);

  let nextDeptId: string | null = !terminology.programs.showDepartmentField
    ? null
    : input.department_id !== undefined
    ? input.department_id?.trim() || null
    : existing.department_id
    ? String(existing.department_id)
    : null;

  if (nextDeptId && !deptById.has(nextDeptId)) {
    if (
      input.department_id === undefined &&
      currentSchoolId.toLowerCase() !== targetSchool.id.toLowerCase()
    ) {
      // School was reassigned without selecting a new department in that school
      nextDeptId = null;
    } else {
      throw new AcademicServiceError(
        "Selected department does not belong to the assigned school.",
        400
      );
    }
  }

  const creditsNum =
    input.total_credits !== undefined
      ? Math.max(1, Number(input.total_credits))
      : Number(existing.total_credits_required || existing.total_credits) || 120;
  const durationNum =
    input.duration_years !== undefined
      ? Math.max(1, Number(input.duration_years))
      : Number(existing.duration_years) || 4;
  const now = new Date().toISOString();

  const updates = {
    school_id: targetSchool.id,
    department_id: nextDeptId,
    code: nextCode,
    name: nextName,
    degree_level: input.degree_level ?? existing.degree_level ?? "undergraduate",
    duration_years: durationNum,
    total_credits_required: creditsNum,
    total_credits: creditsNum,
    is_active:
      input.is_active !== undefined ? Boolean(input.is_active) : existing.is_active ?? true,
    updated_at: now,
  };

  if (isValidUuid(targetSchool.id) && isValidUuid(id)) {
    const { error: liveErr } = await (directAdmin as any)
      .from("programmes")
      .upsert(
        {
          id,
          ...updates,
          department_id: nextDeptId && isValidUuid(nextDeptId) ? nextDeptId : null,
        },
        { onConflict: "id" }
      );

    if (liveErr && !isMissingTableError(liveErr)) {
      const status = liveErr.code === "23505" ? 409 : 400;
      throw new AcademicServiceError(liveErr.message, status);
    }
  }

  await (virtualAdmin as any)
    .from("programmes")
    .upsert(
      {
        ...existing,
        ...updates,
        id,
        university_id: targetSchool.id,
      },
      { onConflict: "id" }
    );

  try {
    await (virtualAdmin as any).from("audit_events").insert({
      action: "PROGRAM_UPDATED",
      entity_type: "programme",
      entity_id: id,
      school_id: targetSchool.id,
      outcome: "success",
      metadata: { code: nextCode, name: nextName, school_id: targetSchool.id },
    });
  } catch {}

  return formatProgram({ ...existing, ...updates, id }, deptById, schoolById);
}

export async function deleteProgram(
  id: string,
  restrictToSchoolId?: string | null
): Promise<{ success: boolean; message: string }> {
  if (!id) {
    throw new AcademicServiceError("Program ID is required.", 400);
  }

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();
  const allProgs = await fetchMergedRawPrograms(null);
  const existing = allProgs.find((p) => String(p.id) === String(id));

  if (!existing) {
    throw new AcademicServiceError("Program not found.", 404);
  }

  const ownerSchoolId = normalizeRowSchoolId(existing);
  if (
    restrictToSchoolId &&
    ownerSchoolId.toLowerCase() !== restrictToSchoolId.trim().toLowerCase()
  ) {
    throw new AcademicServiceError(
      "Forbidden: Cannot delete a program belonging to another school.",
      403
    );
  }

  try {
    await (virtualAdmin as any).from("programme_versions").delete().eq("programme_id", id);
  } catch {}
  try {
    await (virtualAdmin as any).from("application_programmes").delete().eq("programme_id", id);
  } catch {}

  if (isValidUuid(id)) {
    for (const childTbl of ["programme_versions", "application_programmes"]) {
      try {
        await (directAdmin as any).from(childTbl).delete().eq("programme_id", id);
      } catch {}
    }
    const { error: delLiveErr } = await (directAdmin as any)
      .from("programmes")
      .delete()
      .eq("id", id);
    if (delLiveErr && !isMissingTableError(delLiveErr)) {
      throw new AcademicServiceError(delLiveErr.message, 400);
    }
  }

  await (virtualAdmin as any).from("programmes").delete().eq("id", id);

  try {
    await (virtualAdmin as any).from("audit_events").insert({
      action: "PROGRAM_DELETED",
      entity_type: "programme",
      entity_id: id,
      school_id: ownerSchoolId || restrictToSchoolId || null,
      outcome: "success",
      metadata: { programme_id: id, code: existing.code },
    });
  } catch {}

  return { success: true, message: "Program successfully removed." };
}
