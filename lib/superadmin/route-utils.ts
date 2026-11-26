import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getAdminClient } from "@/lib/supabase/admin";
import { normalizeSchoolType } from "@/lib/academics/school-terminology";
import { resolveSchoolCountry } from "@/lib/africanCountries";

export interface ParsedSchoolAdminInput {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

/**
 * Verifies that the incoming request is authenticated as a platform Super Admin.
 * Returns `{ user }` on success or `{ errorResponse }` with 401/403 status on failure.
 */
export async function verifySuperAdminRequest(request: NextRequest): Promise<
  | { user: any; errorResponse: null }
  | { user: null; errorResponse: NextResponse }
> {
  try {
    const { user } = await updateSession(request);
    if (!user) {
      return {
        user: null,
        errorResponse: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
      };
    }

    const email = user.email?.trim().toLowerCase() || "";
    const metaRole = String(
      user.app_metadata?.role ||
        user.user_metadata?.role ||
        user.user_metadata?.default_role ||
        ""
    ).toLowerCase();

    let isSuperAdmin = email === "superadmin@university.edu.gh" || metaRole === "superadmin";

    if (!isSuperAdmin) {
      try {
        const adminClient = getAdminClient();
        const { data: dbRoles } = await adminClient.rpc("get_user_roles", {
          p_user_id: user.id,
        });
        if (Array.isArray(dbRoles)) {
          isSuperAdmin = dbRoles.some((r: any) => String(r?.role_code || "").toLowerCase() === "superadmin");
        }
      } catch {}
    }

    if (!isSuperAdmin) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: "Forbidden: Super Admin privileges are required." },
          { status: 403 }
        ),
      };
    }

    return { user, errorResponse: null };
  } catch {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Failed to verify session." }, { status: 401 }),
    };
  }
}

/**
 * Extracts and validates optional initial school administrator details from either
 * nested `body.admin` or flat `body.admin_*` fields.
 */
export function parseOptionalSchoolAdmin(body: any):
  | { admin: ParsedSchoolAdminInput | undefined; error: null }
  | { admin: undefined; error: string } {
  const rawAdmin = body?.admin && typeof body.admin === "object" ? body.admin : null;
  const hasFlatFields = Boolean(
    body?.admin_email || body?.admin_full_name || body?.admin_password || body?.admin_phone
  );

  if (!rawAdmin && !hasFlatFields) {
    return { admin: undefined, error: null };
  }

  const fullName = String(rawAdmin?.full_name ?? body?.admin_full_name ?? "").trim();
  const email = String(rawAdmin?.email ?? body?.admin_email ?? "")
    .trim()
    .toLowerCase();
  const password = String(rawAdmin?.password ?? body?.admin_password ?? "");
  const phone = String(rawAdmin?.phone ?? body?.admin_phone ?? "").trim() || undefined;
  const role = String(rawAdmin?.role ?? body?.admin_role ?? "system_admin").trim() || "system_admin";

  if (!fullName) {
    return { admin: undefined, error: "School admin full name is required." };
  }
  if (!email || !email.includes("@")) {
    return { admin: undefined, error: "A valid school admin email address is required." };
  }
  if (!password || password.length < 6) {
    return {
      admin: undefined,
      error: "School admin password must be at least 6 characters long.",
    };
  }

  return {
    admin: {
      full_name: fullName,
      email,
      password,
      phone,
      role,
    },
    error: null,
  };
}

/**
 * Builds normalized school creation/update field object from a Super Admin API body.
 */
