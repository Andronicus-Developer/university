import { toPortalSchoolType, type PortalSchoolType } from "@/config/schoolPortalConfig";

export interface PortalTerminology {
  schoolType: PortalSchoolType;
  schoolTypeLabel: string;
  learnerSingular: string;
  learnerPlural: string;
  idLabel: string;
  unitLabel: string;
  programLabel: string;
  cohortLabel: string;
  curriculumLabel: string;
  curriculumPlural: string;
  feeLabel: string;
  resultsLabel: string;
  certificateLabel: string;
  sessionLabel: string;
  scheduleLabel: string;
  instructorLabel: string;
}

const TERMINOLOGY: Record<PortalSchoolType, PortalTerminology> = {
  university: {
    schoolType: "university",
    schoolTypeLabel: "University",
    learnerSingular: "Student",
    learnerPlural: "Students",
    idLabel: "Matric Number",
    unitLabel: "Department",
    programLabel: "Programme",
    cohortLabel: "Level",
    curriculumLabel: "Course",
    curriculumPlural: "Courses",
    feeLabel: "Tuition & Academic Fees",
    resultsLabel: "Semester Results & GPA",
    certificateLabel: "Academic Transcript",
    sessionLabel: "Semester",
    scheduleLabel: "Lecture Timetable",
    instructorLabel: "Lecturer",
  },
  high_school: {
    schoolType: "high_school",
    schoolTypeLabel: "High School",
    learnerSingular: "Student",
    learnerPlural: "Students",
    idLabel: "Admission Number",
    unitLabel: "Class / Form",
    programLabel: "Track / Stream",
    cohortLabel: "Class Group",
    curriculumLabel: "Subject",
    curriculumPlural: "Subjects",
    feeLabel: "School & Boarding Fees",
    resultsLabel: "Term Report Cards",
    certificateLabel: "Term Report Sheet",
    sessionLabel: "Term",
    scheduleLabel: "Class Timetable",
    instructorLabel: "Teacher",
  },
  vocational: {
    schoolType: "vocational",
    schoolTypeLabel: "Vocational Institute",
    learnerSingular: "Trainee",
    learnerPlural: "Trainees",
    idLabel: "Trainee ID",
    unitLabel: "Trade Department",
    programLabel: "Intake Cohort",
    cohortLabel: "Intake",
    curriculumLabel: "Trade Module",
    curriculumPlural: "Trade Modules",
    feeLabel: "Workshop & Training Fees",
    resultsLabel: "Competency Assessments",
    certificateLabel: "Trade Certificate / Attestation",
    sessionLabel: "Training Cycle / Term",
    scheduleLabel: "Workshop Schedule",
    instructorLabel: "Instructor",
  },
};

export function getPortalTerminology(rawSchoolType?: string | null): PortalTerminology {
  return TERMINOLOGY[toPortalSchoolType(rawSchoolType)];
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency = "GHS"
): string {
  const num = Number(amount || 0);
  const safe = Number.isFinite(num) ? num : 0;
  return `${currency || "GHS"} ${safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
