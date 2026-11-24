import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
} from "@/lib/admin/tenant-provisioning";
import {
  backfillSchoolStudentsAndParents,
  upsertParentGuardianForStudent,
} from "@/lib/admin/parent-guardian-sync";

const ALLOWED_RESOURCES = new Set<string>([
  "academic_years",
  "terms",
  "courses",
  "course_enrolments",
  "exam_grades",
  "hostels",
  "hostel_allocations",
  "fee_structures",
  "invoices",
  "payments",
  "subjects",
  "timetable_entries",
  "attendance_sessions",
  "attendance_records",
  "student_conduct_records",
  "parent_guardians",
  "report_card_scores",
  "vocational_modules",
  "vocational_intakes",
  "competency_assessments",
  "industrial_attachments",
  "workshop_inventory",
  "trade_certifications",
]);

const ORDER_COLUMN: Record<string, { col: string; ascending: boolean }> = {
  academic_years: { col: "start_date", ascending: false },
  terms: { col: "term_number", ascending: true },
  courses: { col: "code", ascending: true },
  subjects: { col: "code", ascending: true },
  hostels: { col: "name", ascending: true },
  fee_structures: { col: "code", ascending: true },
  vocational_modules: { col: "code", ascending: true },
  vocational_intakes: { col: "start_date", ascending: false },
  workshop_inventory: { col: "item_code", ascending: true },
  timetable_entries: { col: "start_time", ascending: true },
  attendance_sessions: { col: "session_date", ascending: false },
  attendance_records: { col: "recorded_at", ascending: false },
  competency_assessments: { col: "assessment_date", ascending: false },
  trade_certifications: { col: "issue_date", ascending: false },
  student_conduct_records: { col: "incident_date", ascending: false },
};

const NUMERIC_FIELDS = new Set([
  "credits",
  "contact_hours",
  "semester_number",
  "term_number",
  "total_rooms",
  "total_beds",
  "amount",
  "total_amount",
  "paid_amount",
  "balance",
  "ca_score",
  "exam_score",
  "total_score",
  "grade_point",
  "weekly_periods",
  "pass_mark",
  "practical_hours",
  "theory_hours",
  "credit_units",
  "capacity",
  "practical_score",
  "quantity",
  "min_stock_threshold",
  "unit_cost",
]);

const BOOLEAN_FIELDS = new Set([
  "is_active",
  "is_current",
  "is_mandatory",
  "is_primary_contact",
]);

const NULLABLE_SUFFIXES = ["_id", "_date"];

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

function sanitizePayload(
  raw: Record<string, any>,
  allowedExclude: Set<string> = new Set()
): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (
      k === "id" ||
      k === "school_id" ||
      k === "created_at" ||
      k === "updated_at" ||
      allowedExclude.has(k)
    ) {
      continue;
    }

    if (BOOLEAN_FIELDS.has(k)) {
      out[k] = v === true || v === "true";
      continue;
    }

    if (NUMERIC_FIELDS.has(k)) {
      if (v === "" || v === null || v === undefined) {
        out[k] = 0;
      } else {
        const num = Number(v);
        out[k] = Number.isFinite(num) ? num : 0;
      }
      continue;
    }

    if (v === undefined) continue;

    if (typeof v === "string") {
      const trimmed = v.trim();
      if (
        trimmed === "" &&
        NULLABLE_SUFFIXES.some((sfx) => k.endsWith(sfx))
      ) {
        out[k] = null;
      } else {
        out[k] = trimmed;
      }
      continue;
    }

    out[k] = v;
  }
  return out;
}

function computeUniversityGrade(totalScore: number): {
  letter: string;
  point: number;
} {
  if (totalScore >= 80) return { letter: "A", point: 4.0 };
  if (totalScore >= 75) return { letter: "B+", point: 3.5 };
  if (totalScore >= 70) return { letter: "B", point: 3.0 };
  if (totalScore >= 65) return { letter: "C+", point: 2.5 };
  if (totalScore >= 60) return { letter: "C", point: 2.0 };
  if (totalScore >= 50) return { letter: "D", point: 1.0 };
  return { letter: "F", point: 0.0 };
}

