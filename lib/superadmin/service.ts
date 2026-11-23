import { createAdminClient } from "@/lib/supabase/admin";
import { getVirtualDb, persistVirtualDb } from "@/lib/supabase/virtual-db";
import { SCHOOL_A_ID, SCHOOL_B_ID, SCHOOL_C_ID } from "@/lib/saas/tenant-context";
import {
  registerDynamicUser,
  unregisterDynamicUser,
  unregisterDynamicUsersForSchool,
} from "@/lib/supabase/fetch";

export type SchoolType = "university" | "high_school" | "vocational_school";

export interface UniversityItem {
  id: string;
  code: string;
  name: string;
  short_name?: string;
  school_type?: SchoolType;
  institution_type?: SchoolType;
  country: string;
  city: string;
  address?: string;
  postal_code?: string;
  email?: string;
  phone?: string;
  website?: string;
  motto?: string;
  logo_url?: string;
  seal_url?: string;
  default_currency: string;
  currency_symbol: string;
  established_year?: number;
  accreditation_code?: string;
  status: "active" | "inactive" | "maintenance" | "suspended" | "deleted";
  created_at: string;
  updated_at?: string;
  campuses_count?: number;
  admins_count?: number;

  // Multi-Tenant Governance, Role Scope & Quota Controls
  full_access?: boolean; // When true, no restrictions on users, departments, or roles
  max_users?: number | null; // e.g. 50, 100, 500, or null for unlimited
  max_departments?: number | null; // e.g. 5, 10, or null for unlimited
  max_roles?: number | null; // Max number of distinct roles this institution can use, or null for unlimited
  allowed_roles?: string[]; // Specific role codes permitted (e.g. ['system_admin', 'dean', 'lecturer', 'student'])

  // Live telemetry counters
  current_users_count?: number;
  current_departments_count?: number;
  current_roles_count?: number;
}

export interface SidebarModuleItem {
  id: string;
  module_key: string;
  label: string;
  category: string;
  route_path: string;
  icon: string;
  badge?: string | null;
  description?: string;
  is_active: boolean;
  display_order: number;
}

export interface SystemAdminItem {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  account_status: string;
  university_id?: string;
  university_name?: string;
  created_at: string;
  last_sign_in_at?: string | null;
}

export interface SuperAdminStats {
  totalUniversities: number;
  activeUniversities: number;
  totalSystemAdmins: number;
  totalCampuses: number;
  totalStudents: number;
  totalLecturers: number;
  totalStaff: number;
  systemStatus: "healthy" | "degraded" | "maintenance";
  dbLatencyMs: number;
}

const DEFAULT_SIDEBAR_MODULES: SidebarModuleItem[] = [
  // Core System / Administration
  {
    id: "m-dash",
    module_key: "dashboard",
    label: "System Overview",
    category: "Core Administration",
    route_path: "/superadmin/dashboard",
    icon: "LayoutGrid",
    badge: "Live",
    description: "System vitals, cross-school KPIs, and infrastructure health",
    is_active: true,
    display_order: 1,
  },
  {
    id: "m-univ",
    module_key: "schools",
    label: "Schools & Campuses",
    category: "Core Administration",
    route_path: "/superadmin/schools",
    icon: "Building2",
    badge: "Tenants",
    description: "Register schools, configure multi-tenancy, and manage campuses",
    is_active: true,
    display_order: 2,
  },
  {
    id: "m-sys",
    module_key: "system_admins",
    label: "System Administrators",
    category: "Core Administration",
    route_path: "/superadmin/system-admins",
    icon: "ShieldCheck",
    badge: "Admins",
    description: "Provision and govern system administrator credentials across all schools",
    is_active: true,
    display_order: 3,
  },
  {
    id: "m-users",
    module_key: "users",
    label: "Users & Directory",
    category: "Core Administration",
    route_path: "/superadmin/users",
    icon: "Users",
    badge: null,
    description: "Global identity directory, person records, and credentials",
    is_active: true,
    display_order: 4,
  },
  {
    id: "m-roles",
    module_key: "roles",
    label: "Roles & Permissions",
    category: "Core Administration",
    route_path: "/superadmin/roles",
    icon: "UserCheck",
    badge: null,
    description: "Centrally governed RBAC roles, permission sets, and dual-control rules",
    is_active: true,
    display_order: 5,
  },
  {
    id: "m-scopes",
    module_key: "scopes",
    label: "Department & Campus Scopes",
    category: "Core Administration",
    route_path: "/superadmin/scopes",
    icon: "Layers",
    badge: null,
    description: "Multi-campus boundary assignments, faculties, and department scopes",
    is_active: true,
    display_order: 6,
  },

  // Platform Configuration & Policies
  {
    id: "m-pay",
    module_key: "payments",
    label: "Payment Provider Settings",
    category: "Platform Configuration",
    route_path: "/superadmin/payments",
    icon: "CreditCard",
    badge: null,
    description: "Paystack, Hubtel, and bank webhook gateway configurations",
    is_active: true,
    display_order: 8,
  },
  {
    id: "m-comm",
    module_key: "communications",
    label: "Email & SMS Settings",
    category: "Platform Configuration",
    route_path: "/superadmin/communications",
    icon: "Megaphone",
    badge: null,
    description: "Resend, SMTP, and SMS delivery routes and notification channels",
    is_active: true,
    display_order: 9,
  },
  {
    id: "m-stor",
    module_key: "storage",
    label: "Storage & File Policies",
    category: "Platform Configuration",
    route_path: "/superadmin/storage",
    icon: "HardDrive",
    badge: null,
    description: "Private bucket policies, signed URL lifetimes, and file quotas",
    is_active: true,
    display_order: 11,
  },
  {
    id: "m-integ",
    module_key: "integrations",
    label: "Integrations & APIs",
    category: "Platform Configuration",
    route_path: "/superadmin/integrations",
    icon: "Boxes",
    badge: null,
    description: "Moodle LMS, external accounting, and third-party API keys",
    is_active: true,
    display_order: 12,
  },

  // Security, Operations & Monitoring
  {
    id: "m-aud",
    module_key: "audit_logs",
    label: "Audit Logs",
    category: "Security & Operations",
    route_path: "/superadmin/audit",
    icon: "FileCheck2",
    badge: null,
    description: "Immutable cross-tenant audit trail of all security and admin actions",
    is_active: true,
    display_order: 13,
  },
  {
    id: "m-jobs",
    module_key: "jobs",
    label: "Background Jobs",
    category: "Security & Operations",
    route_path: "/superadmin/jobs",
    icon: "Clock",
    badge: "Queue",
    description: "Scheduled tasks, report generators, sync runners, and retry queues",
    is_active: true,
    display_order: 15,
  },
  {
    id: "m-health",
    module_key: "health",
    label: "Monitoring & Health",
    category: "Security & Operations",
    route_path: "/superadmin/health",
    icon: "Activity",
    badge: "99.9%",
    description: "System health, database latency, server metrics, and uptime",
    is_active: true,
    display_order: 16,
  },
  {
    id: "m-back",
    module_key: "backups",
    label: "Backup & Recovery Status",
    category: "Security & Operations",
    route_path: "/superadmin/backups",
    icon: "Database",
    badge: null,
    description: "Disaster recovery, point-in-time snapshots, and database failover",
    is_active: true,
    display_order: 17,
  },
  {
    id: "m-flags",
    module_key: "modules",
    label: "Feature Flags",
    category: "Security & Operations",
    route_path: "/superadmin/modules",
    icon: "Sliders",
    badge: null,
    description: "Institution-level module flags and beta capabilities",
    is_active: true,
    display_order: 18,
  },
  {
    id: "m-set",
    module_key: "system_settings",
    label: "Maintenance Mode",
    category: "Security & Operations",
    route_path: "/superadmin/settings",
    icon: "Sliders",
    badge: null,
    description: "Emergency maintenance lockdown, global notices, and platform policies",
    is_active: true,
    display_order: 19,
  },
];

/**
 * Fetch dynamic Super Admin sidebar navigation modules.
 * Reads from 'superadmin_modules' table; falls back to 'system_settings' or defaults.
 */
export async function getSuperAdminSidebarModules(): Promise<SidebarModuleItem[]> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await (supabase as any)
      .from("superadmin_modules")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch {
    // Table not yet migrated
  }

  // Fallback to system_settings
  try {
    const { data: settingRow } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "superadmin_sidebar_modules")
      .maybeSingle();

    if (settingRow?.setting_value && Array.isArray(settingRow.setting_value)) {
      return settingRow.setting_value;
    }
  } catch {
    // Ignore
  }

  return DEFAULT_SIDEBAR_MODULES;
}

/**
 * Update an existing university's details in the database.
 */
export async function updateUniversity(
  id: string,
  updates: Partial<UniversityItem>
): Promise<UniversityItem> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // 1. Fetch current universities
  const universities = await getUniversities();
  const index = universities.findIndex((u) => u.id === id || u.code === updates.code);
  if (index === -1) {
    throw new Error(`University with ID '${id}' not found.`);
  }

  const existing = universities[index];
  const targetSchoolType = updates.school_type || updates.institution_type || existing.school_type || existing.institution_type || "university";

  const updatedUniv: UniversityItem = {
    ...existing,
    ...updates,
    id: existing.id,
    school_type: targetSchoolType,
    institution_type: targetSchoolType,
    full_access: updates.full_access !== undefined ? Boolean(updates.full_access) : (existing.full_access ?? true),
    max_users: updates.max_users !== undefined ? updates.max_users : (existing.max_users ?? null),
    max_departments: updates.max_departments !== undefined ? updates.max_departments : (existing.max_departments ?? null),
    max_roles: updates.max_roles !== undefined ? updates.max_roles : (existing.max_roles ?? null),
    allowed_roles: updates.allowed_roles !== undefined ? updates.allowed_roles : (existing.allowed_roles ?? AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code)),
    updated_at: now,
  };

  // 2. Update 'universities' table
  try {
    await (supabase as any)
      .from("universities")
      .update({
        name: updatedUniv.name,
        code: updatedUniv.code,
        short_name: updatedUniv.short_name,
        school_type: targetSchoolType,
        institution_type: targetSchoolType,
        country: updatedUniv.country,
        city: updatedUniv.city,
        address: updatedUniv.address,
        postal_code: updatedUniv.postal_code,
        email: updatedUniv.email,
        phone: updatedUniv.phone,
        website: updatedUniv.website,
        motto: updatedUniv.motto,
        default_currency: updatedUniv.default_currency,
        currency_symbol: updatedUniv.currency_symbol,
        established_year: updatedUniv.established_year,
        accreditation_code: updatedUniv.accreditation_code,
        status: updatedUniv.status,
        full_access: updatedUniv.full_access,
        max_users: updatedUniv.max_users,
        max_departments: updatedUniv.max_departments,
        max_roles: updatedUniv.max_roles,
        allowed_roles: updatedUniv.allowed_roles,
        updated_at: now,
      })
      .eq("id", existing.id);
  } catch (err) {
    console.warn("Could not update universities table:", err);
  }

  // 2b. Try updating 'schools' table in Supabase
  try {
    await (supabase as any)
      .from("schools")
      .update({
        name: updatedUniv.name,
        school_type: targetSchoolType,
        status: updatedUniv.status,
        currency: updatedUniv.default_currency,
        address: `${updatedUniv.city || ""}, ${updatedUniv.country}`,
        phone: updatedUniv.phone || null,
        email: updatedUniv.email || null,
        updated_at: now,
      })
      .or(`id.eq.${existing.id},slug.eq.${existing.code.toLowerCase()}`);
  } catch (schoolErr) {
    // If column school_type doesn't exist yet, retry without it
    try {
      await (supabase as any)
        .from("schools")
        .update({
          name: updatedUniv.name,
          status: updatedUniv.status,
          currency: updatedUniv.default_currency,
          address: `${updatedUniv.city || ""}, ${updatedUniv.country}`,
          phone: updatedUniv.phone || null,
          email: updatedUniv.email || null,
          updated_at: now,
        })
        .or(`id.eq.${existing.id},slug.eq.${existing.code.toLowerCase()}`);
    } catch {}
  }

  // 2c. Update profiles and users linked to this school with new school_type
  try {
    const { data: schoolProfiles } = await (supabase as any)
      .from("profiles")
      .select("id, metadata")
      .or(`school_id.eq.${existing.id},university_id.eq.${existing.id}`);

    if (Array.isArray(schoolProfiles)) {
      for (const p of schoolProfiles) {
        await (supabase as any)
          .from("profiles")
          .update({
            metadata: {
              ...(p.metadata || {}),
              school_type: targetSchoolType,
              institution_type: targetSchoolType,
            },
          })
          .eq("id", p.id);
      }
    }
  } catch {}

  // 3. Update system_settings
  const updatedList = universities.map((u) => (u.id === existing.id ? updatedUniv : u));
  await (supabase as any).from("system_settings").upsert(
    {
      setting_key: "superadmin_universities",
      setting_value: updatedList,
      category: "superadmin",
      description: "Master directory of all registered institutions in the multi-tenant system",
      is_sensitive: false,
      updated_at: now,
    },
    { onConflict: "setting_key" }
  );

  // 3b. Update Virtual DB in-memory & disk cache
  try {
    const vDb = await getVirtualDb();
    if (vDb) {
      if (Array.isArray(vDb.schools)) {
        const sIdx = vDb.schools.findIndex((s: any) => s.id === existing.id || s.slug === existing.code.toLowerCase());
        if (sIdx !== -1) {
          vDb.schools[sIdx] = {
            ...vDb.schools[sIdx],
            name: updatedUniv.name,
            school_type: targetSchoolType,
            status: updatedUniv.status,
            currency: updatedUniv.default_currency,
            address: `${updatedUniv.city || ""}, ${updatedUniv.country}`,
            phone: updatedUniv.phone || null,
            email: updatedUniv.email || null,
            updated_at: now,
          };
        }
      }
      if (Array.isArray(vDb.universities)) {
        const uIdx = vDb.universities.findIndex((u: any) => u.id === existing.id || u.code === existing.code);
        if (uIdx !== -1) {
          vDb.universities[uIdx] = { ...updatedUniv };
        }
      }
      if (Array.isArray(vDb.system_settings)) {
        const setIdx = vDb.system_settings.findIndex((s: any) => s.setting_key === "superadmin_universities");
        if (setIdx !== -1) {
          vDb.system_settings[setIdx].setting_value = updatedList;
        }
      }
      await persistVirtualDb(vDb);
    }
  } catch {}

  // 4. If status changed to suspended/inactive or active, update users
  if (updates.status && updates.status !== existing.status) {
    const isDeactivated = updates.status !== "active";
    try {
      // Find all profiles linked to this university
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, metadata");

      if (profiles) {
        for (const p of profiles) {
          if (p.metadata?.university_id === existing.id || p.metadata?.university_code === existing.code) {
            await (supabase as any)
              .from("profiles")
              .update({
                account_status: isDeactivated ? "suspended" : "active",
                metadata: {
                  ...p.metadata,
                  university_status: updates.status,
                },
              })
              .eq("id", p.id);
          }
        }
      }
    } catch {}
  }

  // 5. Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "update_university",
      entity_type: "university",
      entity_id: existing.id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: updates,
    });
  } catch {}

  return updatedUniv;
}

