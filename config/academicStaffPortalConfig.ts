import { PortalSchoolType, toPortalSchoolType } from "@/config/schoolPortalConfig";

export type AcademicStaffKpiKey =
  | "assigned_units"
  | "active_learners"
  | "pending_actions"
  | "today_schedule";

export interface AcademicStaffNavItem {
  id: string;
  label: string;
  href: string;
  iconKey: string;
  badge?: string;
}

export interface AcademicStaffNavGroup {
  title: string;
  items: AcademicStaffNavItem[];
}

export interface AcademicStaffKpiSpec {
  key: AcademicStaffKpiKey;
  label: string;
  sublabel: string;
  href: string;
  tone: "blue" | "emerald" | "indigo" | "amber" | "teal" | "rose";
}

export interface AcademicStaffPortalConfig {
  schoolType: PortalSchoolType;
  portalBadge: string;
  badgeClasses: string;
  accentGradient: string;
  activeNavClasses: string;
  defaultDashboardHref: string;
  staffSingular: string;
  learnerSingular: string;
  learnerPlural: string;
  idLabel: string;
  unitLabel: string;
  curriculumLabel: string;
  termLabel: string;
  sidebarGroups: AcademicStaffNavGroup[];
  allowedRoutes: string[];
  dashboardKpis: AcademicStaffKpiSpec[];
}

