import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

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

export interface ResendGatewayConfig {
  api_key: string;
  from_email: string;
  sender_name: string;
  reply_to?: string;
}

const DEFAULT_COMMUNICATIONS: CommunicationRecord[] = [
  {
    id: "c9a00001-0000-0000-0000-000000000004",
    direction: "inbound",
    is_read: false,
    parent_id: "c9a00001-0000-0000-0000-000000000001",
    sender_email: "admin@university.edu.gh",
    sender_name: "Andronicus Johnson (AIT System Admin)",
    recipient_to: "superadmin@university.edu.gh",
    recipient_cc: null,
    recipient_bcc: null,
    target_school: "Institutional Campus",
    subject: "Re: 2026/2027 Academic Year Governance & Quota Compliance Directive",
    body: "Dear Master Super Administrator,\n\nThank you for the directive. We have verified our institutional role quotas, confirmed MFA enrollment across all active system administrators, and reviewed our school portal sidebar modules.\n\nEverything is compliant and operational on our campus.\n\nWarm regards,\nAndronicus Johnson\nSystem Administrator • Institutional Campus",
    category: "Compliance",
    priority: "high",
    status: "received",
    attachments: [],
    resend_id: "re_in_44910b2c",
    sent_at: "2026-11-19T11:20:00.000Z",
    created_at: "2026-11-19T11:20:00.000Z",
  },
  {
    id: "c9a00001-0000-0000-0000-000000000001",
    direction: "outbound",
    is_read: true,
    parent_id: null,
    sender_email: "superadmin@university.edu.gh",
    sender_name: "Master Super Administrator",
    recipient_to: "admin@university.edu.gh, registrar@university.edu.gh",
    recipient_cc: "bursar@university.edu.gh",
    recipient_bcc: null,
    target_school: "Institutional Campus",
    subject: "2026/2027 Academic Year Governance & Quota Compliance Directive",
    body: "Dear Institutional Administrators,\n\nPlease be advised that the 2026/2027 multi-tenant governance quotas and sidebar module configurations have been finalized on the central platform.\n\nKey Action Items:\n1. Verify your institution's assigned role tiers and department limits.\n2. Confirm that all active system administrators have Multi-Factor Authentication (MFA) enabled.\n3. Review your portal sidebar navigation items under Settings.\n\nWarm regards,\nMaster Super Administrator\nUMS Global Platform Governance",
    category: "Compliance",
    priority: "high",
    status: "delivered",
    attachments: ["2026_Governance_Policy.pdf"],
    resend_id: "re_msg_99201a8b",
    sent_at: "2026-11-18T09:30:00.000Z",
    created_at: "2026-11-18T09:30:00.000Z",
  },
  {
    id: "c9a00001-0000-0000-0000-000000000002",
    direction: "outbound",
    is_read: true,
    parent_id: null,
    sender_email: "superadmin@university.edu.gh",
    sender_name: "Master Super Administrator",
    recipient_to: "all-school-admins@university.edu.gh",
    recipient_cc: null,
    recipient_bcc: null,
    target_school: "All Registered Schools",
    subject: "Scheduled Cloud Storage Engine Maintenance & Zero-Downtime Sync",
    body: "Hello System Administrators,\n\nOur engineering team will perform a routine optimization on the multi-tenant database cluster this Saturday at 02:00 UTC. All institutional portals (Universities, High Schools, and Vocational Schools) will remain online with zero cold-start impact.\n\nNo action is required on your part.\n\nBest regards,\nPlatform Operations Team",
    category: "Maintenance",
    priority: "normal",
    status: "delivered",
    attachments: [],
    resend_id: "re_msg_88142c1d",
    sent_at: "2026-11-16T14:15:00.000Z",
    created_at: "2026-11-16T14:15:00.000Z",
  },
  {
    id: "c9a00001-0000-0000-0000-000000000003",
    direction: "outbound",
    is_read: true,
    parent_id: null,
    sender_email: "superadmin@university.edu.gh",
    sender_name: "Master Super Administrator",
    recipient_to: "eugenedoeteh@university.edu.gh",
    recipient_cc: "admin@university.edu.gh",
    recipient_bcc: null,
    target_school: "Institutional Campus",
    subject: "End-of-Semester Bursary Reconciliation & Settlement Verification",
    body: "Dear Chief Financial Officer,\n\nKindly ensure all pending fee waiver dual-control approvals and Paystack settlement batches for the First Semester are reconciled before the financial close deadline.\n\nThank you,\nMaster Super Administrator",
    category: "Billing",
    priority: "high",
    status: "delivered",
    attachments: ["Settlement_Checklist_Sem1.xlsx"],
    resend_id: "re_msg_77319f4e",
    sent_at: "2026-11-14T11:00:00.000Z",
    created_at: "2026-11-14T11:00:00.000Z",
  },
];