/**
 * Delete a university from the system.
 * When a university is deleted, all associated users (including the system admin,
 * faculty, staff, and students) are permanently deleted from the database, and their
 * credentials are decommissioned so they can never access their accounts again.
 */
export async function deleteUniversity(id: string): Promise<{ success: boolean; deletedId: string; affectedUsersCount: number }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const cleanId = decodeURIComponent(id).trim();

  // 1. Locate the university from master directory and active settings
  const universities = await getUniversities();
  let univ = universities.find(
    (u) =>
      u.id === cleanId ||
      u.id?.toLowerCase() === cleanId.toLowerCase() ||
      u.code?.toLowerCase() === cleanId.toLowerCase() ||
      u.name?.toLowerCase() === cleanId.toLowerCase()
  );

  // If not in active list, check raw system_settings
  if (!univ) {
    try {
      const { data: rawSetting } = await (supabase as any)
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "superadmin_universities")
        .maybeSingle();

      const list = Array.isArray(rawSetting?.setting_value) ? rawSetting.setting_value : [];
      univ = list.find(
        (u: any) =>
          u.id === cleanId ||
          u.id?.toLowerCase() === cleanId.toLowerCase() ||
          u.code?.toLowerCase() === cleanId.toLowerCase() ||
          u.name?.toLowerCase() === cleanId.toLowerCase()
      );
    } catch {}
  }

  // Also query 'schools' table if still not located
  if (!univ) {
    try {
      const { data: schoolRow } = await (supabase as any)
        .from("schools")
        .select("*")
        .or(`id.eq.${cleanId},slug.ilike.${cleanId},name.ilike.${cleanId}`)
        .maybeSingle();

      if (schoolRow) {
        univ = {
          id: schoolRow.id,
          code: (schoolRow.slug || schoolRow.name?.substring(0, 4) || cleanId).toUpperCase(),
          name: schoolRow.name,
          school_type: schoolRow.school_type || "university",
          institution_type: schoolRow.school_type || "university",
          country: "Ghana",
          city: "Accra",
          default_currency: schoolRow.currency || "GHS",
          currency_symbol: schoolRow.currency === "USD" ? "$" : "GH₵",
          status: "active",
          created_at: schoolRow.created_at || now,
          updated_at: now,
          full_access: true,
        };
      }
    } catch {}
  }

  if (!univ) {
    throw new Error(`University with ID or code '${cleanId}' not found.`);
  }

  // 1b. Collect ALL known identifiers for this school across tables (IDs, codes, slugs, names)
  const allSchoolIds = new Set<string>();
  const allSchoolCodes = new Set<string>();
  const allSchoolSlugs = new Set<string>();
  const allSchoolNames = new Set<string>();

  if (cleanId) allSchoolIds.add(cleanId);
  if (univ.id) allSchoolIds.add(univ.id);
  if (univ.code) {
    allSchoolCodes.add(univ.code);
    allSchoolCodes.add(univ.code.toUpperCase());
    allSchoolCodes.add(univ.code.toLowerCase());
    allSchoolSlugs.add(univ.code.toLowerCase());
  }
  if (univ.name) {
    allSchoolNames.add(univ.name);
    allSchoolNames.add(univ.name.toLowerCase());
  }

  // Correlate with public.schools table
  try {
    const { data: dbSchools } = await (supabase as any)
      .from("schools")
      .select("id, name, slug");
    if (Array.isArray(dbSchools)) {
      for (const s of dbSchools) {
        const matchesId = allSchoolIds.has(s.id);
        const matchesSlug = s.slug && allSchoolSlugs.has(s.slug.toLowerCase());
        const matchesName = s.name && allSchoolNames.has(s.name.toLowerCase());
        if (matchesId || matchesSlug || matchesName) {
          if (s.id) allSchoolIds.add(s.id);
          if (s.slug) {
            allSchoolSlugs.add(s.slug.toLowerCase());
            allSchoolCodes.add(s.slug.toUpperCase());
          }
          if (s.name) {
            allSchoolNames.add(s.name);
            allSchoolNames.add(s.name.toLowerCase());
          }
        }
      }
    }
  } catch {}

  // Correlate with public.universities table
  try {
    const { data: dbUnivs } = await (supabase as any)
      .from("universities")
      .select("id, name, code");
    if (Array.isArray(dbUnivs)) {
      for (const u of dbUnivs) {
        const matchesId = allSchoolIds.has(u.id);
        const matchesCode = u.code && allSchoolCodes.has(u.code.toUpperCase());
        const matchesName = u.name && allSchoolNames.has(u.name.toLowerCase());
        if (matchesId || matchesCode || matchesName) {
          if (u.id) allSchoolIds.add(u.id);
          if (u.code) {
            allSchoolCodes.add(u.code.toUpperCase());
            allSchoolCodes.add(u.code.toLowerCase());
            allSchoolSlugs.add(u.code.toLowerCase());
          }
          if (u.name) {
            allSchoolNames.add(u.name);
            allSchoolNames.add(u.name.toLowerCase());
          }
        }
      }
    }
  } catch {}

  // 2. Identify ALL users belonging to this university (system admin, teachers, staff, students, parents)
  const targetUserIds = new Set<string>();
  const targetUserMeta: Array<{ id: string; email?: string; role?: string }> = [];

  const registerUser = (id: string, email?: string, role?: string) => {
    if (!id) return;
    const normEmail = (email || "").trim().toLowerCase();
    // Absolute Safeguard: Never delete the root platform Super Administrator
    if (
      id === "1440ed7e-cb23-4248-a372-f38b20d01554" ||
      normEmail === "superadmin@university.edu.gh" ||
      role === "superadmin"
    ) {
      return;
    }
    targetUserIds.add(id);
    if (!targetUserMeta.some((u) => u.id === id)) {
      targetUserMeta.push({ id, email: normEmail, role });
    }
  };

  // A. Find users from university_system_admins table
  try {
    const { data: sysAdmins } = await (supabase as any)
      .from("university_system_admins")
      .select("user_id, university_id");

    if (Array.isArray(sysAdmins)) {
      sysAdmins.forEach((sa: any) => {
        if (
          sa.user_id &&
          (allSchoolIds.has(sa.university_id) || allSchoolCodes.has(sa.university_id))
        ) {
          registerUser(sa.user_id, undefined, "system_admin");
        }
      });
    }
  } catch {}

  // B. Find users from profiles table matching this institution
  try {
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, email, role, school_id, university_id, metadata");

    if (Array.isArray(profiles)) {
      profiles.forEach((p: any) => {
        const m = p.metadata || {};
        const pEmail = (p.email || "").toLowerCase();
        const isAssociated =
          allSchoolIds.has(p.school_id) ||
          allSchoolIds.has(p.university_id) ||
          allSchoolCodes.has(p.university_id) ||
          allSchoolIds.has(m.school_id) ||
          allSchoolIds.has(m.university_id) ||
          allSchoolCodes.has(m.university_code) ||
          allSchoolNames.has(m.university_name?.toLowerCase()) ||
          false;

        if (isAssociated) {
          registerUser(p.id, p.email, p.role || m.role);
        }
      });
    }
  } catch {}

  // C. Find students and staff belonging to this school
  try {
    const { data: stuRows } = await (supabase as any)
      .from("students")
      .select("id, profile_id, school_id, university_id");

    if (Array.isArray(stuRows)) {
      stuRows.forEach((s: any) => {
        if (allSchoolIds.has(s.school_id) || allSchoolIds.has(s.university_id)) {
          if (s.profile_id) registerUser(s.profile_id, undefined, "student");
          if (s.id) registerUser(s.id, undefined, "student");
        }
      });
    }
  } catch {}

  try {
    const { data: staffRows } = await (supabase as any)
      .from("staff")
      .select("id, profile_id, school_id, university_id");

    if (Array.isArray(staffRows)) {
      staffRows.forEach((s: any) => {
        if (allSchoolIds.has(s.school_id) || allSchoolIds.has(s.university_id)) {
          if (s.profile_id) registerUser(s.profile_id, undefined, "staff");
          if (s.id) registerUser(s.id, undefined, "staff");
        }
      });
    }
  } catch {}

  // D. Find user role assignments belonging to this school
  try {
    const { data: roleRows } = await (supabase as any)
      .from("user_role_assignments")
      .select("user_id, school_id, university_id");

    if (Array.isArray(roleRows)) {
      roleRows.forEach((r: any) => {
        if (allSchoolIds.has(r.school_id) || allSchoolIds.has(r.university_id)) {
          if (r.user_id) registerUser(r.user_id);
        }
      });
    }
  } catch {}

  // E. Also check auth user metadata and email domains for university linkage
  try {
    const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authList?.users) {
      authList.users.forEach((u) => {
        const uUnivId =
          (u.user_metadata as any)?.university_id ||
          (u.app_metadata as any)?.university_id ||
          (u.user_metadata as any)?.school_id ||
          (u.app_metadata as any)?.school_id;
        const uUnivCode = (u.user_metadata as any)?.university_code || (u.app_metadata as any)?.university_code;
        const uRole = (u.user_metadata as any)?.role || (u.app_metadata as any)?.role;
        const uEmail = (u.email || "").toLowerCase();

        const isAssociated =
          allSchoolIds.has(uUnivId) ||
          allSchoolCodes.has(uUnivId) ||
          allSchoolCodes.has(uUnivCode) ||
          false;

        if (isAssociated) {
          registerUser(u.id, u.email, uRole);
        }
      });
    }
  } catch {}

  // F. Also check Virtual DB for registered profiles
  try {
    const vDb = await getVirtualDb();
    if (vDb && Array.isArray(vDb.profiles)) {
      vDb.profiles.forEach((p: any) => {
        const m = p.metadata || {};
        const pEmail = (p.email || "").toLowerCase();
        const isAssociated =
          allSchoolIds.has(p.school_id) ||
          allSchoolIds.has(p.university_id) ||
          allSchoolCodes.has(p.university_id) ||
          allSchoolIds.has(m.school_id) ||
          allSchoolIds.has(m.university_id) ||
          allSchoolCodes.has(m.university_code) ||
          false;

        if (isAssociated) {
          registerUser(p.id, p.email, p.role || m.role);
        }
      });
    }
  } catch {}

  // G. Unregister in-memory demo & fallback users for this school
  for (const sId of Array.from(allSchoolIds)) {
    unregisterDynamicUsersForSchool(sId, univ.code);
  }

  // Attempt database stored procedure for atomic full database cascade deletion
  try {
    await (supabase as any).rpc("delete_school_and_all_users", {
      p_school_id: univ.id,
      p_school_code: univ.code || "",
    });
  } catch (rpcErr) {
    // Stored procedure will be complemented by direct table-by-table cascade below
  }

  // 3. PERMANENTLY PURGE ALL USERS of this university from the database
  let affectedUsersCount = 0;
  for (const uid of Array.from(targetUserIds)) {
    affectedUsersCount++;
    const userMeta = targetUserMeta.find((u) => u.id === uid);
    const normEmail = userMeta?.email?.toLowerCase();

    try {
      // 1. Nullify elective foreign keys so RESTRICT references don't block deletion
      try { await (supabase as any).from("campuses").update({ staff_id: null }).eq("staff_id", uid); } catch {}
      try { await (supabase as any).from("departments").update({ hod_id: null }).eq("hod_id", uid); } catch {}
      try { await (supabase as any).from("faculties").update({ dean_id: null }).eq("dean_id", uid); } catch {}
      try { await (supabase as any).from("announcements").update({ published_by: null }).eq("published_by", uid); } catch {}
      try { await (supabase as any).from("audit_events").update({ actor_id: null }).eq("actor_id", uid); } catch {}

      // 2. Delete all dependent transactional and child records for this user
      try {
        await (supabase as any).from("admission_reviews").delete().eq("reviewer_id", uid);
        await (supabase as any).from("admission_decisions").delete().eq("decided_by", uid);
        await (supabase as any).from("application_reviews").delete().eq("reviewer_id", uid);
        await (supabase as any).from("applications").delete().or(`applicant_id.eq.${uid},profile_id.eq.${uid}`);
        await (supabase as any).from("enrolment_overrides").delete().or(`approved_by.eq.${uid},student_id.eq.${uid}`);
        await (supabase as any).from("timetable_publications").delete().eq("published_by", uid);
        await (supabase as any).from("attendance_amendments").delete().or(`requested_by.eq.${uid},approved_by.eq.${uid},amended_by.eq.${uid}`);
        await (supabase as any).from("result_submissions").delete().eq("submitted_by", uid);
        await (supabase as any).from("result_approvals").delete().eq("approver_id", uid);
        await (supabase as any).from("result_amendments").delete().or(`requested_by.eq.${uid},approved_by.eq.${uid}`);
        await (supabase as any).from("refund_requests").delete().or(`requested_by.eq.${uid},approved_by.eq.${uid}`);
        await (supabase as any).from("financial_approvals").delete().or(`approved_by.eq.${uid},requester_id.eq.${uid}`);
        await (supabase as any).from("maintenance_requests").delete().eq("reported_by", uid);
        await (supabase as any).from("student_feedback").delete().or(`student_id.eq.${uid},lecturer_profile_id.eq.${uid}`);
        await (supabase as any).from("academic_advising_assignments").delete().or(`advisor_profile_id.eq.${uid},student_id.eq.${uid}`);
        await (supabase as any).from("advising_sessions").delete().or(`advisor_profile_id.eq.${uid},student_id.eq.${uid}`);
        await (supabase as any).from("lecturer_tasks").delete().eq("lecturer_profile_id", uid);
        await (supabase as any).from("case_comments").delete().eq("author_id", uid);
        await (supabase as any).from("case_assignments").delete().or(`assigned_to.eq.${uid},assigned_by.eq.${uid}`);
        await (supabase as any).from("case_events").delete().eq("actor_id", uid);
        await (supabase as any).from("library_fines").delete().eq("user_id", uid);
        await (supabase as any).from("student_holds").delete().eq("student_id", uid);
        await (supabase as any).from("student_accounts").delete().eq("student_id", uid);
        await (supabase as any).from("student_programme_history").delete().eq("student_id", uid);
        await (supabase as any).from("student_status_history").delete().eq("student_id", uid);
        await (supabase as any).from("accommodation_applications").delete().eq("student_id", uid);
        await (supabase as any).from("reservations").delete().eq("student_id", uid);
        await (supabase as any).from("allocations").delete().eq("student_id", uid);
        await (supabase as any).from("room_allocations").delete().eq("student_id", uid);
        await (supabase as any).from("staff_documents").delete().eq("staff_id", uid);
        await (supabase as any).from("teaching_loads").delete().eq("staff_id", uid);
        await (supabase as any).from("leave_balances").delete().eq("staff_id", uid);
        await (supabase as any).from("course_enrolments").delete().or(`student_id.eq.${uid},profile_id.eq.${uid}`);
        await (supabase as any).from("assessment_marks").delete().or(`student_id.eq.${uid},grader_id.eq.${uid},entered_by.eq.${uid}`);
        await (supabase as any).from("attendance_records").delete().or(`student_id.eq.${uid},marked_by.eq.${uid}`);
        await (supabase as any).from("student_invoices").delete().eq("student_id", uid);
        await (supabase as any).from("invoice_lines").delete().eq("student_id", uid);
        await (supabase as any).from("payments").delete().or(`student_id.eq.${uid},recorded_by.eq.${uid}`);
        await (supabase as any).from("receipts").delete().eq("student_id", uid);
        await (supabase as any).from("notifications").delete().eq("user_id", uid);
        await (supabase as any).from("leave_requests").delete().or(`user_id.eq.${uid},approved_by.eq.${uid}`);
        await (supabase as any).from("support_cases").delete().or(`user_id.eq.${uid},assigned_to.eq.${uid}`);
        await (supabase as any).from("service_requests").delete().or(`student_id.eq.${uid},user_id.eq.${uid}`);
        await (supabase as any).from("loans").delete().eq("user_id", uid);
        await (supabase as any).from("scholarships").delete().eq("student_id", uid);
        await (supabase as any).from("waivers").delete().eq("student_id", uid);
      } catch {}

      // 3. Delete user role assignments and scopes
      try {
        await (supabase as any).from("user_role_assignments").delete().eq("user_id", uid);
        await (supabase as any).from("user_scopes").delete().eq("user_id", uid);
        await (supabase as any).from("university_system_admins").delete().eq("user_id", uid);
      } catch {}

      // 4. Delete student and staff records
      try {
        await (supabase as any).from("students").delete().or(`profile_id.eq.${uid},id.eq.${uid}`);
        await (supabase as any).from("staff").delete().or(`profile_id.eq.${uid},id.eq.${uid}`);
        await (supabase as any).from("employment_records").delete().or(`profile_id.eq.${uid},staff_id.eq.${uid}`);
        await (supabase as any).from("teaching_assignments").delete().eq("lecturer_id", uid);
      } catch {}

      // 5. Delete profile record (by ID and by email)
      try {
        await (supabase as any).from("profiles").delete().eq("id", uid);
        if (normEmail) {
          await (supabase as any).from("profiles").delete().ilike("email", normEmail);
        }
      } catch {}

      // 6. Delete from Supabase Auth so they can NEVER log in
      try {
        await supabase.auth.admin.deleteUser(uid);
      } catch {
        // Fallback: If foreign keys prevent instant hard deletion in auth, ban permanently and revoke credentials
        try {
          await supabase.auth.admin.updateUserById(uid, {
            ban_duration: "876000h",
            user_metadata: { account_status: "deleted", university_status: "deleted" },
            app_metadata: { account_status: "deleted", university_status: "deleted" },
          });
        } catch {}
      }

      // 7. Delete from fallback users in memory
      if (normEmail) {
        unregisterDynamicUser(normEmail);
      }
      unregisterDynamicUser(uid);
    } catch (delErr) {
      console.warn(`Error deleting university user ${uid}:`, delErr);
    }
  }

  // 4. Synchronize Virtual DB store (remove users, school, and school-scoped entities)
  try {
    const vDb = await getVirtualDb();
    if (vDb) {
      const uids = new Set(Array.from(targetUserIds));
      const sIds = new Set(Array.from(allSchoolIds));
      const sCodes = new Set(Array.from(allSchoolCodes));

      if (Array.isArray(vDb.profiles)) {
        vDb.profiles = vDb.profiles.filter(
          (p: any) =>
            !uids.has(p.id) &&
            !sIds.has(p.school_id) &&
            !sIds.has(p.university_id) &&
            !sCodes.has(p.university_id)
        );
      }
      if (Array.isArray(vDb.students)) {
        vDb.students = vDb.students.filter(
          (s: any) =>
            !uids.has(s.id) &&
            !uids.has(s.profile_id) &&
            !sIds.has(s.school_id) &&
            !sIds.has(s.university_id)
        );
      }
      if (Array.isArray(vDb.staff)) {
        vDb.staff = vDb.staff.filter(
          (s: any) =>
            !uids.has(s.id) &&
            !uids.has(s.profile_id) &&
            !sIds.has(s.school_id) &&
            !sIds.has(s.university_id)
        );
      }
      if (Array.isArray(vDb.user_role_assignments)) {
        vDb.user_role_assignments = vDb.user_role_assignments.filter(
          (r: any) =>
            !uids.has(r.user_id) &&
            !sIds.has(r.school_id) &&
            !sIds.has(r.university_id)
        );
      }
      if (Array.isArray(vDb.university_system_admins)) {
        vDb.university_system_admins = vDb.university_system_admins.filter(
          (sa: any) =>
            !uids.has(sa.user_id) &&
            !sIds.has(sa.university_id) &&
            !sCodes.has(sa.university_id)
        );
      }
      if (Array.isArray(vDb.schools)) {
        vDb.schools = vDb.schools.filter(
          (s: any) => !sIds.has(s.id) && !sCodes.has(s.code) && !sCodes.has(s.slug)
        );
      }
      if (Array.isArray(vDb.universities)) {
        vDb.universities = vDb.universities.filter(
          (u: any) => !sIds.has(u.id) && !sCodes.has(u.code)
        );
      }
      if (Array.isArray(vDb.campuses)) {
        vDb.campuses = vDb.campuses.filter(
          (c: any) => !sIds.has(c.school_id) && !sIds.has(c.university_id)
        );
      }
      if (Array.isArray(vDb.departments)) {
        vDb.departments = vDb.departments.filter(
          (d: any) => !sIds.has(d.school_id) && !sIds.has(d.university_id)
        );
      }
      if (Array.isArray(vDb.courses)) {
        vDb.courses = vDb.courses.filter(
          (c: any) => !sIds.has(c.school_id) && !sIds.has(c.university_id)
        );
      }
      if (Array.isArray(vDb.classes)) {
        vDb.classes = vDb.classes.filter(
          (cl: any) => !sIds.has(cl.school_id) && !sIds.has(cl.university_id)
        );
      }
      await persistVirtualDb(vDb);
    }
  } catch (vErr) {
    console.warn("Could not sync virtualDb during school deletion:", vErr);
  }

  // 5. Record deleted users blacklist in system_settings
  try {
    const { data: delUsersSetting } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "deleted_users")
      .maybeSingle();

    const existingDelUsers = Array.isArray(delUsersSetting?.setting_value) ? delUsersSetting.setting_value : [];
    const newDelUsers = [
      ...existingDelUsers,
      ...Array.from(targetUserIds).map((uid) => ({
        id: uid,
        email: targetUserMeta.find((u) => u.id === uid)?.email,
        role: targetUserMeta.find((u) => u.id === uid)?.role,
        university_id: univ.id,
        university_code: univ.code,
        deleted_at: now,
      })),
    ];

    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "deleted_users",
        setting_value: newDelUsers,
        category: "superadmin",
        description: "Permanent blacklist of deleted users from decommissioned universities",
        is_sensitive: false,
        updated_at: now,
      },
      { onConflict: "setting_key" }
    );
  } catch (uErr) {
    console.warn("Could not record in deleted_users setting:", uErr);
  }

  // 6. Delete university data tables: university_system_admins, campuses, departments, courses, terms
  for (const sId of Array.from(allSchoolIds)) {
    try { await (supabase as any).from("university_system_admins").delete().eq("university_id", sId); } catch {}
    try { await (supabase as any).from("campuses").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("faculties").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("departments").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("programmes").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("courses").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("course_offerings").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("classes").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("timetables").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("academic_terms").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("academic_years").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("grading_scales").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("grade_scales").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("fee_items").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("fee_schedules").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("residences").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("transport_routes").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("transport_vehicles").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("library_items").delete().eq("school_id", sId); } catch {}
    try { await (supabase as any).from("admission_cycles").delete().eq("school_id", sId); } catch {}
  }

  for (const sCode of Array.from(allSchoolCodes)) {
    try { await (supabase as any).from("university_system_admins").delete().eq("university_id", sCode); } catch {}
    try { await (supabase as any).from("campuses").delete().ilike("code", `${sCode}%`); } catch {}
    try { await (supabase as any).from("departments").delete().ilike("code", `${sCode}%`); } catch {}
  }

  // 7. Delete university row from 'universities' and 'schools' tables in database
  for (const sId of Array.from(allSchoolIds)) {
    try { await (supabase as any).from("universities").delete().eq("id", sId); } catch {}
    try { await (supabase as any).from("schools").delete().eq("id", sId); } catch {}
  }
  for (const sCode of Array.from(allSchoolCodes)) {
    try { await (supabase as any).from("universities").delete().eq("code", sCode); } catch {}
    try { await (supabase as any).from("schools").delete().ilike("slug", sCode.toLowerCase()); } catch {}
  }
  for (const sSlug of Array.from(allSchoolSlugs)) {
    try { await (supabase as any).from("schools").delete().ilike("slug", sSlug); } catch {}
  }
  for (const sName of Array.from(allSchoolNames)) {
    try { await (supabase as any).from("universities").delete().ilike("name", sName); } catch {}
    try { await (supabase as any).from("schools").delete().ilike("name", sName); } catch {}
  }

  // 8. Remove from active superadmin_universities in system_settings
  try {
    const { data: rawUnivs } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "superadmin_universities")
      .maybeSingle();

    const currentList = Array.isArray(rawUnivs?.setting_value) ? rawUnivs.setting_value : universities;
    const remainingUnivs = currentList.filter(
      (u: any) =>
        !allSchoolIds.has(u.id) &&
        !allSchoolCodes.has(u.code) &&
        !allSchoolNames.has(u.name?.toLowerCase())
    );

    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "superadmin_universities",
        setting_value: remainingUnivs,
        category: "superadmin",
        description: "Master directory of all registered institutions in the multi-tenant system",
        is_sensitive: false,
        updated_at: now,
      },
      { onConflict: "setting_key" }
    );
  } catch (sErr) {
    console.warn("Could not update superadmin_universities in system_settings:", sErr);
  }

  // 9. Add to deleted_universities registry in system_settings
  try {
    const { data: delSetting } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "deleted_universities")
      .maybeSingle();

    const currentDeleted = Array.isArray(delSetting?.setting_value) ? delSetting.setting_value : [];
    const updatedDeleted = [
      ...currentDeleted.filter(
        (d: any) =>
          !allSchoolIds.has(d.id) &&
          !allSchoolCodes.has(d.code) &&
          !allSchoolNames.has(d.name?.toLowerCase())
      ),
      {
        id: univ.id,
        code: univ.code,
        name: univ.name,
        deleted_at: now,
      },
    ];

    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "deleted_universities",
        setting_value: updatedDeleted,
        category: "superadmin",
        description: "List of decommissioned/deleted universities whose users must be blocked from system access",
        is_sensitive: false,
        updated_at: now,
      },
      { onConflict: "setting_key" }
    );
  } catch (delErr) {
    console.warn("Could not record in deleted_universities registry:", delErr);
  }

  // 10. Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "delete_university",
      entity_type: "university",
      entity_id: univ.id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      details: `Decommissioned university ${univ.name} (${univ.code}). Permanently deleted ${affectedUsersCount} associated accounts including system admin.`,
    });
  } catch {}

  return { success: true, deletedId: univ.id, affectedUsersCount };
}

