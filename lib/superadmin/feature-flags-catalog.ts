export type FeatureFlagCategory = "portal" | "module";

export interface FeatureFlagDefinition {
  portal_key: string;
  category: FeatureFlagCategory;
  label: string;
  description: string;
  target_roles: string[];
  route_prefixes: string[];
  default_enabled: boolean;
}

export interface ResolvedFeatureFlag extends FeatureFlagDefinition {
  is_enabled: boolean;
  global_enabled: boolean;
  has_school_override: boolean;
  school_id: string | null;
  updated_at: string | null;
}

/**
 * Super Admin portal keys are permanently exempt from lockout.
 */
export const SUPER_ADMIN_EXEMPT_KEYS = new Set([
  "superadmin",
  "super_admin",
  "superadmin_portal",
]);

export const DEFAULT_FEATURE_FLAGS: FeatureFlagDefinition[] = [
  // -------------------------------------------------------------------------
  // Dedicated User Portals (8)
  // -------------------------------------------------------------------------
  {
    portal_key: "admin_portal",
    category: "portal",
    label: "School / System Admin Portal",
    description:
      "Institutional administration workspace covering students, staff, academics, timetables, and school governance.",
    target_roles: [
      "system_admin",
      "admin",
      "administrator",
      "vice_chancellor",
      "registrar",
      "academic_affairs_officer",
      "dean",
      "head_of_department",
      "admissions_officer",
      "librarian",
      "hostel_officer",
      "hr_officer",
      "auditor",
    ],
    route_prefixes: ["/admin"],
    default_enabled: true,
  },
  {
    portal_key: "finance_portal",
    category: "portal",
    label: "Finance & Bursar Portal",
    description:
      "Fee schedules, student invoices, payment reconciliation, bursar receipts, waivers, and refunds.",
    target_roles: ["finance_officer", "bursar", "accountant", "auditor"],
    route_prefixes: ["/finance", "/bursar"],
    default_enabled: true,
  },
  {
    portal_key: "registrar_portal",
    category: "portal",
    label: "Registrar Portal",
    description:
      "Admissions review, student directory, course/module registration approvals, academic calendars, transcripts, and graduation clearance.",
    target_roles: ["registrar", "admissions_officer", "academic_affairs_officer"],
    route_prefixes: ["/registrar"],
    default_enabled: true,
  },
  {
    portal_key: "lecturer_portal",
    category: "portal",
    label: "Lecturer / Faculty Portal",
    description:
      "University and college faculty workspace for courses, attendance, assessments, marks entry, and advising.",
    target_roles: ["lecturer"],
    route_prefixes: ["/lecturer"],
    default_enabled: true,
  },
  {
    portal_key: "teacher_portal",
    category: "portal",
    label: "Teacher / Staff Portal",
    description:
      "High school teachers and vocational instructors workspace for attendance, gradebooks, logbooks, parent messages, and workshops.",
    target_roles: ["teacher", "instructor"],
    route_prefixes: ["/teacher"],
    default_enabled: true,
  },
  {
    portal_key: "student_portal",
    category: "portal",
    label: "Student Portal",
    description:
      "Student self-service portal for course registration, timetables, attendance, grades, transcripts, and fee statements.",
    target_roles: ["student"],
    route_prefixes: ["/student"],
    default_enabled: true,
  },
  {
    portal_key: "parent_portal",
    category: "portal",
    label: "Parent / Guardian Portal",
    description:
      "Family portal for ward attendance tracking, report cards, fee billing visibility, and PTA teacher messages.",
    target_roles: ["parent", "parent_sponsor", "guardian"],
    route_prefixes: ["/parent"],
    default_enabled: true,
  },
  {
    portal_key: "applicant_portal",
    category: "portal",
    label: "Admissions & Applicant Portal",
    description:
      "Online admissions application tracker, document uploads, admission decisions, and institutional admissions pipeline.",
    target_roles: ["applicant", "admissions_officer"],
    route_prefixes: ["/applicant", "/admin/admissions"],
    default_enabled: true,
  },
  {
    portal_key: "advisor_portal",
    category: "portal",
    label: "Academic Advisor Portal",
    description:
      "Academic advising dashboard for assigned student cohorts, credit loads, progression reviews, and case notes.",
    target_roles: ["academic_advisor", "advisor"],
    route_prefixes: ["/advisor"],
    default_enabled: true,
  },

  // -------------------------------------------------------------------------
  // Major Campus Modules (5)
  // -------------------------------------------------------------------------
  {
    portal_key: "exams_module",
    category: "module",
    label: "Examinations & Grading",
    description:
      "Exam scheduling, marks entry, moderation workflows, GPA/CGPA computation, results publishing, and transcripts.",
    target_roles: ["system_admin", "lecturer", "teacher", "instructor", "student", "registrar"],
    route_prefixes: [
      "/admin/exams",
      "/lecturer/marks-entry",
      "/lecturer/assessments",
      "/lecturer/moderation",
      "/lecturer/grades",
      "/lecturer/assignments",
      "/teacher/report-cards",
      "/teacher/competencies",
      "/teacher/gradebook",
      "/student/results",
      "/student/transcripts",
      "/student/report-card",
      "/student/competencies",
    ],
    default_enabled: true,
  },
  {
    portal_key: "library_module",
    category: "module",
    label: "Library Services",
    description:
      "Campus book catalog, circulation inventory, student loans, returns, and overdue fine tracking.",
    target_roles: ["librarian", "system_admin", "student"],
    route_prefixes: ["/admin/library", "/student/library"],
    default_enabled: true,
  },
  {
    portal_key: "hostels_module",
    category: "module",
    label: "Hostels & Campus Housing",
    description:
      "Residence halls, room and bed capacity management, student accommodation requests, allocations, and maintenance.",
    target_roles: ["hostel_officer", "system_admin", "student"],
    route_prefixes: ["/admin/hostels", "/student/hostel"],
    default_enabled: true,
  },
  {
    portal_key: "transport_module",
    category: "module",
    label: "Transport & Fleet Logistics",
    description:
      "School bus routes, vehicle fleet schedules, boarding passes, and campus transit logs.",
    target_roles: ["system_admin", "staff"],
    route_prefixes: ["/admin/transport", "/admin/transportation"],
    default_enabled: true,
  },
  {
    portal_key: "lms_module",
    category: "module",
    label: "LMS / E-Learning & Workshops",
    description:
      "Digital classrooms, practical vocational workshops, apprenticeship tracking, and online learning materials.",
    target_roles: ["system_admin", "teacher", "instructor", "lecturer", "student"],
    route_prefixes: [
      "/admin/workshops",
      "/teacher/workshops",
      "/teacher/modules",
      "/teacher/logbooks",
      "/teacher/attachments",
      "/teacher/inventory",
      "/student/modules",
      "/student/logbook",
    ],
    default_enabled: true,
  },
];

