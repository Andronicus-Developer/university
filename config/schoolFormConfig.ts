import { PortalSchoolType, toPortalSchoolType } from "@/config/schoolPortalConfig";

export interface StudentLevelOption {
  value: string;
  numeric: number;
  label: string;
}

export interface RoleOptionSpec {
  code: string;
  name: string;
}

export interface EmploymentTypeOption {
  value: string;
  label: string;
}

export interface FeeCategoryOption {
  value: string;
  label: string;
}

export interface StudentFormSpec {
  addTitle: string;
  editTitlePrefix: string;
  addSubtitle: string;
  editSubtitle: string;
  idPrefix: string;
  idLabel: string;
  idPlaceholder: string;
  emailPlaceholder: string;
  namePlaceholder: string;
  admissionDateLabel: string;
  showDepartment: boolean;
  departmentLabel: string;
  showProgram: boolean;
  programLabel: string;
  showGpaFields: boolean;
  showAcademicLevel: boolean;
  levelLabel: string;
  levelOptions: StudentLevelOption[];
  entryModeOptions: string[];
  residentialOptions: string[];
  streamOptions: string[];
  boardingOptions: string[];
  guardianRelationships: string[];
  trainingStageOptions: string[];
  sponsorshipOptions: string[];
}

export interface AcademicStaffFormSpec {
  addTitle: string;
  editTitlePrefix: string;
  addSubtitle: string;
  editSubtitle: string;
  pageTitle: string;
  pageSubtitle: string;
  breadcrumbLabel: string;
  idPrefix: string;
  idLabel: string;
  idPlaceholder: string;
  namePlaceholder: string;
  emailPlaceholder: string;
  salaryPlaceholder: string;
  defaultRoleCode: string;
  showDepartment: boolean;
  departmentLabel: string;
  rankLabel: string;
  ranks: string[];
  qualificationLabel: string;
  qualifications: string[];
  employmentTypes: EmploymentTypeOption[];
  roleOptions: RoleOptionSpec[];
}

export interface AdminStaffFormSpec {
  addTitle: string;
  editTitlePrefix: string;
  addSubtitle: string;
  editSubtitle: string;
  pageTitle: string;
  pageSubtitle: string;
  breadcrumbLabel: string;
  idPrefix: string;
  idLabel: string;
  idPlaceholder: string;
  jobTitlePlaceholder: string;
  emailPlaceholder: string;
  unitLabel: string;
  showDepartmentDropdown: boolean;
  officeOptions: string[];
  roleOptions: RoleOptionSpec[];
}

export interface FeesFormSpec {
  addItemSubtitle: string;
  feeTitlePlaceholder: string;
  feeCodePlaceholder: string;
  categories: FeeCategoryOption[];
  showDepartment: boolean;
  departmentLabel: string;
  showProgram: boolean;
  programLabel: string;
  termLabel: string;
  learnerSingular: string;
  paymentProviderPlaceholder: string;
}

export interface AuxiliaryFormSpec {
  noticeAudiences: Array<{ value: string; label: string }>;
  admissionsTitle: string;
  admissionsChoiceLabel: string;
  admissionsNotesPlaceholder: string;
  libraryTitle: string;
  librarySubtitle: string;
  libraryPublisherPlaceholder: string;
  transportDeparturePlaceholder: string;
  emailDomainPlaceholder: string;
}

export interface SchoolFormConfig {
  schoolType: PortalSchoolType;
  portalLabel: string;
  student: StudentFormSpec;
  academicStaff: AcademicStaffFormSpec;
  adminStaff: AdminStaffFormSpec;
  fees: FeesFormSpec;
  auxiliary: AuxiliaryFormSpec;
}