function computeHighSchoolGrade(totalScore: number): string {
  if (totalScore >= 80) return "A1";
  if (totalScore >= 75) return "B2";
  if (totalScore >= 70) return "B3";
  if (totalScore >= 65) return "C4";
  if (totalScore >= 60) return "C5";
  if (totalScore >= 55) return "C6";
  if (totalScore >= 50) return "D7";
  if (totalScore >= 45) return "E8";
  return "F9";
}

function enrichResourceRecord(
  resource: string,
  payload: Record<string, any>
): Record<string, any> {
  const next = { ...payload };

  if (resource === "courses" && typeof next.code === "string") {
    next.code = next.code.toUpperCase();
  }
  if (resource === "subjects" && typeof next.code === "string") {
    next.code = next.code.toUpperCase();
  }
  if (resource === "vocational_modules" && typeof next.code === "string") {
    next.code = next.code.toUpperCase();
  }
  if (resource === "vocational_intakes" && typeof next.code === "string") {
    next.code = next.code.toUpperCase();
  }
  if (resource === "workshop_inventory" && typeof next.item_code === "string") {
    next.item_code = next.item_code.toUpperCase();
  }
  if (resource === "trade_certifications" && typeof next.certificate_number === "string") {
    next.certificate_number = next.certificate_number.toUpperCase();
  }

  if (resource === "exam_grades") {
    const ca = Math.min(100, Math.max(0, Number(next.ca_score || 0)));
    const exam = Math.min(100, Math.max(0, Number(next.exam_score || 0)));
    const total = Number(Math.min(100, ca + exam).toFixed(2));
    const { letter, point } = computeUniversityGrade(total);
    next.ca_score = ca;
    next.exam_score = exam;
    next.total_score = total;
    next.grade_letter = letter;
    next.grade_point = point;
  }

  if (resource === "report_card_scores") {
    const ca = Math.min(100, Math.max(0, Number(next.ca_score || 0)));
    const exam = Math.min(100, Math.max(0, Number(next.exam_score || 0)));
    const total = Number(Math.min(100, ca + exam).toFixed(2));
    next.ca_score = ca;
    next.exam_score = exam;
    next.total_score = total;
    next.grade = computeHighSchoolGrade(total);
  }

  if (resource === "invoices") {
    const total = Math.max(0, Number(next.total_amount || 0));
    const paid = Math.max(0, Math.min(total, Number(next.paid_amount || 0)));
    const balance = Number(Math.max(0, total - paid).toFixed(2));
    next.total_amount = total;
    next.paid_amount = paid;
    next.balance = balance;
    if (!next.invoice_number) {
      next.invoice_number = `INV-${Date.now().toString().slice(-6)}`;
    }
    if (!next.status) {
      next.status = balance <= 0 && total > 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
    }
  }

  if (resource === "payments") {
    next.amount = Math.max(0, Number(next.amount || 0));
    if (!next.currency) next.currency = "USD";
    if (!next.provider) next.provider = "cash";
    if (!next.payment_method) next.payment_method = "manual";
    if (!next.status) next.status = "completed";
    if (next.status === "completed" && !next.verified_at) {
      next.verified_at = new Date().toISOString();
    }
  }

  return next;
}

