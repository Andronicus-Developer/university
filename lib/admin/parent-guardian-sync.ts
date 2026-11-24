import {
  createAdminClient,
  createDirectAdminClient,
} from "@/lib/supabase/admin";
import {
  provisionLiveTenantUser,
  syncVirtualProfileAndRole,
} from "@/lib/admin/tenant-provisioning";

export type AllowedGuardianRelationship =
  | "Mother"
  | "Father"
  | "Guardian"
  | "Sponsor"
  | "Parent";

export type NormalizedStudentGender = "male" | "female" | "other";

export function normalizeGuardianRelationship(
  raw?: string | null
): AllowedGuardianRelationship {
  const clean = String(raw || "").trim().toLowerCase();
  if (clean === "mother") return "Mother";
  if (clean === "father") return "Father";
  if (clean === "sponsor") return "Sponsor";
  if (clean === "parent") return "Parent";
  if (clean === "guardian" || clean === "next of kin") return "Guardian";
  return "Parent";
}

export function normalizeStudentGender(raw?: string | null): NormalizedStudentGender {
  const clean = String(raw || "").trim().toLowerCase();
  if (clean === "male" || clean === "m") return "male";
  if (clean === "female" || clean === "f") return "female";
  return "other";
}

function normalizePhoneCompare(raw?: string | null): string {
  return String(raw || "").replace(/[^\d+]/g, "").trim();
}

function splitNameParts(fullName: string): { first_name: string; last_name: string } {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "Student", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function isColumnError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || "").trim();
  const msg = String(err.message || "").toLowerCase();
  return code === "42703" || code === "PGRST204" || msg.includes("column");
}