export function normalizeSchoolPayload(body: any, isCreate: boolean) {
  const schoolType = body.school_type ?? body.institution_type;
  const parsedNumber = (val: unknown) =>
    val === null || val === "" || val === undefined ? null : Number(val);

  if (isCreate) {
    const resolvedType = normalizeSchoolType(schoolType);
    const resolvedCountry = resolveSchoolCountry({
      country: body.country,
      countryCode: body.country_code,
      address: body.address,
    });
    return {
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      short_name: body.short_name?.trim() || "",
      school_type: resolvedType,
      institution_type: resolvedType,
      country: resolvedCountry.country || body.country?.trim() || "",
      country_code: resolvedCountry.countryCode || body.country_code?.trim().toUpperCase() || "",
      city: body.city?.trim() || "",
      address: body.address?.trim() || "",
      postal_code: body.postal_code?.trim() || "",
      email: body.email?.trim() || "",
      phone: body.phone?.trim() || "",
      website: body.website?.trim() || "",
      motto: body.motto?.trim() || "",
      logo_url: body.logo_url?.trim() || "",
      default_currency: body.default_currency || "USD",
      currency_symbol: body.currency_symbol || "$",
      established_year: body.established_year ? Number(body.established_year) : undefined,
      accreditation_code: body.accreditation_code?.trim() || "",
      status: body.status || "active",
      full_access: body.full_access !== undefined ? Boolean(body.full_access) : true,
      max_users: parsedNumber(body.max_users),
      max_departments: parsedNumber(body.max_departments),
      max_roles: parsedNumber(body.max_roles),
      allowed_roles: Array.isArray(body.allowed_roles) ? body.allowed_roles : undefined,
    };
  }

  const normalizedType =
    schoolType !== undefined && schoolType !== null && String(schoolType).trim() !== ""
      ? normalizeSchoolType(schoolType)
      : undefined;

  const hasCountryUpdate =
    body.country !== undefined || body.country_code !== undefined;
  const resolvedCountryUpdate = hasCountryUpdate
    ? resolveSchoolCountry({
        country: body.country,
        countryCode: body.country_code,
      })
    : null;

  return {
    name: body.name?.trim(),
    code: body.code?.trim() ? body.code.trim().toUpperCase() : undefined,
    short_name: body.short_name?.trim(),
    school_type: normalizedType,
    institution_type: normalizedType,
    country: hasCountryUpdate
      ? resolvedCountryUpdate?.country || body.country?.trim() || ""
      : undefined,
    country_code: hasCountryUpdate
      ? resolvedCountryUpdate?.countryCode || body.country_code?.trim().toUpperCase() || ""
      : undefined,
    city: body.city?.trim(),
    address: body.address?.trim(),
    postal_code: body.postal_code?.trim(),
    email: body.email?.trim(),
    phone: body.phone?.trim(),
    website: body.website?.trim(),
    motto: body.motto?.trim(),
    logo_url: body.logo_url?.trim(),
    default_currency: body.default_currency,
    currency_symbol: body.currency_symbol,
    established_year: body.established_year ? Number(body.established_year) : undefined,
    accreditation_code: body.accreditation_code?.trim(),
    status: body.status,
    full_access: body.full_access !== undefined ? Boolean(body.full_access) : undefined,
    max_users: body.max_users !== undefined ? parsedNumber(body.max_users) : undefined,
    max_departments: body.max_departments !== undefined ? parsedNumber(body.max_departments) : undefined,
    max_roles: body.max_roles !== undefined ? parsedNumber(body.max_roles) : undefined,
    allowed_roles: Array.isArray(body.allowed_roles) ? body.allowed_roles : undefined,
  };
}

/**
 * Maps service errors to semantic HTTP status codes (409 duplicate, 404 not found, 400 validation, 500 server).
 */
export function mapSuperAdminErrorStatus(error: any): number {
  const msg = String(error?.message || error || "").toLowerCase();
  if (
    msg.includes("already exists") ||
    msg.includes("already been registered") ||
    msg.includes("already registered") ||
    msg.includes("duplicate") ||
    msg.includes("23505")
  ) {
    return 409;
  }
  if (msg.includes("not found")) {
    return 404;
  }
  if (
    msg.includes("required") ||
    msg.includes("must be at least") ||
    msg.includes("invalid") ||
    msg.includes("cannot be suspended") ||
    msg.includes("cannot be deleted") ||
    msg.includes("cannot suspend")
  ) {
    return 400;
  }
  return 500;
}