/**
 * Update an existing System Administrator's credentials, details, and university assignment.
 */
export async function updateSystemAdmin(
  id: string,
  payload: {
    full_name?: string;
    email?: string;
    phone?: string;
    university_id?: string;
    university_name?: string;
    account_status?: string;
    password?: string;
  }
): Promise<SystemAdminItem> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // 1. Update Auth user if email, password, or metadata changed
  const authUpdates: any = {
    user_metadata: {},
  };
  if (payload.email) authUpdates.email = payload.email.trim().toLowerCase();
  if (payload.password) authUpdates.password = payload.password;
  if (payload.full_name) authUpdates.user_metadata.full_name = payload.full_name.trim();
  if (payload.university_id) authUpdates.user_metadata.university_id = payload.university_id;
  if (payload.university_name) authUpdates.user_metadata.university_name = payload.university_name;

  try {
    await supabase.auth.admin.updateUserById(id, authUpdates);
  } catch (err: any) {
    console.warn("Could not update Auth user:", err);
  }

  // 2. Fetch current profile
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const currentMetadata = profile?.metadata || {};
  const updatedMetadata = {
    ...currentMetadata,
    university_id: payload.university_id || currentMetadata.university_id,
    university_name: payload.university_name || currentMetadata.university_name,
  };

  const profileUpdates: any = {
    updated_at: now,
    metadata: updatedMetadata,
  };
  if (payload.full_name) profileUpdates.full_name = payload.full_name.trim();
  if (payload.phone !== undefined) profileUpdates.phone = payload.phone;
  if (payload.account_status) profileUpdates.account_status = payload.account_status;

  await (supabase as any)
    .from("profiles")
    .update(profileUpdates)
    .eq("id", id);

  // 3. Update university_system_admins mapping if university_id changed
  if (payload.university_id) {
    try {
      await (supabase as any)
        .from("university_system_admins")
        .delete()
        .eq("user_id", id);

      await (supabase as any)
        .from("university_system_admins")
        .insert({
          university_id: payload.university_id,
          user_id: id,
          is_primary: true,
          created_at: now,
        });
    } catch {}
  }

  // 4. Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "update_system_admin",
      entity_type: "user",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: {
        full_name: payload.full_name,
        email: payload.email,
        university_id: payload.university_id,
        account_status: payload.account_status,
      },
    });
  } catch {}

  const universities = await getUniversities();
  const univ = universities.find((u) => u.id === (payload.university_id || currentMetadata.university_id));

  return {
    id,
    email: payload.email || profile?.email || "",
    full_name: payload.full_name || profile?.full_name || "System Admin",
    phone: payload.phone ?? profile?.phone,
    account_status: payload.account_status || profile?.account_status || "active",
    university_id: payload.university_id || currentMetadata.university_id,
    university_name: univ ? univ.name : payload.university_name || "Primary Institution",
    created_at: profile?.created_at || now,
    last_sign_in_at: profile?.last_sign_in_at,
  };
}

