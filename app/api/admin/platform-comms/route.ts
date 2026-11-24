import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { resolveAdminTenantRequest } from "@/lib/admin/tenant-provisioning";
import { normalizeSchoolType } from "@/lib/academics/school-terminology";

function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err || "");
  return (
    err.code === "PGRST205" ||
    err.code === "42P01" ||
    msg.includes("Could not find the table") ||
    msg.includes("does not exist")
  );
}

export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const requestedSchoolId = req.nextUrl.searchParams.get("school_id") || null;
    const schoolId = tenant.schoolId || (tenant.isSuperAdmin ? requestedSchoolId : null);

    if (!schoolId) {
      return NextResponse.json(
        { announcements: [], supportMessages: [], missingTables: [] },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const db = createDirectAdminClient() as any;

    const [{ data: schoolRow }, annRes, supRes] = await Promise.all([
      db.from("schools").select("id, name, school_type").eq("id", schoolId).maybeSingle(),
      db
        .from("platform_announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("school_support_messages")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const missingTables: string[] = [];
    if (annRes.error && isMissingTableError(annRes.error)) {
      missingTables.push("platform_announcements");
    }
    if (supRes.error && isMissingTableError(supRes.error)) {
      missingTables.push("school_support_messages");
    }

    const canonicalType = normalizeSchoolType(schoolRow?.school_type || "university");
    const announcementTypeKey =
      canonicalType === "vocational_school" ? "vocational" : canonicalType;
    const nowMs = Date.now();

    const targetedAnnouncements = (annRes.error ? [] : annRes.data || []).filter((a: any) => {
      if (a.expires_at && new Date(a.expires_at).getTime() <= nowMs) return false;
      if (a.target_scope === "all") return true;
      if (a.target_scope === "specific_school") {
        return String(a.target_school_id || "") === String(schoolId);
      }
      if (a.target_scope === "school_type") {
        const targetType = String(a.target_school_type || "").toLowerCase();
        return (
          targetType === announcementTypeKey ||
          (targetType === "vocational" && canonicalType === "vocational_school")
        );
      }
      return false;
    });

    return NextResponse.json(
      {
        announcements: targetedAnnouncements,
        supportMessages: supRes.error ? [] : supRes.data || [],
        missingTables,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    if (err?.digest === "NEXT_PRERENDER_INTERRUPTED") throw err;
    console.error("GET /api/admin/platform-comms error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load platform communications." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const schoolId =
      tenant.schoolId || (tenant.isSuperAdmin && body.school_id ? String(body.school_id) : null);
    if (!schoolId) {
      return NextResponse.json(
        { error: "School context is required to send platform support messages." },
        { status: 400 }
      );
    }

    const db = createDirectAdminClient() as any;
    const now = new Date().toISOString();

    const [{ data: schoolRow }, { data: profileRow }] = await Promise.all([
      db.from("schools").select("id, name, school_type").eq("id", schoolId).maybeSingle(),
      tenant.userId
        ? db.from("profiles").select("full_name, email").eq("id", tenant.userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const senderName =
      String(profileRow?.full_name || body.sender_name || tenant.email || "School Administrator").trim();
    const senderEmail = String(profileRow?.email || tenant.email || "").trim();

    if (body.action === "reply") {
      const id = String(body.id || "").trim();
      const replyBody = String(body.body || "").trim();
      if (!id || !replyBody) {
        return NextResponse.json(
          { error: "Ticket ID and reply message are required." },
          { status: 400 }
        );
      }

      const { data: existing, error: findErr } = await db
        .from("school_support_messages")
        .select("*")
        .eq("id", id)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (findErr || !existing) {
        return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
      }

      const currentReplies = Array.isArray(existing.replies) ? existing.replies : [];
      const updatedReplies = [
        ...currentReplies,
        {
          id: crypto.randomUUID(),
          sender_role: "school_admin",
          sender_name: senderName,
          body: replyBody,
          created_at: now,
        },
      ];

      const { data, error } = await db
        .from("school_support_messages")
        .update({
          replies: updatedReplies,
          is_read_by_superadmin: false,
          status: existing.status === "resolved" ? "open" : existing.status,
          updated_at: now,
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ item: data, success: true });
    }

    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message body are required." },
        { status: 400 }
      );
    }

    const { data, error } = await db
      .from("school_support_messages")
      .insert({
        school_id: schoolId,
        school_name: schoolRow?.name || tenant.schoolName || "Registered School",
        school_type: normalizeSchoolType(schoolRow?.school_type || "university"),
        sender_user_id: tenant.userId || null,
        sender_name: senderName,
        sender_email: senderEmail || "admin@school.edu",
        subject,
        category: String(body.category || "Support").trim(),
        priority: ["normal", "high", "urgent"].includes(body.priority)
          ? body.priority
          : "normal",
        message,
        status: "open",
        is_read_by_superadmin: false,
        replies: [],
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "Support messaging table is awaiting database migration (20261124000011).",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data, success: true }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/platform-comms error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send support message." },
      { status: 500 }
    );
  }
}