function getDataDir(): string {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getLocalFilePath(): string {
  return path.join(getDataDir(), "communications.json");
}

function getGatewayConfigPath(): string {
  return path.join(getDataDir(), "resend-config.json");
}

function readLocalCommunications(): CommunicationRecord[] | null {
  try {
    const file = getLocalFilePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          ...item,
          direction: item.direction || "outbound",
          is_read: item.is_read !== undefined ? Boolean(item.is_read) : true,
        }));
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function writeLocalCommunications(items: CommunicationRecord[]) {
  try {
    fs.writeFileSync(getLocalFilePath(), JSON.stringify(items, null, 2), "utf-8");
  } catch {
    // ignore
  }
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

async function loadResendConfig(): Promise<ResendGatewayConfig> {
  const envKey = process.env.RESEND_API_KEY || "";
  const defaultConfig: ResendGatewayConfig = {
    api_key: isRealResendKey(envKey) ? envKey.trim() : "",
    from_email: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    sender_name: process.env.RESEND_FROM_NAME || "Master Super Administrator",
    reply_to: process.env.RESEND_REPLY_TO || "superadmin@university.edu.gh",
  };

  try {
    const file = getGatewayConfigPath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (parsed) {
        return {
          api_key: isRealResendKey(parsed.api_key) ? parsed.api_key : defaultConfig.api_key,
          from_email: parsed.from_email || defaultConfig.from_email,
          sender_name: parsed.sender_name || defaultConfig.sender_name,
          reply_to: parsed.reply_to || defaultConfig.reply_to,
        };
      }
    }
  } catch {
    // ignore
  }

  try {
    const supabase = createAdminClient();
    const { data } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "resend_gateway_config")
      .maybeSingle();

    if (data?.setting_value) {
      return {
        api_key: isRealResendKey(data.setting_value.api_key)
          ? data.setting_value.api_key
          : defaultConfig.api_key,
        from_email: data.setting_value.from_email || defaultConfig.from_email,
        sender_name: data.setting_value.sender_name || defaultConfig.sender_name,
        reply_to: data.setting_value.reply_to || defaultConfig.reply_to,
      };
    }
  } catch {
    // ignore
  }

  return defaultConfig;
}

async function saveResendConfig(config: Partial<ResendGatewayConfig>): Promise<ResendGatewayConfig> {
  const current = await loadResendConfig();
  const updated: ResendGatewayConfig = {
    api_key: config.api_key !== undefined ? config.api_key.trim() : current.api_key,
    from_email: config.from_email?.trim() || current.from_email || "onboarding@resend.dev",
    sender_name: config.sender_name?.trim() || current.sender_name || "Master Super Administrator",
    reply_to: config.reply_to?.trim() || current.reply_to || "superadmin@university.edu.gh",
  };

  try {
    fs.writeFileSync(getGatewayConfigPath(), JSON.stringify(updated, null, 2), "utf-8");
  } catch {
    // ignore
  }

  try {
    const supabase = createAdminClient();
    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "resend_gateway_config",
        setting_value: updated,
        category: "communications",
        description: "Resend transactional email API configuration",
        is_sensitive: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    );
  } catch {
    // ignore
  }

  return updated;
}