function isMissingTableError(err: any): boolean {
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

export interface LiveStudentUpsertInput {
  id: string;
  school_id: string;
  profile_id?: string | null;
  student_number: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  programme_id?: string | null;
  department_id?: string | null;
  intake_id?: string | null;
  current_level?: number;
  entry_term_id?: string | null;
  cohort_year?: number | null;
  status?: string;
  enrolled_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Reliably upserts a row into live Postgres `public.students` including `gender`,
 * gracefully downgrading only on missing optional columns or `status` CHECK differences,
 * and returning explicit success/error status instead of failing silently.
 */
export async function upsertLiveStudentRecord(
  directAdmin: ReturnType<typeof createDirectAdminClient>,
  input: LiveStudentUpsertInput
): Promise<{ ok: boolean; error: string | null }> {
  const safeGender = normalizeStudentGender(input.gender || input.metadata?.gender);
  const safeStatus = input.status || "active";
  const now = new Date().toISOString();

  const buildPayload = (tier: "full" | "mid" | "base", statusVal: string) => {
    const base: Record<string, any> = {
      id: input.id,
      school_id: input.school_id,
      student_number: input.student_number,
      first_name: input.first_name,
      last_name: input.last_name,
      gender: safeGender,
      status: statusVal,
      enrolled_at: input.enrolled_at || now.slice(0, 10),
      updated_at: now,
    };
    if (tier === "base") return base;

    const mid: Record<string, any> = {
      ...base,
      profile_id: input.profile_id || null,
      email: input.email || null,
      phone: input.phone || null,
      programme_id: input.programme_id || null,
      department_id: input.department_id || null,
      intake_id: input.intake_id || null,
      current_level: input.current_level ?? 100,
    };
    if (tier === "mid") return mid;

    return {
      ...mid,
      ...(input.entry_term_id !== undefined ? { entry_term_id: input.entry_term_id } : {}),
      ...(input.cohort_year !== undefined ? { cohort_year: input.cohort_year } : {}),
      metadata: {
        ...(input.metadata || {}),
        gender: safeGender,
      },
    };
  };

  let lastError: any = null;
  for (const tier of ["full", "mid", "base"] as const) {
    const payload = buildPayload(tier, safeStatus);
    const { error } = await (directAdmin as any)
      .from("students")
      .upsert(payload, { onConflict: "id" });

    if (!error) {
      return { ok: true, error: null };
    }

    lastError = error;
    if (isColumnError(error)) {
      continue;
    }

    // If CHECK constraint on status rejected e.g. 'active', retry with 'enrolled' once
    if (
      String(error.code || "") === "23514" &&
      String(error.message || "").toLowerCase().includes("status") &&
      safeStatus !== "enrolled"
    ) {
      const retryPayload = buildPayload(tier, "enrolled");
      const retryRes = await (directAdmin as any)
        .from("students")
        .upsert(retryPayload, { onConflict: "id" });
      if (!retryRes.error) {
        return { ok: true, error: null };
      }
      lastError = retryRes.error;
    }

    break;
  }

  return {
    ok: false,
    error: lastError?.message || "Failed to save live public.students row.",
  };
}

export interface UpsertParentGuardianParams {
  directAdmin: ReturnType<typeof createDirectAdminClient>;
  virtualAdmin?: ReturnType<typeof createAdminClient>;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  studentId?: string | null;
  liveStudentExists?: boolean;
  fullName: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
  occupation?: string | null;
  address?: string | null;
  isPrimaryContact?: boolean;
  status?: string;
  createPortalAccount?: boolean;
  parentPassword?: string | null;
}

export interface UpsertParentGuardianResult {
  record: any | null;
  linkedExistingParent: boolean;
  provisionedPortalAccount: boolean;
  warning: string | null;
}

/**
 * Deduplicates by `(school_id, email)` and `(school_id, phone)` so siblings cleanly
 * share one `public.parent_guardians` record without unique-email errors or orphaned rows,
 * optionally provisions the Parent Auth/Profile account (`role = 'parent'`), and links the
 * student via both `student_id` (if unassigned) and `public.parent_guardian_students`.
 */
export async function upsertParentGuardianForStudent(
  params: UpsertParentGuardianParams
): Promise<UpsertParentGuardianResult> {
  const {
    directAdmin,
    virtualAdmin,
    schoolId,
    schoolName = "",
    schoolCode = "",
    studentId = null,
    liveStudentExists = false,
    fullName,
    relationship,
    phone,
    email,
    occupation,
    address,
    isPrimaryContact = true,
    status = "active",
    createPortalAccount = false,
    parentPassword = "",
  } = params;

  const cleanName = String(fullName || "").trim();
  if (!cleanName) {
    return {
      record: null,
      linkedExistingParent: false,
      provisionedPortalAccount: false,
      warning: null,
    };
  }

  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPhone = String(phone || "").trim();
  const normPhone = normalizePhoneCompare(cleanPhone);
  const cleanRel = normalizeGuardianRelationship(relationship);
  const cleanStatus = status === "inactive" ? "inactive" : "active";

  // 1. Look up existing parent_guardians rows in this school to avoid duplicates across siblings
  const { data: schoolParents, error: fetchParentsErr } = await (directAdmin as any)
    .from("parent_guardians")
    .select("*")
    .eq("school_id", schoolId);

  if (fetchParentsErr) {
    return {
      record: null,
      linkedExistingParent: false,
      provisionedPortalAccount: false,
      warning: isMissingTableError(fetchParentsErr)
        ? "Live table public.parent_guardians is missing. Run Supabase migration 20261124000003."
        : fetchParentsErr.message,
    };
  }

  const parentsList: any[] = Array.isArray(schoolParents) ? schoolParents : [];
  let existingParent: any = null;

  if (cleanEmail) {
    existingParent =
      parentsList.find(
        (p) => String(p.email || "").trim().toLowerCase() === cleanEmail
      ) || null;
  }

  if (!existingParent && normPhone) {
    existingParent =
      parentsList.find(
        (p) => normalizePhoneCompare(p.phone) === normPhone && normPhone.length >= 5
      ) || null;
  }

  if (!existingParent && studentId && !cleanEmail && !normPhone) {
    existingParent =
      parentsList.find((p) => String(p.student_id || "") === String(studentId)) ||
      null;
  }

  // 2. Check existing public.profiles in the same school for a matching parent user account
  let parentUserId: string | null = existingParent?.user_id || null;
  let provisionedPortalAccount = false;
  let portalWarning: string | null = null;
  let emailOwnedByDifferentRole = false;

  if (cleanEmail && !parentUserId) {
    const { data: existingProf } = await (directAdmin as any)
      .from("profiles")
      .select("id, school_id, role")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingProf?.id) {
      const profRole = String(existingProf.role || "").toLowerCase();
      const sameSchool =
        !existingProf.school_id ||
        String(existingProf.school_id).toLowerCase() === schoolId.toLowerCase();

      if (!sameSchool) {
        emailOwnedByDifferentRole = true;
        portalWarning = `Parent email "${cleanEmail}" belongs to another school institution.`;
      } else if (profRole === "parent") {
        parentUserId = existingProf.id;
      } else if (profRole) {
        emailOwnedByDifferentRole = true;
        portalWarning = `Email "${cleanEmail}" is already registered with role "${profRole}"; skipped changing its login role to parent.`;
      }
    }
  }

  if (createPortalAccount && cleanEmail && !emailOwnedByDifferentRole) {
    try {
      const pProv = await provisionLiveTenantUser({
        existingUserId: parentUserId || undefined,
        email: cleanEmail,
        password:
          parentPassword && parentPassword.trim().length >= 6
            ? parentPassword.trim()
            : undefined,
        fullName: cleanName,
        phone: cleanPhone || null,
        roleCode: "parent",
        schoolId,
        schoolName,
        schoolCode,
        accountStatus: cleanStatus,
      });
      parentUserId = pProv.userId;
      provisionedPortalAccount = true;

      if (virtualAdmin) {
        await syncVirtualProfileAndRole(virtualAdmin, {
          userId: pProv.userId,
          email: cleanEmail,
          fullName: cleanName,
          phone: cleanPhone || null,
          roleCode: "parent",
          schoolId,
          schoolName,
          schoolCode,
          accountStatus: cleanStatus,
        }).catch(() => {});
      }
    } catch (provErr: any) {
      portalWarning = provErr?.message || "Could not provision Parent Portal login.";
    }
  }

  // 3. Insert or update `public.parent_guardians`
  let savedParent: any = null;
  let linkedExistingParent = false;

  if (existingParent?.id) {
    linkedExistingParent = true;
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (!existingParent.user_id && parentUserId) updates.user_id = parentUserId;
    if (!existingParent.email && cleanEmail) updates.email = cleanEmail;
    if ((!existingParent.phone || !String(existingParent.phone).trim()) && cleanPhone) {
      updates.phone = cleanPhone;
    }
    if (!existingParent.full_name && cleanName) updates.full_name = cleanName;
    if (
      !existingParent.student_id &&
      liveStudentExists &&
      studentId
    ) {
      updates.student_id = studentId;
    }
    if (occupation && !existingParent.occupation) updates.occupation = String(occupation).trim();
    if (address && !existingParent.address) updates.address = String(address).trim();

    const { data: updatedRow, error: updErr } = await (directAdmin as any)
      .from("parent_guardians")
      .update(updates)
      .eq("id", existingParent.id)
      .eq("school_id", schoolId)
      .select("*")
      .single();

    if (updErr) {
      return {
        record: null,
        linkedExistingParent: false,
        provisionedPortalAccount,
        warning: updErr.message,
      };
    }
    savedParent = updatedRow || existingParent;
  } else {
    const insertPayload: Record<string, any> = {
      school_id: schoolId,
      user_id: parentUserId,
      full_name: cleanName,
      email: cleanEmail || null,
      phone: cleanPhone || "", // Keep non-null for pre-migration safety
      relationship: cleanRel,
      occupation: occupation ? String(occupation).trim() : null,
      address: address ? String(address).trim() : null,
      student_id: liveStudentExists && studentId ? studentId : null,
      is_primary_contact: Boolean(isPrimaryContact),
      status: cleanStatus,
    };

    const { data: insertedRow, error: insErr } = await (directAdmin as any)
      .from("parent_guardians")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insErr) {
      return {
        record: null,
        linkedExistingParent: false,
        provisionedPortalAccount,
        warning: insErr.message,
      };
    }
    savedParent = insertedRow;
  }

  // 4. Link student in `public.parent_guardian_students` join table when available
  if (savedParent?.id && liveStudentExists && studentId) {
    try {
      const { error: joinErr } = await (directAdmin as any)
        .from("parent_guardian_students")
        .upsert(
          {
            school_id: schoolId,
            parent_guardian_id: savedParent.id,
            student_id: studentId,
            relationship: cleanRel,
            is_primary_contact: Boolean(isPrimaryContact),
          },
          { onConflict: "school_id,parent_guardian_id,student_id" }
        );
      if (joinErr && !isMissingTableError(joinErr)) {
        portalWarning = portalWarning
          ? `${portalWarning}; ${joinErr.message}`
          : joinErr.message;
      }
    } catch {
      // Join table optional prior to migration 20261124000007
    }
  }

  return {
    record: savedParent,
    linkedExistingParent,
    provisionedPortalAccount,
    warning: portalWarning,
  };
}

