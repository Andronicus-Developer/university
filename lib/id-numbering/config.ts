import type { PortalSchoolType } from "@/config/schoolPortalConfig";

export type IdEntityType =
  | "student"
  | "trainee"
  | "lecturer"
  | "teacher"
  | "instructor"
  | "registrar"
  | "finance"
  | "staff";

export type IdSeparator = "-" | "/" | "";
export type IdYearFormat = "YYYY" | "YY";

export interface IdCategoryDefinition {
  entity_type: IdEntityType;
  label: string;
  description: string;
  defaultPrefix: string;
}

export interface IdSequenceRuleInput {
  entity_type: IdEntityType;
  prefix: string;
  separator: IdSeparator;
  include_year: boolean;
  year_format: IdYearFormat;
  padding_length: number;
  next_number: number;
}

export interface IdSequenceRule extends IdSequenceRuleInput {
  label: string;
  description: string;
  preview: string;
}

export const VALID_ID_ENTITY_TYPES: readonly IdEntityType[] = [
  "student",
  "trainee",
  "lecturer",
  "teacher",
  "instructor",
  "registrar",
  "finance",
  "staff",
];

export const DEFAULT_PREFIX_BY_ENTITY: Record<IdEntityType, string> = {
  student: "STU",
  trainee: "TRN",
  lecturer: "LEC",
  teacher: "TCH",
  instructor: "INS",
  registrar: "REG",
  finance: "FIN",
  staff: "STF",
};

export function getIdCategoriesForSchoolType(
  schoolType: PortalSchoolType
): IdCategoryDefinition[] {
  if (schoolType === "high_school") {
    return [
      {
        entity_type: "student",
        label: "Student (Admission No.)",
        description: "Assigned automatically when admitting or registering high school students.",
        defaultPrefix: "STU",
      },
      {
        entity_type: "teacher",
        label: "Teacher",
        description: "Assigned to classroom and subject teachers.",
        defaultPrefix: "TCH",
      },
      {
        entity_type: "registrar",
        label: "Registrar",
        description: "Assigned to academic registrar and admissions officers.",
        defaultPrefix: "REG",
      },
      {
        entity_type: "finance",
        label: "Finance / Bursar",
        description: "Assigned to school bursars, accountants, and fee officers.",
        defaultPrefix: "FIN",
      },
      {
        entity_type: "staff",
        label: "General Staff",
        description: "Assigned to librarians, HR, hostel, and support staff.",
        defaultPrefix: "STF",
      },
    ];
  }

  if (schoolType === "vocational") {
    return [
      {
        entity_type: "trainee",
        label: "Trainee ID",
        description: "Assigned automatically when enrolling vocational/technical trainees.",
        defaultPrefix: "TRN",
      },
      {
        entity_type: "instructor",
        label: "Trade Instructor",
        description: "Assigned to workshop and trade skill instructors.",
        defaultPrefix: "INS",
      },
      {
        entity_type: "registrar",
        label: "Registrar",
        description: "Assigned to centre registrar and trainee admissions officers.",
        defaultPrefix: "REG",
      },
      {
        entity_type: "finance",
        label: "Finance / Bursar",
        description: "Assigned to finance officers, bursars, and accounts staff.",
        defaultPrefix: "FIN",
      },
      {
        entity_type: "staff",
        label: "General Staff",
        description: "Assigned to workshop technicians, HR, and support staff.",
        defaultPrefix: "STF",
      },
    ];
  }

  // University (default)
  return [
    {
      entity_type: "student",
      label: "Student (Matric No.)",
      description: "Assigned automatically when matriculating or enrolling students.",
      defaultPrefix: "STU",
    },
    {
      entity_type: "lecturer",
      label: "Lecturer",
      description: "Assigned to university faculty, lecturers, and professors.",
      defaultPrefix: "LEC",
    },
    {
      entity_type: "registrar",
      label: "Registrar",
      description: "Assigned to academic registry and admissions officers.",
      defaultPrefix: "REG",
    },
    {
      entity_type: "finance",
      label: "Finance / Bursar",
      description: "Assigned to bursary, accounting, and audit staff.",
      defaultPrefix: "FIN",
    },
    {
      entity_type: "staff",
      label: "General Staff",
      description: "Assigned to non-teaching, library, hostel, and administrative staff.",
      defaultPrefix: "STF",
    },
  ];
}

export function resolveLearnerEntityType(
  schoolType: PortalSchoolType
): IdEntityType {
  return schoolType === "vocational" ? "trainee" : "student";
}

export function resolveStaffEntityType(
  roleCode: string,
  schoolType: PortalSchoolType,
  isAcademic = false
): IdEntityType {
  const role = String(roleCode || "").trim().toLowerCase();

  if (
    ["registrar", "academic_affairs_officer", "admissions_officer"].includes(role)
  ) {
    return "registrar";
  }

  if (["finance_officer", "bursar", "accountant", "auditor"].includes(role)) {
    return "finance";
  }

  if (
    isAcademic ||
    [
      "lecturer",
      "teacher",
      "instructor",
      "dean",
      "head_of_department",
      "academic_advisor",
    ].includes(role)
  ) {
    if (schoolType === "vocational") return "instructor";
    if (schoolType === "high_school") return "teacher";
    return "lecturer";
  }

  return "staff";
}

export function sanitizeSeparator(val: unknown): IdSeparator {
  if (val === "/" || val === "") return val;
  return "-";
}

export function sanitizeYearFormat(val: unknown): IdYearFormat {
  return val === "YY" ? "YY" : "YYYY";
}

export function sanitizePaddingLength(val: unknown): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 4;
  return Math.min(8, Math.max(2, Math.trunc(n)));
}

export function sanitizeNextNumber(val: unknown): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.trunc(n));
}

export function formatIdFromRule(
  rule: {
    prefix: string;
    separator: IdSeparator;
    include_year: boolean;
    year_format: IdYearFormat;
    padding_length: number;
    next_number: number;
  },
  year = 2026
): string {
  const parts: string[] = [];
  const cleanPrefix = String(rule.prefix || "").trim().toUpperCase();
  if (cleanPrefix) parts.push(cleanPrefix);

  if (rule.include_year) {
    const fullYear = String(Math.max(1900, Math.trunc(year)));
    parts.push(rule.year_format === "YY" ? fullYear.slice(-2) : fullYear);
  }

  const padding = sanitizePaddingLength(rule.padding_length);
  const seq = sanitizeNextNumber(rule.next_number);
  parts.push(String(seq).padStart(padding, "0"));

  return parts.join(sanitizeSeparator(rule.separator)).toUpperCase();
}