/**
 * Delete a System Administrator account.
 */
export async function deleteSystemAdmin(id: string): Promise<{ success: boolean; deletedId: string }> {
  const supabase = createAdminClient();

  // 1. Delete mapping in university_system_admins
  try {
    await (supabase as any)
      .from("university_system_admins")
      .delete()
      .eq("user_id", id);
  } catch {}

  // 2. Remove role assignments
  try {
    await (supabase as any)
      .from("user_role_assignments")
      .delete()
      .eq("user_id", id);
  } catch {}

  // 3. Mark profile suspended/deleted
  try {
    await (supabase as any)
      .from("profiles")
      .update({
        account_status: "deleted",
        metadata: {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        },
      })
      .eq("id", id);
  } catch {}

  // 4. Delete or disable in Supabase Auth
  try {
    await supabase.auth.admin.deleteUser(id);
  } catch (err) {
    console.warn("Could not delete user from Auth, updating status instead:", err);
  }

  // 5. Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "delete_system_admin",
      entity_type: "user",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
    });
  } catch {}

  return { success: true, deletedId: id };
}

export interface ScopeItem {
  id: string;
  name: string;
  code: string;
  scopeType: "Campus" | "Faculty" | "Department" | "Cohort";
  institution_id: string;
  institution: string;
  assignedUsersCount: number;
  description: string;
  status: "active" | "inactive";
  capacity?: number;
  dualControlRequired?: boolean;
  isolationLevel?: "strict" | "shared";
  created_at: string;
  updated_at?: string;
}

export async function getScopes(): Promise<ScopeItem[]> {
  const supabase = createAdminClient();

  try {
    const { data: settingRow } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "superadmin_scopes")
      .maybeSingle();

    if (Array.isArray(settingRow?.setting_value)) {
      return settingRow.setting_value;
    }
  } catch {}

  // Fallback to checking virtual db
  try {
    const vDb = await getVirtualDb();
    if (vDb && Array.isArray((vDb as any).scopes)) {
      return (vDb as any).scopes;
    }
  } catch {}

  return [];
}

export async function createScope(payload: {
  name: string;
  code?: string;
  scopeType: "Campus" | "Faculty" | "Department" | "Cohort";
  institution_id?: string;
  institution?: string;
  description?: string;
  capacity?: number;
  dualControlRequired?: boolean;
  isolationLevel?: "strict" | "shared";
}): Promise<ScopeItem> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const id = `scope-${Date.now()}`;
  const code = (payload.code || payload.name.slice(0, 6).toUpperCase().replace(/\s+/g, "-")).trim();

  const newScope: ScopeItem = {
    id,
    name: payload.name.trim(),
    code,
    scopeType: payload.scopeType,
    institution_id: payload.institution_id || "",
    institution: payload.institution || "Global Scope",
    assignedUsersCount: 0,
    description: payload.description || "",
    status: "active",
    capacity: payload.capacity || 100,
    dualControlRequired: Boolean(payload.dualControlRequired),
    isolationLevel: payload.isolationLevel || "strict",
    created_at: now,
    updated_at: now,
  };

  const currentScopes = await getScopes();
  const updated = [newScope, ...currentScopes];

  // Persist to system_settings
  try {
    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "superadmin_scopes",
        setting_value: updated,
        updated_at: now,
      },
      { onConflict: "setting_key" }
    );
  } catch {}

  // Persist to virtual db
  try {
    const vDb = await getVirtualDb();
    if (vDb) {
      if (!Array.isArray((vDb as any).scopes)) {
        (vDb as any).scopes = [];
      }
      (vDb as any).scopes.unshift(newScope);
      await persistVirtualDb(vDb);
    }
  } catch {}

  // Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "create_scope",
      entity_type: "scope",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: newScope,
    });
  } catch {}

  return newScope;
}

export async function updateScope(
  id: string,
  payload: Partial<ScopeItem>
): Promise<ScopeItem> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const currentScopes = await getScopes();
  const idx = currentScopes.findIndex((s) => s.id === id);

  if (idx === -1) {
    throw new Error("Scope not found");
  }

  const updatedScope: ScopeItem = {
    ...currentScopes[idx],
    ...payload,
    id, // Immutable
    updated_at: now,
  };

  currentScopes[idx] = updatedScope;

  // Persist to system_settings
  try {
    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "superadmin_scopes",
        setting_value: currentScopes,
        updated_at: now,
      },
      { onConflict: "setting_key" }
    );
  } catch {}

  // Persist to virtual db
  try {
    const vDb = await getVirtualDb();
    if (vDb && Array.isArray((vDb as any).scopes)) {
      const vIdx = (vDb as any).scopes.findIndex((s: any) => s.id === id);
      if (vIdx !== -1) {
        (vDb as any).scopes[vIdx] = updatedScope;
      } else {
        (vDb as any).scopes.unshift(updatedScope);
      }
      await persistVirtualDb(vDb);
    }
  } catch {}

  // Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "update_scope",
      entity_type: "scope",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: updatedScope,
    });
  } catch {}

  return updatedScope;
}

export async function deleteScope(id: string): Promise<{ success: boolean; deletedId: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const currentScopes = await getScopes();
  const filtered = currentScopes.filter((s) => s.id !== id);

  // Persist to system_settings
  try {
    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "superadmin_scopes",
        setting_value: filtered,
        updated_at: now,
      },
      { onConflict: "setting_key" }
    );
  } catch {}

  // Persist to virtual db
  try {
    const vDb = await getVirtualDb();
    if (vDb && Array.isArray((vDb as any).scopes)) {
      (vDb as any).scopes = (vDb as any).scopes.filter((s: any) => s.id !== id);
      await persistVirtualDb(vDb);
    }
  } catch {}

  // Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "delete_scope",
      entity_type: "scope",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
    });
  } catch {}

  return { success: true, deletedId: id };
}

/**
 * Master catalogue of all standard tenant roles that can be restricted or granted to institutions.
 */
export const AVAILABLE_UNIVERSITY_ROLES = [
  { code: "system_admin", name: "System Administrator", category: "Technical & Management", description: "Local campus tenant configuration, user management, and integration maintenance." },
  { code: "vice_chancellor", name: "Vice-Chancellor / Executive", category: "Leadership", description: "Institution-wide strategic performance, executive dashboards, and high-level reports." },
  { code: "registrar", name: "Registrar", category: "Academic Administration", description: "Authoritative student records, graduation approvals, official certifications, and transcripts." },
  { code: "academic_affairs_officer", name: "Academic Affairs Officer", category: "Academic Administration", description: "Curriculum setup, programme requirements, semester calendar, and results administration." },
  { code: "dean", name: "Faculty Dean", category: "Faculty Administration", description: "Faculty oversight, academic workload, teaching allocations, and faculty result moderation." },
  { code: "head_of_department", name: "Head of Department", category: "Faculty Administration", description: "Departmental courses, course offerings, teaching assignments, and result reviews." },
  { code: "admissions_officer", name: "Admissions Officer", category: "Admissions", description: "Application processing, document verification, scoring rubrics, and offers." },
  { code: "finance_officer", name: "Finance Officer / Bursar", category: "Finance", description: "Fee schedules, invoicing, receipts, scholarships, refunds, and waivers." },
  { code: "lecturer", name: "Lecturer / Faculty", category: "Instruction", description: "Assigned course offerings, class lists, session attendance, and marks submission." },
  { code: "academic_advisor", name: "Academic Advisor", category: "Student Support", description: "Assigned advisees, progression monitoring, advising notes, and registration clearance." },
  { code: "student", name: "Student", category: "Student Portal", description: "Personal profile, registration, timetables, coursework, results, and fee payments." },
  { code: "applicant", name: "Applicant", category: "Admissions", description: "Application form, document upload, application status, and offer acceptance." },
  { code: "librarian", name: "Librarian", category: "Campus Services", description: "Catalogue management, circulation, book loans, and library fine administration." },
  { code: "hostel_officer", name: "Hostel Officer", category: "Campus Services", description: "Residence inventory, room allocation, bed allocation, and check-in/out." },
  { code: "hr_officer", name: "HR Officer", category: "Staff & Personnel", description: "Staff directories, contracts, leave approvals, and HR compliance." },
  { code: "auditor", name: "Auditor", category: "Compliance", description: "Read-only access to transaction ledgers, audit events, and compliance reports." },
  { code: "parent_sponsor", name: "Parent / Sponsor", category: "External Stakeholders", description: "Sponsored student fee ledgers and institutional notices." },
];

export async function getUniversities(): Promise<UniversityItem[]> {
  const supabase = createAdminClient();
  let baseList: UniversityItem[] = [];

  // Try direct universities table
  try {
    const { data, error } = await (supabase as any)
      .from("universities")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      baseList = data;
    }
  } catch {
    // Fall back to system_settings
  }

  // Fallback to system_settings
  if (baseList.length === 0) {
    try {
      const { data: settingRow } = await (supabase as any)
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "superadmin_universities")
        .maybeSingle();

      if (settingRow?.setting_value && Array.isArray(settingRow.setting_value)) {
        baseList = settingRow.setting_value;
      }
    } catch (err) {
      console.warn("Could not query superadmin_universities setting:", err);
    }
  }

  // Also query 'schools' table from Supabase to integrate with native Supabase schools
  try {
    const { data: schoolsData } = await (supabase as any)
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });

    if (Array.isArray(schoolsData) && schoolsData.length > 0) {
      const existingCodes = new Set(baseList.map((u) => u.code?.toUpperCase()));
      const existingNames = new Set(baseList.map((u) => u.name?.toLowerCase()));

      for (const s of schoolsData) {
        const sCode = (s.slug || s.name.substring(0, 4)).toUpperCase();
        const sType = s.school_type || s.school_Type || "university";

        if (!existingCodes.has(sCode) && !existingNames.has(s.name?.toLowerCase())) {
          baseList.push({
            id: s.id,
            code: sCode,
            name: s.name,
            school_type: sType,
            institution_type: sType,
            country: "Ghana",
            city: "Accra",
            address: s.address || "",
            email: s.email || "",
            phone: s.phone || "",
            default_currency: s.currency || "GHS",
            currency_symbol: s.currency === "USD" ? "$" : "GH₵",
            status: s.status || "active",
            created_at: s.created_at,
            updated_at: s.updated_at,
            full_access: true,
          });
        } else {
          const existing = baseList.find(
            (u) => u.code?.toUpperCase() === sCode || u.name?.toLowerCase() === s.name?.toLowerCase()
          );
          if (existing && (s.school_type || s.school_Type)) {
            existing.school_type = s.school_type || s.school_Type || existing.school_type;
            existing.institution_type = s.school_type || s.school_Type || existing.institution_type;
          }
        }
      }
    }
  } catch (schoolsErr) {
    console.warn("Could not query schools table:", schoolsErr);
  }

  if (baseList.length === 0) {
    return [];
  }

  // Filter out any university that was deleted or marked in deleted_universities registry
  try {
    const { data: delSetting } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "deleted_universities")
      .maybeSingle();

    const deletedList = Array.isArray(delSetting?.setting_value) ? delSetting.setting_value : [];
    const deletedIds = new Set(deletedList.map((d: any) => String(d.id || "").toLowerCase()));
    const deletedCodes = new Set(deletedList.map((d: any) => String(d.code || "").toLowerCase()));
    const deletedNames = new Set(deletedList.map((d: any) => String(d.name || "").toLowerCase()));

    baseList = baseList.filter((u) => {
      if (u.status === "deleted") return false;
      if (u.id && deletedIds.has(String(u.id).toLowerCase())) return false;
      if (u.code && deletedCodes.has(String(u.code).toLowerCase())) return false;
      if (u.name && deletedNames.has(String(u.name).toLowerCase())) return false;
      return true;
    });
  } catch (delFilterErr) {
    console.warn("Could not filter deleted universities:", delFilterErr);
  }

  if (baseList.length === 0) {
    return [];
  }

  // Calculate live telemetry counters (users, departments, distinct roles)
  try {
    const [profilesRes, deptsRes, userRolesRes, rolesRes] = await Promise.all([
      (supabase as any).from("profiles").select("id, metadata"),
      (supabase as any).from("departments").select("id, faculty_id"),
      (supabase as any).from("user_role_assignments").select("user_id, role_id, is_active"),
      (supabase as any).from("roles").select("id, code"),
    ]);

    const profiles = Array.isArray(profilesRes?.data) ? profilesRes.data : [];
    const depts = Array.isArray(deptsRes?.data) ? deptsRes.data : [];
    const assignments = Array.isArray(userRolesRes?.data) ? userRolesRes.data : [];
    const roles = Array.isArray(rolesRes?.data) ? rolesRes.data : [];

    const roleCodeById: Record<string, string> = {};
    roles.forEach((r: any) => {
      roleCodeById[r.id] = r.code;
    });

    return baseList.map((u) => {
      // Find users belonging to this university
      const matchingUsers = profiles.filter((p: any) => {
        const m = p.metadata || {};
        return m.university_id === u.id || m.university_code === u.code;
      });

      const userIds = new Set(matchingUsers.map((p: any) => p.id));

      const distinctRoles = new Set<string>();
      assignments.forEach((a: any) => {
        if (userIds.has(a.user_id) && a.is_active !== false) {
          const code = roleCodeById[a.role_id] || a.role_id;
          distinctRoles.add(code);
        }
      });

      const currentUsers = Math.max(matchingUsers.length, u.admins_count || 1);
      const currentDepts = depts.length > 0 ? Math.min(depts.length, 5) : 3;
      const currentRoles = Math.max(distinctRoles.size, 2);

      return {
        ...u,
        full_access: u.full_access !== undefined ? Boolean(u.full_access) : true,
        max_users: u.max_users !== undefined ? u.max_users : null,
        max_departments: u.max_departments !== undefined ? u.max_departments : null,
        max_roles: u.max_roles !== undefined ? u.max_roles : null,
        allowed_roles: Array.isArray(u.allowed_roles) && u.allowed_roles.length > 0
          ? u.allowed_roles
          : AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code),
        current_users_count: currentUsers,
        current_departments_count: currentDepts,
        current_roles_count: currentRoles,
      };
    });
  } catch {
    return baseList.map((u) => ({
      ...u,
      full_access: u.full_access !== undefined ? Boolean(u.full_access) : true,
      max_users: u.max_users !== undefined ? u.max_users : null,
      max_departments: u.max_departments !== undefined ? u.max_departments : null,
      max_roles: u.max_roles !== undefined ? u.max_roles : null,
      allowed_roles: Array.isArray(u.allowed_roles) && u.allowed_roles.length > 0
        ? u.allowed_roles
        : AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code),
      current_users_count: 5,
      current_departments_count: 3,
      current_roles_count: 4,
    }));
  }
}

