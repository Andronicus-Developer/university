import { PortalSchoolType, toPortalSchoolType } from "@/config/schoolPortalConfig";

export type StudentKpiKey =
  | "primary_progress"
  | "academic_standing"
  | "fee_balance"
  | "upcoming_schedule";

export interface StudentNavItem {
  id: string;
  label: string;
  href: string;
  iconKey: string;
  badge?: string;
}

export interface StudentNavGroup {
  title: string;
  items: StudentNavItem[];
}

export interface StudentKpiSpec {
  key: StudentKpiKey;
  label: string;
  sublabel: string;
  href: string;
  tone: "blue" | "emerald" | "rose" | "indigo" | "amber" | "teal";
  isCurrency?: boolean;
}

export interface StudentPortalConfig {
  schoolType: PortalSchoolType;
  portalBadge: string;
  badgeClasses: string;
  accentGradient: string;
  activeNavClasses: string;
  learnerSingular: string;
  idLabel: string;
  unitLabel: string;
  curriculumLabel: string;
  termLabel: string;
  sidebarGroups: StudentNavGroup[];
  allowedRoutes: string[];
  dashboardKpis: StudentKpiSpec[];
}

export const STUDENT_PORTAL_CONFIG: Record<PortalSchoolType, StudentPortalConfig> = {
  university: {
    schoolType: "university",
    portalBadge: "University Student Portal",
    badgeClasses:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80",
    accentGradient: "from-blue-600 via-indigo-600 to-sky-600",
    activeNavClasses:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-xs",
    learnerSingular: "Student",
    idLabel: "Matric Number",
    unitLabel: "Department",
    curriculumLabel: "Program",
    termLabel: "Semester",
    sidebarGroups: [
      {
        title: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/student/dashboard", iconKey: "LayoutGrid" },
        ],
      },
      {
        title: "Academics & Registration",
        items: [
          {
            id: "registration",
            label: "Course Registration",
            href: "/student/registration",
            iconKey: "ClipboardList",
            badge: "Open",
          },
          {
            id: "enrolments",
            label: "My Courses & Materials",
            href: "/student/enrolments",
            iconKey: "BookOpen",
          },
          {
            id: "timetable",
            label: "Lecture & Exam Timetable",
            href: "/student/timetable",
            iconKey: "CalendarDays",
          },
          {
            id: "results",
            label: "Semester Results & Transcript",
            href: "/student/results",
            iconKey: "Award",
          },
        ],
      },
      {
        title: "Campus & Finance",
        items: [
          {
            id: "hostel",
            label: "Hostel & Accommodation",
            href: "/student/hostel",
            iconKey: "Building2",
          },
          {
            id: "fee-statement",
            label: "Tuition & Fee Statement",
            href: "/student/fee-statement",
            iconKey: "Receipt",
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            id: "profile",
            label: "Profile & Settings",
            href: "/student/profile",
            iconKey: "User",
          },
        ],
      },
    ],
    allowedRoutes: [
      "/student",
      "/student/dashboard",
      "/student/registration",
      "/student/enrolments",
      "/student/timetable",
      "/student/results",
      "/student/hostel",
      "/student/fee-statement",
      "/student/profile",
      "/student/settings",
    ],
    dashboardKpis: [
      {
        key: "primary_progress",
        label: "Registered Credits",
        sublabel: "Current semester credit load",
        href: "/student/registration",
        tone: "blue",
      },
      {
        key: "academic_standing",
        label: "Current CGPA / GPA",
        sublabel: "Cumulative academic standing",
        href: "/student/results",
        tone: "indigo",
      },
      {
        key: "fee_balance",
        label: "Fee Balance",
        sublabel: "Tuition & institutional dues",
        href: "/student/fee-statement",
        tone: "rose",
        isCurrency: true,
      },
      {
        key: "upcoming_schedule",
        label: "Lectures & Exams",
        sublabel: "Scheduled course sessions",
        href: "/student/timetable",
        tone: "emerald",
      },
    ],
  },

  high_school: {
    schoolType: "high_school",
    portalBadge: "High School Student Portal",
    badgeClasses:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80",
    accentGradient: "from-emerald-600 via-teal-600 to-cyan-600",
    activeNavClasses:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold shadow-xs",
    learnerSingular: "Student",
    idLabel: "Index / Admission #",
    unitLabel: "Class / Form",
    curriculumLabel: "Subjects",
    termLabel: "Academic Term",
    sidebarGroups: [
      {
        title: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/student/dashboard", iconKey: "LayoutGrid" },
        ],
      },
      {
        title: "Classes & Homework",
        items: [
          {
            id: "subjects",
            label: "My Subjects",
            href: "/student/subjects",
            iconKey: "BookOpen",
          },
          {
            id: "timetable",
            label: "Class Timetable",
            href: "/student/timetable",
            iconKey: "CalendarDays",
          },
          {
            id: "assignments",
            label: "Assignments & Homework",
            href: "/student/assignments",
            iconKey: "FileCheck2",
          },
        ],
      },
      {
        title: "Progress & Billing",
        items: [
          {
            id: "attendance",
            label: "Attendance & Conduct",
            href: "/student/attendance",
            iconKey: "CheckSquare",
          },
          {
            id: "report-card",
            label: "Term Report Card",
            href: "/student/report-card",
            iconKey: "Award",
          },
          {
            id: "fee-statement",
            label: "School Fees & Levies",
            href: "/student/fee-statement",
            iconKey: "Receipt",
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            id: "profile",
            label: "Profile & Settings",
            href: "/student/profile",
            iconKey: "User",
          },
        ],
      },
    ],
    allowedRoutes: [
      "/student",
      "/student/dashboard",
      "/student/subjects",
      "/student/timetable",
      "/student/assignments",
      "/student/attendance",
      "/student/report-card",
      "/student/fee-statement",
      "/student/profile",
      "/student/settings",
    ],
    dashboardKpis: [
      {
        key: "primary_progress",
        label: "Class / Form & Stream",
        sublabel: "Assigned academic placement",
        href: "/student/subjects",
        tone: "emerald",
      },
      {
        key: "upcoming_schedule",
        label: "Attendance Rate",
        sublabel: "Daily roll call & conduct",
        href: "/student/attendance",
        tone: "teal",
      },
      {
        key: "academic_standing",
        label: "Term Average & Rank",
        sublabel: "CA & terminal exam score",
        href: "/student/report-card",
        tone: "indigo",
      },
      {
        key: "fee_balance",
        label: "Fee Balance",
        sublabel: "Tuition, boarding & levies",
        href: "/student/fee-statement",
        tone: "rose",
        isCurrency: true,
      },
    ],
  },

  vocational: {
    schoolType: "vocational",
    portalBadge: "Vocational Trainee Portal",
    badgeClasses:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80",
    accentGradient: "from-amber-600 via-orange-600 to-yellow-600",
    activeNavClasses:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold shadow-xs",
    learnerSingular: "Trainee",
    idLabel: "Trainee ID",
    unitLabel: "Trade Class / Workshop",
    curriculumLabel: "Trade Modules",
    termLabel: "Intake / Cohort",
    sidebarGroups: [
      {
        title: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/student/dashboard", iconKey: "LayoutGrid" },
        ],
      },
      {
        title: "Trade Training & Logbook",
        items: [
          {
            id: "modules",
            label: "My Trade Modules & Practicals",
            href: "/student/modules",
            iconKey: "Wrench",
          },
          {
            id: "logbook",
            label: "Practical Logbook / Submissions",
            href: "/student/logbook",
            iconKey: "NotebookPen",
          },
          {
            id: "competencies",
            label: "Competency Assessments",
            href: "/student/competencies",
            iconKey: "ShieldCheck",
          },
        ],
      },
      {
        title: "Attachment & Certification",
        items: [
          {
            id: "attachments",
            label: "Industrial Attachment / Apprenticeship",
            href: "/student/attachments",
            iconKey: "Briefcase",
          },
          {
            id: "certifications",
            label: "Trade Certification Status",
            href: "/student/certifications",
            iconKey: "BadgeCheck",
          },
          {
            id: "fee-statement",
            label: "Fees & Workshop Materials",
            href: "/student/fee-statement",
            iconKey: "CreditCard",
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            id: "profile",
            label: "Profile & Settings",
            href: "/student/profile",
            iconKey: "User",
          },
        ],
      },
    ],
    allowedRoutes: [
      "/student",
      "/student/dashboard",
      "/student/modules",
      "/student/logbook",
      "/student/competencies",
      "/student/attachments",
      "/student/certifications",
      "/student/fee-statement",
      "/student/profile",
      "/student/settings",
    ],
    dashboardKpis: [
      {
        key: "primary_progress",
        label: "Trade Class & Intake",
        sublabel: "Assigned workshop cohort",
        href: "/student/modules",
        tone: "amber",
      },
      {
        key: "upcoming_schedule",
        label: "Completed Modules",
        sublabel: "Competent trade modules",
        href: "/student/modules",
        tone: "emerald",
      },
      {
        key: "academic_standing",
        label: "Competency Progress",
        sublabel: "Practical assessment pass rate",
        href: "/student/competencies",
        tone: "indigo",
      },
      {
        key: "fee_balance",
        label: "Fee & Materials Balance",
        sublabel: "Tuition, toolkits & lab dues",
        href: "/student/fee-statement",
        tone: "rose",
        isCurrency: true,
      },
    ],
  },
};

export function getStudentPortalConfig(rawSchoolType?: string | null): StudentPortalConfig {
  return STUDENT_PORTAL_CONFIG[toPortalSchoolType(rawSchoolType)];
}

export function isStudentRouteAllowedForSchoolType(
  pathname: string,
  rawSchoolType?: string | null
): boolean {
  const cleanPath =
    (String(pathname || "/").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/").toLowerCase();
  if (!cleanPath.startsWith("/student")) return true;
  const config = getStudentPortalConfig(rawSchoolType);
  return config.allowedRoutes.some(
    (allowed) =>
      cleanPath === allowed ||
      (allowed !== "/student" && cleanPath.startsWith(`${allowed}/`))
  );
}