function parseEmailList(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes("@"));
}

function escapeHtml(raw: string): string {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlEmail(params: {
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  targetSchool: string;
  category: string;
  priority: string;
  attachments: string[];
}): string {
  const safeSubject = escapeHtml(params.subject);
  const safeCategory = escapeHtml(params.category);
  const safePriority = escapeHtml(params.priority);
  const safeTargetSchool = escapeHtml(params.targetSchool);
  const safeSenderName = escapeHtml(params.senderName);
  const safeSenderEmail = escapeHtml(params.senderEmail);

  const escapedBody = escapeHtml(params.body)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");

  const priorityBadgeColor =
    params.priority === "urgent"
      ? "#DC2626"
      : params.priority === "high"
      ? "#D97706"
      : "#2563EB";

  const attachmentHtml =
    params.attachments.length > 0
      ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #E2E8F0;">
           <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:8px;">
             Attached Documents (${params.attachments.length})
           </div>
           ${params.attachments
             .map(
               (a) =>
                 `<span style="display:inline-block;padding:6px 12px;margin-right:8px;margin-bottom:6px;background:#F1F5F9;border:1px solid #CBD5E1;border-radius:8px;font-size:12px;color:#334155;">📎 ${escapeHtml(a)}</span>`
             )
             .join("")}
         </div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#FFFFFF;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.05);">
          <tr>
            <td style="background:linear-gradient(135deg,#0F172A 0%,#1E1B4B 100%);padding:24px 32px;color:#FFFFFF;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#93C5FD;margin-bottom:6px;">
                School Management System • Super Admin Dispatch
              </div>
              <div style="font-size:18px;font-weight:700;line-height:1.35;color:#FFFFFF;">
                ${safeSubject}
              </div>
              <div style="margin-top:12px;">
                <span style="display:inline-block;padding:3px 10px;border-radius:999px;background-color:rgba(255,255,255,0.15);color:#E2E8F0;font-size:11px;font-weight:600;margin-right:8px;">
                  ${safeCategory}
                </span>
                <span style="display:inline-block;padding:3px 10px;border-radius:999px;background-color:${priorityBadgeColor};color:#FFFFFF;font-size:11px;font-weight:700;text-transform:uppercase;margin-right:8px;">
                  ${safePriority} Priority
                </span>
                <span style="display:inline-block;padding:3px 10px;border-radius:999px;background-color:rgba(255,255,255,0.1);color:#CBD5E1;font-size:11px;">
                  ${safeTargetSchool}
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#1E293B;font-size:14px;line-height:1.7;">
              ${escapedBody}
              ${attachmentHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 32px;color:#64748B;font-size:12px;">
              <div><strong>Sent by:</strong> ${safeSenderName} (${safeSenderEmail})</div>
              <div style="margin-top:4px;font-size:11px;color:#94A3B8;">
                Replying directly to this email delivers your response to the Super Admin Dashboard Inbox.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function loadAllCommunications(): Promise<CommunicationRecord[]> {
  let items: CommunicationRecord[] = [];

  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase as any)
      .from("communications")
      .select("*")
      .order("sent_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      items = data.map((item: any) => ({
        ...item,
        direction: item.direction || "outbound",
        is_read: item.is_read !== undefined ? Boolean(item.is_read) : true,
      }));
    } else {
      const { data: settingData } = await (supabase as any)
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "superadmin_communications")
        .maybeSingle();

      if (settingData?.setting_value && Array.isArray(settingData.setting_value)) {
        items = settingData.setting_value.map((item: any) => ({
          ...item,
          direction: item.direction || "outbound",
          is_read: item.is_read !== undefined ? Boolean(item.is_read) : true,
        }));
      }
    }
  } catch {
    // fallback to local cache
  }

  if (items.length === 0) {
    const local = readLocalCommunications();
    if (local && local.length > 0) {
      items = local;
    }
  }

  if (items.length === 0) {
    items = DEFAULT_COMMUNICATIONS;
    writeLocalCommunications(items);
  }

  // Ensure at least one inbound reply exists in seed if migrating from older cache
  if (!items.some((i) => i.direction === "inbound")) {
    items = [DEFAULT_COMMUNICATIONS[0], ...items];
    writeLocalCommunications(items);
  }

  items.sort(
    (a, b) =>
      new Date(b.sent_at || b.created_at).getTime() -
      new Date(a.sent_at || a.created_at).getTime()
  );

  return items;
}