/**
 * Reconciles missing live `public.students` rows from `public.profiles` (`role = 'student'`)
 * and backfills embedded parent/guardian details + orphan `role = 'parent'` profiles into
 * `public.parent_guardians` and `public.parent_guardian_students` for a single `school_id`.
 */
export async function backfillSchoolStudentsAndParents(params: {
  directAdmin: ReturnType<typeof createDirectAdminClient>;
  virtualAdmin?: ReturnType<typeof createAdminClient>;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
}): Promise<{
  syncedStudents: number;
  syncedParents: number;
  linkedSiblings: number;
  warnings: string[];
}> {
  const { directAdmin, virtualAdmin, schoolId, schoolName = "", schoolCode = "" } = params;
  const warnings: string[] = [];
  let syncedStudents = 0;
  let syncedParents = 0;
  let linkedSiblings = 0;

  const [studentsRes, profilesRes, parentsRes] = await Promise.all([
    (directAdmin as any).from("students").select("*").eq("school_id", schoolId),
    (directAdmin as any).from("profiles").select("*").eq("school_id", schoolId),
    (directAdmin as any).from("parent_guardians").select("*").eq("school_id", schoolId),
  ]);

  if (parentsRes.error && isMissingTableError(parentsRes.error)) {
    return {
      syncedStudents: 0,
      syncedParents: 0,
      linkedSiblings: 0,
      warnings: ["Live table public.parent_guardians does not exist yet."],
    };
  }

  let liveStudents: any[] = Array.isArray(studentsRes.data) ? studentsRes.data : [];
  const schoolProfiles: any[] = Array.isArray(profilesRes.data) ? profilesRes.data : [];

  // A) Sync any student profiles missing from live `public.students`
  const existingByProfileId = new Set(
    liveStudents.filter((s) => s.profile_id).map((s) => String(s.profile_id))
  );
  const existingByEmail = new Set(
    liveStudents
      .filter((s) => s.email)
      .map((s) => String(s.email).trim().toLowerCase())
  );

  for (const prof of schoolProfiles) {
    if (String(prof.role || "").toLowerCase() !== "student") continue;
    const profEmail = String(prof.email || "").trim().toLowerCase();
    if (
      existingByProfileId.has(String(prof.id)) ||
      (profEmail && existingByEmail.has(profEmail))
    ) {
      continue;
    }

    const spMeta =
      prof.metadata?.student_profile && typeof prof.metadata.student_profile === "object"
        ? prof.metadata.student_profile
        : {};
    const { first_name, last_name } = splitNameParts(prof.full_name || profEmail || "Student");
    const studentNumber =
      String(spMeta.student_number || "").trim().toUpperCase() ||
      `STU-${String(prof.id).slice(0, 8).toUpperCase()}`;

    const stuUpsert = await upsertLiveStudentRecord(directAdmin, {
      id: prof.id,
      school_id: schoolId,
      profile_id: prof.id,
      student_number: studentNumber,
      first_name,
      last_name,
      email: profEmail || null,
      phone: prof.phone || null,
      gender: spMeta.gender || "other",
      status: prof.account_status === "suspended" ? "suspended" : "active",
      enrolled_at: String(prof.created_at || new Date().toISOString()).slice(0, 10),
      metadata: spMeta,
    });

    if (stuUpsert.ok) {
      syncedStudents++;
      existingByProfileId.add(String(prof.id));
      if (profEmail) existingByEmail.add(profEmail);
    } else if (stuUpsert.error) {
      warnings.push(`Student ${studentNumber}: ${stuUpsert.error}`);
    }
  }

  // Reload live students so FK references are accurate
  if (syncedStudents > 0) {
    const refreshed = await (directAdmin as any)
      .from("students")
      .select("*")
      .eq("school_id", schoolId);
    if (Array.isArray(refreshed.data)) {
      liveStudents = refreshed.data;
    }
  }

  // B) Sync embedded guardian details from every student in `public.students`
  for (const stu of liveStudents) {
    const meta = stu.metadata && typeof stu.metadata === "object" ? stu.metadata : {};
    const guardianName = String(
      meta.guardian_name || meta.parent_name || meta.next_of_kin_name || ""
    ).trim();
    if (!guardianName) continue;

    const guardianEmail = String(meta.guardian_email || meta.parent_email || "")
      .trim()
      .toLowerCase();
    const guardianPhone = String(
      meta.guardian_phone || meta.parent_phone || meta.next_of_kin_phone || ""
    ).trim();
    const guardianRel = String(
      meta.guardian_relationship || meta.parent_relationship || "Parent"
    ).trim();

    const res = await upsertParentGuardianForStudent({
      directAdmin,
      virtualAdmin,
      schoolId,
      schoolName,
      schoolCode,
      studentId: stu.id,
      liveStudentExists: true,
      fullName: guardianName,
      relationship: guardianRel,
      phone: guardianPhone,
      email: guardianEmail,
      createPortalAccount: false,
    });

    if (res.warning) {
      warnings.push(res.warning);
    }
    if (res.record) {
      if (res.linkedExistingParent) linkedSiblings++;
      else syncedParents++;
    }
  }

  // C) Ensure any standalone `role = 'parent'` profile without a `parent_guardians` row gets one
  const refreshedParentsRes = await (directAdmin as any)
    .from("parent_guardians")
    .select("id, user_id, email")
    .eq("school_id", schoolId);
  const existingParentsList: any[] = Array.isArray(refreshedParentsRes.data)
    ? refreshedParentsRes.data
    : [];

  for (const prof of schoolProfiles) {
    if (String(prof.role || "").toLowerCase() !== "parent") continue;
    const pEmail = String(prof.email || "").trim().toLowerCase();
    const alreadyMapped = existingParentsList.some(
      (pg) =>
        String(pg.user_id || "") === String(prof.id) ||
        (pEmail && String(pg.email || "").trim().toLowerCase() === pEmail)
    );
    if (alreadyMapped) continue;

    const res = await upsertParentGuardianForStudent({
      directAdmin,
      virtualAdmin,
      schoolId,
      schoolName,
      schoolCode,
      studentId: null,
      liveStudentExists: false,
      fullName: prof.full_name || pEmail || "Parent / Guardian",
      relationship: "Parent",
      phone: prof.phone || "",
      email: pEmail,
      createPortalAccount: false,
    });
    if (res.record) {
      await (directAdmin as any)
        .from("parent_guardians")
        .update({ user_id: prof.id })
        .eq("id", res.record.id)
        .is("user_id", null);
      syncedParents++;
    }
    if (res.warning) warnings.push(res.warning);
  }

  return { syncedStudents, syncedParents, linkedSiblings, warnings };
}
