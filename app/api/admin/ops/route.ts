import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
} from "@/lib/admin/tenant-provisioning";

function isMissingTableErr(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || "").trim();
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const resource = req.nextUrl.searchParams.get("resource") || "notices";
    const schoolId = tenant.schoolId;
    const db = createDirectAdminClient() as any;

    if (resource === "notices") {
      let q = db
        .from("school_events")
        .select("*")
        .order("start_date", { ascending: false });
      if (schoolId) q = q.eq("school_id", schoolId);
      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ notices: data || [] });
    }

    if (resource === "leave") {
      let lq = db
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });
      let sq = db
        .from("staff_profiles")
        .select("id, first_name, last_name, designation")
        .order("first_name", { ascending: true });
      if (schoolId) {
        lq = lq.eq("school_id", schoolId);
        sq = sq.eq("school_id", schoolId);
      }
      const [leaveRes, staffRes] = await Promise.all([lq, sq]);
      const missingTables = isMissingTableErr(leaveRes.error) ? ["leave_requests"] : [];
      return NextResponse.json({
        leaves: leaveRes.data || [],
        staffList: (staffRes.data || []).map((s: any) => ({
          id: s.id,
          full_name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Staff",
          designation: s.designation || "",
        })),
        missingTables,
      });
    }

    if (resource === "library") {
      let q = db
        .from("library_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (schoolId) q = q.eq("school_id", schoolId);
      const { data, error } = await q;
      const missingTables = isMissingTableErr(error) ? ["library_items"] : [];
      return NextResponse.json({ items: data || [], missingTables });
    }

    if (resource === "audit") {
      let q = db
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (schoolId) q = q.eq("school_id", schoolId);
      const { data, error } = await q;
      const missingTables = isMissingTableErr(error) ? ["audit_logs"] : [];
      return NextResponse.json({ logs: data || [], missingTables });
    }

    if (resource === "reports") {
      let rq = db
        .from("institutional_reports")
        .select("*")
        .order("created_at", { ascending: false });
      let stq = db.from("students").select("id, status");
      let sfq = db.from("staff_profiles").select("id");
      let inq = db.from("invoices").select("total_amount, paid_amount, balance");
      if (schoolId) {
        rq = rq.eq("school_id", schoolId);
        stq = stq.eq("school_id", schoolId);
        sfq = sfq.eq("school_id", schoolId);
        inq = inq.eq("school_id", schoolId);
      }
      const [repRes, stRes, sfRes, invRes] = await Promise.all([rq, stq, sfq, inq]);
      const missingTables = isMissingTableErr(repRes.error) ? ["institutional_reports"] : [];
      const students = stRes.data || [];
      const invoices = invRes.data || [];
      return NextResponse.json({
        reports: repRes.data || [],
        liveStats: {
          totalStudents: students.length,
          activeStudents: students.filter((s: any) => s.status === "active").length,
          totalStaff: (sfRes.data || []).length,
          totalBilled: invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0),
          totalCollected: invoices.reduce((s: number, i: any) => s + Number(i.paid_amount || 0), 0),
        },
        missingTables,
      });
    }

    return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/admin/ops error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const resource = String(body?.resource || "");
    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;
    const schoolId = targetSchool.schoolId;

    const db = createDirectAdminClient() as any;

    if (resource === "notices") {
      if (!body.title?.trim() || !body.description?.trim()) {
        return NextResponse.json(
          { error: "Title and message body are required." },
          { status: 400 }
        );
      }
      const { data, error } = await db
        .from("school_events")
        .insert({
          school_id: schoolId,
          title: body.title.trim(),
          description: body.description.trim(),
          event_type: String(body.event_type || "announcement"),
          start_date: String(body.start_date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ notice: data, success: true });
    }

    if (resource === "leave") {
      if (body.action === "update_status") {
        const { error } = await db
          .from("leave_requests")
          .update({
            status: body.status,
            reviewed_by: tenant.userId || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.id)
          .eq("school_id", schoolId);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
      }
      if (!body.staff_name?.trim() || !body.start_date || !body.end_date) {
        return NextResponse.json(
          { error: "Staff name, start date, and end date are required." },
          { status: 400 }
        );
      }
      const { data, error } = await db
        .from("leave_requests")
        .insert({
          school_id: schoolId,
          staff_id: body.staff_id || null,
          staff_name: body.staff_name.trim(),
          leave_type: body.leave_type || "annual",
          start_date: body.start_date,
          end_date: body.end_date,
          reason: body.reason ? String(body.reason).trim() : null,
          status: "pending",
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ leave: data, success: true });
    }

    if (resource === "library") {
      if (!body.title?.trim() || !body.author?.trim()) {
        return NextResponse.json(
          { error: "Book/resource title and author are required." },
          { status: 400 }
        );
      }
      const copies = Math.max(1, Number(body.total_copies || 1));
      const { data, error } = await db
        .from("library_items")
        .insert({
          school_id: schoolId,
          title: body.title.trim(),
          author: body.author.trim(),
          isbn: body.isbn ? String(body.isbn).trim() : null,
          category: body.category || "General",
          publisher: body.publisher ? String(body.publisher).trim() : null,
          publication_year: Number(body.publication_year || 2024),
          total_copies: copies,
          available_copies: copies,
          status: "available",
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ item: data, success: true });
    }

    if (resource === "reports") {
      if (!body.title?.trim()) {
        return NextResponse.json({ error: "Report title is required." }, { status: 400 });
      }
      const [stRes, invRes] = await Promise.all([
        db.from("students").select("id, status").eq("school_id", schoolId),
        db.from("invoices").select("total_amount, paid_amount").eq("school_id", schoolId),
      ]);
      const students = stRes.data || [];
      const invoices = invRes.data || [];
      const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      const totalPaid = invoices.reduce((s: number, i: any) => s + Number(i.paid_amount || 0), 0);
      const summary = `Total Students: ${students.length} (Active: ${
        students.filter((s: any) => s.status === "active").length
      }) | Billed: ${totalBilled.toFixed(2)} | Collected: ${totalPaid.toFixed(2)}`;

      const { data, error } = await db
        .from("institutional_reports")
        .insert({
          school_id: schoolId,
          title: body.title.trim(),
          report_type: body.report_type || "executive_summary",
          period_label: body.period_label || "Current Cycle",
          summary: body.summary?.trim() || summary,
          generated_by: tenant.userId || null,
          status: "generated",
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ report: data, success: true });
    }

    return NextResponse.json({ error: `Unsupported resource: ${resource}` }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/admin/ops error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const resource = req.nextUrl.searchParams.get("resource") || "";
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    const tableMap: Record<string, string> = {
      notices: "school_events",
      leave: "leave_requests",
      library: "library_items",
      reports: "institutional_reports",
    };
    const table = tableMap[resource];
    if (!table) {
      return NextResponse.json({ error: `Unsupported delete resource: ${resource}` }, { status: 400 });
    }

    const db = createDirectAdminClient() as any;
    let q = db.from(table).delete().eq("id", id);
    if (tenant.schoolId) q = q.eq("school_id", tenant.schoolId);

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/ops error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