export async function persistCommunicationRecord(newRecord: CommunicationRecord) {
  const existing = await loadAllCommunications();
  const updated = [newRecord, ...existing.filter((c) => c.id !== newRecord.id)];
  const now = new Date().toISOString();

  writeLocalCommunications(updated);

  try {
    const supabase = createAdminClient();

    await (supabase as any).from("communications").insert({
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

    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "superadmin_communications",
        setting_value: updated,
        category: "communications",
        description: "Super Admin email communications history log (outbound + inbound replies)",
        is_sensitive: false,
        updated_at: now,
      },
      { onConflict: "setting_key" }
    );

    if (newRecord.direction === "inbound") {
      // Create notification for Super Admin
      await (supabase as any).from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: "1440ed7e-cb23-4248-a372-f38b20d01554",
        title: `New Email Reply from ${newRecord.sender_name}`,
        message: `${newRecord.subject} — ${newRecord.body.slice(0, 100)}`,
        type: "info",
        is_read: false,
        link: "/superadmin/communications",
        created_at: now,
      });
    }
  } catch (dbErr) {
    console.warn("Supabase communications persistence warning:", dbErr);
  }

  return updated;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeConfig = searchParams.get("config") === "true";

    const items = await loadAllCommunications();

    if (includeConfig) {
      const config = await loadResendConfig();
      const hasApiKey = isRealResendKey(config.api_key);
      const maskedKey = hasApiKey
        ? `${config.api_key.slice(0, 6)}••••••••••••••••${config.api_key.slice(-4)}`
        : "";

      return NextResponse.json({
        items,
        unreadCount: items.filter((i) => i.direction === "inbound" && !i.is_read).length,
        config: {
          hasApiKey,
          maskedKey,
          fromEmail: config.from_email,
          senderName: config.sender_name,
          replyTo: config.reply_to,
        },
      });
    }

    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load communications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle marking inbound replies as read
    if (body.action === "mark_read" && body.id) {
      const items = await loadAllCommunications();
      const updated = items.map((c) =>
        c.id === body.id ? { ...c, is_read: true } : c
      );
      writeLocalCommunications(updated);

      try {
        const supabase = createAdminClient();
        await (supabase as any)
          .from("communications")
          .update({ is_read: true })
          .eq("id", body.id);
        await (supabase as any).from("system_settings").upsert(
          {
            setting_key: "superadmin_communications",
            setting_value: updated,
            category: "communications",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "setting_key" }
        );
      } catch {
        // ignore
      }

      return NextResponse.json({
        success: true,
        unreadCount: updated.filter((i) => i.direction === "inbound" && !i.is_read).length,
      });
    }

    if (body.action === "mark_all_read") {
      const items = await loadAllCommunications();
      const updated = items.map((c) => ({ ...c, is_read: true }));
      writeLocalCommunications(updated);

      try {
        const supabase = createAdminClient();
        await (supabase as any)
          .from("communications")
          .update({ is_read: true })
          .eq("direction", "inbound");
        await (supabase as any).from("system_settings").upsert(
          {
            setting_key: "superadmin_communications",
            setting_value: updated,
            category: "communications",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "setting_key" }
        );
      } catch {
        // ignore
      }

      return NextResponse.json({ success: true, unreadCount: 0 });
    }

    // Otherwise update Resend Gateway configuration
    const updated = await saveResendConfig({
      api_key: body.api_key,
      from_email: body.from_email,
      sender_name: body.sender_name,
      reply_to: body.reply_to,
    });

    const hasApiKey = isRealResendKey(updated.api_key);
    const maskedKey = hasApiKey
      ? `${updated.api_key.slice(0, 6)}••••••••••••••••${updated.api_key.slice(-4)}`
      : "";

    return NextResponse.json({
      success: true,
      config: {
        hasApiKey,
        maskedKey,
        fromEmail: updated.from_email,
        senderName: updated.sender_name,
        replyTo: updated.reply_to,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update communications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const isInbound = body.direction === "inbound";

    // Handle Inbound Reply from a Receiver
    if (isInbound) {
      if (!body.sender_email || !body.subject || !body.body) {
        return NextResponse.json(
          { error: "Sender email, subject, and reply body are required." },
          { status: 400 }
        );
      }

      const existing = await loadAllCommunications();
      let parentId = body.parent_id || null;
      let matchedSchool = body.target_school || "School Administrator";
      let matchedCategory = body.category || "General";

      if (!parentId) {
        const cleanSubject = body.subject.replace(/^(Re|Fwd):\s*/i, "").trim().toLowerCase();
        const parentMatch = existing.find(
          (c) =>
            c.subject.replace(/^(Re|Fwd):\s*/i, "").trim().toLowerCase() === cleanSubject
        );
        if (parentMatch) {
          parentId = parentMatch.id;
          matchedSchool = body.target_school || parentMatch.target_school || matchedSchool;
          matchedCategory = body.category || parentMatch.category || matchedCategory;
        }
      }

      const now = new Date().toISOString();
      const inboundRecord: CommunicationRecord = {
        id: crypto.randomUUID(),
        direction: "inbound",
        is_read: false,
        parent_id: parentId,
        sender_email: body.sender_email.trim(),
        sender_name: body.sender_name?.trim() || body.sender_email.split("@")[0],
        recipient_to: body.recipient_to?.trim() || "superadmin@university.edu.gh",
        recipient_cc: body.recipient_cc || null,
        recipient_bcc: null,
        target_school: matchedSchool,
        subject: body.subject.trim().startsWith("Re:")
          ? body.subject.trim()
          : `Re: ${body.subject.trim()}`,
        body: body.body,
        category: matchedCategory,
        priority: body.priority || "normal",
        status: "received",
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
        resend_id: body.resend_id || `re_in_${crypto.randomUUID().slice(0, 8)}`,
        delivery_note: "Inbound reply received in Super Admin Inbox",
        sent_at: now,
        created_at: now,
      };

      await persistCommunicationRecord(inboundRecord);

      return NextResponse.json(
        {
          item: inboundRecord,
          success: true,
        },
        { status: 201 }
      );
    }

    // Handle Outbound Email Sent by Super Admin
    if (!body.recipient_to || !body.subject || !body.body) {
      return NextResponse.json(
        { error: "Recipient (To), Subject, and Message Body are required." },
        { status: 400 }
      );
    }

    const toEmails = parseEmailList(body.recipient_to);
    if (toEmails.length === 0) {
      return NextResponse.json(
        { error: "Please enter at least one valid email address in the 'To' field." },
        { status: 400 }
      );
    }

    const ccEmails = parseEmailList(body.recipient_cc);
    const bccEmails = parseEmailList(body.recipient_bcc);

    const resendConfig = await loadResendConfig();
    const rawKey = (body.resend_api_key || resendConfig.api_key || process.env.RESEND_API_KEY || "").trim();
    const activeApiKey = isRealResendKey(rawKey) ? rawKey : "";
    const senderName = body.sender_name || resendConfig.sender_name || "Master Super Administrator";
    const configuredFromEmail = body.sender_email || resendConfig.from_email || "onboarding@resend.dev";
    const targetSchool = body.target_school || "All Registered Schools";
    const category = body.category || "General";
    const priority = body.priority || "normal";
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    let resendMessageId: string | null = null;
    let deliveryStatus: "delivered" | "sent" | "failed" = "delivered";
    let deliveryNote: string | null = null;

    if (activeApiKey) {
      const resend = new Resend(activeApiKey);
      const htmlContent = buildHtmlEmail({
        subject: body.subject.trim(),
        body: body.body,
        senderName,
        senderEmail: configuredFromEmail,
        targetSchool,
        category,
        priority,
        attachments,
      });

      const fromAddress = configuredFromEmail.includes("<")
        ? configuredFromEmail
        : `${senderName} <${configuredFromEmail}>`;

      let sendResult = await resend.emails.send({
        from: fromAddress,
        to: toEmails,
        ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
        ...(bccEmails.length > 0 ? { bcc: bccEmails } : {}),
        ...(resendConfig.reply_to ? { replyTo: resendConfig.reply_to } : {}),
        subject: body.subject.trim(),
        html: htmlContent,
        text: body.body,
      });

      if (
        sendResult.error &&
        configuredFromEmail !== "onboarding@resend.dev" &&
        (sendResult.error.message?.toLowerCase().includes("domain") ||
          sendResult.error.message?.toLowerCase().includes("verify") ||
          sendResult.error.name === "validation_error")
      ) {
        sendResult = await resend.emails.send({
          from: `${senderName} <onboarding@resend.dev>`,
          to: toEmails,
          ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
          ...(bccEmails.length > 0 ? { bcc: bccEmails } : {}),
          subject: body.subject.trim(),
          html: htmlContent,
          text: body.body,
        });
      }

      if (sendResult.error) {
        return NextResponse.json(
          {
            error: `Resend API Error: ${sendResult.error.message}`,
            resendError: sendResult.error,
          },
          { status: 422 }
        );
      }

      resendMessageId = sendResult.data?.id || null;
      deliveryStatus = "delivered";
      deliveryNote = `Dispatched via Resend (ID: ${resendMessageId})`;
    } else {
      deliveryStatus = "sent";
      deliveryNote = "Logged in database (Configure Resend API key in Gateway Settings for live SMTP/API delivery)";
    }

    const now = new Date().toISOString();
    const newRecord: CommunicationRecord = {
      id: crypto.randomUUID(),
      direction: "outbound",
      is_read: true,
      parent_id: body.parent_id || null,
      sender_email: configuredFromEmail,
      sender_name: senderName,
      recipient_to: toEmails.join(", "),
      recipient_cc: ccEmails.length > 0 ? ccEmails.join(", ") : null,
      recipient_bcc: bccEmails.length > 0 ? bccEmails.join(", ") : null,
      target_school: targetSchool,
      subject: body.subject.trim(),
      body: body.body,
      category,
      priority,
      status: deliveryStatus,
      attachments,
      resend_id: resendMessageId,
      delivery_note: deliveryNote,
      sent_at: now,
      created_at: now,
    };

    await persistCommunicationRecord(newRecord);

    return NextResponse.json(
      {
        item: newRecord,
        resendId: resendMessageId,
        dispatchedViaResend: Boolean(activeApiKey),
        deliveryNote,
        success: true,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to send communication" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Communication ID is required" }, { status: 400 });
    }

    const existing = await loadAllCommunications();
    const filtered = existing.filter((c) => c.id !== id);
    writeLocalCommunications(filtered);

    try {
      const supabase = createAdminClient();
      await (supabase as any).from("communications").delete().eq("id", id);
      await (supabase as any).from("system_settings").upsert(
        {
          setting_key: "superadmin_communications",
          setting_value: filtered,
          category: "communications",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      );
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete communication" },
      { status: 500 }
    );
  }
}
