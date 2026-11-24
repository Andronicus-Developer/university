import { normalizeSchoolType } from "@/lib/academics/school-terminology";

export type PortalSchoolType = "university" | "high_school" | "vocational";

export type PortalKpiKey =
  | "departments"
  | "programs"
  | "subjects"
  | "modules"
  | "students"
  | "teachers"
  | "fees";

export interface PortalNavItem {
  id: string;
  label: string;
  href: string;
  iconKey: string;
  badge?: string;
}

export interface PortalNavGroup {
  title: string;
  items: PortalNavItem[];
}

export interface PortalKpiSpec {
  key: PortalKpiKey;
  label: string;
  sublabel: string;
  href: string;
  tone: "blue" | "emerald" | "rose" | "indigo" | "amber" | "teal";
  isCurrency?: boolean;
}

export interface SchoolPortalConfig {
  schoolType: PortalSchoolType;
  portalBadge: string;
  badgeClasses: string;
  learnerSingular: string;
  learnerPlural: string;
  instructorSingular: string;
  instructorPlural: string;
  academicUnitSingular: string;
  academicUnitPlural: string;
  curriculumUnitSingular: string;
  curriculumUnitPlural: string;
  termSingular: string;
  termPlural: string;
  sidebarGroups: PortalNavGroup[];
  allowedRoutes: string[];
  dashboardKpis: PortalKpiSpec[];
}

export function toPortalSchoolType(raw?: string | null): PortalSchoolType {
  const canonical = normalizeSchoolType(raw);
  if (canonical === "high_school") return "high_school";
  if (canonical === "vocational_school") return "vocational";
  return "university";
}