export const ACADEMIC_STAFF_PORTAL_CONFIG: Record<PortalSchoolType, AcademicStaffPortalConfig> = {
  university: {
    schoolType: "university",
    portalBadge: "University Lecturer Portal",
    badgeClasses:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80",
    accentGradient: "from-blue-600 via-indigo-600 to-sky-600",
    activeNavClasses:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-xs",
    defaultDashboardHref: "/lecturer/dashboard",
    staffSingular: "Lecturer",
    learnerSingular: "Student",
    learnerPlural: "Students",
    idLabel: "Staff / Lecturer ID",
    unitLabel: "Department",
    curriculumLabel: "Courses",
    termLabel: "Semester",
    sidebarGroups: [
      {
        title: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/lecturer/dashboard", iconKey: "LayoutGrid" },
        ],
      },
      {
        title: "Teaching & Courses",
        items: [
          {
            id: "courses",
            label: "My Assigned Courses",
            href: "/lecturer/courses",
            iconKey: "BookOpen",
          },
          {
            id: "attendance",
            label: "Class Lists & Attendance",
            href: "/lecturer/attendance",
            iconKey: "Users",
          },
          {
            id: "assignments",
            label: "Assignments & CA",
            href: "/lecturer/assignments",
            iconKey: "FileCheck2",
          },
          {
            id: "grades",
            label: "Exams & Grade Entry (GPA)",
            href: "/lecturer/grades",
            iconKey: "Award",
            badge: "GPA",
          },
        ],
      },
      {
        title: "Schedule & Mentorship",
        items: [
          {
            id: "timetable",
            label: "Lecture & Exam Timetable",
            href: "/lecturer/timetable",
            iconKey: "CalendarDays",
          },
          {
            id: "advising",
            label: "Student Advising & Mentorship",
            href: "/lecturer/advising",
            iconKey: "GraduationCap",
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            id: "profile",
            label: "Profile & Settings",
            href: "/lecturer/profile",
            iconKey: "User",
          },
        ],
      },
    ],
    allowedRoutes: [
      "/lecturer",
      "/lecturer/dashboard",
      "/lecturer/courses",
      "/lecturer/attendance",
      "/lecturer/assignments",
      "/lecturer/grades",
      "/lecturer/timetable",
      "/lecturer/advising",
      "/lecturer/profile",
    ],
    dashboardKpis: [
      {
        key: "assigned_units",
        label: "Assigned Courses",
        sublabel: "Active semester allocations",
        href: "/lecturer/courses",
        tone: "blue",
      },
      {
        key: "active_learners",
        label: "Total Enrolled Students",
        sublabel: "Registered across your courses",
        href: "/lecturer/attendance",
        tone: "emerald",
      },
      {
        key: "pending_actions",
        label: "Pending Grade Entries",
        sublabel: "Enrolments awaiting GPA grading",
        href: "/lecturer/grades",
        tone: "rose",
      },
      {
        key: "today_schedule",
        label: "Today's Lectures",
        sublabel: "Scheduled sessions today",
        href: "/lecturer/timetable",
        tone: "indigo",
      },
    ],
  },

  high_school: {
    schoolType: "high_school",
    portalBadge: "High School Teacher Portal",
    badgeClasses:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80",
    accentGradient: "from-emerald-600 via-teal-600 to-cyan-600",
    activeNavClasses:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold shadow-xs",
    defaultDashboardHref: "/teacher/dashboard",
    staffSingular: "Teacher",
    learnerSingular: "Student",
    learnerPlural: "Students",
    idLabel: "Teacher ID",
    unitLabel: "Class / Form",
    curriculumLabel: "Subjects",
    termLabel: "Academic Term",
    sidebarGroups: [
      {
        title: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/teacher/dashboard", iconKey: "LayoutGrid" },
        ],
      },
      {
        title: "Classes & Teaching",
        items: [
          {
            id: "classes",
            label: "My Classes & Subjects",
            href: "/teacher/classes",
            iconKey: "BookOpen",
          },
          {
            id: "attendance",
            label: "Daily Attendance & Conduct",
            href: "/teacher/attendance",
            iconKey: "CheckSquare",
          },
          {
            id: "homework",
            label: "Homework & Class Exercises",
            href: "/teacher/homework",
            iconKey: "FileCheck2",
          },
          {
            id: "report-cards",
            label: "Term Exams & Report Card Entry",
            href: "/teacher/report-cards",
            iconKey: "ClipboardCheck",
          },
        ],
      },
      {
        title: "Schedule & Parents",
        items: [
          {
            id: "timetable",
            label: "Teaching Timetable",
            href: "/teacher/timetable",
            iconKey: "CalendarDays",
          },
          {
            id: "messages",
            label: "Parent / Guardian Messages",
            href: "/teacher/messages",
            iconKey: "MessageSquare",
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            id: "profile",
            label: "Profile & Settings",
            href: "/teacher/profile",
            iconKey: "User",
          },
        ],
      },
    ],
    allowedRoutes: [
      "/teacher",
      "/teacher/dashboard",
      "/teacher/classes",
      "/teacher/attendance",
      "/teacher/homework",
      "/teacher/report-cards",
      "/teacher/timetable",
      "/teacher/messages",
      "/teacher/profile",
    ],
    dashboardKpis: [
      {
        key: "assigned_units",
        label: "Assigned Classes & Subjects",
        sublabel: "Form & subject allocations",
        href: "/teacher/classes",
        tone: "emerald",
      },
      {
        key: "active_learners",
        label: "Total Students",
        sublabel: "Enrolled in assigned classes",
        href: "/teacher/attendance",
        tone: "teal",
      },
      {
        key: "today_schedule",
        label: "Today's Periods",
        sublabel: "Scheduled lessons today",
        href: "/teacher/timetable",
        tone: "indigo",
      },
      {
        key: "pending_actions",
        label: "Pending Assessments",
        sublabel: "Homework & report scores due",
        href: "/teacher/report-cards",
        tone: "amber",
      },
    ],
  },

  vocational: {
    schoolType: "vocational",
    portalBadge: "Vocational Instructor Portal",
    badgeClasses:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80",
    accentGradient: "from-amber-600 via-orange-600 to-yellow-600",
    activeNavClasses:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold shadow-xs",
    defaultDashboardHref: "/teacher/dashboard",
    staffSingular: "Instructor",
    learnerSingular: "Trainee",
    learnerPlural: "Trainees",
    idLabel: "Instructor ID",
    unitLabel: "Trade Workshop",
    curriculumLabel: "Trade Modules",
    termLabel: "Intake / Cohort",
    sidebarGroups: [
      {
        title: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/teacher/dashboard", iconKey: "LayoutGrid" },
        ],
      },
      {
        title: "Workshop & Practicals",
        items: [
          {
            id: "modules",
            label: "My Trade Class & Modules",
            href: "/teacher/modules",
            iconKey: "Wrench",
          },
          {
            id: "attendance",
            label: "Trainee Attendance & Safety",
            href: "/teacher/attendance",
            iconKey: "ShieldCheck",
          },
          {
            id: "logbooks",
            label: "Practical Logbook Sign-Offs",
            href: "/teacher/logbooks",
            iconKey: "NotebookPen",
            badge: "Review",
          },
          {
            id: "competencies",
            label: "Competency Assessments",
            href: "/teacher/competencies",
            iconKey: "ClipboardCheck",
          },
        ],
      },
      {
        title: "Placement & Tools",
        items: [
          {
            id: "attachments",
            label: "Industrial Attachment Supervision",
            href: "/teacher/attachments",
            iconKey: "Briefcase",
          },
          {
            id: "inventory",
            label: "Workshop Tools & Equipment Request",
            href: "/teacher/inventory",
            iconKey: "Boxes",
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            id: "profile",
            label: "Profile & Settings",
            href: "/teacher/profile",
            iconKey: "User",
          },
        ],
      },
    ],
    allowedRoutes: [
      "/teacher",
      "/teacher/dashboard",
      "/teacher/modules",
      "/teacher/attendance",
      "/teacher/logbooks",
      "/teacher/competencies",
      "/teacher/attachments",
      "/teacher/inventory",
      "/teacher/profile",
    ],
    dashboardKpis: [
      {
        key: "assigned_units",
        label: "Assigned Trade Workshop",
        sublabel: "Trade department & modules",
        href: "/teacher/modules",
        tone: "amber",
      },
      {
        key: "active_learners",
        label: "Active Trainees",
        sublabel: "Registered workshop trainees",
        href: "/teacher/attendance",
        tone: "emerald",
      },
      {
        key: "pending_actions",
        label: "Pending Logbook Sign-Offs",
        sublabel: "Practical entries awaiting review",
        href: "/teacher/logbooks",
        tone: "rose",
      },
      {
        key: "today_schedule",
        label: "Modules Taught",
        sublabel: "Assigned NVTI / CBET modules",
        href: "/teacher/competencies",
        tone: "indigo",
      },
    ],
  },
};

export function getAcademicStaffPortalConfig(
  rawSchoolType?: string | null
): AcademicStaffPortalConfig {
  return ACADEMIC_STAFF_PORTAL_CONFIG[toPortalSchoolType(rawSchoolType)];
}

export function isAcademicStaffRouteAllowedForSchoolType(
  pathname: string,
  rawSchoolType?: string | null
): boolean {
  const cleanPath =
    (String(pathname || "/").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/").toLowerCase();
  if (!cleanPath.startsWith("/lecturer") && !cleanPath.startsWith("/teacher")) {
    return true;
  }
  const config = getAcademicStaffPortalConfig(rawSchoolType);
  return config.allowedRoutes.some(
    (allowed) =>
      cleanPath === allowed ||
      (allowed !== "/lecturer" && allowed !== "/teacher" && cleanPath.startsWith(`${allowed}/`))
  );
}