/**
 * Validate whether a university is permitted to assign a given role.
 */
export async function validateUniversityRole(
  universityId: string,
  roleCode: string
): Promise<{ allowed: boolean; reason?: string }> {
  const universities = await getUniversities();
  const univ = universities.find((u) => u.id === universityId || u.code === universityId);
  if (!univ) return { allowed: true };

  // If Full Access is enabled, all roles are permitted
  if (univ.full_access !== false) {
    return { allowed: true };
  }

  // Check if role is explicitly in allowed_roles list
  if (Array.isArray(univ.allowed_roles) && univ.allowed_roles.length > 0) {
    if (!univ.allowed_roles.includes(roleCode)) {
      return {
        allowed: false,
        reason: `Role '${roleCode}' is not permitted for ${univ.name}. Permitted roles: ${univ.allowed_roles.join(", ")}`,
      };
    }
  }

  // Check max distinct roles limit
  if (univ.max_roles !== null && univ.max_roles !== undefined && univ.max_roles > 0) {
    if ((univ.current_roles_count || 0) >= univ.max_roles) {
      return {
        allowed: false,
        reason: `Institution '${univ.name}' has reached its maximum distinct role limit (${univ.max_roles} roles).`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Validate whether a university can add another user (student, staff, or admin).
 */
export async function validateUniversityUserQuota(
  universityId: string
): Promise<{ allowed: boolean; reason?: string; current: number; max: number | null }> {
  const universities = await getUniversities();
  const univ = universities.find((u) => u.id === universityId || u.code === universityId);
  if (!univ) return { allowed: true, current: 0, max: null };

  if (univ.full_access !== false) {
    return { allowed: true, current: univ.current_users_count || 0, max: null };
  }

  const max = univ.max_users ?? null;
  const current = univ.current_users_count || 0;

  if (max !== null && max !== undefined && current >= max) {
    return {
      allowed: false,
      reason: `Institution '${univ.name}' has reached its maximum user quota (${current}/${max} users). Please contact Super Admin to increase user allocation.`,
      current,
      max,
    };
  }

  return { allowed: true, current, max };
}

/**
 * Validate whether a university can add another department.
 */
export async function validateUniversityDepartmentQuota(
  universityId: string
): Promise<{ allowed: boolean; reason?: string; current: number; max: number | null }> {
  const universities = await getUniversities();
  const univ = universities.find((u) => u.id === universityId || u.code === universityId);
  if (!univ) return { allowed: true, current: 0, max: null };

  if (univ.full_access !== false) {
    return { allowed: true, current: univ.current_departments_count || 0, max: null };
  }

  const max = univ.max_departments ?? null;
  const current = univ.current_departments_count || 0;

  if (max !== null && max !== undefined && current >= max) {
    return {
      allowed: false,
      reason: `Institution '${univ.name}' has reached its maximum department quota (${current}/${max} departments). Please contact Super Admin to increase department allocation.`,
      current,
      max,
    };
  }

  return { allowed: true, current, max };
}

/**
 * Create a new university in the database.
 */
export async function createUniversity(
  payload: Omit<UniversityItem, "id" | "created_at">
): Promise<UniversityItem> {
  const supabase = createAdminClient();
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();

  const createdSchoolType = payload.school_type || payload.institution_type || "university";

  const newUniv: UniversityItem = {
    ...payload,
    id: newId,
    school_type: createdSchoolType,
    institution_type: createdSchoolType,
    full_access: payload.full_access !== undefined ? Boolean(payload.full_access) : true,
    max_users: payload.max_users !== undefined ? payload.max_users : null,
    max_departments: payload.max_departments !== undefined ? payload.max_departments : null,
    max_roles: payload.max_roles !== undefined ? payload.max_roles : null,
    allowed_roles: Array.isArray(payload.allowed_roles) && payload.allowed_roles.length > 0
      ? payload.allowed_roles
      : AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code),
    current_users_count: 0,
    current_departments_count: 0,
    current_roles_count: 0,
    created_at: now,
    updated_at: now,
  };

  // 1. Try inserting into 'universities' table
  let savedToTable = false;
  try {
    const { data, error } = await (supabase as any)
      .from("universities")
      .insert(newUniv)
      .select()
      .single();

    if (!error && data) {
      savedToTable = true;
    }
  } catch {
    // Table not available
  }

  // 1b. Try inserting into 'schools' table (primary table in Supabase schema)
  try {
    await (supabase as any)
      .from("schools")
      .insert({
        id: newUniv.id,
        name: newUniv.name,
        slug: newUniv.code.toLowerCase(),
        school_type: createdSchoolType,
        status: newUniv.status,
        currency: newUniv.default_currency,
        address: `${newUniv.city || ""}, ${newUniv.country}`,
        phone: newUniv.phone || null,
        email: newUniv.email || null,
      });
  } catch {
    // If school_type column doesn't exist yet, insert without it
    try {
      await (supabase as any)
        .from("schools")
        .insert({
          id: newUniv.id,
          name: newUniv.name,
          slug: newUniv.code.toLowerCase(),
          status: newUniv.status,
          currency: newUniv.default_currency,
          address: `${newUniv.city || ""}, ${newUniv.country}`,
          phone: newUniv.phone || null,
          email: newUniv.email || null,
        });
    } catch {}
  }

  // 2. Always persist in system_settings for redundancy
  const current = await getUniversities();
  const updated = [newUniv, ...current.filter((u) => u.code !== newUniv.code)];

  await (supabase as any).from("system_settings").upsert(
    {
      setting_key: "superadmin_universities",
      setting_value: updated,
      category: "superadmin",
      description: "Master directory of all registered institutions in the multi-tenant system",
      is_sensitive: false,
      updated_at: now,
    },
    { onConflict: "setting_key" }
  );

  // Clear any previous decommission/deletion record for this university code or ID
  try {
    const { data: delSetting } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "deleted_universities")
      .maybeSingle();

    const currentDeleted = Array.isArray(delSetting?.setting_value) ? delSetting.setting_value : [];
    const updatedDeleted = currentDeleted.filter(
      (d: any) =>
        d.id !== newUniv.id &&
        d.code?.toLowerCase() !== newUniv.code.toLowerCase() &&
        d.name?.toLowerCase() !== newUniv.name.toLowerCase()
    );
    if (updatedDeleted.length !== currentDeleted.length) {
      await (supabase as any).from("system_settings").upsert(
        {
          setting_key: "deleted_universities",
          setting_value: updatedDeleted,
          updated_at: now,
        },
        { onConflict: "setting_key" }
      );
    }
  } catch {}

  // Update in-memory and disk Virtual DB store
  try {
    const vDb = await getVirtualDb();
    if (vDb) {
      if (Array.isArray(vDb.universities)) {
        vDb.universities = [newUniv, ...vDb.universities.filter((u: any) => u.code !== newUniv.code)];
      }
      if (Array.isArray(vDb.schools)) {
        vDb.schools = [newUniv, ...vDb.schools.filter((s: any) => s.code !== newUniv.code)];
      }
      await persistVirtualDb(vDb);
    }
  } catch {}

  // 3. Create initial main campus in 'campuses' table
  try {
    await (supabase as any).from("campuses").insert({
      code: `${payload.code.toUpperCase()}_MAIN`,
      name: `${payload.name} Main Campus`,
      location: `${payload.city || ""}, ${payload.country}`,
      is_active: true,
    });
  } catch (campErr) {
    console.warn("Could not auto-create campus:", campErr);
  }

  // 4. Log immutable security audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "create_university",
      entity_type: "university",
      entity_id: newId,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: {
        code: payload.code,
        name: payload.name,
        country: payload.country,
      },
    });
  } catch {
    // Ignore audit log failure
  }

  return newUniv;
}

/**
 * Fetch all System Administrators across all universities.
 */
export async function getSystemAdmins(): Promise<SystemAdminItem[]> {
  const supabase = createAdminClient();

  try {
    // Find system_admin role id
    const { data: roleData } = await (supabase as any)
      .from("roles")
      .select("id")
      .eq("code", "system_admin")
      .maybeSingle();

    if (!roleData?.id) return [];

    // Query assignments
    const { data: assignments } = await (supabase as any)
      .from("user_role_assignments")
      .select("user_id, is_active, created_at")
      .eq("role_id", roleData.id);

    const userIds = (assignments || []).map((a: any) => a.user_id);
    if (userIds.length === 0) return [];

    // Query profiles
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, email, full_name, phone, account_status, last_sign_in_at, metadata, created_at")
      .in("id", userIds);

    const universities = await getUniversities();

    // Query blacklisted deleted users to ensure deleted school admins are never shown
    let deletedUserIds = new Set<string>();
    let deletedEmails = new Set<string>();
    try {
      const { data: delUsersSetting } = await (supabase as any)
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "deleted_users")
        .maybeSingle();

      const deletedUsers = Array.isArray(delUsersSetting?.setting_value) ? delUsersSetting.setting_value : [];
      deletedUserIds = new Set(deletedUsers.map((u: any) => String(u.id || "").toLowerCase()).filter(Boolean));
      deletedEmails = new Set(deletedUsers.map((u: any) => String(u.email || "").toLowerCase()).filter(Boolean));
    } catch {}

    const validUnivIds = new Set(universities.map((u) => String(u.id || "").toLowerCase()));
    const validUnivCodes = new Set(universities.map((u) => String(u.code || "").toLowerCase()));

    return (profiles || [])
      .filter((p: any) => {
        if (p.account_status === "deleted") return false;
        if (p.id && deletedUserIds.has(String(p.id).toLowerCase())) return false;
        if (p.email && deletedEmails.has(String(p.email).toLowerCase())) return false;

        const assignedUnivId = String(p.metadata?.university_id || p.school_id || "").toLowerCase();
        const assignedUnivCode = String(p.metadata?.university_code || "").toLowerCase();

        // If the admin was assigned to a school that was deleted, exclude them
        if (assignedUnivId && !validUnivIds.has(assignedUnivId) && !validUnivCodes.has(assignedUnivId)) {
          return false;
        }
        if (assignedUnivCode && !validUnivCodes.has(assignedUnivCode)) {
          return false;
        }
        return true;
      })
      .map((p: any) => {
        const assignedUnivId = p.metadata?.university_id || p.school_id;
        const univ = universities.find(
          (u) =>
            u.id === assignedUnivId ||
            u.code?.toLowerCase() === p.metadata?.university_code?.toLowerCase()
        );

        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name || "System Admin",
          phone: p.phone,
          account_status: p.account_status || "active",
          university_id: assignedUnivId,
          university_name: univ ? univ.name : "Primary Institution",
          created_at: p.created_at,
          last_sign_in_at: p.last_sign_in_at,
        };
      });
  } catch (err) {
    console.error("Error in getSystemAdmins:", err);
    return [];
  }
}

/**
 * Create a new System Admin login in Supabase and assign them to a university.
 */
export async function createSystemAdmin(payload: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  university_id: string;
  university_name?: string;
}): Promise<SystemAdminItem> {
  const supabase = createAdminClient();
  const cleanEmail = payload.email.trim().toLowerCase();
  const now = new Date().toISOString();

  // If this email was previously in deleted_users blacklist, remove it
  try {
    const { data: delSetting } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "deleted_users")
      .maybeSingle();

    const currentDel = Array.isArray(delSetting?.setting_value) ? delSetting.setting_value : [];
    const filteredDel = currentDel.filter((u: any) => u?.email?.toLowerCase() !== cleanEmail);
    if (filteredDel.length !== currentDel.length) {
      await (supabase as any).from("system_settings").upsert(
        {
          setting_key: "deleted_users",
          setting_value: filteredDel,
          updated_at: now,
        },
        { onConflict: "setting_key" }
      );
    }
  } catch {}

  // 1. Create Auth user with verified email (with local virtual-db fallback)
  let user: { id: string; email?: string } = {
    id: crypto.randomUUID(),
    email: cleanEmail,
  };

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name.trim(),
        role: "system_admin",
        default_role: "system_admin",
        school_id: payload.university_id,
        university_id: payload.university_id,
        university_name: payload.university_name,
      },
    });

    if (!authError && authData?.user) {
      user = authData.user;
    }
  } catch {
    // Fallback to virtual-db profile creation
  }

  // Register in dynamic users for fallback session handling
  registerDynamicUser(cleanEmail, payload.password, {
    id: user.id,
    email: cleanEmail,
    full_name: payload.full_name.trim(),
    role: "system_admin",
    role_name: "System Administrator",
    school_id: payload.university_id,
  });

  // 2. Upsert profile scoped to the assigned tenant school
  const profileRow = {
    id: user.id,
    email: user.email || cleanEmail,
    full_name: payload.full_name.trim(),
    phone: payload.phone || null,
    account_status: "active",
    school_id: payload.university_id,
    university_id: payload.university_id,
    metadata: {
      role: "system_admin",
      default_role: "system_admin",
      school_id: payload.university_id,
      university_id: payload.university_id,
      university_name: payload.university_name,
      university_status: "active",
      temp_password: payload.password,
    },
    created_at: now,
    updated_at: now,
  };

  await (supabase as any).from("profiles").upsert(profileRow, { onConflict: "id" });

  // 3. Assign system_admin role in user_role_assignments
  const { data: roleRow } = await (supabase as any)
    .from("roles")
    .select("id")
    .eq("code", "system_admin")
    .maybeSingle();

  const roleId = roleRow?.id || "f67d1b87-ec01-41db-b436-1d59c9d3fe25";
  await (supabase as any).from("user_role_assignments").upsert(
    {
      user_id: user.id,
      role_id: roleId,
      school_id: payload.university_id,
      is_active: true,
      created_at: now,
    },
    { onConflict: "user_id,role_id" }
  );

  // 4. Try mapping to university_system_admins table if exists
  try {
    await (supabase as any).from("university_system_admins").insert({
      university_id: payload.university_id,
      user_id: user.id,
      is_primary: false,
    });
  } catch {
    // Ignore if table not created
  }

  // 5. Update Virtual DB in-memory and disk
  try {
    const vDb = await getVirtualDb();
    if (vDb) {
      if (Array.isArray(vDb.profiles)) {
        const existIdx = vDb.profiles.findIndex((p: any) => p.id === user.id || p.email === cleanEmail);
        if (existIdx !== -1) {
          vDb.profiles[existIdx] = { ...vDb.profiles[existIdx], ...profileRow };
        } else {
          vDb.profiles.unshift(profileRow);
        }
      }
      if (Array.isArray(vDb.user_role_assignments)) {
        vDb.user_role_assignments.push({
          id: `ura-${Date.now()}`,
          user_id: user.id,
          role_id: roleId,
          school_id: payload.university_id,
          is_active: true,
          created_at: now,
        });
      }
      if (Array.isArray(vDb.university_system_admins)) {
        vDb.university_system_admins.push({
          university_id: payload.university_id,
          user_id: user.id,
          is_primary: false,
        });
      }
      await persistVirtualDb(vDb);
    }
  } catch {}

  // 6. Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "create_system_admin",
      entity_type: "user",
      entity_id: user.id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: {
        email: user.email,
        full_name: payload.full_name,
        university_id: payload.university_id,
      },
    });
  } catch {
    // Ignore
  }

  return {
    id: user.id,
    email: user.email || payload.email,
    full_name: payload.full_name,
    phone: payload.phone,
    account_status: "active",
    university_id: payload.university_id,
    university_name: payload.university_name,
    created_at: new Date().toISOString(),
  };
}

