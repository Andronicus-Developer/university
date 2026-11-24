import { createDirectAdminClient } from "@/lib/supabase/admin";

export type InquiryType = "demo_request" | "sales_chat";
export type InquirySchoolType = "university" | "high_school" | "vocational" | "other";

export interface LandingInquiryPayload {
  type?: unknown;
  inquiry_type?: unknown;
  full_name?: unknown;
  email?: unknown;
  phone?: unknown;
  institution_name?: unknown;
  school_name?: unknown;
  school_type?: unknown;
  estimated_students?: unknown;
  student_count?: unknown;
  role?: unknown;
  preferred_date?: unknown;
  preferred_time?: unknown;
  interests?: unknown;
  topic?: unknown;
  preferred_channel?: unknown;
  notes?: unknown;
  message?: unknown;
  website?: unknown; // Honeypot field
}

export interface InquirySubmissionResult {
  ok: boolean;
  status: number;
  id?: string;
  referenceId?: string;
  message?: string;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 6;
const rateBuckets = new Map<string, number[]>();

export function normalizeInquirySchoolType(raw: unknown): InquirySchoolType {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "university" || v.includes("univ") || v.includes("tertiary") || v.includes("college")) {
    return "university";
  }
  if (v === "high_school" || v.includes("high") || v.includes("secondary") || v.includes("k-12") || v.includes("k12")) {
    return "high_school";
  }
  if (v === "vocational" || v.includes("voc") || v.includes("tech") || v.includes("tvet") || v.includes("trade")) {
    return "vocational";
  }
  return "other";
}

function checkRateLimit(rateKey: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(rateKey) || [];
  const active = prev.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (active.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateBuckets.set(rateKey, active);
    return false;
  }
  active.push(now);
  rateBuckets.set(rateKey, active);
  return true;
}

function isMissingTableError(err: any): boolean {
  const msg = String(err?.message || err || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    msg.includes("Could not find the table") ||
    msg.includes("does not exist")
  );
}

export async function submitLandingInquiry(
  rawBody: LandingInquiryPayload,
  clientIp = "unknown"
): Promise<InquirySubmissionResult> {
  if (!rawBody || typeof rawBody !== "object") {
    return { ok: false, status: 400, error: "Invalid request payload." };
  }

  // Honeypot spam rejection
  if (String(rawBody.website || "").trim().length > 0) {
    return { ok: false, status: 400, error: "Invalid submission." };
  }

  const rawType = String(rawBody.inquiry_type || rawBody.type || "").trim();
  if (rawType !== "demo_request" && rawType !== "sales_chat") {
    return {
      ok: false,
      status: 400,
      error: "Inquiry type must be 'demo_request' or 'sales_chat'.",
    };
  }
  const inquiryType: InquiryType = rawType;

  const fullName = String(rawBody.full_name || "").trim().slice(0, 120);
  const email = String(rawBody.email || "").trim().toLowerCase().slice(0, 180);
  const phone = String(rawBody.phone || "").trim().slice(0, 50);
  const schoolName = String(rawBody.school_name || rawBody.institution_name || "")
    .trim()
    .slice(0, 180);
  const schoolType = normalizeInquirySchoolType(rawBody.school_type);

  if (fullName.length < 2) {
    return { ok: false, status: 400, error: "Full name is required." };
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return {
      ok: false,
      status: 400,
      error: "A valid work or institutional email is required.",
    };
  }
  if (schoolName.length < 2) {
    return { ok: false, status: 400, error: "School or institution name is required." };
  }

  if (!checkRateLimit(`${clientIp}:${email}`)) {
    return {
      ok: false,
      status: 429,
      error: "Too many submissions in a short period. Please wait a few minutes before retrying.",
    };
  }

  const estimatedStudents = String(
    rawBody.estimated_students || rawBody.student_count || ""
  )
    .trim()
    .slice(0, 60);

  let preferredDate: string | null = null;
  let preferredTime: string | null = null;
  let topic: string | null = null;
  let messageText = "";

  const randomCode = Math.floor(100000 + Math.random() * 900000);
  const referenceId =
    inquiryType === "demo_request"
      ? `ERD-DEMO-${randomCode}`
      : `ERD-SALES-${randomCode}`;

  if (inquiryType === "demo_request") {
    if (!phone) {
      return {
        ok: false,
        status: 400,
        error: "Phone number is required for demo requests.",
      };
    }

    const rawDate = String(rawBody.preferred_date || "").trim().slice(0, 40);
    preferredDate = rawDate && rawDate !== "Flexible" ? rawDate : null;
    preferredTime = String(rawBody.preferred_time || "").trim().slice(0, 60) || null;
    const role = String(rawBody.role || "").trim().slice(0, 100);
    const interests = Array.isArray(rawBody.interests)
      ? rawBody.interests
          .slice(0, 12)
          .map((x) => String(x || "").trim())
          .filter(Boolean)
      : [];
    const notes = String(rawBody.notes || rawBody.message || "").trim().slice(0, 3000);

    topic = interests.length > 0 ? interests.join(", ") : role || "Live Platform Demo";
    messageText = [
      role ? `Role: ${role}` : "",
      interests.length > 0 ? `Modules of Interest: ${interests.join(", ")}` : "",
      notes ? `Notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join("\n") || "Requested a live institutional walkthrough.";
  } else {
    const rawMsg = String(rawBody.message || "").trim().slice(0, 4000);
    if (rawMsg.length < 3) {
      return {
        ok: false,
        status: 400,
        error: "Please enter a message or question for our sales team.",
      };
    }
    topic = String(rawBody.topic || "General Sales Inquiry").trim().slice(0, 140);
    const preferredChannel = String(rawBody.preferred_channel || "").trim().slice(0, 60);
    messageText = preferredChannel
      ? `Preferred Reply Channel: ${preferredChannel}\n\n${rawMsg}`
      : rawMsg;
  }

  try {
    const db = createDirectAdminClient() as any;
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("sales_inquiries")
      .insert({
        reference_code: referenceId,
        inquiry_type: inquiryType,
        full_name: fullName,
        email,
        phone: phone || null,
        school_name: schoolName,
        school_type: schoolType,
        estimated_students: estimatedStudents || null,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        topic,
        message: messageText,
        status: "unread",
        created_at: now,
        updated_at: now,
      })
      .select("id, reference_code")
      .single();

    if (error) {
      console.error("[submitLandingInquiry] sales_inquiries insert error:", error);
      if (isMissingTableError(error)) {
        return {
          ok: false,
          status: 503,
          error:
            "Inquiries service is awaiting database migration (sales_inquiries). Please contact support.",
        };
      }
      return {
        ok: false,
        status: 500,
        error: error.message || "Unable to save inquiry.",
      };
    }

    return {
      ok: true,
      status: 201,
      id: data?.id,
      referenceId: data?.reference_code || referenceId,
      message:
        inquiryType === "demo_request"
          ? "Your demo request has been received. Our education specialist will confirm your session shortly."
          : "Thank you for reaching out! Our sales team has received your inquiry and will reply shortly.",
    };
  } catch (err: any) {
    console.error("[submitLandingInquiry] fatal error:", err);
    return {
      ok: false,
      status: 500,
      error: err?.message || "Failed to submit inquiry. Please try again.",
    };
  }
}
