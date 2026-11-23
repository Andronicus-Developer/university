export type CanonicalSchoolType = "university" | "high_school" | "vocational_school";

export type HelperBadgeTone = "blue" | "emerald" | "amber" | "red";

export interface ProgramLevelOption {
  value: string;
  label: string;
}

export interface DepartmentTerminology {
  visible: boolean;
  allowed: boolean;
  singular: string;
  plural: string;
  navLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  addButtonLabel: string;
  editModalPrefix: string;
  addModalTitle: string;
  deleteModalTitle: string;
  codeLabel: string;
  codePlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  headLabel: string;
  headPlaceholder: string;
  descriptionPlaceholder: string;
  activeCheckboxLabel: string;
  searchPlaceholder: string;
  showLinkedPrograms: boolean;
  redirectWhenHidden: string;
  superAdminBadgeTone: HelperBadgeTone;
  superAdminHelperBadge: string;
  superAdminRowTag: string;
}

export interface ProgramTerminology {
  visible: boolean;
  allowed: boolean;
  singular: string;
  plural: string;
  navLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  addButtonLabel: string;
  editModalPrefix: string;
  addModalTitle: string;
  deleteModalTitle: string;
  codeLabel: string;
  codePlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  levelLabel: string;
  levelColumnLabel: string;
  creditsLabel: string;
  creditsColumnLabel: string;
  creditsUnit: string;
  activeCheckboxLabel: string;
  searchPlaceholder: string;
  showDepartmentField: boolean;
  defaultLevel: string;
  defaultDurationYears: number;
  defaultCredits: number;
  levelOptions: ProgramLevelOption[];
  redirectWhenHidden: string;
  superAdminBadgeTone: HelperBadgeTone;
  superAdminHelperBadge: string;
  superAdminRowTag: string;
}

export interface SchoolAcademicTerminology {
  schoolType: CanonicalSchoolType;
  schoolTypeLabel: string;
  departments: DepartmentTerminology;
  programs: ProgramTerminology;
}

const HIGH_SCHOOL_ALIASES = new Set([
  "high_school",
  "highschool",
  "secondary",
  "secondary_school",
  "prep",
  "preparatory",
]);

const VOCATIONAL_ALIASES = new Set([
  "vocational",
  "vocational_school",
  "technical",
  "technical_school",
  "tvet",
  "trade_school",
]);

const UNIVERSITY_LEVEL_OPTIONS: ProgramLevelOption[] = [
  { value: "undergraduate", label: "Undergraduate (Bachelor's)" },
  { value: "postgraduate", label: "Postgraduate (Master's / Ph.D.)" },
  { value: "diploma", label: "Diploma" },
  { value: "certificate", label: "Certificate" },
  { value: "doctorate", label: "Doctorate / Ph.D." },
];

const HIGH_SCHOOL_LEVEL_OPTIONS: ProgramLevelOption[] = [
  { value: "general", label: "General / Core" },
  { value: "science", label: "Science Track" },
  { value: "arts", label: "Arts & Humanities" },
  { value: "business", label: "Business / Commercial" },
  { value: "honors", label: "Honors / Advanced" },
];

/**
 * Normalizes raw school_type / institution_type values into the canonical
 * database constraint values (`university` | `high_school` | `vocational_school`).
 */
export function normalizeSchoolType(raw?: string | null): CanonicalSchoolType {
  const normalized = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (HIGH_SCHOOL_ALIASES.has(normalized)) {
    return "high_school";
  }
  if (VOCATIONAL_ALIASES.has(normalized)) {
    return "vocational_school";
  }
  return "university";
}

export function getSchoolTypeLabel(raw?: string | null): string {
  const type = normalizeSchoolType(raw);
  if (type === "high_school") return "High School";
  if (type === "vocational_school") return "Vocational School";
  return "University / Tertiary";
}

/**
 * Returns school-type-specific navigation visibility, UI labels, placeholders,
 * defaults, and Super Admin helper badges while leaving database schema intact.
 */