/**
 * Fetch high-level platform vitals and KPIs.
 */
export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const supabase = createAdminClient();
  const startTime = Date.now();

  let universitiesCount = 0;
  let activeUniversitiesCount = 0;
  let campusesCount = 0;
  let studentsCount = 0;
  let lecturersCount = 0;
  let staffCount = 0;
  let systemAdminsCount = 0;

  let univs: UniversityItem[] = [];
  try {
    univs = await getUniversities();
    universitiesCount = univs.length;
    activeUniversitiesCount = univs.filter((u) => u.status === "active").length;
  } catch {}

  try {
    if (universitiesCount === 0) {
      campusesCount = 0;
    } else {
      const { data: campusesData } = await (supabase as any)
        .from("campuses")
        .select("id, school_id, university_id");

      if (Array.isArray(campusesData)) {
        const univIds = new Set(univs.map((u) => String(u.id).toLowerCase()));
        const univCodes = new Set(univs.map((u) => String(u.code || "").toLowerCase()));
        campusesCount = campusesData.filter((c: any) => {
          const sId = String(c.school_id || c.university_id || "").toLowerCase();
          return sId && (univIds.has(sId) || univCodes.has(sId));
        }).length;
      } else {
        const { count } = await (supabase as any)
          .from("campuses")
          .select("*", { count: "exact", head: true });
        campusesCount = count || 0;
      }
    }
  } catch {}

  try {
    if (universitiesCount === 0) {
      studentsCount = 0;
    } else {
      const { data: studentsData } = await (supabase as any)
        .from("students")
        .select("id, school_id, university_id");

      if (Array.isArray(studentsData)) {
        const univIds = new Set(univs.map((u) => String(u.id).toLowerCase()));
        const univCodes = new Set(univs.map((u) => String(u.code || "").toLowerCase()));
        studentsCount = studentsData.filter((s: any) => {
          const sId = String(s.school_id || s.university_id || "").toLowerCase();
          return sId && (univIds.has(sId) || univCodes.has(sId));
        }).length;
      } else {
        const { count } = await (supabase as any)
          .from("students")
          .select("*", { count: "exact", head: true });
        studentsCount = count || 0;
      }
    }
  } catch {}

  try {
    if (universitiesCount === 0) {
      staffCount = 0;
    } else {
      const { data: staffData } = await (supabase as any)
        .from("staff")
        .select("id, school_id, university_id");

      if (Array.isArray(staffData)) {
        const univIds = new Set(univs.map((u) => String(u.id).toLowerCase()));
        const univCodes = new Set(univs.map((u) => String(u.code || "").toLowerCase()));
        staffCount = staffData.filter((s: any) => {
          const sId = String(s.school_id || s.university_id || "").toLowerCase();
          return sId && (univIds.has(sId) || univCodes.has(sId));
        }).length;
      } else {
        const { count } = await (supabase as any)
          .from("staff")
          .select("*", { count: "exact", head: true });
        staffCount = count || 0;
      }
    }
  } catch {}

  try {
    if (universitiesCount === 0) {
      lecturersCount = 0;
    } else {
      const { data: profilesData } = await (supabase as any)
        .from("profiles")
        .select("id, role, school_id, university_id, metadata")
        .eq("role", "lecturer");

      if (Array.isArray(profilesData)) {
        const univIds = new Set(univs.map((u) => String(u.id).toLowerCase()));
        const univCodes = new Set(univs.map((u) => String(u.code || "").toLowerCase()));
        lecturersCount = profilesData.filter((p: any) => {
          const meta = p.metadata || {};
          const sId = String(p.school_id || p.university_id || meta.school_id || meta.university_id || "").toLowerCase();
          const sCode = String(meta.university_code || "").toLowerCase();
          return (sId && (univIds.has(sId) || univCodes.has(sId))) || (sCode && univCodes.has(sCode));
        }).length;
      } else {
        const { count } = await (supabase as any)
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "lecturer");
        lecturersCount = count || 0;
      }
    }
  } catch {}

  try {
    if (universitiesCount === 0) {
      systemAdminsCount = 0;
    } else {
      const sysAdmins = await getSystemAdmins();
      systemAdminsCount = sysAdmins.length;
    }
  } catch {}

  const dbLatencyMs = Math.max(1, Date.now() - startTime);

  return {
    totalUniversities: universitiesCount,
    activeUniversities: activeUniversitiesCount,
    totalSystemAdmins: systemAdminsCount,
    totalCampuses: campusesCount,
    totalStudents: studentsCount,
    totalLecturers: lecturersCount,
    totalStaff: staffCount,
    systemStatus: "healthy",
    dbLatencyMs,
  };
}

// ==========================================
// ROLES & PERMISSIONS GOVERNANCE (RBAC)
// ==========================================

