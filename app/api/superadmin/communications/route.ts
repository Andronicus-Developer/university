import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/superadmin/api-guard";
import { updateSession } from "@/lib/supabase/middleware";

export interface CommunicationRecord {
  id: string;
  direction: "outbound" | "inbound";
  is_read: boolean;
  parent_id?: string | null;
  sender_email: string;
  sender_name: string;
  recipient_to: string;
  recipient_cc?: string | null;
  recipient_bcc?: string | null;
  target_school?: string | null;
  subject: string;
  body: string;
  category: string;
  priority: "normal" | "high" | "urgent";
  status: "sent" | "delivered" | "received" | "draft" | "scheduled" | "failed";
  attachments?: string[];
  resend_id?: string | null;
  delivery_note?: string | null;
  sent_at: string;
  created_at: string;
}

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

function isRealResendKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return (
    trimmed.startsWith("re_") &&
    trimmed !== "re_your_resend_api_key_here" &&
    trimmed.length > 10
  );
}

async function getResendConfigFromEnvOrIntegrations(): Promise<{
  apiKey: string;
  fromEmail: string;
  senderName: string;
}> {
  const envKey = process.env.RESEND_API_KEY || "";
  let apiKey = isRealResendKey(envKey) ? envKey.trim() : "";
  let fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const senderName = process.env.RESEND_FROM_NAME || "Erudian360 Platform Team";

  if (!apiKey) {
    try {
      const db = createDirectAdminClient() as any;
      const { data } = await db
        .from("platform_integrations")
        .select("is_enabled, config")
        .eq("slug", "resend")
        .maybeSingle();
      if (data?.is_enabled && data?.config) {
        const cfgKey = String(data.config.api_key || data.config.apiKey || "").trim();
        if (isRealResendKey(cfgKey)) apiKey = cfgKey;
        if (data.config.from_email) fromEmail = String(data.config.from_email);
      }
    } catch {
      // ignore if platform_integrations is unavailable
    }
  }

  return { apiKey, fromEmail, senderName };
}

/**
 * Shared live reader preserved for `/api/webhooks/resend-inbound`.
 */
export async function loadAllCommunications(): Promise<CommunicationRecord[]> {
  try {
    const db = createDirectAdminClient() as any;
    const { data, error } = await db
      .from("communications")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(200);

    if (error || !Array.isArray(data)) return [];
    return data.map((item: any) => ({
      ...item,
      direction: item.direction || "outbound",
      is_read: item.is_read !== undefined ? Boolean(item.is_read) : true,
    }));
  } catch {
    return [];
  }
}

/**
 * Shared live writer preserved for `/api/webhooks/resend-inbound`.
 */
export async function persistCommunicationRecord(newRecord: CommunicationRecord) {
  try {
    const db = createDirectAdminClient() as any;
    await db.from("communications").insert({
      id: newRecord.id,
      direction: newRecord.direction,
      is_read: newRecord.is_read,
      parent_id: newRecord.parent_id || null,
      resend_id: newRecord.resend_id || null,
      sender_email: newRecord.sender_email,
      sender_name: newRecord.sender_name,
      recipient_to: newRecord.recipient_to,
      recipient_cc: newRecord.recipient_cc || null,
      recipient_bcc: newRecord.recipient_bcc || null,
      target_school: newRecord.target_school || null,
      subject: newRecord.subject,
      body: newRecord.body,
      category: newRecord.category,
      priority: newRecord.priority,
      status: newRecord.status,
      attachments: newRecord.attachments || [],
      sent_at: newRecord.sent_at,
      created_at: newRecord.created_at,
    });
  } catch (err) {
    console.error("[persistCommunicationRecord] Supabase error:", err);
  }
  return [newRecord];
}

