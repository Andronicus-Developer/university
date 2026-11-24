import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";
import { getUniversities } from "@/lib/superadmin/service";
import {
  toPortalSchoolType,
  type PortalSchoolType,
} from "@/config/schoolPortalConfig";

export interface StudentResolvedContext {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  schoolId: string;
  schoolName: string;
  schoolAbbr: string;
  schoolLogo: string;
  schoolType: PortalSchoolType;
  currency: string;
  currencySymbol: string;
  maxCredits: number;
  student: any | null;
  profile: any | null;
  programme: any | null;
  department: any | null;
  intake: any | null;
  activeYear: any | null;
  activeTerm: any | null;
}

export function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "").trim();
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    code === "42703" ||
    code === "PGRST204" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

export async function safeStudentQuery<T = any>(
  queryPromise: PromiseLike<{ data: T | null; error: any }>
): Promise<{ data: T | null; missing: boolean; error: any }> {
  try {
    const res = await queryPromise;
    if (res?.error) {
      return {
        data: null,
        missing: isMissingTableError(res.error),
        error: res.error,
      };
    }
    return { data: res?.data ?? null, missing: false, error: null };
  } catch (err) {
    return { data: null, missing: isMissingTableError(err), error: err };
  }
}

export async function resolveStudentRequestContext(
  req: NextRequest
): Promise<
  | { ctx: StudentResolvedContext; errorResponse: null }
  | { ctx: null; errorResponse: NextResponse }