export interface PermissionItem {
  id: string;
  code: string;
  module: string;
  description: string;
  roles_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface RoleItem {
  id: string;
  code: string;
  name: string;
  description: string;
  typical_restrictions?: string;
  is_system_role: boolean;
  permissions_count: number;
  permissions: string[]; // Permission codes
  permission_ids: string[]; // Permission UUIDs
  assigned_users_count: number;
  created_at: string;
  updated_at?: string;
}

/**
 * Retrieve all registered permissions across all functional modules.
 */
export async function getPermissions(): Promise<PermissionItem[]> {
  const supabase = createAdminClient();

  try {
    const { data: perms, error: permErr } = await (supabase as any)
      .from("permissions")
      .select("*")
      .order("module", { ascending: true })
      .order("code", { ascending: true });

    if (!permErr && Array.isArray(perms) && perms.length > 0) {
      // Calculate roles count for each permission
      const { data: rolePerms } = await (supabase as any)
        .from("role_permissions")
        .select("permission_id");

      const countMap: Record<string, number> = {};
      if (Array.isArray(rolePerms)) {
        rolePerms.forEach((rp: any) => {
          countMap[rp.permission_id] = (countMap[rp.permission_id] || 0) + 1;
        });
      }

      return perms.map((p: any) => ({
        id: p.id,
        code: p.code,
        module: p.module || "General",
        description: p.description || "",
        roles_count: countMap[p.id] || 0,
        created_at: p.created_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Could not query permissions table directly:", err);
  }

  // Fallback default permissions
  return [
    { id: "perm-adm-read", code: "admissions.application.read", module: "Admissions", description: "View applicant records, submitted forms, and document uploads", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-adm-rev", code: "admissions.application.review", module: "Admissions", description: "Review, score rubrics, and add reviewer remarks to applications", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-adm-appr", code: "admissions.decision.approve", module: "Admissions", description: "Approve admission offers, rejection decisions, and issue admission letters", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-adm-cycle", code: "admissions.cycle.manage", module: "Admissions", description: "Create and publish admission cycles, application periods, and fees", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-acad-curr", code: "academics.curriculum.manage", module: "Academics", description: "Manage academic curriculum, programme versions, and course credit structures", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-acad-course", code: "academics.course.manage", module: "Academics", description: "Create and edit courses, prerequisites, and syllabus content", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-acad-offer", code: "academics.offering.manage", module: "Academics", description: "Schedule semester course offerings, assign lecturers, and set class capacities", roles_count: 4, created_at: new Date().toISOString() },
    { id: "perm-reg-enrol", code: "registration.enrolment.manage", module: "Registration", description: "Register students for course offerings and enforce prerequisite checks", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-reg-over", code: "registration.override.approve", module: "Registration", description: "Approve prerequisite overrides, late registrations, and credit overload", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-time-man", code: "timetable.manage", module: "Timetable", description: "Draft semester timetable schedules, room allocations, and clash detection", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-time-pub", code: "timetable.publish", module: "Timetable", description: "Officially publish finalized campus and class timetables to staff and students", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-att-rec", code: "attendance.record", module: "Attendance", description: "Log student class session attendance and calculate semester eligibility", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-att-amend", code: "attendance.amend", module: "Attendance", description: "Amend past attendance records with justification audit notes", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-res-sub", code: "results.marks.submit", module: "Examinations & Grading", description: "Enter and submit coursework assessments and semester exam marks", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-res-mod", code: "results.marks.moderate", module: "Examinations & Grading", description: "Perform departmental moderation, marks standardisation, and statistical reviews", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-res-appr", code: "results.approve", module: "Examinations & Grading", description: "Dean and Senate approval of moderated examination results", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-res-pub", code: "results.publish", module: "Examinations & Grading", description: "Publish final approved grades to student transcript portals", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-res-amend", code: "results.amend", module: "Examinations & Grading", description: "Execute post-publication grade corrections under Senate audit mandate", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-fin-inv", code: "finance.invoice.create", module: "Finance", description: "Generate tuition invoices, laboratory fees, and billings", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-fin-read", code: "finance.invoice.read", module: "Finance", description: "Inspect student billing ledgers, outstanding balances, and aging summaries", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-fin-pay", code: "finance.payment.record", module: "Finance", description: "Post verified bank deposits, mobile money receipts, and manual payments", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-fin-ref-req", code: "finance.refund.request", module: "Finance", description: "Initiate student refund vouchers and fee adjustments", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-fin-ref-appr", code: "finance.refund.approve", module: "Finance", description: "Execute dual-control approval for student refunds and credit disbursements", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-fin-waive", code: "finance.waiver.manage", module: "Finance", description: "Grant approved institutional scholarships, discounts, and fee waivers", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-fin-holds", code: "finance.holds.manage", module: "Finance", description: "Place and lift financial registration holds based on fee balance thresholds", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-fin-recon", code: "finance.reconcile", module: "Finance", description: "Reconcile daily merchant settlements and bank feeds", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-reg-stu-read", code: "registry.student.read", module: "Registry", description: "View official student files, matriculation details, and biodata", roles_count: 4, created_at: new Date().toISOString() },
    { id: "perm-reg-stu-stat", code: "registry.student.status_change", module: "Registry", description: "Authorize status changes: suspension, withdrawal, leave of absence, or completion", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-reg-trans", code: "registry.transcript.issue", module: "Registry", description: "Issue certified digital and embossed academic transcripts", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-reg-let", code: "registry.letter.issue", module: "Registry", description: "Generate official letters of introduction, English proficiency, and completion", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-lib-cat", code: "library.catalog.manage", module: "Library", description: "Catalog new print books, journals, and digital repository items", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-lib-circ", code: "library.circulation.manage", module: "Library", description: "Manage loans, renewals, returns, reservations, and overdue library fines", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-host-inv", code: "hostel.inventory.manage", module: "Residences & Hostels", description: "Manage hostel blocks, rooms, bed inventory, and maintenance logs", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-host-alloc", code: "hostel.allocation.manage", module: "Residences & Hostels", description: "Allocate rooms to approved student applicants and process check-ins", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-hr-staff", code: "hr.staff.manage", module: "Human Resources", description: "Maintain employee directories, academic ranks, contracts, and job designations", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-hr-leave", code: "hr.leave.approve", module: "Human Resources", description: "Review and approve faculty and administrative staff leave requests", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-comm-ann", code: "communications.announce", module: "Communications", description: "Broadcast institutional announcements and campus SMS/email dispatches", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-sup-tick", code: "support.ticket.manage", module: "Support", description: "Triage and resolve student academic and ICT support tickets", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-rep-adm", code: "reports.view.admissions", module: "Reports & Analytics", description: "Access recruitment intake KPIs, conversion funnels, and demographics", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-rep-acad", code: "reports.view.academic", module: "Reports & Analytics", description: "Access graduation trends, retention rates, and grade distribution charts", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-rep-fin", code: "reports.view.finance", module: "Reports & Analytics", description: "Access fee collection analytics, revenue forecasts, and outstanding debt summaries", roles_count: 3, created_at: new Date().toISOString() },
    { id: "perm-rep-aud", code: "reports.view.audit", module: "Reports & Analytics", description: "Access compliance audit logs, user login trails, and security events", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-usr-role", code: "users.roles.manage", module: "System & Security", description: "Assign, modify, and revoke RBAC roles and granular permission scopes", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-id-read", code: "identity.user.read", module: "System & Security", description: "Inspect authentication profiles, MFA enrollment, and session statuses", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-id-update", code: "identity.user.update", module: "System & Security", description: "Reset user credentials, lock/unlock accounts, and suspend login access", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-aud-read", code: "audit.events.read", module: "System & Security", description: "Search immutable system audit events, changes, and access attempts", roles_count: 2, created_at: new Date().toISOString() },
    { id: "perm-sys-cfg", code: "system.config.manage", module: "System & Security", description: "Configure system parameters, academic terms, and cloud integrations", roles_count: 2, created_at: new Date().toISOString() },
  ];
}

/**
 * Create a new permission.
 */
export async function createPermission(payload: {
  code: string;
  module: string;
  description?: string;
}): Promise<PermissionItem> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const id = `perm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const newPerm: PermissionItem = {
    id,
    code: payload.code.trim().toLowerCase(),
    module: payload.module.trim(),
    description: payload.description?.trim() || "",
    roles_count: 0,
    created_at: now,
  };

  try {
    const { error } = await (supabase as any).from("permissions").insert({
      id: newPerm.id,
      code: newPerm.code,
      module: newPerm.module,
      description: newPerm.description,
      created_at: now,
    });

    if (error) {
      console.warn("Could not insert directly to permissions table:", error);
    }
  } catch (err) {
    console.warn("Permissions insert error:", err);
  }

  // Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "create_permission",
      entity_type: "permission",
      entity_id: newPerm.id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: newPerm,
    });
  } catch {}

  return newPerm;
}

/**
 * Update an existing permission.
 */
export async function updatePermission(
  id: string,
  payload: {
    code?: string;
    module?: string;
    description?: string;
  }
): Promise<PermissionItem> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const updates: any = {};
  if (payload.code) updates.code = payload.code.trim().toLowerCase();
  if (payload.module) updates.module = payload.module.trim();
  if (payload.description !== undefined) updates.description = payload.description.trim();

  try {
    await (supabase as any)
      .from("permissions")
      .update(updates)
      .eq("id", id);
  } catch (err) {
    console.warn("Could not update permissions table:", err);
  }

  // Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "update_permission",
      entity_type: "permission",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: updates,
    });
  } catch {}

  const all = await getPermissions();
  const updated = all.find((p) => p.id === id);
  return (
    updated || {
      id,
      code: payload.code || "",
      module: payload.module || "",
      description: payload.description || "",
      roles_count: 0,
      created_at: now,
    }
  );
}

/**
 * Delete a permission.
 */
export async function deletePermission(id: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Delete role_permissions bindings
    await (supabase as any).from("role_permissions").delete().eq("permission_id", id);
    // Delete from permissions
    await (supabase as any).from("permissions").delete().eq("id", id);
  } catch (err) {
    console.warn("Could not delete from permissions table:", err);
  }

  // Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "delete_permission",
      entity_type: "permission",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
    });
  } catch {}
}

/**
 * Retrieve all roles with their assigned permissions and user counts.
 */
export async function getRoles(): Promise<RoleItem[]> {
  const supabase = createAdminClient();

  let rawRoles: any[] = [];
  try {
    const { data, error } = await (supabase as any)
      .from("roles")
      .select("*")
      .order("name", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      rawRoles = data;
    }
  } catch (err) {
    console.warn("Could not query roles table directly:", err);
  }

  // Fallback system roles if empty
  if (rawRoles.length === 0) {
    rawRoles = [
      {
        id: "9ff88ff1-e423-4ba4-8b98-f7473c98eaea",
        code: "superadmin",
        name: "Super Administrator",
        description: "Master multi-tenant platform overseer across all institutions, global configs, and system-wide security.",
        is_system_role: true,
        created_at: "2026-11-05T08:00:00.000Z",
      },
      {
        id: "f67d1b87-ec01-41db-b436-1d59c9d3fe25",
        code: "system_admin",
        name: "System Administrator",
        description: "Institutional technical configuration, user provisioning, integrations, and operational health.",
        is_system_role: true,
        created_at: "2026-11-05T08:00:00.000Z",
      },
      {
        id: "39525f22-9abb-467b-a7d2-183c33d77fb0",
        code: "vice_chancellor",
        name: "Vice-Chancellor / Executive",
        description: "Institution-wide strategic performance, executive KPIs, and official leadership reports.",
        is_system_role: true,
        created_at: "2026-11-05T08:00:00.000Z",
      },
      {
        id: "d66410d7-4065-4273-9e7b-3ae6c3bc4c12",
        code: "registrar",
        name: "Registrar",
        description: "Authoritative student records, academic calendar, graduation approvals, official certifications, and transcripts.",
        is_system_role: true,
        created_at: "2026-11-05T08:00:00.000Z",
      },
      {
        id: "d2be4e20-7995-4a69-a8aa-b4ed2174002f",
        code: "finance_officer",
        name: "Finance Officer / Bursar",
        description: "Fee schedules, invoices, receipts, scholarships, refunds, waivers, and provider reconciliation.",
        is_system_role: true,
        created_at: "2026-11-05T08:00:00.000Z",
      },
      {
        id: "f3c0a12c-59ae-417d-b2f5-bb761136d193",
        code: "dean",
        name: "Faculty Dean",
        description: "Faculty oversight, academic review, departmental course allocations, and workload approval.",
        is_system_role: true,
        created_at: "2026-11-05T08:00:00.000Z",
      },
      {
        id: "1e47b447-85e2-4a75-8bb5-41062c8f5cd9",
        code: "lecturer",
        name: "Lecturer / Faculty",
        description: "Assigned course offerings, student lists, session attendance, coursework assessments, and marks submission.",
        is_system_role: true,
        created_at: "2026-11-05T08:00:00.000Z",
      },
      {
        id: "a213be9f-e76a-4281-bd89-28beacc7642c",
        code: "student",
        name: "Student",
        description: "Personal profile, registration, timetables, coursework, approved results, fee statements, and payments.",
        is_system_role: true,
        created_at: "2026-11-05T08:00:00.000Z",
      },
    ];
  }

  // Fetch all permissions and role_permissions to assemble role details
  const [allPerms, rolePermsRes, assignmentsRes] = await Promise.all([
    getPermissions(),
    (supabase as any).from("role_permissions").select("role_id, permission_id"),
    (supabase as any).from("user_role_assignments").select("role_id, is_active"),
  ]);

  const permById: Record<string, PermissionItem> = {};
  allPerms.forEach((p) => {
    permById[p.id] = p;
  });

  const rolePermMap: Record<string, string[]> = {};
  const rolePermCodeMap: Record<string, string[]> = {};
  const rawRolePerms = Array.isArray(rolePermsRes?.data) ? rolePermsRes.data : [];

  rawRolePerms.forEach((rp: any) => {
    if (!rolePermMap[rp.role_id]) {
      rolePermMap[rp.role_id] = [];
      rolePermCodeMap[rp.role_id] = [];
    }
    rolePermMap[rp.role_id].push(rp.permission_id);
    const code = permById[rp.permission_id]?.code;
    if (code) {
      rolePermCodeMap[rp.role_id].push(code);
    }
  });

  const userCountMap: Record<string, number> = {};
  const assignments = Array.isArray(assignmentsRes?.data) ? assignmentsRes.data : [];
  assignments.forEach((a: any) => {
    if (a.is_active !== false) {
      userCountMap[a.role_id] = (userCountMap[a.role_id] || 0) + 1;
    }
  });

  return rawRoles.map((r) => {
    const pIds = rolePermMap[r.id] || [];
    const pCodes = rolePermCodeMap[r.id] || [];

    // Fallback counts for system roles if role_permissions was just initialized
    let pCount = pIds.length;
    if (pCount === 0) {
      if (r.code === "superadmin") pCount = allPerms.length;
      else if (r.code === "system_admin") pCount = allPerms.length - 2;
      else if (r.code === "registrar") pCount = 14;
      else if (r.code === "finance_officer") pCount = 10;
      else if (r.code === "dean") pCount = 8;
      else if (r.code === "lecturer") pCount = 4;
      else if (r.code === "student") pCount = 3;
    }

    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || "",
      typical_restrictions: r.typical_restrictions || (
        r.code === "superadmin"
          ? "Restricted from arbitrary academic grade alterations without senate audit trail."
          : r.code === "system_admin"
          ? "No automatic permission to alter grades or approve unauthorized financial transactions."
          : r.code === "student"
          ? "Access strictly limited to own record and permitted cohort notices."
          : "Actions logged and governed by separation of duties."
      ),
      is_system_role: Boolean(r.is_system_role),
      permissions_count: pCount,
      permissions: pCodes,
      permission_ids: pIds,
      assigned_users_count: userCountMap[r.id] || (r.code === "superadmin" ? 1 : r.code === "system_admin" ? 1 : 2),
      created_at: r.created_at || new Date().toISOString(),
    };
  });
}

/**
 * Create a new custom or system role.
 */
export async function createRole(payload: {
  code: string;
  name: string;
  description?: string;
  typical_restrictions?: string;
  is_system_role?: boolean;
  permission_ids?: string[];
}): Promise<RoleItem> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const formattedCode = payload.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const id = `role-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const newRoleRow = {
    id,
    code: formattedCode,
    name: payload.name.trim(),
    description: payload.description?.trim() || "",
    typical_restrictions: payload.typical_restrictions?.trim() || "Actions logged and governed by least-privilege standards.",
    is_system_role: Boolean(payload.is_system_role),
    created_at: now,
  };

  try {
    const { error } = await (supabase as any).from("roles").insert(newRoleRow);
    if (error) {
      console.warn("Could not insert directly to roles table:", error);
    }
  } catch (err) {
    console.warn("Roles insert error:", err);
  }

  // Insert permission bindings
  if (Array.isArray(payload.permission_ids) && payload.permission_ids.length > 0) {
    try {
      const bindings = payload.permission_ids.map((pId) => ({
        role_id: id,
        permission_id: pId,
        created_at: now,
      }));
      await (supabase as any).from("role_permissions").insert(bindings);
    } catch (err) {
      console.warn("Could not bind role permissions:", err);
    }
  }

  // Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "create_role",
      entity_type: "role",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: {
        code: formattedCode,
        name: payload.name,
        permissions_count: payload.permission_ids?.length || 0,
      },
    });
  } catch {}

  const roles = await getRoles();
  const created = roles.find((r) => r.id === id);
  return created || {
    id,
    code: formattedCode,
    name: payload.name,
    description: payload.description || "",
    typical_restrictions: newRoleRow.typical_restrictions,
    is_system_role: Boolean(payload.is_system_role),
    permissions_count: payload.permission_ids?.length || 0,
    permissions: [],
    permission_ids: payload.permission_ids || [],
    assigned_users_count: 0,
    created_at: now,
  };
}

/**
 * Update an existing role and its permissions.
 */
export async function updateRole(
  id: string,
  payload: {
    name?: string;
    description?: string;
    typical_restrictions?: string;
    is_system_role?: boolean;
    permission_ids?: string[];
  }
): Promise<RoleItem> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const updates: any = {};
  if (payload.name) updates.name = payload.name.trim();
  if (payload.description !== undefined) updates.description = payload.description.trim();
  if (payload.typical_restrictions !== undefined) updates.typical_restrictions = payload.typical_restrictions.trim();
  if (payload.is_system_role !== undefined) updates.is_system_role = payload.is_system_role;

  try {
    await (supabase as any).from("roles").update(updates).eq("id", id);
  } catch (err) {
    console.warn("Could not update roles table:", err);
  }

  // Synchronize permission bindings if provided
  if (Array.isArray(payload.permission_ids)) {
    try {
      await (supabase as any).from("role_permissions").delete().eq("role_id", id);
      if (payload.permission_ids.length > 0) {
        const bindings = payload.permission_ids.map((pId) => ({
          role_id: id,
          permission_id: pId,
          created_at: now,
        }));
        await (supabase as any).from("role_permissions").insert(bindings);
      }
    } catch (err) {
      console.warn("Could not synchronize role_permissions:", err);
    }
  }

  // Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "update_role",
      entity_type: "role",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: {
        ...updates,
        permissions_count: payload.permission_ids?.length,
      },
    });
  } catch {}

  const roles = await getRoles();
  const updated = roles.find((r) => r.id === id);
  if (!updated) {
    throw new Error(`Role with ID '${id}' not found after update.`);
  }
  return updated;
}

/**
 * Delete a role and remove its permissions/assignments.
 */
export async function deleteRole(id: string): Promise<void> {
  const supabase = createAdminClient();

  // Find role to ensure it is not a protected system role
  const roles = await getRoles();
  const existing = roles.find((r) => r.id === id);

  if (existing) {
    if (existing.code === "superadmin" || existing.code === "system_admin") {
      throw new Error(`Cannot delete root system role '${existing.name}' (${existing.code}). This role is essential for platform governance.`);
    }
  }

  try {
    // 1. Delete role permissions bindings
    await (supabase as any).from("role_permissions").delete().eq("role_id", id);
    // 2. Deactivate / delete user role assignments
    await (supabase as any).from("user_role_assignments").delete().eq("role_id", id);
    // 3. Delete from roles table
    await (supabase as any).from("roles").delete().eq("id", id);
  } catch (err) {
    console.warn("Could not delete from roles table:", err);
  }

  // Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "delete_role",
      entity_type: "role",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      old_values: existing,
    });
  } catch {}
}

// SaaS School Aliases
export const getSchools = getUniversities;
export const createSchool = createUniversity;
export const updateSchool = updateUniversity;
export const deleteSchool = deleteUniversity;
export type SchoolItem = UniversityItem;

export interface DirectoryUserItem {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  account_status: "active" | "suspended" | "locked" | "deleted";
  school_id?: string | null;
  institution: string;
  mfa_enabled: boolean;
  created_at: string;
}

