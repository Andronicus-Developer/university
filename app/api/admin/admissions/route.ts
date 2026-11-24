import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
} from "@/lib/admin/tenant-provisioning";

function splitCandidateName(fullName: string) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "Applicant", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "-" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const db = createDirectAdminClient() as any;
    const schoolId = tenant.schoolId;

    let appsQuery = db
      .from("admissions_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (schoolId) appsQuery = appsQuery.eq("school_id", schoolId);

    let progsQuery = db
      .from("programmes")
      .select("id, name, code, degree_level")
      .order("name", { ascending: true });
    if (schoolId) progsQuery = progsQuery.eq("school_id", schoolId);

    let deptsQuery = db
      .from("departments")
      .select("id, name, code")
      .order("name", { ascending: true });
    if (schoolId) deptsQuery = deptsQuery.eq("school_id", schoolId);

    const [appsRes, progsRes, deptsRes] = await Promise.all([
      appsQuery,
      progsQuery,
      deptsQuery,
    ]);

    if (appsRes.error) {
      return NextResponse.json({
        applications: [],
        programmes: progsRes.data || [],
        stats: { totalApplications: 0, approved: 0, underReview: 0, enrolled: 0 },
      });
    }

    const progMap = new Map<string, any>(
      (progsRes.data || []).map((p: any) => [String(p.id), p])
    );
    const deptMap = new Map<string, any>(
      (deptsRes.data || []).map((d: any) => [String(d.id), d])
    );

    const applications = (appsRes.data || []).map((a: any) => {
      const prog = a.programme_id ? progMap.get(String(a.programme_id)) : null;
      const dept = a.department_id ? deptMap.get(String(a.department_id)) : null;
      const unit = prog || dept;
      return {
        id: a.id,
        application_number: a.application_number,
        status: a.status || "submitted",
        candidate_name: `${a.first_name || ""} ${a.last_name || ""}`.trim(),
        candidate_email: a.email || "",
        candidate_phone: a.phone || "",
        programme_id: a.programme_id || a.department_id || null,
        programme_name: unit?.name || "General Studies",
        programme_code: unit?.code || "GEN",
        notes: a.notes || "",
        submitted_at: a.created_at,
        created_at: a.created_at,
      };
    });

    return NextResponse.json({
      applications,
      programmes: progsRes.data || [],
      stats: {
        totalApplications: applications.length,
        approved: applications.filter((a: any) => a.status === "approved").length,
        underReview: applications.filter((a: any) =>
          ["submitted", "under_review"].includes(a.status)
        ).length,
        enrolled: applications.filter((a: any) =>
          ["enrolled", "converted_to_student"].includes(a.status)
        ).length,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/admissions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const {
      candidate_name,
      candidate_email,
      candidate_phone,
      programme_id,
      application_number,
      status,
      notes,
    } = body;

    if (!candidate_name?.trim() || !candidate_email?.trim()) {
      return NextResponse.json(
        { error: "Candidate name and email are required." },
        { status: 400 }
      );
    }

    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;
    const schoolId = targetSchool.schoolId;

    const db = createDirectAdminClient() as any;
    const { first_name, last_name } = splitCandidateName(candidate_name);

    let resolvedProgrammeId: string | null = null;
    let resolvedDepartmentId: string | null = null;
    if (programme_id) {
      const { data: progMatch } = await db
        .from("programmes")
        .select("id")
        .eq("id", programme_id)
        .eq("school_id", schoolId)
        .maybeSingle();
      if (progMatch) {
        resolvedProgrammeId = progMatch.id;
      } else {
        const { data: deptMatch } = await db
          .from("departments")
          .select("id")
          .eq("id", programme_id)
          .eq("school_id", schoolId)
          .maybeSingle();
        if (deptMatch) resolvedDepartmentId = deptMatch.id;
      }
    }

    const appNumber =
      application_number?.trim() ||
      `ADM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data, error } = await db
      .from("admissions_applications")
      .insert({
        school_id: schoolId,
        application_number: appNumber,
        first_name,
        last_name,
        email: candidate_email.trim().toLowerCase(),
        phone: candidate_phone ? String(candidate_phone).trim() : null,
        programme_id: resolvedProgrammeId,
        department_id: resolvedDepartmentId,
        status: status || "submitted",
        notes: notes ? String(notes).trim() : null,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ application: data, success: true });
  } catch (err: any) {
    console.error("POST /api/admin/admissions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, candidate_name, candidate_email, candidate_phone, status, notes } = body;
    if (!id) {
      return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
    }

    const db = createDirectAdminClient() as any;
    const { first_name, last_name } = splitCandidateName(candidate_name);

    let q = db
      .from("admissions_applications")
      .update({
        first_name,
        last_name,
        email: candidate_email ? String(candidate_email).trim().toLowerCase() : null,
        phone: candidate_phone ? String(candidate_phone).trim() : null,
        status: status || "submitted",
        notes: notes ? String(notes).trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (tenant.schoolId) q = q.eq("school_id", tenant.schoolId);

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT /api/admin/admissions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
    }

    const db = createDirectAdminClient() as any;
    let q = db.from("admissions_applications").delete().eq("id", id);
    if (tenant.schoolId) q = q.eq("school_id", tenant.schoolId);

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/admissions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