> {
  if (typeof window !== "undefined") {
    throw new Error("resolveStudentRequestContext must only execute on the server");
  }

  const cookies = req.cookies
    .getAll()
    .map((c) => ({ name: c.name, value: c.value }));
  const tenantCtx = resolveTenantContextFromHeaders(req.headers, cookies);
  const { user } = await updateSession(req).catch(() => ({ user: null as any }));

  const activeUserId = user?.id || tenantCtx.userId;
  const activeEmail = String(user?.email || tenantCtx.email || "")
    .trim()
    .toLowerCase();

  if (!activeUserId && !tenantCtx.isAuthenticated) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  const directAdmin = createDirectAdminClient();

  const metaRole = String(
    user?.app_metadata?.role ||
      user?.user_metadata?.role ||
      user?.user_metadata?.default_role ||
      tenantCtx.role ||
      ""
  ).toLowerCase();

  const isSuperAdmin =
    tenantCtx.isSuperAdmin ||
    activeEmail === "superadmin@university.edu.gh" ||
    metaRole === "superadmin";

  // 1. Strictly resolve authoritative school_id
  let schoolId: string | null = isSuperAdmin
    ? req.nextUrl.searchParams.get("school_id") ||
      req.headers.get("x-tenant-school-id") ||
      null
    : null;

  if (!schoolId && activeUserId) {
    const { data: prof } = await safeStudentQuery<any>(
      (directAdmin as any)
        .from("profiles")
        .select("id, school_id, university_id, full_name, email, phone, metadata")
        .eq("id", activeUserId)
        .maybeSingle()
    );
    if (prof?.school_id || prof?.university_id) {
      schoolId = String(prof.school_id || prof.university_id);
    }
  }

  if (!schoolId && activeUserId) {
    const { data: mem } = await safeStudentQuery<any>(
      (directAdmin as any)
        .from("school_memberships")
        .select("school_id")
        .eq("user_id", activeUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    if (mem?.school_id) {
      schoolId = String(mem.school_id);
    }
  }

  if (!schoolId && activeUserId) {
    const { data: stuSchool } = await safeStudentQuery<any>(
      (directAdmin as any)
        .from("students")
        .select("school_id")
        .or(`profile_id.eq.${activeUserId},id.eq.${activeUserId}`)
        .limit(1)
        .maybeSingle()
    );
    if (stuSchool?.school_id) {
      schoolId = String(stuSchool.school_id);
    }
  }

  if (!schoolId && !isSuperAdmin) {
    schoolId =
      user?.app_metadata?.school_id ||
      user?.app_metadata?.university_id ||
      user?.user_metadata?.school_id ||
      user?.user_metadata?.university_id ||
      tenantCtx.schoolId ||
      null;
  }

  if (!schoolId) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Your account is not linked to a school institution. Contact your School Administrator.",
        },
        { status: 403 }
      ),
    };
  }

  // 2. Load authoritative school details
  const [{ data: liveSchool }, allSchools] = await Promise.all([
    safeStudentQuery<any>(
      (directAdmin as any)
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .maybeSingle()
    ),
    getUniversities().catch(() => []),
  ]);

  const fallbackSchool = allSchools.find(
    (s) => String(s.id).toLowerCase() === String(schoolId).toLowerCase()
  );

  if (!liveSchool && !fallbackSchool) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { error: "Associated school institution was not found." },
        { status: 404 }
      ),
    };
  }

  const schoolName = String(liveSchool?.name || fallbackSchool?.name || "");
  const schoolAbbr = String(
    liveSchool?.short_name ||
      liveSchool?.tenant_slug ||
      liveSchool?.slug ||
      fallbackSchool?.code ||
      ""
  ).toUpperCase();
  const schoolLogo = String(
    liveSchool?.logo_url || fallbackSchool?.logo_url || ""
  );
  const rawType =
    liveSchool?.school_type ||
    fallbackSchool?.school_type ||
    fallbackSchool?.institution_type ||
    "university";
  const schoolType = toPortalSchoolType(rawType);
  const currency = String(
    liveSchool?.currency || fallbackSchool?.default_currency || "USD"
  );
  const currencySymbol =
    currency === "GHS"
      ? "GH₵"
      : currency === "NGN"
      ? "₦"
      : currency === "GBP"
      ? "£"
      : currency === "EUR"
      ? "€"
      : "$";

  const maxCreditsRaw = Number(
    liveSchool?.academic_settings?.max_credits ?? 24
  );
  const maxCredits =
    Number.isFinite(maxCreditsRaw) && maxCreditsRaw >= 6 ? maxCreditsRaw : 24;

  // 3. Strictly resolve THIS authenticated user's student record inside `schoolId`
  let student: any = null;
  if (activeUserId) {
    const { data: liveByAuth } = await safeStudentQuery<any>(
      (directAdmin as any)
        .from("students")
        .select("*")
        .eq("school_id", schoolId)
        .or(`profile_id.eq.${activeUserId},id.eq.${activeUserId}`)
        .maybeSingle()
    );
    student = liveByAuth;
  }

  if (!student && activeEmail) {
    const { data: liveByEmail } = await safeStudentQuery<any>(
      (directAdmin as any)
        .from("students")
        .select("*")
        .eq("school_id", schoolId)
        .ilike("email", activeEmail)
        .maybeSingle()
    );
    student = liveByEmail;
  }

  // Optional virtual-DB mirror check (still strictly scoped to schoolId + userId)
  if (!student && activeUserId) {
    try {
      const virtualAdmin = createAdminClient();
      const { data: vStu } = await (virtualAdmin as any)
        .from("students")
        .select("*")
        .eq("school_id", schoolId)
        .or(`profile_id.eq.${activeUserId},id.eq.${activeUserId}`)
        .maybeSingle();
      if (vStu) {
        student = vStu;
      }
    } catch {
      // non-blocking
    }
  }

  // Load user's profile row
  const { data: profileRow } = activeUserId
    ? await safeStudentQuery<any>(
        (directAdmin as any)
          .from("profiles")
          .select("*")
          .eq("id", student?.profile_id || activeUserId)
          .maybeSingle()
      )
    : { data: null };

  const metaFallback =
    profileRow?.metadata?.student_profile &&
    typeof profileRow.metadata.student_profile === "object"
      ? profileRow.metadata.student_profile
      : {};

  if (student) {
    const mergedMeta = {
      ...metaFallback,
      ...(student.metadata && typeof student.metadata === "object"
        ? student.metadata
        : {}),
    };
    const fullName =
      `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
      profileRow?.full_name ||
      user?.user_metadata?.full_name ||
      activeEmail ||
      "Student";

    student = {
      ...student,
      full_name: fullName,
      email: student.email || profileRow?.email || activeEmail,
      phone: student.phone || profileRow?.phone || "",
      address: student.address || mergedMeta.address || "",
      emergency_contact_name:
        student.emergency_contact_name || mergedMeta.emergency_contact_name || "",
      emergency_contact_phone:
        student.emergency_contact_phone || mergedMeta.emergency_contact_phone || "",
      metadata: mergedMeta,
    };
  }

  // Load Student's Programme, Department, Intake, and School's Active Year & Term
  const [progRes, deptRes, intakeRes, yearsRes, termsRes] = await Promise.all([
    student?.programme_id
      ? safeStudentQuery<any>(
          (directAdmin as any)
            .from("programmes")
            .select("*")
            .eq("school_id", schoolId)
            .eq("id", student.programme_id)
            .maybeSingle()
        )
      : Promise.resolve({ data: null, missing: false, error: null }),
    student?.department_id
      ? safeStudentQuery<any>(
          (directAdmin as any)
            .from("departments")
            .select("*")
            .eq("school_id", schoolId)
            .eq("id", student.department_id)
            .maybeSingle()
        )
      : Promise.resolve({ data: null, missing: false, error: null }),
    student?.intake_id
      ? safeStudentQuery<any>(
          (directAdmin as any)
            .from("vocational_intakes")
            .select("*")
            .eq("school_id", schoolId)
            .eq("id", student.intake_id)
            .maybeSingle()
        )
      : Promise.resolve({ data: null, missing: false, error: null }),
    safeStudentQuery<any[]>(
      (directAdmin as any)
        .from("academic_years")
        .select("*")
        .eq("school_id", schoolId)
        .order("is_current", { ascending: false })
        .order("start_date", { ascending: false })
    ),
    safeStudentQuery<any[]>(
      (directAdmin as any)
        .from("terms")
        .select("*")
        .eq("school_id", schoolId)
        .order("is_current", { ascending: false })
        .order("term_number", { ascending: true })
    ),
  ]);

  const years = Array.isArray(yearsRes.data) ? yearsRes.data : [];
  const terms = Array.isArray(termsRes.data) ? termsRes.data : [];
  const activeYear =
    years.find((y: any) => y.is_current) || years[0] || null;
  const activeTerm =
    terms.find((t: any) => t.is_current || t.is_active) || terms[0] || null;

  return {
    ctx: {
      userId: String(activeUserId),
      email: activeEmail,
      isSuperAdmin,
      schoolId,
      schoolName,
      schoolAbbr,
      schoolLogo,
      schoolType,
      currency,
      currencySymbol,
      maxCredits,
      student,
      profile: profileRow,
      programme: progRes.data,
      department: deptRes.data,
      intake: intakeRes.data,
      activeYear,
      activeTerm,
    },
    errorResponse: null,
  };
}