export function getSchoolTerminology(
  schoolType?: string | null
): SchoolAcademicTerminology {
  const canonical = normalizeSchoolType(schoolType);
  const schoolTypeLabel = getSchoolTypeLabel(canonical);

  if (canonical === "high_school") {
    return {
      schoolType: canonical,
      schoolTypeLabel,
      departments: {
        visible: false,
        allowed: false,
        singular: "Department",
        plural: "Departments",
        navLabel: "Departments",
        pageTitle: "Academic Departments Management",
        pageSubtitle:
          "Departments are disabled for High Schools; manage Classes under Programs.",
        addButtonLabel: "Add Department",
        editModalPrefix: "Edit Department",
        addModalTitle: "Add Academic Department",
        deleteModalTitle: "Delete Department",
        codeLabel: "Department Code",
        codePlaceholder: "e.g. SCI",
        nameLabel: "Department Name",
        namePlaceholder: "e.g. Department of Science",
        headLabel: "Head of Department",
        headPlaceholder: "e.g. Dr. Kwame Mensah",
        descriptionPlaceholder:
          "Brief mandate, academic focus, or administrative scope...",
        activeCheckboxLabel: "Active Department",
        searchPlaceholder:
          "Search by department code, name, or head of department...",
        showLinkedPrograms: false,
        redirectWhenHidden: "/admin/programs",
        superAdminBadgeTone: "red",
        superAdminHelperBadge:
          "High School — Departments are not available (assign Classes under Programs instead)",
        superAdminRowTag: "Not Eligible (High School)",
      },
      programs: {
        visible: true,
        allowed: true,
        singular: "Class",
        plural: "Classes",
        navLabel: "Classes",
        pageTitle: "Classes Management",
        pageSubtitle:
          "Configure high school classes, grade levels, and academic tracks for your school.",
        addButtonLabel: "Add Class",
        editModalPrefix: "Edit Class",
        addModalTitle: "Add Class",
        deleteModalTitle: "Delete Class",
        codeLabel: "Class Code",
        codePlaceholder: "e.g. G10-SCI",
        nameLabel: "Class Name",
        namePlaceholder: "e.g. Grade 10 / Form 1, Science Class",
        levelLabel: "Track / Level",
        levelColumnLabel: "Track / Level",
        creditsLabel: "Subject Units",
        creditsColumnLabel: "Units",
        creditsUnit: "Units",
        activeCheckboxLabel: "Active Class (Available for student enrollment)",
        searchPlaceholder: "Search by class name, code, or track...",
        showDepartmentField: false,
        defaultLevel: "general",
        defaultDurationYears: 1,
        defaultCredits: 10,
        levelOptions: HIGH_SCHOOL_LEVEL_OPTIONS,
        redirectWhenHidden: "/admin/departments",
        superAdminBadgeTone: "emerald",
        superAdminHelperBadge:
          "High School — appears as Classes to School Admin",
        superAdminRowTag: "Appears as Classes",
      },
    };
  }

  if (canonical === "vocational_school") {
    return {
      schoolType: canonical,
      schoolTypeLabel,
      departments: {
        visible: true,
        allowed: true,
        singular: "Class",
        plural: "Classes",
        navLabel: "Classes",
        pageTitle: "Classes Management",
        pageSubtitle:
          "Manage vocational trade classes, lead instructors, and training units for your school.",
        addButtonLabel: "Add Class",
        editModalPrefix: "Edit Class",
        addModalTitle: "Add Class",
        deleteModalTitle: "Delete Class",
        codeLabel: "Class Code",
        codePlaceholder: "e.g. CARP-101",
        nameLabel: "Class Name",
        namePlaceholder: "e.g. Carpentry Class, Catering Class, Tailoring Class",
        headLabel: "Lead Instructor",
        headPlaceholder: "e.g. Mr. Samuel Boateng",
        descriptionPlaceholder:
          "Trade focus, workshop skills, or training cohort overview...",
        activeCheckboxLabel: "Active Class",
        searchPlaceholder:
          "Search by class code, name, or lead instructor...",
        showLinkedPrograms: false,
        redirectWhenHidden: "/admin/programs",
        superAdminBadgeTone: "amber",
        superAdminHelperBadge:
          "Vocational — appears as Classes to School Admin",
        superAdminRowTag: "Appears as Classes",
      },
      programs: {
        visible: false,
        allowed: false,
        singular: "Program",
        plural: "Programs",
        navLabel: "Programs",
        pageTitle: "Academic Programs Management",
        pageSubtitle:
          "Programs are disabled for Vocational Schools; manage Classes under Departments.",
        addButtonLabel: "Add Program",
        editModalPrefix: "Edit Academic Program",
        addModalTitle: "Add Academic Program",
        deleteModalTitle: "Delete Program",
        codeLabel: "Program Code",
        codePlaceholder: "e.g. BSC-CS",
        nameLabel: "Program Name",
        namePlaceholder: "e.g. B.Sc. Computer Science",
        levelLabel: "Degree Level",
        levelColumnLabel: "Level",
        creditsLabel: "Total Credits Req.",
        creditsColumnLabel: "Credits",
        creditsUnit: "Credits",
        activeCheckboxLabel:
          "Active Program (Available for new student admissions)",
        searchPlaceholder: "Search by program name, code, or department...",
        showDepartmentField: false,
        defaultLevel: "certificate",
        defaultDurationYears: 1,
        defaultCredits: 40,
        levelOptions: UNIVERSITY_LEVEL_OPTIONS,
        redirectWhenHidden: "/admin/departments",
        superAdminBadgeTone: "red",
        superAdminHelperBadge:
          "Vocational — Programs are not available (assign Classes under Departments instead)",
        superAdminRowTag: "Not Eligible (Vocational)",
      },
    };
  }

  return {
    schoolType: "university",
    schoolTypeLabel,
    departments: {
      visible: true,
      allowed: true,
      singular: "Department",
      plural: "Departments",
      navLabel: "Departments",
      pageTitle: "Academic Departments Management",
      pageSubtitle:
        "Manage departments, department heads, and structure strictly scoped to your school.",
      addButtonLabel: "Add Department",
      editModalPrefix: "Edit Department",
      addModalTitle: "Add Academic Department",
      deleteModalTitle: "Delete Department",
      codeLabel: "Department Code",
      codePlaceholder: "e.g. CS",
      nameLabel: "Department Name",
      namePlaceholder: "e.g. Department of Computer Science",
      headLabel: "Head of Department",
      headPlaceholder: "e.g. Dr. Kwame Mensah",
      descriptionPlaceholder:
        "Brief mandate, academic focus, or administrative scope...",
      activeCheckboxLabel: "Active Department",
      searchPlaceholder:
        "Search by department code, name, or head of department...",
      showLinkedPrograms: true,
      redirectWhenHidden: "/admin/programs",
      superAdminBadgeTone: "blue",
      superAdminHelperBadge:
        "University / Tertiary — appears as Departments to School Admin",
      superAdminRowTag: "Departments",
    },
    programs: {
      visible: true,
      allowed: true,
      singular: "Program",
      plural: "Programs",
      navLabel: "Programs",
      pageTitle: "Academic Programs Management",
      pageSubtitle:
        "Configure degree offerings, curricular duration, and graduation credit requirements.",
      addButtonLabel: "Add Program",
      editModalPrefix: "Edit Academic Program",
      addModalTitle: "Add Academic Program",
      deleteModalTitle: "Delete Program",
      codeLabel: "Program Code",
      codePlaceholder: "e.g. BSC-CS",
      nameLabel: "Program Name",
      namePlaceholder: "e.g. B.Sc. Computer Science",
      levelLabel: "Degree Level",
      levelColumnLabel: "Level",
      creditsLabel: "Total Credits Req.",
      creditsColumnLabel: "Credits",
      creditsUnit: "Credits",
      activeCheckboxLabel:
        "Active Program (Available for new student admissions)",
      searchPlaceholder: "Search by program name, code, or department...",
      showDepartmentField: true,
      defaultLevel: "undergraduate",
      defaultDurationYears: 4,
      defaultCredits: 120,
      levelOptions: UNIVERSITY_LEVEL_OPTIONS,
      redirectWhenHidden: "/admin/departments",
      superAdminBadgeTone: "blue",
      superAdminHelperBadge:
        "University / Tertiary — appears as Programs to School Admin",
      superAdminRowTag: "Programs",
    },
  };
}