export const SCHOOL_PORTAL_CONFIG: Record<PortalSchoolType, SchoolPortalConfig> = {
  university: {
    schoolType: "university",
    portalBadge: "University Portal",
    badgeClasses: "bg-blue-50 text-blue-700 border-blue-200",
    learnerSingular: "Student",
    learnerPlural: "Students",
    instructorSingular: "Lecturer",
    instructorPlural: "Lecturers / Faculty",
    academicUnitSingular: "Department",
    academicUnitPlural: "Departments",
    curriculumUnitSingular: "Program",
    curriculumUnitPlural: "Programs",
    termSingular: "Semester",
    termPlural: "Semesters",
    sidebarGroups: [
      {
        title: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", iconKey: "LayoutGrid" },
        ],
      },
      {
        title: "Academics & Curriculum",
        items: [
          { id: "departments", label: "Departments", href: "/admin/departments", iconKey: "Layers" },
          { id: "programs", label: "Programs", href: "/admin/programs", iconKey: "Award" },
          { id: "courses", label: "Courses & Credit Hours", href: "/admin/courses", iconKey: "BookOpen" },
          { id: "sessions", label: "Semesters / Academic Sessions", href: "/admin/sessions", iconKey: "CalendarRange" },
        ],
      },
      {
        title: "People & Directory",
        items: [
          { id: "students", label: "Students", href: "/admin/students", iconKey: "GraduationCap" },
          { id: "teachers", label: "Lecturers / Faculty", href: "/admin/teachers", iconKey: "UserCheck" },
          { id: "staff", label: "Staff & Bursar", href: "/admin/staff", iconKey: "Users" },
        ],
      },
      {
        title: "Records, Campus & Finance",
        items: [
          { id: "course-registration", label: "Course Registration", href: "/admin/course-registration", iconKey: "ClipboardList" },
          { id: "exams", label: "Exams & GPA / Transcripts", href: "/admin/exams", iconKey: "FileCheck2" },
          { id: "hostels", label: "Hostels / Accommodation", href: "/admin/hostels", iconKey: "Building2" },
          { id: "fees", label: "Finance & Tuition Fees", href: "/admin/fees", iconKey: "CreditCard" },
        ],
      },
      {
        title: "System",
        items: [
          { id: "settings", label: "Settings", href: "/admin/settings", iconKey: "Sliders" },
        ],
      },
    ],
    allowedRoutes: [
      "/admin",
      "/admin/dashboard",
      "/admin/departments",
      "/admin/programs",
      "/admin/programmes",
      "/admin/courses",
      "/admin/sessions",
      "/admin/students",
      "/admin/teachers",
      "/admin/staff",
      "/admin/course-registration",
      "/admin/exams",
      "/admin/hostels",
      "/admin/fees",
      "/admin/settings",
    ],
    dashboardKpis: [
      { key: "departments", label: "Departments", sublabel: "Academic units", href: "/admin/departments", tone: "indigo" },
      { key: "programs", label: "Programs", sublabel: "Degree & diploma tracks", href: "/admin/programs", tone: "blue" },
      { key: "students", label: "Students", sublabel: "Enrolled students", href: "/admin/students", tone: "rose" },
      { key: "teachers", label: "Lecturers", sublabel: "Faculty members", href: "/admin/teachers", tone: "teal" },
      { key: "fees", label: "Fees Collected", sublabel: "Tuition & fee revenue", href: "/admin/fees", tone: "emerald", isCurrency: true },
    ],
  },

  high_school: {
    schoolType: "high_school",
    portalBadge: "High School Portal",
    badgeClasses: "bg-emerald-50 text-emerald-700 border-emerald-200",
    learnerSingular: "Student",
    learnerPlural: "Students",
    instructorSingular: "Teacher",
    instructorPlural: "Teachers",
    academicUnitSingular: "Class / Form",
    academicUnitPlural: "Classes / Forms",
    curriculumUnitSingular: "Subject",
    curriculumUnitPlural: "Subjects",
    termSingular: "Term",
    termPlural: "Terms",
    sidebarGroups: [
      {
        title: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", iconKey: "LayoutGrid" },
        ],
      },
      {
        title: "Academics & Terms",
        items: [
          { id: "classes", label: "Classes / Forms", href: "/admin/programs", iconKey: "Award" },
          { id: "subject", label: "Subjects", href: "/admin/subject", iconKey: "BookOpen" },
          { id: "sessions", label: "Terms & Academic Year", href: "/admin/sessions", iconKey: "CalendarRange" },
        ],
      },
      {
        title: "People & Guardians",
        items: [
          { id: "students", label: "Students", href: "/admin/students", iconKey: "GraduationCap" },
          { id: "teachers", label: "Teachers", href: "/admin/teachers", iconKey: "UserCheck" },
          { id: "parents", label: "Parents / Guardians", href: "/admin/parents", iconKey: "Users" },
          { id: "staff", label: "Staff & Bursar", href: "/admin/staff", iconKey: "Briefcase" },
        ],
      },
      {
        title: "Operations & Billing",
        items: [
          { id: "routine", label: "Class Timetable", href: "/admin/routine", iconKey: "CalendarDays" },
          { id: "attendance", label: "Attendance & Conduct", href: "/admin/attendance", iconKey: "CheckSquare" },
          { id: "report-cards", label: "Term Report Cards", href: "/admin/report-cards", iconKey: "FileCheck2" },
          { id: "fees", label: "School Fees & Levies", href: "/admin/fees", iconKey: "CreditCard" },
        ],
      },
      {
        title: "System",
        items: [
          { id: "settings", label: "Settings", href: "/admin/settings", iconKey: "Sliders" },
        ],
      },
    ],
    allowedRoutes: [
      "/admin",
      "/admin/dashboard",
      "/admin/programs",
      "/admin/programmes",
      "/admin/subject",
      "/admin/sessions",
      "/admin/students",
      "/admin/teachers",
      "/admin/parents",
      "/admin/staff",
      "/admin/routine",
      "/admin/attendance",
      "/admin/report-cards",
      "/admin/fees",
      "/admin/settings",
    ],
    dashboardKpis: [
      { key: "programs", label: "Classes / Forms", sublabel: "Active streams & forms", href: "/admin/programs", tone: "indigo" },
      { key: "subjects", label: "Subjects", sublabel: "Curriculum subjects", href: "/admin/subject", tone: "blue" },
      { key: "students", label: "Students", sublabel: "Enrolled students", href: "/admin/students", tone: "rose" },
      { key: "teachers", label: "Teachers", sublabel: "Teaching staff", href: "/admin/teachers", tone: "teal" },
      { key: "fees", label: "Fee Collection", sublabel: "Term fees & levies", href: "/admin/fees", tone: "emerald", isCurrency: true },
    ],
  },

  vocational: {
    schoolType: "vocational",
    portalBadge: "Vocational Portal",
    badgeClasses: "bg-amber-50 text-amber-800 border-amber-200",
    learnerSingular: "Trainee",
    learnerPlural: "Trainees / Students",
    instructorSingular: "Instructor",
    instructorPlural: "Instructors",
    academicUnitSingular: "Trade Class / Workshop",
    academicUnitPlural: "Trade Classes / Workshops",
    curriculumUnitSingular: "Module / Practical",
    curriculumUnitPlural: "Modules / Practicals",
    termSingular: "Intake / Cohort",
    termPlural: "Intakes / Cohorts",
    sidebarGroups: [
      {
        title: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", iconKey: "LayoutGrid" },
        ],
      },
      {
        title: "Trade Training & Intakes",
        items: [
          { id: "trade-classes", label: "Trade Classes / Workshops", href: "/admin/departments", iconKey: "Wrench" },
          { id: "workshops", label: "Modules / Practicals", href: "/admin/workshops", iconKey: "Boxes" },
          { id: "intakes", label: "Intakes / Cohorts", href: "/admin/intakes", iconKey: "CalendarRange" },
        ],
      },
      {
        title: "People & Directory",
        items: [
          { id: "students", label: "Trainees / Students", href: "/admin/students", iconKey: "GraduationCap" },
          { id: "teachers", label: "Instructors", href: "/admin/teachers", iconKey: "UserCheck" },
          { id: "staff", label: "Staff & Bursar", href: "/admin/staff", iconKey: "Users" },
        ],
      },
      {
        title: "Skills, Workshop & Finance",
        items: [
          { id: "competencies", label: "Competency & Practical Assessments", href: "/admin/competencies", iconKey: "FileCheck2" },
          { id: "attachments", label: "Apprenticeship / Industrial Attachments", href: "/admin/attachments", iconKey: "Briefcase" },
          { id: "inventory", label: "Workshop Equipment & Inventory", href: "/admin/inventory", iconKey: "Database" },
          { id: "certifications", label: "Trade Certifications", href: "/admin/certifications", iconKey: "Award" },
          { id: "fees", label: "Fees & Workshop Materials", href: "/admin/fees", iconKey: "CreditCard" },
        ],
      },
      {
        title: "System",
        items: [
          { id: "settings", label: "Settings", href: "/admin/settings", iconKey: "Sliders" },
        ],
      },
    ],
    allowedRoutes: [
      "/admin",
      "/admin/dashboard",
      "/admin/departments",
      "/admin/workshops",
      "/admin/intakes",
      "/admin/students",
      "/admin/teachers",
      "/admin/staff",
      "/admin/competencies",
      "/admin/attachments",
      "/admin/inventory",
      "/admin/certifications",
      "/admin/fees",
      "/admin/settings",
    ],
    dashboardKpis: [
      { key: "departments", label: "Trade Classes", sublabel: "Workshops & trades", href: "/admin/departments", tone: "amber" },
      { key: "modules", label: "Modules", sublabel: "Practical training units", href: "/admin/workshops", tone: "indigo" },
      { key: "students", label: "Trainees", sublabel: "Enrolled trainees", href: "/admin/students", tone: "rose" },
      { key: "teachers", label: "Instructors", sublabel: "Trade instructors", href: "/admin/teachers", tone: "teal" },
      { key: "fees", label: "Fees & Materials", sublabel: "Tuition & workshop fees", href: "/admin/fees", tone: "emerald", isCurrency: true },
    ],
  },
};

export function getSchoolPortalConfig(rawSchoolType?: string | null): SchoolPortalConfig {
  return SCHOOL_PORTAL_CONFIG[toPortalSchoolType(rawSchoolType)];
}

export function isRouteAllowedForSchoolType(
  pathname: string,
  rawSchoolType?: string | null
): boolean {
  const cleanPath =
    (String(pathname || "/").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/").toLowerCase();
  if (!cleanPath.startsWith("/admin")) return true;
  if (cleanPath === "/admin") return true;
  const config = getSchoolPortalConfig(rawSchoolType);
  return config.allowedRoutes.some(
    (allowed) =>
      allowed !== "/admin" &&
      (cleanPath === allowed || cleanPath.startsWith(`${allowed}/`))
  );
}