export async function GET(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get("resource") || "";
    const db = createDirectAdminClient() as any;

    // Resource-specific filtered queries
    if (resource === "inquiries") {
      let q = db
        .from("sales_inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      const type = searchParams.get("type");
      const status = searchParams.get("status");
      if (type && type !== "all") q = q.eq("inquiry_type", type);
      if (status && status !== "all") q = q.eq("status", status);

      const { data, error } = await q;
      if (error && isMissingTableError(error)) {
        return NextResponse.json({
          items: [],
          missingTables: ["sales_inquiries"],
        });
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [], missingTables: [] });
    }

    if (resource === "announcements") {
      const { data, error } = await db
        .from("platform_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error && isMissingTableError(error)) {
        return NextResponse.json({ items: [], missingTables: ["platform_announcements"] });
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [], missingTables: [] });
    }

    if (resource === "support") {
      const status = searchParams.get("status");
      let q = db
        .from("school_support_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);

      const { data, error } = await q;
      if (error && isMissingTableError(error)) {
        return NextResponse.json({ items: [], missingTables: ["school_support_messages"] });
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [], missingTables: [] });
    }

    // Default / ?summary=true full Communications Hub snapshot
    const [inqRes, annRes, supRes, schoolsRes, commRes, resendCfg] = await Promise.all([
      db
        .from("sales_inquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("platform_announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("school_support_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150),
      db
        .from("schools")
        .select("id, name, school_type, status")
        .order("name", { ascending: true }),
      db
        .from("communications")
        .select("id, direction, is_read")
        .eq("direction", "inbound")
        .eq("is_read", false),
      getResendConfigFromEnvOrIntegrations(),
    ]);

    const missingTables: string[] = [];
    if (inqRes.error && isMissingTableError(inqRes.error)) missingTables.push("sales_inquiries");
    if (annRes.error && isMissingTableError(annRes.error)) missingTables.push("platform_announcements");
    if (supRes.error && isMissingTableError(supRes.error)) missingTables.push("school_support_messages");

    const inquiries = inqRes.error ? [] : inqRes.data || [];
    const announcements = annRes.error ? [] : annRes.data || [];
    const supportMessages = supRes.error ? [] : supRes.data || [];
    const schools = schoolsRes.error
      ? []
      : (schoolsRes.data || []).filter((s: any) => s.status !== "deleted");

    const unreadInquiriesCount = inquiries.filter((i: any) => i.status === "unread").length;
    const unreadSupportCount = supportMessages.filter(
      (m: any) => !m.is_read_by_superadmin && m.status !== "resolved"
    ).length;
    const unreadEmailsCount = !commRes.error && Array.isArray(commRes.data) ? commRes.data.length : 0;

    return NextResponse.json(
      {
        unreadCount: unreadInquiriesCount + unreadSupportCount,
        unreadInquiriesCount,
        unreadSupportCount,
        unreadEmailsCount,
        inquiries,
        announcements,
        supportMessages,
        schools,
        resendConfigured: isRealResendKey(resendCfg.apiKey),
        missingTables,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    if (error?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    return NextResponse.json(
      { error: error?.message || "Failed to load communications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const resource = String(body.resource || "").trim();
    const db = createDirectAdminClient() as any;

    const { user } = await updateSession(request).catch(() => ({ user: null as any }));
    const actorName =
      user?.user_metadata?.full_name || user?.email || "Super Administrator";

    if (resource === "announcements") {
      const title = String(body.title || "").trim();
      const msgBody = String(body.body || "").trim();
      const targetScope = String(body.target_scope || "all").trim();

      if (!title || !msgBody) {
        return NextResponse.json(
          { error: "Announcement title and message body are required." },
          { status: 400 }
        );
      }

      if (!["all", "school_type", "specific_school"].includes(targetScope)) {
        return NextResponse.json(
          { error: "Invalid target_scope value." },
          { status: 400 }
        );
      }

      let targetSchoolType: string | null = null;
      let targetSchoolId: string | null = null;
      let targetSchoolName: string | null = null;

      if (targetScope === "school_type") {
        targetSchoolType = String(body.target_school_type || "").trim().toLowerCase();
        if (!["university", "high_school", "vocational"].includes(targetSchoolType)) {
          return NextResponse.json(
            { error: "Please select a valid target school type." },
            { status: 400 }
          );
        }
      } else if (targetScope === "specific_school") {
        targetSchoolId = String(body.target_school_id || "").trim() || null;
        if (!targetSchoolId) {
          return NextResponse.json(
            { error: "Please select a target school." },
            { status: 400 }
          );
        }
        const { data: sch } = await db
          .from("schools")
          .select("id, name")
          .eq("id", targetSchoolId)
          .maybeSingle();
        targetSchoolName = sch?.name || body.target_school_name || "Selected School";
      }

      const now = new Date().toISOString();
      const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : null;

      const { data, error } = await db
        .from("platform_announcements")
        .insert({
          title,
          body: msgBody,
          category: String(body.category || "General").trim(),
          priority: ["normal", "high", "urgent"].includes(body.priority)
            ? body.priority
            : "normal",
          target_scope: targetScope,
          target_school_type: targetSchoolType,
          target_school_id: targetSchoolId,
          target_school_name: targetSchoolName,
          is_active: true,
          expires_at: expiresAt,
          created_by: user?.id || null,
          created_by_name: actorName,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ item: data, success: true }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Unsupported POST resource on /api/superadmin/communications." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create communications record" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const resource = String(body.resource || "").trim();
    const id = String(body.id || "").trim();
    const db = createDirectAdminClient() as any;

    if (!id) {
      return NextResponse.json({ error: "Record id is required." }, { status: 400 });
    }

    const { user } = await updateSession(request).catch(() => ({ user: null as any }));
    const actorName =
      user?.user_metadata?.full_name || user?.email || "Super Administrator";
    const now = new Date().toISOString();

    if (resource === "inquiries") {
      if (body.action === "send_email_reply") {
        const toEmail = String(body.to || "").trim();
        const subject = String(body.subject || "").trim();
        const message = String(body.message || "").trim();
        if (!toEmail || !subject || !message) {
          return NextResponse.json(
            { error: "Recipient email, subject, and reply message are required." },
            { status: 400 }
          );
        }

        const resendCfg = await getResendConfigFromEnvOrIntegrations();
        if (!isRealResendKey(resendCfg.apiKey)) {
          return NextResponse.json(
            {
              error:
                "Email API is not configured. Add RESEND_API_KEY or configure the Resend integration, or use 'Reply via Email' (mailto).",
            },
            { status: 501 }
          );
        }

        const resend = new Resend(resendCfg.apiKey);
        const sendResult = await resend.emails.send({
          from: `${resendCfg.senderName} <${resendCfg.fromEmail}>`,
          to: [toEmail],
          subject,
          text: message,
        });
        if (sendResult.error) {
          return NextResponse.json(
            { error: sendResult.error.message || "Email delivery failed." },
            { status: 422 }
          );
        }

        const { data: updated, error: upErr } = await db
          .from("sales_inquiries")
          .update({ status: "contacted", updated_at: now })
          .eq("id", id)
          .select("*")
          .single();
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
        return NextResponse.json({ item: updated, success: true, resendId: sendResult.data?.id });
      }

      const patchData: Record<string, any> = { updated_at: now };
      if (body.status && ["unread", "in_progress", "contacted", "closed"].includes(body.status)) {
        patchData.status = body.status;
      }
      if (body.admin_notes !== undefined) {
        patchData.admin_notes = String(body.admin_notes || "").trim();
      }

      const { data, error } = await db
        .from("sales_inquiries")
        .update(patchData)
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ item: data, success: true });
    }

    if (resource === "announcements") {
      const patchData: Record<string, any> = { updated_at: now };
      if (typeof body.is_active === "boolean") patchData.is_active = body.is_active;
      if (body.title !== undefined) patchData.title = String(body.title).trim();
      if (body.body !== undefined) patchData.body = String(body.body).trim();
      if (body.priority !== undefined) patchData.priority = body.priority;
      if (body.category !== undefined) patchData.category = body.category;

      const { data, error } = await db
        .from("platform_announcements")
        .update(patchData)
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ item: data, success: true });
    }

    if (resource === "support") {
      const { data: existing, error: fetchErr } = await db
        .from("school_support_messages")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: "Support message not found." }, { status: 404 });
      }

      const patchData: Record<string, any> = { updated_at: now };
      if (typeof body.is_read_by_superadmin === "boolean") {
        patchData.is_read_by_superadmin = body.is_read_by_superadmin;
      }
      if (body.status && ["open", "in_progress", "replied", "resolved"].includes(body.status)) {
        patchData.status = body.status;
      }

      const replyBody = String(body.reply_body || "").trim();
      if (replyBody) {
        const currentReplies = Array.isArray(existing.replies) ? existing.replies : [];
        const newReplyEntry = {
          id: crypto.randomUUID(),
          sender_role: "superadmin",
          sender_name: actorName,
          body: replyBody,
          created_at: now,
        };
        patchData.replies = [...currentReplies, newReplyEntry];
        patchData.superadmin_reply = replyBody;
        patchData.replied_by = actorName;
        patchData.replied_at = now;
        patchData.is_read_by_superadmin = true;
        if (!body.status) patchData.status = "replied";
      }

      const { data, error } = await db
        .from("school_support_messages")
        .update(patchData)
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ item: data, success: true });
    }

    return NextResponse.json({ error: "Unsupported PATCH resource." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update communications" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const resource = searchParams.get("resource") || "communications";
    if (!id) {
      return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
    }

    const tableMap: Record<string, string> = {
      inquiries: "sales_inquiries",
      announcements: "platform_announcements",
      support: "school_support_messages",
      communications: "communications",
    };
    const table = tableMap[resource];
    if (!table) {
      return NextResponse.json({ error: "Unsupported resource." }, { status: 400 });
    }

    const db = createDirectAdminClient() as any;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete record" },
      { status: 500 }
    );
  }
}