export const SCHOOL_FORM_CONFIG: Record<PortalSchoolType, SchoolFormConfig> = {
  university: {
    schoolType: "university",
    portalLabel: "University",
    student: {
      addTitle: "Add University Student",
      editTitlePrefix: "Edit University Student",
      addSubtitle:
        "Provisions a live Supabase Auth account, university matriculation record, and portal role.",
      editSubtitle:
        "Update student matriculation details, faculty/program placement, residential status, and credentials.",
      idPrefix: "MAT",
      idLabel: "Matric / Index Number",
      idPlaceholder: "e.g. MAT20260001",
      emailPlaceholder: "e.g. ama.mensah@university.edu",
      namePlaceholder: "e.g. Ama Mensah",
      admissionDateLabel: "Matriculation / Admission Date",
      showDepartment: true,
      departmentLabel: "Faculty / Department",
      showProgram: true,
      programLabel: "Academic Program",
      showGpaFields: true,
      showAcademicLevel: true,
      levelLabel: "Academic Level",
      levelOptions: [
        { value: "100", numeric: 100, label: "Level 100" },
        { value: "200", numeric: 200, label: "Level 200" },
        { value: "300", numeric: 300, label: "Level 300" },
        { value: "400", numeric: 400, label: "Level 400" },
        { value: "postgrad", numeric: 600, label: "Postgraduate" },
      ],
      entryModeOptions: ["Regular", "Weekend", "Distance"],
      residentialOptions: ["On-Campus Hostel", "Off-Campus", "Non-Resident / Commuter"],
      streamOptions: [],
      boardingOptions: [],
      guardianRelationships: [],
      trainingStageOptions: [],
      sponsorshipOptions: [],
    },
    academicStaff: {
      addTitle: "Add Lecturer",
      editTitlePrefix: "Edit Lecturer",
      addSubtitle:
        "Provisions a live Supabase Auth account, lecturer faculty profile, and assigned university courses.",
      editSubtitle:
        "Update academic rank, qualifications, research area, department placement, and course teaching load.",
      pageTitle: "Lecturers & Academic Faculty",
      pageSubtitle:
        "Create, edit, and manage university professors, lecturers, department heads, and course teaching loads.",
      breadcrumbLabel: "Lecturers / Faculty",
      idPrefix: "LEC",
      idLabel: "Staff / Lecturer ID",
      idPlaceholder: "e.g. LEC20260001",
      namePlaceholder: "e.g. Dr. Kwame Asare",
      emailPlaceholder: "e.g. k.asare@university.edu",
      salaryPlaceholder: "e.g. ACAD-SL-04",
      defaultRoleCode: "lecturer",
      showDepartment: true,
      departmentLabel: "Department",
      rankLabel: "Academic Rank",
      ranks: [
        "Professor",
        "Associate Professor",
        "Senior Lecturer",
        "Lecturer",
        "Assistant Lecturer",
        "Teaching Assistant",
      ],
      qualificationLabel: "Highest Qualification",
      qualifications: [
        "PhD",
        "MPhil / MSc",
        "MA / MBA",
        "BSc / BA",
        "Professional Fellowship",
      ],
      employmentTypes: [
        { value: "full_time", label: "Full-Time" },
        { value: "adjunct", label: "Adjunct / Part-Time" },
        { value: "contract", label: "Contract" },
      ],
      roleOptions: [
        { code: "lecturer", name: "Lecturer" },
        { code: "head_of_department", name: "Head of Department" },
        { code: "dean", name: "Faculty Dean" },
        { code: "academic_advisor", name: "Academic Advisor" },
      ],
    },
    adminStaff: {
      addTitle: "Add University Staff",
      editTitlePrefix: "Edit University Staff",
      addSubtitle:
        "Provisions a live Supabase Auth account, HR record, and university administrative role.",
      editSubtitle:
        "Update university registry, exams, finance, or department office assignment.",
      pageTitle: "University Administrative Staff",
      pageSubtitle:
        "Manage faculty officers, exams officers, bursars, registrars, librarians, hostel, and HR staff.",
      breadcrumbLabel: "Administrative Staff",
      idPrefix: "USTF",
      idLabel: "University Staff ID",
      idPlaceholder: "e.g. USTF20260001",
      jobTitlePlaceholder: "e.g. Senior Faculty Officer",
      emailPlaceholder: "e.g. c.boateng@university.edu",
      unitLabel: "Faculty / Department",
      showDepartmentDropdown: true,
      officeOptions: [],
      roleOptions: [
        { code: "faculty_officer", name: "Faculty Officer" },
        { code: "exams_officer", name: "Exams Officer" },
        { code: "bursar", name: "Bursar / Finance Officer" },
        { code: "registrar", name: "Registrar" },
        { code: "admissions_officer", name: "Admissions Officer" },
        { code: "hostel_officer", name: "Hostel Officer" },
        { code: "librarian", name: "Librarian" },
        { code: "hr_officer", name: "HR Officer" },
        { code: "accountant", name: "Accountant" },
        { code: "auditor", name: "Auditor" },
      ],
    },
    fees: {
      addItemSubtitle: "Define university tuition, hostel, exam, and registration fee schedules.",
      feeTitlePlaceholder: "e.g. Undergraduate Semester Tuition Fee",
      feeCodePlaceholder: "e.g. UNI-TUI-01",
      categories: [
        { value: "tuition", label: "Tuition Fee" },
        { value: "hostel", label: "Hostel / Accommodation" },
        { value: "examination", label: "Examination Fee" },
        { value: "registration", label: "Semester Registration" },
        { value: "ict_library", label: "ICT & Library Dues" },
        { value: "other", label: "Other University Dues" },
      ],
      showDepartment: true,
      departmentLabel: "Department",
      showProgram: true,
      programLabel: "Academic Program",
      termLabel: "Semester / Session",
      learnerSingular: "Student",
      paymentProviderPlaceholder: "e.g. Paystack / Bank / Bursary",
    },
    auxiliary: {
      noticeAudiences: [
        { value: "all", label: "Entire University Community" },
        { value: "students", label: "Undergraduate & Postgraduate Students" },
        { value: "lecturers", label: "Lecturers & Academic Faculty" },
        { value: "staff", label: "Registry & Administrative Staff" },
      ],
      admissionsTitle: "Register University Admission Application",
      admissionsChoiceLabel: "Degree Program Choice",
      admissionsNotesPlaceholder: "WASSCE aggregate, transcript notes, or faculty interview remarks...",
      libraryTitle: "University Library & Research Repository",
      librarySubtitle:
        "Manage campus textbooks, journals, research monographs, and loan circulations.",
      libraryPublisherPlaceholder: "University Press",
      transportDeparturePlaceholder: "Main Campus Shuttle Terminal",
      emailDomainPlaceholder: "user@university.edu",
    },
  },

  high_school: {
    schoolType: "high_school",
    portalLabel: "High School",
    student: {
      addTitle: "Add High School Student",
      editTitlePrefix: "Edit High School Student",
      addSubtitle:
        "Creates a live Supabase student account, class/house placement, and optional Parent/Guardian link.",
      editSubtitle:
        "Update class/form assignment, stream, boarding status, house, and parent/guardian details.",
      idPrefix: "ADM",
      idLabel: "Student Admission / Index Number",
      idPlaceholder: "e.g. ADM20260001",
      emailPlaceholder: "e.g. kwame.osei@highschool.edu",
      namePlaceholder: "e.g. Kwame Osei",
      admissionDateLabel: "Admission Date",
      showDepartment: false,
      departmentLabel: "",
      showProgram: true,
      programLabel: "Class / Form",
      showGpaFields: false,
      showAcademicLevel: false,
      levelLabel: "Form Level",
      levelOptions: [
        { value: "100", numeric: 100, label: "Form 1 / Grade 10" },
        { value: "200", numeric: 200, label: "Form 2 / Grade 11" },
        { value: "300", numeric: 300, label: "Form 3 / Grade 12" },
      ],
      entryModeOptions: [],
      residentialOptions: [],
      streamOptions: [
        "General Science",
        "General Arts",
        "Business",
        "Visual Arts",
        "Home Economics",
        "Technical",
      ],
      boardingOptions: ["Boarding", "Day"],
      guardianRelationships: ["Mother", "Father", "Guardian", "Sponsor"],
      trainingStageOptions: [],
      sponsorshipOptions: [],
    },
    academicStaff: {
      addTitle: "Add Teacher",
      editTitlePrefix: "Edit Teacher",
      addSubtitle:
        "Provisions a live Supabase Auth account, class teacher assignment, and teaching subjects.",
      editSubtitle:
        "Update assigned class/form, class teacher role, teaching qualification, and subject load.",
      pageTitle: "Teachers & Form Masters",
      pageSubtitle:
        "Create, edit, and manage high school teachers, class teachers, and subject assignments.",
      breadcrumbLabel: "Teachers",
      idPrefix: "TCH",
      idLabel: "Staff / Teacher ID",
      idPlaceholder: "e.g. TCH20260001",
      namePlaceholder: "e.g. Mrs. Abena Mensah",
      emailPlaceholder: "e.g. a.mensah@highschool.edu",
      salaryPlaceholder: "e.g. TCH-GR-03",
      defaultRoleCode: "teacher",
      showDepartment: false,
      departmentLabel: "Class / Form",
      rankLabel: "Teaching Role Title",
      ranks: [
        "Senior Teacher",
        "Subject Teacher",
        "Class Teacher",
        "Head of Form",
        "Assistant Teacher",
      ],
      qualificationLabel: "Teaching Qualification",
      qualifications: [
        "B.Ed",
        "PGDE",
        "Diploma in Education",
        "First Degree (BSc / BA)",
        "M.Ed / MSc",
      ],
      employmentTypes: [
        { value: "full_time", label: "Full-Time" },
        { value: "part_time", label: "Part-Time" },
        { value: "contract", label: "Contract" },
      ],
      roleOptions: [
        { code: "teacher", name: "Teacher" },
        { code: "head_of_department", name: "Head of Subjects / Form" },
        { code: "academic_advisor", name: "Guidance & Counseling Coordinator" },
      ],
    },
    adminStaff: {
      addTitle: "Add School Staff",
      editTitlePrefix: "Edit School Staff",
      addSubtitle:
        "Provisions a live Supabase Auth account and assigns school office responsibilities.",
      editSubtitle:
        "Update school office placement, bursar/matron role, and employment status.",
      pageTitle: "High School Administrative & Support Staff",
      pageSubtitle:
        "Manage school bursars, boarding matrons, librarians, admissions clerks, and admin personnel.",
      breadcrumbLabel: "School Staff & Bursar",
      idPrefix: "HSTF",
      idLabel: "School Staff ID",
      idPlaceholder: "e.g. HSTF20260001",
      jobTitlePlaceholder: "e.g. Senior School Matron",
      emailPlaceholder: "e.g. bursar@highschool.edu",
      unitLabel: "School Office / Unit",
      showDepartmentDropdown: false,
      officeOptions: [
        "Bursary & Accounts",
        "School Administration",
        "Boarding / Matron Office",
        "School Library",
        "Guidance & Counseling",
        "Admissions / Front Office",
        "Campus Maintenance & Security",
      ],
      roleOptions: [
        { code: "bursar", name: "School Bursar" },
        { code: "registrar", name: "Academic Registrar" },
        { code: "matron", name: "Matron / House Parent" },
        { code: "librarian", name: "Librarian" },
        { code: "school_admin", name: "School Admin / Secretary" },
        { code: "accountant", name: "Accounts Officer" },
        { code: "admissions_officer", name: "Admissions Clerk" },
        { code: "hr_officer", name: "Staff Welfare / HR" },
      ],
    },
    fees: {
      addItemSubtitle: "Configure high school term tuition, PTA levies, boarding, and dining fees.",
      feeTitlePlaceholder: "e.g. First Term Boarding & Feeding Fee",
      feeCodePlaceholder: "e.g. HS-TRM-01",
      categories: [
        { value: "tuition", label: "Term Tuition" },
        { value: "term_levy", label: "Term / PTA Levies" },
        { value: "boarding", label: "Boarding & Dormitory" },
        { value: "dining", label: "Feeding / Dining Fee" },
        { value: "books_uniform", label: "Textbooks & Uniform" },
        { value: "examination", label: "Examination Levy" },
      ],
      showDepartment: false,
      departmentLabel: "",
      showProgram: true,
      programLabel: "Class / Form",
      termLabel: "Academic Term",
      learnerSingular: "Student",
      paymentProviderPlaceholder: "e.g. School Bursar / Mobile Money / Bank",
    },
    auxiliary: {
      noticeAudiences: [
        { value: "all", label: "Whole School Community" },
        { value: "students", label: "All Students & Prefects" },
        { value: "parents", label: "Parents & Guardians" },
        { value: "teachers", label: "Teaching Staff" },
        { value: "staff", label: "Matrons, Bursar & Support Staff" },
      ],
      admissionsTitle: "Register High School Admission Application",
      admissionsChoiceLabel: "Class / Form & Track Choice",
      admissionsNotesPlaceholder: "BECE aggregate, previous school report, or boarding preference...",
      libraryTitle: "School Library & Textbook Catalog",
      librarySubtitle: "Track core textbooks, literature readers, and student book loans.",
      libraryPublisherPlaceholder: "Academic Educational Press",
      transportDeparturePlaceholder: "Main School Gate / Assembly Ground",
      emailDomainPlaceholder: "user@highschool.edu",
    },
  },

  vocational: {
    schoolType: "vocational",
    portalLabel: "Vocational",
    student: {
      addTitle: "Add Vocational Trainee",
      editTitlePrefix: "Edit Vocational Trainee",
      addSubtitle:
        "Provisions a live Supabase Auth account, trade workshop assignment, cohort intake, and trainee record.",
      editSubtitle:
        "Update trade class placement, cohort intake, NVTI training stage, sponsorship, and next of kin.",
      idPrefix: "TRN",
      idLabel: "Trainee ID",
      idPlaceholder: "e.g. TRN20260001",
      emailPlaceholder: "e.g. kofi.boateng@tvet.edu",
      namePlaceholder: "e.g. Kofi Boateng",
      admissionDateLabel: "Training Enrollment Date",
      showDepartment: true,
      departmentLabel: "Trade Class / Workshop",
      showProgram: false,
      programLabel: "",
      showGpaFields: false,
      showAcademicLevel: false,
      levelLabel: "Training Stage",
      levelOptions: [
        { value: "100", numeric: 100, label: "Foundation / Stage 1" },
        { value: "200", numeric: 200, label: "Intermediate / Stage 2" },
        { value: "300", numeric: 300, label: "Advanced / Master" },
      ],
      entryModeOptions: [],
      residentialOptions: [],
      streamOptions: [],
      boardingOptions: [],
      guardianRelationships: ["Parent", "Guardian", "Next of Kin", "Sponsor"],
      trainingStageOptions: [
        "NVTI Foundation",
        "NVTI Grade II",
        "NVTI Grade I",
        "Competency Level 1",
        "Competency Level 2",
        "Master Craftsman",
      ],
      sponsorshipOptions: [
        "Self-Sponsored",
        "Scholarship",
        "Apprenticeship",
        "Government TVET Grant",
      ],
    },
    academicStaff: {
      addTitle: "Add Trade Instructor",
      editTitlePrefix: "Edit Trade Instructor",
      addSubtitle:
        "Provisions a live Supabase Auth account, trade workshop link, license details, and practical modules.",
      editSubtitle:
        "Update trade class assignment, Master Craftsman license, experience years, and practical modules.",
      pageTitle: "Trade Instructors & Workshop Trainers",
      pageSubtitle:
        "Create, edit, and manage trade instructors, workshop demonstrators, and practical module loads.",
      breadcrumbLabel: "Trade Instructors",
      idPrefix: "INS",
      idLabel: "Instructor ID",
      idPlaceholder: "e.g. INS20260001",
      namePlaceholder: "e.g. Master Samuel Osei",
      emailPlaceholder: "e.g. s.osei@tvet.edu",
      salaryPlaceholder: "e.g. TVET-INS-02",
      defaultRoleCode: "instructor",
      showDepartment: true,
      departmentLabel: "Trade Workshop / Class",
      rankLabel: "Instructor Designation",
      ranks: [
        "Master Trade Instructor",
        "Senior Workshop Instructor",
        "Trade Instructor",
        "Workshop Demonstrator",
      ],
      qualificationLabel: "Trade Qualification",
      qualifications: [
        "Master Craftsman Certificate",
        "NVTI Instructor License",
        "HND / B.Tech Technical",
        "Trade Diploma",
        "City & Guilds Advanced",
      ],
      employmentTypes: [
        { value: "full_time", label: "Full-Time" },
        { value: "part_time", label: "Part-Time / Visiting Master" },
        { value: "contract", label: "Industry Contract" },
      ],
      roleOptions: [
        { code: "instructor", name: "Trade Instructor" },
        { code: "head_of_department", name: "Lead Workshop Instructor" },
      ],
    },
    adminStaff: {
      addTitle: "Add Vocational Center Staff",
      editTitlePrefix: "Edit Vocational Center Staff",
      addSubtitle:
        "Provisions a live Supabase Auth account, workshop store/placement unit, and center role.",
      editSubtitle:
        "Update workshop storekeeper, placement coordinator, bursar, or center registry record.",
      pageTitle: "Vocational Center Staff & Operations",
      pageSubtitle:
        "Manage workshop storekeepers, bursars, industrial placement coordinators, and center registrars.",
      breadcrumbLabel: "Staff & Operations",
      idPrefix: "VSTF",
      idLabel: "Center Staff ID",
      idPlaceholder: "e.g. VSTF20260001",
      jobTitlePlaceholder: "e.g. Central Tool Storekeeper",
      emailPlaceholder: "e.g. storekeeper@tvet.edu",
      unitLabel: "Trade Workshop / Center Unit",
      showDepartmentDropdown: true,
      officeOptions: [
        "Central Tool & Material Store",
        "Industrial Placement Office",
        "Bursary & Accounts",
        "Center Administration",
        "Safety & Equipment Maintenance",
      ],
      roleOptions: [
        { code: "storekeeper", name: "Workshop Storekeeper" },
        { code: "bursar", name: "Bursar / Finance Officer" },
        { code: "placement_coordinator", name: "Placement Coordinator" },
        { code: "registrar", name: "Center Registrar" },
        { code: "safety_officer", name: "Safety & Maintenance Officer" },
        { code: "hr_officer", name: "Admin / HR Officer" },
      ],
    },
    fees: {
      addItemSubtitle:
        "Configure vocational training tuition, workshop materials/consumables, tools/PPE, and NVTI exam fees.",
      feeTitlePlaceholder: "e.g. Welding Consumables & Protective Gear Fee",
      feeCodePlaceholder: "e.g. TVET-WRK-01",
      categories: [
        { value: "tuition", label: "Training Tuition" },
        { value: "workshop_materials", label: "Workshop Materials & Consumables" },
        { value: "tools_ppe", label: "Tool Kit & Safety PPE" },
        { value: "trade_exam", label: "NVTI / Trade Test Fee" },
        { value: "certification", label: "Trade Certification Fee" },
        { value: "attachment", label: "Industrial Attachment Fee" },
      ],
      showDepartment: true,
      departmentLabel: "Trade Class / Workshop",
      showProgram: false,
      programLabel: "",
      termLabel: "Training Period",
      learnerSingular: "Trainee",
      paymentProviderPlaceholder: "e.g. Center Bursar / Mobile Money / Bank",
    },
    auxiliary: {
      noticeAudiences: [
        { value: "all", label: "Entire Training Center" },
        { value: "trainees", label: "All Vocational Trainees" },
        { value: "instructors", label: "Trade Instructors" },
        { value: "staff", label: "Storekeepers, Placement & Admin Staff" },
      ],
      admissionsTitle: "Register Vocational Trainee Application",
      admissionsChoiceLabel: "Preferred Trade Class / Workshop",
      admissionsNotesPlaceholder: "Prior craft background, sponsorship letter, or tool readiness notes...",
      libraryTitle: "Technical Manuals & Trade Resource Library",
      librarySubtitle:
        "Catalog workshop safety manuals, NVTI trade guides, engineering schematics, and equipment handbooks.",
      libraryPublisherPlaceholder: "Technical & Trade Press",
      transportDeparturePlaceholder: "Main Workshop Gate",
      emailDomainPlaceholder: "user@tvet.edu",
    },
  },
};

export function getSchoolFormConfig(rawSchoolType?: string | null): SchoolFormConfig {
  return SCHOOL_FORM_CONFIG[toPortalSchoolType(rawSchoolType)];
}