async function safeSelectBySchool(
  directAdmin: ReturnType<typeof createDirectAdminClient>,
  table: string,
  schoolId: string,
  selectCols = "*"
): Promise<any[]> {
  try {
    const { data, error } = await (directAdmin as any)
      .from(table)
      .select(selectCols)
      .eq("school_id", schoolId);
    if (error) {
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function loadLookups(
  directAdmin: ReturnType<typeof createDirectAdminClient>,
  schoolId: string
) {
  const [
    studentsRaw,
    departments,
    programmes,
    staffProfiles,
    profiles,
    academicYears,
    terms,
    courses,
    subjects,
    vocationalModules,
    vocationalIntakes,
    hostels,
    invoices,
    attendanceSessions,
  ] = await Promise.all([
    safeSelectBySchool(directAdmin, "students", schoolId),
    safeSelectBySchool(directAdmin, "departments", schoolId, "id, name, code"),
    safeSelectBySchool(directAdmin, "programmes", schoolId, "id, name, code, degree_level"),
    safeSelectBySchool(
      directAdmin,
      "staff_profiles",
      schoolId,
      "id, user_id, staff_number, first_name, last_name, designation, department, email"
    ),
    safeSelectBySchool(directAdmin, "profiles", schoolId, "id, full_name, email, role"),
    safeSelectBySchool(directAdmin, "academic_years", schoolId, "id, name, code, is_current"),
    safeSelectBySchool(directAdmin, "terms", schoolId, "id, name, code, term_number, is_current, academic_year_id"),
    safeSelectBySchool(directAdmin, "courses", schoolId, "id, code, name, credits, department_id"),
    safeSelectBySchool(directAdmin, "subjects", schoolId, "id, code, name, programme_id"),
    safeSelectBySchool(directAdmin, "vocational_modules", schoolId, "id, code, name, department_id"),
    safeSelectBySchool(directAdmin, "vocational_intakes", schoolId, "id, code, name, department_id"),
    safeSelectBySchool(directAdmin, "hostels", schoolId, "id, code, name, total_beds"),
    safeSelectBySchool(directAdmin, "invoices", schoolId, "id, invoice_number, student_id, total_amount, paid_amount, balance, status"),
    safeSelectBySchool(directAdmin, "attendance_sessions", schoolId, "id, session_date, session_type, status"),
  ]);

  const profileMap = new Map<string, any>();
  for (const p of profiles) {
    profileMap.set(String(p.id), p);
  }

  const students = studentsRaw.map((s: any) => {
    const prof = s.profile_id ? profileMap.get(String(s.profile_id)) : null;
    const fullName =
      `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
      prof?.full_name ||
      s.email ||
      s.student_number ||
      "Student";
    return {
      ...s,
      full_name: fullName,
      display_label: `${fullName} (${s.student_number || s.id.slice(0, 6)})`,
    };
  });

  const staff = staffProfiles.map((sp: any) => {
    const fullName = `${sp.first_name || ""} ${sp.last_name || ""}`.trim() || sp.email || "Staff";
    return {
      ...sp,
      full_name: fullName,
      display_label: `${fullName}${sp.designation ? ` — ${sp.designation}` : ""}`,
    };
  });

  return {
    students,
    departments,
    programmes,
    staff,
    academic_years: academicYears,
    terms,
    courses,
    subjects,
    vocational_modules: vocationalModules,
    vocational_intakes: vocationalIntakes,
    hostels,
    invoices,
    attendance_sessions: attendanceSessions,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await context.params;
    if (!ALLOWED_RESOURCES.has(resource)) {
      return NextResponse.json(
        { error: `Unsupported portal resource: ${resource}` },
        { status: 400 }
      );
    }

    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const requestedSchoolId = req.nextUrl.searchParams.get("school_id") || null;
    const schoolId =
      tenant.schoolId || (tenant.isSuperAdmin ? requestedSchoolId : null);

    if (!schoolId) {
      return NextResponse.json(
        { error: "School tenant context is required." },
        { status: 403 }
      );
    }

    const directAdmin = createDirectAdminClient();
    const orderSpec = ORDER_COLUMN[resource] || {
      col: "created_at",
      ascending: false,
    };

    const { data, error } = await (directAdmin as any)
      .from(resource)
      .select("*")
      .eq("school_id", schoolId)
      .order(orderSpec.col, { ascending: orderSpec.ascending });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error: `Live table "public.${resource}" is not created yet. Apply Supabase migration 20261124000003_school_type_specialized_tables.sql to enable live persistence.`,
            migration_required: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: error.message || `Failed to load ${resource}.` },
        { status: 500 }
      );
    }

    let records = Array.isArray(data) ? data : [];

    // Enrich parent_guardians with all sibling links from parent_guardian_students join table
    if (resource === "parent_guardians" && records.length > 0) {
      const linksByParent = new Map<string, Set<string>>();
      try {
        const { data: joinRows, error: joinErr } = await (directAdmin as any)
          .from("parent_guardian_students")
          .select("parent_guardian_id, student_id")
          .eq("school_id", schoolId);
        if (!joinErr && Array.isArray(joinRows)) {
          for (const jr of joinRows) {
            if (!jr?.parent_guardian_id || !jr?.student_id) continue;
            const key = String(jr.parent_guardian_id);
            if (!linksByParent.has(key)) linksByParent.set(key, new Set());
            linksByParent.get(key)!.add(String(jr.student_id));
          }
        }
      } catch {
        // Join table optional prior to migration 20261124000007
      }

      records = records.map((pg: any) => {
        const linked = new Set<string>(linksByParent.get(String(pg.id)) || []);
        if (pg.student_id) linked.add(String(pg.student_id));
        return {
          ...pg,
          linked_student_ids: Array.from(linked),
        };
      });
    }

    const includeLookups =
      req.nextUrl.searchParams.get("include") === "lookups";
    const lookups = includeLookups
      ? await loadLookups(directAdmin, schoolId)
      : undefined;

    return NextResponse.json(
      {
        resource,
        school_id: schoolId,
        records,
        ...(lookups ? { lookups } : {}),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("GET /api/admin/portal-data/[resource] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load portal records." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await context.params;
    if (!ALLOWED_RESOURCES.has(resource)) {
      return NextResponse.json(
        { error: `Unsupported portal resource: ${resource}` },
        { status: 400 }
      );
    }

    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const targetSchool = await resolveTargetSchoolForMutation(
      tenant,
      body.school_id
    );
    if (targetSchool.errorResponse) return targetSchool.errorResponse;

    const directAdmin = createDirectAdminClient();

    // Support manual one-click backfill on Parents page
    if (resource === "parent_guardians" && body.action === "sync_from_students") {
      const synced = await backfillSchoolStudentsAndParents({
        directAdmin,
        virtualAdmin: createAdminClient(),
        schoolId: targetSchool.schoolId,
        schoolName: targetSchool.schoolName,
        schoolCode: targetSchool.schoolCode,
      });
      return NextResponse.json({ synced });
    }

    // Extract special action-only fields before DB insert
    const invoiceIdToSettle = body.invoice_id ? String(body.invoice_id).trim() : null;
    const createAccount = Boolean(body.create_account);
    const parentPassword = body.password ? String(body.password).trim() : "";

    const cleaned = sanitizePayload(
      body,
      new Set(["invoice_id", "create_account", "password", "action"])
    );
    const insertPayload = enrichResourceRecord(resource, cleaned);
    insertPayload.school_id = targetSchool.schoolId;

    // Route manual parent creation through sibling-aware upsert helper
    if (resource === "parent_guardians") {
      if (!String(insertPayload.full_name || "").trim()) {
        return NextResponse.json(
          { error: "Parent / Guardian full name is required." },
          { status: 400 }
        );
      }
      if (parentPassword && parentPassword.length < 6) {
        return NextResponse.json(
          { error: "Initial portal password must be at least 6 characters long." },
          { status: 400 }
        );
      }
      if (createAccount && !String(insertPayload.email || "").trim()) {
        return NextResponse.json(
          { error: "An email address is required to create a Parent Portal login." },
          { status: 400 }
        );
      }

      let liveStudentExists = false;
      if (insertPayload.student_id) {
        const { data: matchedStudent } = await (directAdmin as any)
          .from("students")
          .select("id")
          .eq("id", insertPayload.student_id)
          .eq("school_id", targetSchool.schoolId)
          .maybeSingle();
        liveStudentExists = Boolean(matchedStudent?.id);
      }

      const pgRes = await upsertParentGuardianForStudent({
        directAdmin,
        virtualAdmin: createAdminClient(),
        schoolId: targetSchool.schoolId,
        schoolName: targetSchool.schoolName,
        schoolCode: targetSchool.schoolCode,
        studentId: insertPayload.student_id || null,
        liveStudentExists,
        fullName: String(insertPayload.full_name || ""),
        relationship: insertPayload.relationship || "Parent",
        phone: insertPayload.phone || "",
        email: insertPayload.email || "",
        occupation: insertPayload.occupation || null,
        address: insertPayload.address || null,
        isPrimaryContact: insertPayload.is_primary_contact ?? true,
        status: insertPayload.status || "active",
        createPortalAccount: Boolean(createAccount && insertPayload.email),
        parentPassword,
      });

      if (!pgRes.record) {
        return NextResponse.json(
          { error: pgRes.warning || "Failed to create Parent / Guardian record." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          record: pgRes.record,
          linked_existing_parent: pgRes.linkedExistingParent,
          warning: pgRes.warning,
        },
        { status: 201 }
      );
    }

    let { data, error } = await (directAdmin as any)
      .from(resource)
      .insert(insertPayload)
      .select("*")
      .single();

    if (
      error &&
      (String(error.code || "") === "42703" ||
        String(error.code || "") === "PGRST204" ||
        String(error.message || "").toLowerCase().includes("column"))
    ) {
      const fallbackPayload = { ...insertPayload };
      delete fallbackPayload.term_id;
      delete fallbackPayload.metadata;
      const retry = await (directAdmin as any)
        .from(resource)
        .insert(fallbackPayload)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error: `Live table "public.${resource}" is missing. Apply Supabase migration 20261124000003_school_type_specialized_tables.sql first.`,
            migration_required: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: error.message || `Failed to create ${resource} record.` },
        { status: 400 }
      );
    }

    // Automatically apply completed payment toward a matching student invoice
    if (
      resource === "payments" &&
      String(insertPayload.status || "").toLowerCase() === "completed" &&
      Number(insertPayload.amount || 0) > 0
    ) {
      try {
        let targetInv: any = null;
        if (invoiceIdToSettle) {
          const { data: invById } = await (directAdmin as any)
            .from("invoices")
            .select("*")
            .eq("id", invoiceIdToSettle)
            .eq("school_id", targetSchool.schoolId)
            .maybeSingle();
          targetInv = invById;
        } else if (insertPayload.student_id) {
          const { data: invByStudent } = await (directAdmin as any)
            .from("invoices")
            .select("*")
            .eq("student_id", insertPayload.student_id)
            .eq("school_id", targetSchool.schoolId)
            .gt("balance", 0)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          targetInv = invByStudent;
        }

        if (targetInv) {
          const newPaid =
            Number(targetInv.paid_amount || 0) + Number(insertPayload.amount || 0);
          const total = Number(targetInv.total_amount || 0);
          const newBalance = Math.max(0, Number((total - newPaid).toFixed(2)));
          const newStatus =
            newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";

          await (directAdmin as any)
            .from("invoices")
            .update({
              paid_amount: newPaid,
              balance: newBalance,
              status: newStatus,
            })
            .eq("id", targetInv.id)
            .eq("school_id", targetSchool.schoolId);
        }
      } catch (settleErr) {
        console.warn("Could not apply payment to invoice:", settleErr);
      }
    }

    return NextResponse.json({ record: data }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/portal-data/[resource] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create portal record." },
      { status: err?.statusCode || 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await context.params;
    if (!ALLOWED_RESOURCES.has(resource)) {
      return NextResponse.json(
        { error: `Unsupported portal resource: ${resource}` },
        { status: 400 }
      );
    }

    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required for updating." },
        { status: 400 }
      );
    }

    const directAdmin = createDirectAdminClient();

    // Fetch existing row to enforce strict school ownership
    const { data: existing, error: findErr } = await (directAdmin as any)
      .from(resource)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (findErr) {
      if (isMissingTableError(findErr)) {
        return NextResponse.json(
          {
            error: `Live table "public.${resource}" is missing. Apply Supabase migration 20261124000003_school_type_specialized_tables.sql first.`,
            migration_required: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    if (
      !tenant.isSuperAdmin &&
      tenant.schoolId &&
      String(existing.school_id).toLowerCase() !== tenant.schoolId.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot update a record belonging to another school." },
        { status: 403 }
      );
    }

    const cleaned = sanitizePayload(
      body,
      new Set(["invoice_id", "create_account", "password"])
    );
    const mergedForCompute = enrichResourceRecord(resource, {
      ...existing,
      ...cleaned,
    });
    delete mergedForCompute.id;
    delete mergedForCompute.school_id;
    delete mergedForCompute.created_at;
    if ("updated_at" in existing) {
      mergedForCompute.updated_at = new Date().toISOString();
    } else {
      delete mergedForCompute.updated_at;
    }

    if (resource === "parent_guardians") {
      mergedForCompute.phone = String(mergedForCompute.phone || "").trim();
      delete mergedForCompute.linked_student_ids;
    }

    let { data: updated, error: updateErr } = await (directAdmin as any)
      .from(resource)
      .update(mergedForCompute)
      .eq("id", id)
      .eq("school_id", existing.school_id)
      .select("*")
      .single();

    if (
      updateErr &&
      (String(updateErr.code || "") === "42703" ||
        String(updateErr.code || "") === "PGRST204" ||
        String(updateErr.message || "").toLowerCase().includes("column"))
    ) {
      const fallbackUpdate = { ...mergedForCompute };
      delete fallbackUpdate.term_id;
      delete fallbackUpdate.metadata;
      const retryUpd = await (directAdmin as any)
        .from(resource)
        .update(fallbackUpdate)
        .eq("id", id)
        .eq("school_id", existing.school_id)
        .select("*")
        .single();
      updated = retryUpd.data;
      updateErr = retryUpd.error;
    }

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message || `Failed to update ${resource}.` },
        { status: 400 }
      );
    }

    if (resource === "parent_guardians" && updated?.id && updated?.student_id) {
      try {
        await (directAdmin as any)
          .from("parent_guardian_students")
          .upsert(
            {
              school_id: existing.school_id,
              parent_guardian_id: updated.id,
              student_id: updated.student_id,
              relationship: updated.relationship || "Parent",
              is_primary_contact: Boolean(updated.is_primary_contact ?? true),
            },
            { onConflict: "school_id,parent_guardian_id,student_id" }
          );
      } catch {}
    }

    return NextResponse.json({ record: updated });
  } catch (err: any) {
    console.error("PUT /api/admin/portal-data/[resource] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update portal record." },
      { status: err?.statusCode || 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await context.params;
    if (!ALLOWED_RESOURCES.has(resource)) {
      return NextResponse.json(
        { error: `Unsupported portal resource: ${resource}` },
        { status: 400 }
      );
    }

    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required for deletion." },
        { status: 400 }
      );
    }

    const directAdmin = createDirectAdminClient();

    const { data: existing, error: findErr } = await (directAdmin as any)
      .from(resource)
      .select("id, school_id")
      .eq("id", id)
      .maybeSingle();

    if (findErr) {
      if (isMissingTableError(findErr)) {
        return NextResponse.json(
          {
            error: `Live table "public.${resource}" is missing. Apply Supabase migration 20261124000003_school_type_specialized_tables.sql first.`,
            migration_required: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    if (
      !tenant.isSuperAdmin &&
      tenant.schoolId &&
      String(existing.school_id).toLowerCase() !== tenant.schoolId.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot delete a record belonging to another school." },
        { status: 403 }
      );
    }

    const { error: delErr } = await (directAdmin as any)
      .from(resource)
      .delete()
      .eq("id", id)
      .eq("school_id", existing.school_id);

    if (delErr) {
      return NextResponse.json(
        { error: delErr.message || `Failed to delete ${resource}.` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error("DELETE /api/admin/portal-data/[resource] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete portal record." },
      { status: err?.statusCode || 500 }
    );
  }
}