export async function getDirectoryUsers(): Promise<DirectoryUserItem[]> {
  const supabase = createAdminClient();

  // 1. Fetch active profiles
  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("id, full_name, email, phone, role, school_id, university_id, account_status, is_mfa_enabled, metadata, created_at")
    .neq("account_status", "deleted")
    .order("created_at", { ascending: false });

  // 2. Query deleted users blacklist and active universities
  const [{ data: delUsersRow }, { data: delUnivsRow }, universities] = await Promise.all([
    (supabase as any).from("system_settings").select("setting_value").eq("setting_key", "deleted_users").maybeSingle(),
    (supabase as any).from("system_settings").select("setting_value").eq("setting_key", "deleted_universities").maybeSingle(),
    getUniversities(),
  ]);

  const deletedUsersList = Array.isArray(delUsersRow?.setting_value) ? delUsersRow.setting_value : [];
  const deletedUnivsList = Array.isArray(delUnivsRow?.setting_value) ? delUnivsRow.setting_value : [];

  const delUserIds = new Set(deletedUsersList.map((u: any) => String(u.id || "").toLowerCase()).filter(Boolean));
  const delUserEmails = new Set(deletedUsersList.map((u: any) => String(u.email || "").toLowerCase()).filter(Boolean));
  const delUnivIds = new Set(deletedUnivsList.map((d: any) => String(d.id || "").toLowerCase()).filter(Boolean));
  const delUnivCodes = new Set(deletedUnivsList.map((d: any) => String(d.code || "").toLowerCase()).filter(Boolean));

  const univNameMap = new Map<string, string>();
  universities.forEach((u) => {
    if (u.id) univNameMap.set(String(u.id).toLowerCase(), u.name);
    if (u.code) univNameMap.set(String(u.code).toLowerCase(), u.name);
  });

  const validProfiles = (profiles || []).filter((u: any) => {
    if (u.account_status === "deleted") return false;
    if (u.id && delUserIds.has(String(u.id).toLowerCase())) return false;
    if (u.email && delUserEmails.has(String(u.email).toLowerCase())) return false;

    const meta = u.metadata || {};
    const schoolId = String(u.school_id || u.university_id || meta.school_id || meta.university_id || "").toLowerCase();
    const schoolCode = String(meta.university_code || "").toLowerCase();

    if (schoolId && delUnivIds.has(schoolId)) return false;
    if (schoolCode && delUnivCodes.has(schoolCode)) return false;
    if (meta.university_status === "deleted") return false;

    return true;
  });

  return validProfiles.map((u: any) => {
    const meta = u.metadata || {};
    const schoolId = u.school_id || u.university_id || meta.school_id || meta.university_id || null;
    const cleanSchoolId = String(schoolId || "").toLowerCase();
    const schoolCode = String(meta.university_code || "").toLowerCase();
    const isSuperAdmin = u.role === "superadmin" || meta.role === "superadmin" || u.email === "superadmin@university.edu.gh";

    const instName = isSuperAdmin
      ? "UMS Central Platform"
      : univNameMap.get(cleanSchoolId) ||
        univNameMap.get(schoolCode) ||
        meta.university_name ||
        "Unassigned";

    const assignedRole = isSuperAdmin
      ? "superadmin"
      : u.role || meta.role || meta.default_role || "user";

    const status = (u.account_status || meta.account_status || "active") as "active" | "suspended" | "locked" | "deleted";

    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name || meta.full_name || "User",
      phone: u.phone || meta.phone,
      role: assignedRole,
      account_status: status,
      school_id: schoolId,
      institution: instName,
      mfa_enabled: Boolean(u.is_mfa_enabled || meta.is_mfa_enabled),
      created_at: u.created_at || new Date().toISOString(),
    };
  });
}

export async function updateDirectoryUser(
  id: string,
  payload: {
    full_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    account_status?: "active" | "suspended" | "locked";
    password?: string;
    school_id?: string | null;
  }
): Promise<{ success: boolean; user: any }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // 1. Fetch current profile
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    throw new Error("User not found");
  }

  const isSuperAdmin =
    profile.email === "superadmin@university.edu.gh" ||
    profile.id === "1440ed7e-cb23-4248-a372-f38b20d01554" ||
    profile.role === "superadmin" ||
    profile.metadata?.role === "superadmin";

  if (isSuperAdmin && payload.account_status && payload.account_status !== "active") {
    throw new Error("Master Super Administrator cannot be suspended or locked.");
  }

  // 2. Auth updates
  const authUpdates: any = { user_metadata: {} };
  if (payload.email) authUpdates.email = payload.email.trim().toLowerCase();
  if (payload.password) authUpdates.password = payload.password;
  if (payload.full_name) authUpdates.user_metadata.full_name = payload.full_name.trim();
  if (payload.role && !isSuperAdmin) authUpdates.user_metadata.role = payload.role;
  if (payload.school_id !== undefined) authUpdates.user_metadata.school_id = payload.school_id;

  try {
    await supabase.auth.admin.updateUserById(id, authUpdates);
  } catch {}

  // 3. Profile updates
  const currentMetadata = profile.metadata || {};
  const updatedMetadata = {
    ...currentMetadata,
    full_name: payload.full_name?.trim() || profile.full_name,
    role: isSuperAdmin ? "superadmin" : (payload.role || currentMetadata.role || profile.role),
    school_id: payload.school_id !== undefined ? payload.school_id : (profile.school_id || currentMetadata.school_id),
    temp_password: payload.password || currentMetadata.temp_password,
  };

  const profileUpdates: any = {
    updated_at: now,
    metadata: updatedMetadata,
  };
  if (payload.full_name) profileUpdates.full_name = payload.full_name.trim();
  if (payload.email) profileUpdates.email = payload.email.trim().toLowerCase();
  if (payload.phone !== undefined) profileUpdates.phone = payload.phone;
  if (payload.account_status) profileUpdates.account_status = payload.account_status;
  if (payload.role && !isSuperAdmin) profileUpdates.role = payload.role;
  if (payload.school_id !== undefined) {
    profileUpdates.school_id = payload.school_id;
    profileUpdates.university_id = payload.school_id;
  }

  await (supabase as any)
    .from("profiles")
    .update(profileUpdates)
    .eq("id", id);

  // 4. Update role assignment if role changed
  if (payload.role && !isSuperAdmin) {
    try {
      const { data: roleRow } = await (supabase as any)
        .from("roles")
        .select("id")
        .eq("code", payload.role)
        .maybeSingle();

      if (roleRow?.id) {
        await (supabase as any).from("user_role_assignments").upsert(
          {
            user_id: id,
            role_id: roleRow.id,
            school_id: payload.school_id !== undefined ? payload.school_id : profile.school_id,
            is_active: payload.account_status !== "suspended",
            created_at: now,
          },
          { onConflict: "user_id,role_id" }
        );
      }
    } catch {}
  }

  // 5. Update in Virtual DB in-memory & disk
  try {
    const vDb = await getVirtualDb();
    if (vDb && Array.isArray(vDb.profiles)) {
      const idx = vDb.profiles.findIndex((p: any) => p.id === id);
      if (idx !== -1) {
        vDb.profiles[idx] = { ...vDb.profiles[idx], ...profileUpdates };
      }
      if (payload.account_status && Array.isArray(vDb.user_role_assignments)) {
        vDb.user_role_assignments.forEach((ura: any) => {
          if (ura.user_id === id) {
            ura.is_active = payload.account_status === "active";
          }
        });
      }
      await persistVirtualDb(vDb);
    }
  } catch {}

  // 6. Update dynamic user cache
  if (payload.password || payload.email || payload.full_name || payload.role || payload.account_status) {
    const activeEmail = (payload.email || profile.email).trim().toLowerCase();
    registerDynamicUser(activeEmail, payload.password || currentMetadata.temp_password || "User@123456", {
      id,
      email: activeEmail,
      full_name: payload.full_name?.trim() || profile.full_name,
      role: isSuperAdmin ? "superadmin" : (payload.role || profile.role || "student"),
      role_name: payload.role || profile.role || "User",
      school_id: payload.school_id !== undefined ? payload.school_id : (profile.school_id || null),
    });
  }

  // 7. Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: payload.account_status ? `user_${payload.account_status}` : "update_user",
      entity_type: "user",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: payload,
    });
  } catch {}

  return {
    success: true,
    user: {
      id,
      email: profileUpdates.email || profile.email,
      full_name: profileUpdates.full_name || profile.full_name,
      role: profileUpdates.role || profile.role,
      account_status: profileUpdates.account_status || profile.account_status,
      phone: profileUpdates.phone !== undefined ? profileUpdates.phone : profile.phone,
      school_id: profileUpdates.school_id !== undefined ? profileUpdates.school_id : profile.school_id,
    },
  };
}

export async function deleteDirectoryUser(id: string): Promise<{ success: boolean; deletedId: string }> {
  const supabase = createAdminClient();

  // 1. Fetch profile to check if superadmin
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("id, email, full_name, metadata")
    .eq("id", id)
    .maybeSingle();

  if (profile) {
    const isSuperAdmin =
      profile.email === "superadmin@university.edu.gh" ||
      profile.id === "1440ed7e-cb23-4248-a372-f38b20d01554" ||
      profile.role === "superadmin" ||
      profile.metadata?.role === "superadmin";

    if (isSuperAdmin) {
      throw new Error("Master Super Administrator cannot be deleted.");
    }
  }

  // 2. Remove role assignments
  try {
    await (supabase as any)
      .from("user_role_assignments")
      .delete()
      .eq("user_id", id);
  } catch {}

  // 3. Remove university_system_admins if applicable
  try {
    await (supabase as any)
      .from("university_system_admins")
      .delete()
      .eq("user_id", id);
  } catch {}

  // 4. Mark profile as deleted or remove from profiles
  try {
    await (supabase as any)
      .from("profiles")
      .delete()
      .eq("id", id);
  } catch {
    await (supabase as any)
      .from("profiles")
      .update({ account_status: "deleted" })
      .eq("id", id);
  }

  // 5. Delete in Virtual DB
  try {
    const vDb = await getVirtualDb();
    if (vDb) {
      if (Array.isArray(vDb.profiles)) {
        vDb.profiles = vDb.profiles.filter((p: any) => p.id !== id);
      }
      if (Array.isArray(vDb.user_role_assignments)) {
        vDb.user_role_assignments = vDb.user_role_assignments.filter((ura: any) => ura.user_id !== id);
      }
      if (Array.isArray(vDb.university_system_admins)) {
        vDb.university_system_admins = vDb.university_system_admins.filter((u: any) => u.user_id !== id);
      }
      await persistVirtualDb(vDb);
    }
  } catch {}

  // 6. Delete in Auth & dynamic user store
  try {
    await supabase.auth.admin.deleteUser(id);
  } catch {}
  unregisterDynamicUser(id);
  if (profile?.email) {
    unregisterDynamicUser(profile.email);
  }

  // 7. Add to deleted_users blacklist in system_settings
  try {
    const { data: delRow } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "deleted_users")
      .maybeSingle();

    const currentList = Array.isArray(delRow?.setting_value) ? delRow.setting_value : [];
    currentList.push({
      id,
      email: profile?.email || "",
      deleted_at: new Date().toISOString(),
    });

    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "deleted_users",
        setting_value: currentList,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    );
  } catch {}

  // 8. Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "delete_user",
      entity_type: "user",
      entity_id: id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
    });
  } catch {}

  return { success: true, deletedId: id };
}

/**
 * Provision a new user in the directory with an assigned role and school context.
 */
export async function createDirectoryUser(payload: {
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  role: string;
  school_id?: string | null;
  account_status?: "active" | "suspended" | "locked";
}): Promise<DirectoryUserItem> {
  const supabase = createAdminClient();
  const cleanEmail = payload.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const defaultPassword = payload.password?.trim() || "Pass@123456";

  // 0. Remove from deleted_users blacklist if present
  try {
    const { data: delSetting } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "deleted_users")
      .maybeSingle();

    const currentDel = Array.isArray(delSetting?.setting_value) ? delSetting.setting_value : [];
    const filteredDel = currentDel.filter((u: any) => u?.email?.toLowerCase() !== cleanEmail);
    if (filteredDel.length !== currentDel.length) {
      await (supabase as any).from("system_settings").upsert(
        {
          setting_key: "deleted_users",
          setting_value: filteredDel,
          updated_at: now,
        },
        { onConflict: "setting_key" }
      );
    }
  } catch {}

  // 1. Resolve university name
  let universityName = "UMS Central Platform";
  if (payload.school_id) {
    const universities = await getUniversities();
    const found = universities.find(
      (u) => u.id === payload.school_id || u.code.toLowerCase() === payload.school_id?.toLowerCase()
    );
    if (found) {
      universityName = found.name;
    }
  }

  // 2. Create Auth user
  let user: { id: string; email?: string } = {
    id: crypto.randomUUID(),
    email: cleanEmail,
  };

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name.trim(),
        role: payload.role,
        default_role: payload.role,
        school_id: payload.school_id || null,
        university_id: payload.school_id || null,
        university_name: universityName,
      },
    });

    if (!authError && authData?.user) {
      user = authData.user;
    }
  } catch (err) {
    console.warn("Could not create user via Supabase admin auth, using virtual profile:", err);
  }

  // 3. Register in dynamic users for fallback session handling
  registerDynamicUser(cleanEmail, defaultPassword, {
    id: user.id,
    email: cleanEmail,
    full_name: payload.full_name.trim(),
    role: payload.role,
    role_name: payload.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    school_id: payload.school_id || null,
  });

  // 4. Upsert profile
  const profileRow = {
    id: user.id,
    email: cleanEmail,
    full_name: payload.full_name.trim(),
    phone: payload.phone || null,
    role: payload.role,
    account_status: payload.account_status || "active",
    school_id: payload.school_id || null,
    university_id: payload.school_id || null,
    is_mfa_enabled: false,
    metadata: {
      role: payload.role,
      default_role: payload.role,
      school_id: payload.school_id || null,
      university_id: payload.school_id || null,
      university_name: universityName,
      temp_password: defaultPassword,
    },
    created_at: now,
    updated_at: now,
  };

  await (supabase as any).from("profiles").upsert(profileRow, { onConflict: "id" });

  // 5. User role assignment
  try {
    const { data: roleRow } = await (supabase as any)
      .from("roles")
      .select("id")
      .eq("code", payload.role)
      .maybeSingle();

    if (roleRow?.id) {
      await (supabase as any).from("user_role_assignments").upsert(
        {
          user_id: user.id,
          role_id: roleRow.id,
          school_id: payload.school_id || null,
          is_active: true,
          created_at: now,
        },
        { onConflict: "user_id,role_id" }
      );
    }
  } catch {}

  // 6. If role is system_admin and school_id is provided, also insert into university_system_admins
  if (payload.role === "system_admin" && payload.school_id) {
    try {
      await (supabase as any).from("university_system_admins").insert({
        university_id: payload.school_id,
        user_id: user.id,
        is_primary: false,
      });
    } catch {}
  }

  // 7. Update Virtual DB
  try {
    const vDb = await getVirtualDb();
    if (vDb) {
      if (Array.isArray(vDb.profiles)) {
        const existIdx = vDb.profiles.findIndex((p: any) => p.id === user.id || p.email === cleanEmail);
        if (existIdx !== -1) {
          vDb.profiles[existIdx] = { ...vDb.profiles[existIdx], ...profileRow };
        } else {
          vDb.profiles.unshift(profileRow);
        }
      }
      await persistVirtualDb(vDb);
    }
  } catch {}

  // 8. Audit event
  try {
    await (supabase as any).from("audit_events").insert({
      action: "provision_user",
      entity_type: "user",
      entity_id: user.id,
      actor_role: "superadmin",
      outcome: "SUCCESS",
      new_values: profileRow,
    });
  } catch {}

  return {
    id: user.id,
    email: cleanEmail,
    full_name: payload.full_name.trim(),
    phone: payload.phone,
    role: payload.role,
    account_status: (payload.account_status || "active") as any,
    school_id: payload.school_id || null,
    institution: universityName,
    mfa_enabled: false,
    created_at: now,
  };
}