export function getFeatureFlagDefinition(
  portalKey: string
): FeatureFlagDefinition | undefined {
  const key = String(portalKey || "").trim().toLowerCase();
  return DEFAULT_FEATURE_FLAGS.find((f) => f.portal_key === key);
}

export function isSuperAdminPath(pathname: string): boolean {
  const clean = normalizePathForMatching(pathname);
  return (
    clean === "/superadmin" ||
    clean.startsWith("/superadmin/") ||
    clean === "/super-admin" ||
    clean.startsWith("/super-admin/") ||
    clean === "/api/superadmin" ||
    clean.startsWith("/api/superadmin/")
  );
}

function stripQueryAndTrailingSlash(pathname: string): string {
  const base = String(pathname || "").split("?")[0].split("#")[0].trim() || "/";
  if (base.length > 1 && base.endsWith("/")) {
    return base.slice(0, -1);
  }
  return base;
}

export function normalizePathForMatching(pathname: string): string {
  const base = stripQueryAndTrailingSlash(pathname).toLowerCase();
  if (base.startsWith("/api/admin/") || base === "/api/admin") {
    return base.replace(/^\/api/, "");
  }
  if (base.startsWith("/api/finance/") || base === "/api/finance") {
    return base.replace(/^\/api/, "");
  }
  if (base.startsWith("/api/bursar/") || base === "/api/bursar") {
    return base.replace(/^\/api/, "");
  }
  if (base.startsWith("/api/registrar/") || base === "/api/registrar") {
    return base.replace(/^\/api/, "");
  }
  if (base.startsWith("/api/lecturer/") || base === "/api/lecturer") {
    return base.replace(/^\/api/, "");
  }
  if (base.startsWith("/api/teacher/") || base === "/api/teacher") {
    return base.replace(/^\/api/, "");
  }
  if (base.startsWith("/api/student/") || base === "/api/student") {
    return base.replace(/^\/api/, "");
  }
  if (base.startsWith("/api/parent/") || base === "/api/parent") {
    return base.replace(/^\/api/, "");
  }
  if (base.startsWith("/api/applicant/") || base === "/api/applicant") {
    return base.replace(/^\/api/, "");
  }
  if (base.startsWith("/api/advisor/") || base === "/api/advisor") {
    return base.replace(/^\/api/, "");
  }
  return base;
}

function matchesPrefix(path: string, prefix: string): boolean {
  const normalizedPrefix = stripQueryAndTrailingSlash(prefix).toLowerCase();
  return path === normalizedPrefix || path.startsWith(`${normalizedPrefix}/`);
}

/**
 * Returns matching portal/module definitions ordered so portal-level flags appear
 * before finer-grained module flags (e.g. `admin_portal` before `library_module`).
 */
export function matchFeatureFlagsForPath(
  pathname: string
): FeatureFlagDefinition[] {
  const clean = normalizePathForMatching(pathname);
  if (
    clean === "/" ||
    clean === "/login" ||
    clean === "/portal-unavailable" ||
    clean === "/unauthorized" ||
    clean === "/not-found" ||
    clean === "/404" ||
    isSuperAdminPath(clean)
  ) {
    return [];
  }

  const matched = DEFAULT_FEATURE_FLAGS.filter((def) =>
    def.route_prefixes.some((prefix) => matchesPrefix(clean, prefix))
  );

  return matched.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category === "portal" ? -1 : 1;
    }
    return 0;
  });
}

export function findDisabledFlagForPath(
  pathname: string,
  enabledMap: Record<string, boolean>
): FeatureFlagDefinition | null {
  const matches = matchFeatureFlagsForPath(pathname);
  for (const def of matches) {
    if (enabledMap[def.portal_key] === false) {
      return def;
    }
  }
  return null;
}

export function isHrefEnabledByFlags(
  href: string,
  enabledMap: Record<string, boolean>
): boolean {
  return findDisabledFlagForPath(href, enabledMap) === null;
}

export function buildDefaultEnabledMap(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const def of DEFAULT_FEATURE_FLAGS) {
    map[def.portal_key] = def.default_enabled;
  }
  return map;
}
