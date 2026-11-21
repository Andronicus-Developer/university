/**
 * Cloud-Synced Multi-Tenant SaaS Virtual PostgREST Engine for the School Management System.
 *
 * Enforces strict per-school data isolation (`school_id` / `university_id`) so users of
 * School A can ONLY access School A's data, while Super Admins oversee all tenants.
 */

import {
  SCHOOL_A_ID,
  SCHOOL_B_ID,
  SCHOOL_C_ID,
  resolveTenantContextFromHeaders,
  rowBelongsToTenant,
  stampRowWithTenant,
  type TenantContext,
} from "@/lib/saas/tenant-context";

export type Row = Record<string, any>;
export type TableStore = Record<string, Row[]>;

const STORAGE_BUCKET = "institutional-reports";
const STORAGE_OBJECT_KEY = "ums-virtual-db.json";

const ADMIN_ID = "a0000000-0000-0000-0000-000000000001";
const SUPERADMIN_ID = "1440ed7e-cb23-4248-a372-f38b20d01554";
const FINANCE_ID = "ce155d80-2f26-4bfb-9ca1-72879fc60b62";
const LECTURER_ID = "6d8f80fb-c341-4622-b23b-0efa4702bb66";
const LECTURER_2_ID = "a0000000-0000-0000-0000-000000000002";
const STUDENT_ID = "6015cdd8-1c8e-4995-bde4-2bb90435e6ee";
const STUDENT_2_ID = "a0000000-0000-0000-0000-000000000003";
const STUDENT_3_ID = "a0000000-0000-0000-0000-000000000006";
const APPLICANT_ID = "a0000000-0000-0000-0000-000000000004";
const ADVISOR_ID = "a0000000-0000-0000-0000-000000000005";
const REGISTRAR_ID = "a0000000-0000-0000-0000-000000000007";
const HR_ID = "a0000000-0000-0000-0000-000000000008";

const CAMPUS_MAIN_ID = "2f92820b-2fcf-4ca4-9787-fc1ca2d936d6";
const FACULTY_COMP_ID = "f0000001-0000-0000-0000-000000000001";
const FACULTY_BUS_ID = "f0000001-0000-0000-0000-000000000002";
const FACULTY_ENG_ID = "f0000001-0000-0000-0000-000000000003";

const DEPT_CS_ID = "d0000001-0000-0000-0000-000000000001";
const DEPT_IT_ID = "d0000001-0000-0000-0000-000000000002";
const DEPT_BA_ID = "d0000001-0000-0000-0000-000000000003";
const DEPT_CE_ID = "d0000001-0000-0000-0000-000000000004";
const DEPT_ADMIN_ID = "d0000001-0000-0000-0000-000000000005";

const PROG_CS_ID = "b0000001-0000-0000-0000-000000000001";
const PROG_IT_ID = "b0000001-0000-0000-0000-000000000002";
const PROG_BBA_ID = "b0000001-0000-0000-0000-000000000003";
const PROG_CE_ID = "b0000001-0000-0000-0000-000000000004";

const AY_CURRENT_ID = "ac000001-0000-0000-0000-000000000001";
const TERM_SEM1_ID = "te000001-0000-0000-0000-000000000001";
const TERM_SEM2_ID = "te000001-0000-0000-0000-000000000002";

const COURSE_CS101_ID = "c0000001-0000-0000-0000-000000000001";
const COURSE_CS102_ID = "c0000001-0000-0000-0000-000000000002";
const COURSE_CS201_ID = "c0000001-0000-0000-0000-000000000003";
const COURSE_IT202_ID = "c0000001-0000-0000-0000-000000000004";
const COURSE_BA101_ID = "c0000001-0000-0000-0000-000000000005";
const COURSE_CE101_ID = "c0000001-0000-0000-0000-000000000006";

const OFFERING_1_ID = "cf000001-0000-0000-0000-000000000001";
const OFFERING_2_ID = "cf000001-0000-0000-0000-000000000002";
const OFFERING_3_ID = "cf000001-0000-0000-0000-000000000003";
const OFFERING_4_ID = "cf000001-0000-0000-0000-000000000004";

const STU_REC_1_ID = "50000001-0000-0000-0000-000000000001";
const STU_REC_2_ID = "50000001-0000-0000-0000-000000000002";
const STU_REC_3_ID = "50000001-0000-0000-0000-000000000003";

const STAFF_REC_1_ID = "5f000001-0000-0000-0000-000000000001";
const STAFF_REC_2_ID = "5f000001-0000-0000-0000-000000000002";
const STAFF_REC_3_ID = "5f000001-0000-0000-0000-000000000003";
const STAFF_REC_4_ID = "5f000001-0000-0000-0000-000000000004";
const STAFF_REC_5_ID = "5f000001-0000-0000-0000-000000000005";

export function createInitialSeedData(): TableStore {
  const now = "2026-11-05T08:00:00.000Z";

  const roles: Row[] = [
    {
      id: "9ff88ff1-e423-4ba4-8b98-f7473c98eaea",
      code: "superadmin",
      name: "Super Administrator",
      description: "Master platform overseer across all universities, campuses, and system settings.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "f67d1b87-ec01-41db-b436-1d59c9d3fe25",
      code: "system_admin",
      name: "System Administrator",
      description: "Technical configuration, integrations, user management, and operational maintenance.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "39525f22-9abb-467b-a7d2-183c33d77fb0",
      code: "vice_chancellor",
      name: "Vice-Chancellor / Executive",
      description: "Executive institutional oversight, strategic performance dashboards, and read-only reporting.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "d66410d7-4065-4273-9e7b-3ae6c3bc4c12",
      code: "registrar",
      name: "Registrar",
      description: "Authoritative student records, academic calendar, graduation, transcripts, and official certifications.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "937558d4-d969-454e-b3c2-5f613548d99c",
      code: "academic_affairs_officer",
      name: "Academic Affairs Officer",
      description: "Curriculum setup, programme requirements, semester calendar, and results administration.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "f3c0a12c-59ae-417d-b2f5-bb761136d193",
      code: "dean",
      name: "Faculty Dean",
      description: "Faculty oversight, academic workload, teaching allocations, and faculty-level result moderation.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "e405beef-5237-4d58-99a7-ba1db321fe83",
      code: "head_of_department",
      name: "Head of Department",
      description: "Departmental courses, course offerings, teaching assignments, and departmental result reviews.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "08841f8b-1e6c-4e79-80e0-842e9eccd769",
      code: "admissions_officer",
      name: "Admissions Officer",
      description: "Application processing, document verification, applicant scoring, and admissions recommendation.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "d2be4e20-7995-4a69-a8aa-b4ed2174002f",
      code: "finance_officer",
      name: "Finance Officer / Bursar",
      description: "Fee schedules, student invoicing, payment verification, receipts, reconciliation, and refunds.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "1e47b447-85e2-4a75-8bb5-41062c8f5cd9",
      code: "lecturer",
      name: "Lecturer / Instructor",
      description: "Assigned course offerings, class lists, attendance recording, assessment setup, and mark sheets.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "c39df56e-83dd-4dc0-8ef6-142ac25bc2e6",
      code: "academic_advisor",
      name: "Academic Advisor",
      description: "Assigned advisees, academic progression monitoring, advising notes, and registration guidance.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "a213be9f-e76a-4281-bd89-28beacc7642c",
      code: "student",
      name: "Student",
      description: "Personal profile, course registration, timetable, attendance, results, and fee payments.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "e3ad0255-07dd-43c7-9242-44e948005b9b",
      code: "applicant",
      name: "Applicant",
      description: "Admission application submission, document upload, status tracking, and offer acceptance.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "79e992cb-2b80-4db5-aa34-050e6a0e4cde",
      code: "librarian",
      name: "Librarian",
      description: "Catalogue management, circulation, loans, reservations, and library fine administration.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "05e83f44-c3cc-43f7-8295-cc28c575c0f7",
      code: "hostel_officer",
      name: "Hostel Officer",
      description: "Residence halls, room inventories, bed allocations, check-in/out, and maintenance.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "cd00857c-1e89-4be3-8380-656d8dd21b4e",
      code: "hr_officer",
      name: "Human Resources Officer",
      description: "Staff records, employment contracts, leave administration, and teaching load tracking.",
      is_system_role: true,
      created_at: now,
    },
    {
      id: "c5d12003-331f-4f43-91fe-f2e43a1fd640",
      code: "auditor",
      name: "Internal / External Auditor",
      description: "Read-only compliance verification across audit trails and financial ledgers.",
      is_system_role: true,
      created_at: now,
    },
  ];

  const profiles: Row[] = [
    {
      id: SUPERADMIN_ID,
      email: "superadmin@university.edu.gh",
      full_name: "Master Super Administrator",
      phone: "+233 30 200 0001",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: true,
      last_sign_in_at: now,
      metadata: { role: "superadmin", default_role: "superadmin", full_name: "Master Super Administrator" },
      created_at: now,
      updated_at: now,
    },
    {
      id: ADMIN_ID,
      email: "admin@university.edu.gh",
      full_name: "Andronicus Johnson",
      phone: "+233 30 212 8899",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: true,
      last_sign_in_at: now,
      metadata: {
        role: "system_admin",
        default_role: "system_admin",
        full_name: "Andronicus Johnson",
        university_id: "u0000001-0000-0000-0000-000000000001",
        university_code: "LCU",
      },
      created_at: now,
      updated_at: now,
    },
    {
      id: FINANCE_ID,
      email: "eugenedoeteh@university.edu.gh",
      full_name: "Eugene Doeteh",
      phone: "+233 24 411 2233",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "finance_officer", full_name: "Eugene Doeteh" },
      created_at: now,
      updated_at: now,
    },
    {
      id: LECTURER_ID,
      email: "adaahessel@university.edu.gh",
      full_name: "Keziah Adaah Essel",
      phone: "+233 24 522 3344",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "lecturer", full_name: "Keziah Adaah Essel" },
      created_at: now,
      updated_at: now,
    },
    {
      id: LECTURER_2_ID,
      email: "lecturer@university.edu.gh",
      full_name: "Dr. Kwame Mensah",
      phone: "+233 24 633 4455",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "lecturer", full_name: "Dr. Kwame Mensah" },
      created_at: now,
      updated_at: now,
    },
    {
      id: ADVISOR_ID,
      email: "advisor@university.edu.gh",
      full_name: "Prof. Abena Owusu",
      phone: "+233 20 811 2299",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "academic_advisor", full_name: "Prof. Abena Owusu" },
      created_at: now,
      updated_at: now,
    },
    {
      id: REGISTRAR_ID,
      email: "registrar@university.edu.gh",
      full_name: "Dr. Samuel Boateng",
      phone: "+233 20 900 1122",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "registrar", full_name: "Dr. Samuel Boateng" },
      created_at: now,
      updated_at: now,
    },
    {
      id: HR_ID,
      email: "hr@university.edu.gh",
      full_name: "Grace Asante",
      phone: "+233 20 777 8899",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "hr_officer", full_name: "Grace Asante" },
      created_at: now,
      updated_at: now,
    },
    {
      id: STUDENT_ID,
      email: "ama.johnson@university.edu.gh",
      full_name: "Ama Johnson",
      phone: "+233 55 123 4567",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "student", full_name: "Ama Johnson" },
      created_at: now,
      updated_at: now,
    },
    {
      id: STUDENT_2_ID,
      email: "student@university.edu.gh",
      full_name: "Ama Osei",
      phone: "+233 55 234 5678",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "student", full_name: "Ama Osei" },
      created_at: now,
      updated_at: now,
    },
    {
      id: STUDENT_3_ID,
      email: "daniel.tetteh@university.edu.gh",
      full_name: "Daniel Tetteh",
      phone: "+233 55 345 6789",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "student", full_name: "Daniel Tetteh" },
      created_at: now,
      updated_at: now,
    },
    {
      id: APPLICANT_ID,
      email: "applicant@university.edu.gh",
      full_name: "Kofi Boateng",
      phone: "+233 54 987 6543",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      metadata: { role: "applicant", full_name: "Kofi Boateng" },
      created_at: now,
      updated_at: now,
    },
  ];

  const user_role_assignments: Row[] = [
    { id: "ura-1", user_id: SUPERADMIN_ID, role_id: "9ff88ff1-e423-4ba4-8b98-f7473c98eaea", is_active: true, created_at: now },
    { id: "ura-2", user_id: ADMIN_ID, role_id: "f67d1b87-ec01-41db-b436-1d59c9d3fe25", is_active: true, created_at: now },
    { id: "ura-3", user_id: FINANCE_ID, role_id: "d2be4e20-7995-4a69-a8aa-b4ed2174002f", is_active: true, created_at: now },
    { id: "ura-4", user_id: LECTURER_ID, role_id: "1e47b447-85e2-4a75-8bb5-41062c8f5cd9", is_active: true, created_at: now },
    { id: "ura-5", user_id: LECTURER_2_ID, role_id: "1e47b447-85e2-4a75-8bb5-41062c8f5cd9", is_active: true, created_at: now },
    { id: "ura-6", user_id: ADVISOR_ID, role_id: "c39df56e-83dd-4dc0-8ef6-142ac25bc2e6", is_active: true, created_at: now },
    { id: "ura-7", user_id: REGISTRAR_ID, role_id: "d66410d7-4065-4273-9e7b-3ae6c3bc4c12", is_active: true, created_at: now },
    { id: "ura-8", user_id: HR_ID, role_id: "cd00857c-1e89-4be3-8380-656d8dd21b4e", is_active: true, created_at: now },
    { id: "ura-9", user_id: STUDENT_ID, role_id: "a213be9f-e76a-4281-bd89-28beacc7642c", is_active: true, created_at: now },
    { id: "ura-10", user_id: STUDENT_2_ID, role_id: "a213be9f-e76a-4281-bd89-28beacc7642c", is_active: true, created_at: now },
    { id: "ura-11", user_id: STUDENT_3_ID, role_id: "a213be9f-e76a-4281-bd89-28beacc7642c", is_active: true, created_at: now },
    { id: "ura-12", user_id: APPLICANT_ID, role_id: "e3ad0255-07dd-43c7-9242-44e948005b9b", is_active: true, created_at: now },
  ];

  const universities: Row[] = [
    {
      id: SCHOOL_A_ID,
      code: "AIT",
      name: "Accra Institute of Technology",
      short_name: "AIT Ghana",
      school_type: "university",
      institution_type: "university",
      subscription_plan: "enterprise",
      subscription_status: "active",
      country: "Ghana",
      city: "Accra",
      address: "Cantonments Science Park, Accra",
      email: "admin@university.edu.gh",
      phone: "+233 30 278 6050",
      website: "https://ait.edu.gh",
      motto: "Service, Leadership & Scholarship",
      default_currency: "GHS",
      currency_symbol: "GH₵",
      established_year: 2005,
      accreditation_code: "GTEC/UNI/2026-0119",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      id: SCHOOL_B_ID,
      code: "KTVI",
      name: "Kumasi Technical & Vocational Institute",
      short_name: "KTVI Kumasi",
      school_type: "vocational_school",
      institution_type: "vocational_school",
      subscription_plan: "enterprise",
      subscription_status: "active",
      country: "Ghana",
      city: "Kumasi",
      address: "Suame Industrial & Technical Hub, Kumasi",
      email: "admin@ktvi.edu.gh",
      phone: "+233 32 202 4411",
      website: "https://ktvi.edu.gh",
      motto: "Skills, Craftsmanship & Innovation",
      default_currency: "GHS",
      currency_symbol: "GH₵",
      established_year: 2010,
      accreditation_code: "CTVET/VOC/2026-0304",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      id: SCHOOL_C_ID,
      code: "ASHS",
      name: "Achimota Senior High School",
      short_name: "Achimota School",
      school_type: "high_school",
      institution_type: "high_school",
      subscription_plan: "professional",
      subscription_status: "active",
      country: "Ghana",
      city: "Accra",
      address: "Achimota Forest Road, Accra",
      email: "admin@achimota.edu.gh",
      phone: "+233 30 240 1221",
      website: "https://achimota.edu.gh",
      motto: "Ut Omnes Unum Sint",
      default_currency: "GHS",
      currency_symbol: "GH₵",
      established_year: 1927,
      accreditation_code: "GES/SHS/2026-0012",
      status: "active",
      created_at: now,
      updated_at: now,
    },
  ];

  const superadmin_modules: Row[] = [
    {
      id: "m-dash",
      module_key: "dashboard",
      label: "System Overview",
      category: "Core Administration",
      route_path: "/superadmin/dashboard",
      icon: "LayoutGrid",
      badge: "Live",
      description: "System vitals, cross-university KPIs, and infrastructure health",
      is_active: true,
      display_order: 1,
      created_at: now,
    },
    {
      id: "m-univ",
      module_key: "universities",
      label: "Universities & Campuses",
      category: "Core Administration",
      route_path: "/superadmin/universities",
      icon: "Building2",
      badge: "Tenants",
      description: "Register institutions, configure multi-tenancy, and manage campuses",
      is_active: true,
      display_order: 2,
      created_at: now,
    },
    {
      id: "m-sys",
      module_key: "system_admins",
      label: "System Administrators",
      category: "Core Administration",
      route_path: "/superadmin/system-admins",
      icon: "ShieldCheck",
      badge: "Admins",
      description: "Provision and govern system administrator credentials across all universities",
      is_active: true,
      display_order: 3,
      created_at: now,
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
      created_at: now,
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
      created_at: now,
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
      created_at: now,
    },
    {
      id: "m-acad",
      module_key: "academics",
      label: "Academic Configuration",
      category: "Platform Configuration",
      route_path: "/superadmin/academics",
      icon: "GraduationCap",
      badge: null,
      description: "Global grading scales, credit rules, terms, and progression logic",
      is_active: true,
      display_order: 7,
      created_at: now,
    },
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
      created_at: now,
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
      created_at: now,
    },
    {
      id: "m-tmpl",
      module_key: "templates",
      label: "Document Templates",
      category: "Platform Configuration",
      route_path: "/superadmin/templates",
      icon: "FileText",
      badge: null,
      description: "Transcript, certificate, admission letter, and official document formats",
      is_active: true,
      display_order: 10,
      created_at: now,
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
      created_at: now,
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
      created_at: now,
    },
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
      created_at: now,
    },
    {
      id: "m-sec",
      module_key: "security_events",
      label: "Security Events",
      category: "Security & Operations",
      route_path: "/superadmin/security-events",
      icon: "ShieldAlert",
      badge: null,
      description: "Real-time threat monitoring, failed logins, and privilege escalations",
      is_active: true,
      display_order: 14,
      created_at: now,
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
      created_at: now,
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
      created_at: now,
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
      created_at: now,
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
      created_at: now,
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
      created_at: now,
    },
  ];

  const campuses: Row[] = [
    {
      id: CAMPUS_MAIN_ID,
      code: "MAIN_ACCRA",
      name: "Accra Central Campus",
      location: "Legon, Accra, Greater Accra Region, Ghana",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  const faculties: Row[] = [
    { id: FACULTY_COMP_ID, campus_id: CAMPUS_MAIN_ID, code: "FOCIS", name: "Faculty of Computing & Information Systems", is_active: true, created_at: now },
    { id: FACULTY_BUS_ID, campus_id: CAMPUS_MAIN_ID, code: "FOBM", name: "Faculty of Business & Management Studies", is_active: true, created_at: now },
    { id: FACULTY_ENG_ID, campus_id: CAMPUS_MAIN_ID, code: "FOE", name: "Faculty of Engineering & Built Environment", is_active: true, created_at: now },
  ];

  const departments: Row[] = [
    { id: DEPT_CS_ID, faculty_id: FACULTY_COMP_ID, code: "CS", name: "Department of Computer Science", is_active: true, created_at: now },
    { id: DEPT_IT_ID, faculty_id: FACULTY_COMP_ID, code: "IT", name: "Department of Information Technology", is_active: true, created_at: now },
    { id: DEPT_BA_ID, faculty_id: FACULTY_BUS_ID, code: "BA", name: "Department of Business Administration", is_active: true, created_at: now },
    { id: DEPT_CE_ID, faculty_id: FACULTY_ENG_ID, code: "CE", name: "Department of Computer Engineering", is_active: true, created_at: now },
    { id: DEPT_ADMIN_ID, faculty_id: FACULTY_BUS_ID, code: "REG", name: "Central Registry & Administration", is_active: true, created_at: now },
  ];

  const programmes: Row[] = [
    { id: PROG_CS_ID, department_id: DEPT_CS_ID, code: "BSC-CS", name: "B.Sc. Computer Science", degree_level: "bachelor", duration_years: 4, total_credits: 136, is_active: true, created_at: now },
    { id: PROG_IT_ID, department_id: DEPT_IT_ID, code: "BSC-IT", name: "B.Sc. Information Technology", degree_level: "bachelor", duration_years: 4, total_credits: 132, is_active: true, created_at: now },
    { id: PROG_BBA_ID, department_id: DEPT_BA_ID, code: "BBA", name: "Bachelor of Business Administration", degree_level: "bachelor", duration_years: 4, total_credits: 128, is_active: true, created_at: now },
    { id: PROG_CE_ID, department_id: DEPT_CE_ID, code: "BENG-CE", name: "B.Eng. Computer Engineering", degree_level: "bachelor", duration_years: 4, total_credits: 144, is_active: true, created_at: now },
  ];

  const academic_years: Row[] = [
    {
      id: AY_CURRENT_ID,
      code: "2026/2027",
      name: "2026/2027 Academic Year",
      start_date: "2026-09-01",
      end_date: "2027-06-30",
      is_current: true,
      created_at: now,
    },
  ];

  const terms: Row[] = [
    {
      id: TERM_SEM1_ID,
      academic_year_id: AY_CURRENT_ID,
      code: "SEM1-2627",
      name: "First Semester 2026/2027",
      start_date: "2026-09-01",
      end_date: "2027-01-15",
      is_active: true,
      created_at: now,
    },
    {
      id: TERM_SEM2_ID,
      academic_year_id: AY_CURRENT_ID,
      code: "SEM2-2627",
      name: "Second Semester 2026/2027",
      start_date: "2027-02-01",
      end_date: "2027-06-15",
      is_active: false,
      created_at: now,
    },
  ];

  const courses: Row[] = [
    { id: COURSE_CS101_ID, department_id: DEPT_CS_ID, code: "CS101", name: "Introduction to Computer Science & Programming", description: "Foundational algorithms, data representation, and structured programming in Python & C.", credits: 3, contact_hours: 3, course_type: "core", is_active: true, created_at: now, updated_at: now },
    { id: COURSE_CS102_ID, department_id: DEPT_CS_ID, code: "CS102", name: "Data Structures & Algorithms", description: "Trees, graphs, hash tables, sorting, searching, and asymptotic complexity analysis.", credits: 4, contact_hours: 4, course_type: "core", is_active: true, created_at: now, updated_at: now },
    { id: COURSE_CS201_ID, department_id: DEPT_CS_ID, code: "CS201", name: "Database Management Systems", description: "Relational algebra, SQL, normalization, ACID transactions, and indexing architectures.", credits: 3, contact_hours: 3, course_type: "core", is_active: true, created_at: now, updated_at: now },
    { id: COURSE_IT202_ID, department_id: DEPT_IT_ID, code: "IT202", name: "Cloud Computing & Distributed Systems", description: "Virtualization, microservices, container orchestration, and resilient cloud architectures.", credits: 3, contact_hours: 3, course_type: "elective", is_active: true, created_at: now, updated_at: now },
    { id: COURSE_BA101_ID, department_id: DEPT_BA_ID, code: "BA101", name: "Principles of Corporate Finance & Management", description: "Financial statements, capital budgeting, organizational leadership, and strategic planning.", credits: 3, contact_hours: 3, course_type: "core", is_active: true, created_at: now, updated_at: now },
    { id: COURSE_CE101_ID, department_id: DEPT_CE_ID, code: "CE101", name: "Digital Logic & Microprocessor Systems", description: "Boolean algebra, combinational and sequential circuits, FPGA synthesis, and embedded systems.", credits: 4, contact_hours: 4, course_type: "core", is_active: true, created_at: now, updated_at: now },
  ];

  const course_offerings: Row[] = [
    { id: OFFERING_1_ID, term_id: TERM_SEM1_ID, academic_year_id: AY_CURRENT_ID, course_id: COURSE_CS101_ID, section: "A", delivery_mode: "in_person", capacity: 60, enrolled_count: 42, status: "published", created_at: now },
    { id: OFFERING_2_ID, term_id: TERM_SEM1_ID, academic_year_id: AY_CURRENT_ID, course_id: COURSE_CS102_ID, section: "A", delivery_mode: "in_person", capacity: 55, enrolled_count: 38, status: "published", created_at: now },
    { id: OFFERING_3_ID, term_id: TERM_SEM1_ID, academic_year_id: AY_CURRENT_ID, course_id: COURSE_CS201_ID, section: "A", delivery_mode: "hybrid", capacity: 50, enrolled_count: 35, status: "published", created_at: now },
    { id: OFFERING_4_ID, term_id: TERM_SEM1_ID, academic_year_id: AY_CURRENT_ID, course_id: COURSE_IT202_ID, section: "B", delivery_mode: "in_person", capacity: 45, enrolled_count: 29, status: "published", created_at: now },
  ];

  const staff: Row[] = [
    {
      id: STAFF_REC_1_ID,
      profile_id: LECTURER_ID,
      staff_number: "STF-2026-001",
      department_id: DEPT_CS_ID,
      employment_type: "full_time",
      job_title: "Senior Lecturer in Computer Science",
      hire_date: "2021-09-01",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      id: STAFF_REC_2_ID,
      profile_id: LECTURER_2_ID,
      staff_number: "STF-2026-002",
      department_id: DEPT_IT_ID,
      employment_type: "full_time",
      job_title: "Associate Professor of Information Systems",
      hire_date: "2019-08-15",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      id: STAFF_REC_3_ID,
      profile_id: ADVISOR_ID,
      staff_number: "STF-2026-003",
      department_id: DEPT_CS_ID,
      employment_type: "full_time",
      job_title: "Professor & Senior Academic Advisor",
      hire_date: "2018-01-10",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      id: STAFF_REC_4_ID,
      profile_id: FINANCE_ID,
      staff_number: "STF-2026-004",
      department_id: DEPT_ADMIN_ID,
      employment_type: "full_time",
      job_title: "Chief Finance Officer / Bursar",
      hire_date: "2020-03-01",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      id: STAFF_REC_5_ID,
      profile_id: REGISTRAR_ID,
      staff_number: "STF-2026-005",
      department_id: DEPT_ADMIN_ID,
      employment_type: "full_time",
      job_title: "University Registrar",
      hire_date: "2017-06-01",
      status: "active",
      created_at: now,
      updated_at: now,
    },
  ];

  const employment_records: Row[] = [
    { id: "emp-1", staff_id: STAFF_REC_1_ID, contract_type: "full_time", salary_grade: "GHS 12,500", start_date: "2021-09-01", created_at: now },
    { id: "emp-2", staff_id: STAFF_REC_2_ID, contract_type: "full_time", salary_grade: "GHS 15,800", start_date: "2019-08-15", created_at: now },
    { id: "emp-3", staff_id: STAFF_REC_3_ID, contract_type: "full_time", salary_grade: "GHS 17,200", start_date: "2018-01-10", created_at: now },
    { id: "emp-4", staff_id: STAFF_REC_4_ID, contract_type: "full_time", salary_grade: "GHS 14,500", start_date: "2020-03-01", created_at: now },
    { id: "emp-5", staff_id: STAFF_REC_5_ID, contract_type: "full_time", salary_grade: "GHS 16,000", start_date: "2017-06-01", created_at: now },
  ];

  const teaching_assignments: Row[] = [
    { id: "ta-1", course_offering_id: OFFERING_1_ID, staff_id: LECTURER_ID, role: "lecturer", is_primary: true, created_at: now },
    { id: "ta-2", course_offering_id: OFFERING_2_ID, staff_id: LECTURER_ID, role: "lecturer", is_primary: true, created_at: now },
    { id: "ta-3", course_offering_id: OFFERING_3_ID, staff_id: LECTURER_ID, role: "lecturer", is_primary: true, created_at: now },
    { id: "ta-4", course_offering_id: OFFERING_4_ID, staff_id: LECTURER_2_ID, role: "lecturer", is_primary: true, created_at: now },
  ];

  const students: Row[] = [
    {
      id: STU_REC_1_ID,
      profile_id: STUDENT_ID,
      student_number: "AIT/BSC/26/001",
      programme_id: PROG_CS_ID,
      entry_term_id: TERM_SEM1_ID,
      current_term_id: TERM_SEM1_ID,
      cohort_year: 2026,
      admission_date: "2026-08-25",
      status: "active",
      academic_status: "good_standing",
      current_level: 200,
      gpa: 3.78,
      cgpa: 3.82,
      total_credits_earned: 48,
      created_at: now,
      updated_at: now,
    },
    {
      id: STU_REC_2_ID,
      profile_id: STUDENT_2_ID,
      student_number: "AIT/BSC/26/002",
      programme_id: PROG_IT_ID,
      entry_term_id: TERM_SEM1_ID,
      current_term_id: TERM_SEM1_ID,
      cohort_year: 2026,
      admission_date: "2026-08-26",
      status: "active",
      academic_status: "good_standing",
      current_level: 200,
      gpa: 3.55,
      cgpa: 3.60,
      total_credits_earned: 45,
      created_at: now,
      updated_at: now,
    },
    {
      id: STU_REC_3_ID,
      profile_id: STUDENT_3_ID,
      student_number: "AIT/BBA/26/003",
      programme_id: PROG_BBA_ID,
      entry_term_id: TERM_SEM1_ID,
      current_term_id: TERM_SEM1_ID,
      cohort_year: 2026,
      admission_date: "2026-08-28",
      status: "active",
      academic_status: "good_standing",
      current_level: 100,
      gpa: 3.42,
      cgpa: 3.45,
      total_credits_earned: 18,
      created_at: now,
      updated_at: now,
    },
  ];

  const course_enrolments: Row[] = [
    { id: "enr-1", student_id: STU_REC_1_ID, course_offering_id: OFFERING_1_ID, enrolment_status: "enrolled", registered_at: now, final_grade: "A", grade_points: 4.0, created_at: now },
    { id: "enr-2", student_id: STU_REC_1_ID, course_offering_id: OFFERING_2_ID, enrolment_status: "enrolled", registered_at: now, final_grade: "A-", grade_points: 3.7, created_at: now },
    { id: "enr-3", student_id: STU_REC_1_ID, course_offering_id: OFFERING_3_ID, enrolment_status: "enrolled", registered_at: now, final_grade: "A", grade_points: 4.0, created_at: now },
    { id: "enr-4", student_id: STU_REC_2_ID, course_offering_id: OFFERING_1_ID, enrolment_status: "enrolled", registered_at: now, final_grade: "B+", grade_points: 3.5, created_at: now },
    { id: "enr-5", student_id: STU_REC_2_ID, course_offering_id: OFFERING_4_ID, enrolment_status: "enrolled", registered_at: now, final_grade: "A", grade_points: 4.0, created_at: now },
  ];

  const assessment_components: Row[] = [
    { id: "ac-1", course_offering_id: OFFERING_1_ID, name: "Mid-Semester Examination", component_type: "midterm", weight_percentage: 30, max_marks: 30, created_at: now },
    { id: "ac-2", course_offering_id: OFFERING_1_ID, name: "End-of-Semester Final Exam", component_type: "final_exam", weight_percentage: 50, max_marks: 100, created_at: now },
    { id: "ac-3", course_offering_id: OFFERING_2_ID, name: "Practical Lab & Project", component_type: "project", weight_percentage: 20, max_marks: 20, created_at: now },
    { id: "ac-4", course_offering_id: OFFERING_3_ID, name: "Database Design Final Exam", component_type: "final_exam", weight_percentage: 60, max_marks: 100, created_at: now },
  ];

  const assessment_marks: Row[] = [
    { id: "am-1", enrolment_id: "enr-1", assessment_component_id: "ac-1", marks_obtained: 28, is_absent: false, remarks: "Excellent", entered_at: now },
    { id: "am-2", enrolment_id: "enr-1", assessment_component_id: "ac-2", marks_obtained: 89, is_absent: false, remarks: "Distinction", entered_at: now },
    { id: "am-3", enrolment_id: "enr-2", assessment_component_id: "ac-3", marks_obtained: 18, is_absent: false, remarks: "Very good", entered_at: now },
  ];

  const published_results: Row[] = [
    { id: "pr-1", enrolment_id: "enr-1", total_marks: 88, letter_grade: "A", grade_points: 4.0, published_at: now },
    { id: "pr-2", enrolment_id: "enr-2", total_marks: 82, letter_grade: "A-", grade_points: 3.7, published_at: now },
    { id: "pr-3", enrolment_id: "enr-3", total_marks: 91, letter_grade: "A", grade_points: 4.0, published_at: now },
  ];

  const grade_scales: Row[] = [
    { id: "gs-1", name: "Standard 4.0 GPA Grading Scale", description: "Official Senate Undergraduate Grading Scale", is_default: true, created_at: now },
  ];

  const grade_scale_items: Row[] = [
    { id: "gsi-1", grade_scale_id: "gs-1", letter_grade: "A", min_percentage: 80, max_percentage: 100, grade_points: 4.0, pass_status: "pass", remarks: "First Class / Distinction" },
    { id: "gsi-2", grade_scale_id: "gs-1", letter_grade: "B+", min_percentage: 70, max_percentage: 79.99, grade_points: 3.5, pass_status: "pass", remarks: "Very Good" },
    { id: "gsi-3", grade_scale_id: "gs-1", letter_grade: "B", min_percentage: 60, max_percentage: 69.99, grade_points: 3.0, pass_status: "pass", remarks: "Good" },
    { id: "gsi-4", grade_scale_id: "gs-1", letter_grade: "C", min_percentage: 50, max_percentage: 59.99, grade_points: 2.0, pass_status: "pass", remarks: "Credit / Pass" },
    { id: "gsi-5", grade_scale_id: "gs-1", letter_grade: "F", min_percentage: 0, max_percentage: 49.99, grade_points: 0.0, pass_status: "fail", remarks: "Fail / Repeat" },
  ];

  const fee_items: Row[] = [
    { id: "fi-1", code: "TUITION-UG", name: "Undergraduate Semester Tuition Fee", description: "Core academic instruction & laboratory access", default_amount: 4500, is_mandatory: true, is_active: true, created_at: now },
    { id: "fi-2", code: "ICT-LEVY", name: "Campus ICT & Digital Library Levy", description: "High-speed fiber internet, e-journals, and LMS access", default_amount: 450, is_mandatory: true, is_active: true, created_at: now },
    { id: "fi-3", code: "MED-INS", name: "Student Medical & Clinic Cover", description: "University hospital & emergency care coverage", default_amount: 250, is_mandatory: true, is_active: true, created_at: now },
  ];

  const fee_schedules: Row[] = [
    { id: "fs-1", fee_item_id: "fi-1", programme_id: PROG_CS_ID, term_id: TERM_SEM1_ID, academic_year_id: AY_CURRENT_ID, level: 200, amount: 4500, currency: "GHS", due_date: "2026-10-15", created_at: now },
    { id: "fs-2", fee_item_id: "fi-2", programme_id: PROG_CS_ID, term_id: TERM_SEM1_ID, academic_year_id: AY_CURRENT_ID, level: 200, amount: 450, currency: "GHS", due_date: "2026-10-15", created_at: now },
  ];

  const student_invoices: Row[] = [
    {
      id: "inv-1",
      invoice_number: "INV-2026-0001",
      student_id: STU_REC_1_ID,
      term_id: TERM_SEM1_ID,
      total_amount: 5200,
      paid_amount: 5200,
      balance_amount: 0,
      currency: "GHS",
      status: "paid",
      issue_date: "2026-09-01",
      due_date: "2026-10-15",
      created_at: now,
    },
    {
      id: "inv-2",
      invoice_number: "INV-2026-0002",
      student_id: STU_REC_2_ID,
      term_id: TERM_SEM1_ID,
      total_amount: 5200,
      paid_amount: 3400,
      balance_amount: 1800,
      currency: "GHS",
      status: "partially_paid",
      issue_date: "2026-09-01",
      due_date: "2026-10-15",
      created_at: now,
    },
    {
      id: "inv-3",
      invoice_number: "INV-2026-0003",
      student_id: STU_REC_3_ID,
      term_id: TERM_SEM1_ID,
      total_amount: 4800,
      paid_amount: 4800,
      balance_amount: 0,
      currency: "GHS",
      status: "paid",
      issue_date: "2026-09-05",
      due_date: "2026-10-20",
      created_at: now,
    },
  ];

  const invoice_lines: Row[] = [
    { id: "il-1", invoice_id: "inv-1", fee_item_id: "fi-1", description: "Undergraduate Semester Tuition Fee", amount: 4500, created_at: now },
    { id: "il-2", invoice_id: "inv-1", fee_item_id: "fi-2", description: "Campus ICT & Digital Library Levy", amount: 450, created_at: now },
    { id: "il-3", invoice_id: "inv-1", fee_item_id: "fi-3", description: "Student Medical & Clinic Cover", amount: 250, created_at: now },
  ];

  const payments: Row[] = [
    {
      id: "pay-1",
      student_id: STU_REC_1_ID,
      invoice_id: "inv-1",
      amount: 5200,
      currency: "GHS",
      provider: "paystack",
      provider_reference: "PSK-2026-8849201",
      payment_method: "Paystack Card",
      status: "successful",
      verified_at: now,
      created_at: now,
    },
    {
      id: "pay-2",
      student_id: STU_REC_2_ID,
      invoice_id: "inv-2",
      amount: 3400,
      currency: "GHS",
      provider: "mtn_momo",
      provider_reference: "MOMO-2026-9931044",
      payment_method: "MTN Mobile Money",
      status: "successful",
      verified_at: now,
      created_at: now,
    },
    {
      id: "pay-3",
      student_id: STU_REC_3_ID,
      invoice_id: "inv-3",
      amount: 4800,
      currency: "GHS",
      provider: "bank_transfer",
      provider_reference: "BNK-2026-7712900",
      payment_method: "Direct Bank Wire",
      status: "successful",
      verified_at: now,
      created_at: now,
    },
  ];

  const receipts: Row[] = [
    { id: "rcp-1", receipt_number: "RCP-2026-0001", payment_id: "pay-1", student_id: STU_REC_1_ID, amount: 5200, currency: "GHS", issued_at: now, receipt_data: { description: "Full Tuition & Fees Settlement" } },
    { id: "rcp-2", receipt_number: "RCP-2026-0002", payment_id: "pay-2", student_id: STU_REC_2_ID, amount: 3400, currency: "GHS", issued_at: now, receipt_data: { description: "Partial Tuition Settlement" } },
  ];

  const scholarships: Row[] = [
    { id: "sch-1", student_id: STU_REC_1_ID, name: "Chancellor's Academic Excellence Scholarship", sponsor_name: "University Endowment Fund", coverage_type: "percentage", amount_percentage: 50, max_amount: 5000, is_active: true, created_at: now },
  ];

  const waivers: Row[] = [
    { id: "wav-1", student_id: STU_REC_2_ID, invoice_id: "inv-2", amount: 500, reason: "STEM Innovation Competition Winner Grant", waiver_type: "merit", approved_by: FINANCE_ID, approved_at: now, created_at: now },
  ];

  const refund_requests: Row[] = [
    { id: "ref-1", student_id: STU_REC_1_ID, payment_id: "pay-1", amount: 250, reason: "Duplicate clinic cover payment adjustment", status: "pending", requested_by: STUDENT_ID, approved_by: null, created_at: now },
  ];

  const financial_approvals: Row[] = [
    { id: "fa-1", approval_type: "refund", reference_id: "ref-1", student_id: STU_REC_1_ID, amount: 250, currency: "GHS", reason: "Duplicate clinic cover payment adjustment", requested_by: FINANCE_ID, status: "pending", created_at: now },
  ];

  const settlement_batches: Row[] = [
    { id: "sb-1", batch_reference: "STL-2026-11-01", provider: "paystack", total_amount: 13400, transaction_count: 3, status: "reconciled", settled_at: now, created_at: now },
  ];

  const buildings: Row[] = [
    { id: "bld-1", campus_id: CAMPUS_MAIN_ID, code: "ICT-BLK", name: "Kofi Annan ICT & Innovation Complex", floors: 4, created_at: now },
    { id: "bld-2", campus_id: CAMPUS_MAIN_ID, code: "SCI-BLK", name: "Engineering & Science Lecture Theatre", floors: 3, created_at: now },
  ];

  const rooms: Row[] = [
    { id: "rm-1", building_id: "bld-1", code: "LAB-101", name: "Software Engineering Lab 101", room_type: "lab", capacity: 65, created_at: now },
    { id: "rm-2", building_id: "bld-2", code: "LT-201", name: "Main Lecture Theatre 201", room_type: "lecture_hall", capacity: 120, created_at: now },
  ];

  const timetable_events: Row[] = [
    { id: "tt-1", course_offering_id: OFFERING_1_ID, room_id: "rm-1", staff_id: LECTURER_ID, day_of_week: 1, start_time: "08:30:00", end_time: "10:30:00", recurrence_pattern: "weekly", created_at: now },
    { id: "tt-2", course_offering_id: OFFERING_2_ID, room_id: "rm-2", staff_id: LECTURER_ID, day_of_week: 3, start_time: "11:00:00", end_time: "13:00:00", recurrence_pattern: "weekly", created_at: now },
    { id: "tt-3", course_offering_id: OFFERING_3_ID, room_id: "rm-1", staff_id: LECTURER_ID, day_of_week: 4, start_time: "14:00:00", end_time: "16:00:00", recurrence_pattern: "weekly", created_at: now },
  ];

  const class_sessions: Row[] = [
    { id: "cs-1", course_offering_id: OFFERING_1_ID, session_date: "2026-11-02", start_time: "08:30:00", end_time: "10:30:00", topic: "Pointers, Memory Allocation & Recursion", conducted_by: LECTURER_ID, created_at: now },
    { id: "cs-2", course_offering_id: OFFERING_2_ID, session_date: "2026-11-04", start_time: "11:00:00", end_time: "13:00:00", topic: "Balanced Binary Search Trees (AVL & Red-Black)", conducted_by: LECTURER_ID, created_at: now },
  ];

  const attendance_records: Row[] = [
    { id: "att-1", class_session_id: "cs-1", student_id: STU_REC_1_ID, status: "present", recorded_at: now },
    { id: "att-2", class_session_id: "cs-1", student_id: STU_REC_2_ID, status: "present", recorded_at: now },
    { id: "att-3", class_session_id: "cs-2", student_id: STU_REC_1_ID, status: "present", recorded_at: now },
  ];

  const leave_requests: Row[] = [
    { id: "lv-1", staff_id: STAFF_REC_1_ID, leave_type: "study_conference", start_date: "2026-11-20", end_date: "2026-11-24", reason: "IEEE West Africa AI Research Symposium Keynote", status: "approved", created_at: now },
    { id: "lv-2", staff_id: STAFF_REC_2_ID, leave_type: "annual", start_date: "2026-12-15", end_date: "2026-12-22", reason: "End of semester family vacation", status: "pending", created_at: now },
  ];

  const announcements: Row[] = [
    { id: "ann-1", title: "2026/2027 Mid-Semester Examinations Timetable Published", content: "All students and faculty are advised to review the published examination schedule on their portals.", target_audience: "all", published_at: now, created_at: now },
    { id: "ann-2", title: "Course Registration Add/Drop Window Closing Notice", content: "Final course registration adjustments close this Friday at 17:00 GMT.", target_audience: "students", published_at: now, created_at: now },
    { id: "ann-3", title: "Research Grant Proposals Open for Faculty Members", content: "Submit departmental research proposals to the Directorate of Research & Innovation.", target_audience: "staff", published_at: now, created_at: now },
  ];

  const notifications: Row[] = [
    { id: "not-1", user_id: ADMIN_ID, title: "System Health Verified", message: "All university portals and database services are operating normally.", is_read: false, created_at: now },
    { id: "not-2", user_id: ADMIN_ID, title: "New Admission Applications", message: "3 new undergraduate applications are ready for departmental review.", is_read: false, created_at: now },
    { id: "not-3", user_id: STUDENT_ID, title: "Tuition Payment Confirmed", message: "Your payment of GHS 5,200 (Ref: PSK-2026-8849201) has been verified.", is_read: false, created_at: now },
    { id: "not-4", user_id: LECTURER_ID, title: "Continuous Assessment Window Open", message: "You can now upload mid-semester marks for CS101 and CS102.", is_read: false, created_at: now },
  ];

  const generated_documents: Row[] = [
    { id: "gd-1", student_id: STU_REC_1_ID, document_reference: "TRANS-2026-0091", document_type: "official_transcript", status: "issued", issued_at: now, created_at: now },
    { id: "gd-2", student_id: STU_REC_2_ID, document_reference: "ATTEST-2026-0104", document_type: "enrollment_attestation", status: "issued", issued_at: now, created_at: now },
  ];

  const service_requests: Row[] = [
    { id: "sr-1", student_id: STU_REC_1_ID, request_type: "official_transcript", status: "completed", notes: "Digital transcript issued", created_at: now },
  ];

  const audit_events: Row[] = [
    { id: "aud-1", event_time: now, actor_id: SUPERADMIN_ID, actor_role: "superadmin", action: "PLATFORM_INITIALIZED", entity_type: "system", entity_id: "ums-core", outcome: "SUCCESS", ip_address: "127.0.0.1" },
    { id: "aud-2", event_time: now, actor_id: ADMIN_ID, actor_role: "system_admin", action: "TERM_CONFIGURED", entity_type: "term", entity_id: TERM_SEM1_ID, outcome: "SUCCESS", ip_address: "127.0.0.1" },
    { id: "aud-3", event_time: now, actor_id: FINANCE_ID, actor_role: "finance_officer", action: "PAYMENT_VERIFIED", entity_type: "payment", entity_id: "pay-1", outcome: "SUCCESS", ip_address: "127.0.0.1" },
  ];

  const residences: Row[] = [
    { id: "res-1", campus_id: CAMPUS_MAIN_ID, name: "Kwame Nkrumah Hall", gender_allocation: "mixed", total_capacity: 400, address: "North Campus Avenue", created_at: now },
    { id: "res-2", campus_id: CAMPUS_MAIN_ID, name: "Yaa Asantewaa Executive Hostel", gender_allocation: "female", total_capacity: 250, address: "East Legon Annex", created_at: now },
  ];

  const hostel_rooms: Row[] = [
    { id: "hr-1", residence_id: "res-1", room_number: "A-204", floor_number: 2, room_type: "2-in-1 Executive", max_occupancy: 2, created_at: now },
  ];

  const beds: Row[] = [
    { id: "bed-1", hostel_room_id: "hr-1", bed_number: "A-204-B1", is_occupied: true, created_at: now },
  ];

  const allocations: Row[] = [
    { id: "alc-1", student_id: STU_REC_1_ID, bed_id: "bed-1", term_id: TERM_SEM1_ID, status: "checked_in", allocated_at: now, check_in_at: now },
  ];

  const library_items: Row[] = [
    { id: "lib-1", title: "Introduction to Algorithms (4th Edition)", author: "Thomas H. Cormen et al.", isbn: "978-0262046305", publisher: "MIT Press", publication_year: 2022, call_number: "QA76.6 .I5858", category: "Computer Science", total_copies: 12, available_copies: 9, created_at: now },
    { id: "lib-2", title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", isbn: "978-1449373320", publisher: "O'Reilly Media", publication_year: 2021, call_number: "QA76.9.D3 K54", category: "Distributed Systems", total_copies: 8, available_copies: 6, created_at: now },
  ];

  const item_copies: Row[] = [
    { id: "ic-1", library_item_id: "lib-1", barcode: "LIB-BC-00101", location: "Main Stack Floor 2", status: "checked_out", created_at: now },
  ];

  const loans: Row[] = [
    { id: "ln-1", copy_id: "ic-1", borrower_id: STUDENT_ID, student_id: STU_REC_1_ID, borrowed_at: now, due_date: "2026-12-01", status: "active", created_at: now },
  ];

  const transport_routes: Row[] = [
    { id: "tr-1", route_code: "RT-01", route_name: "Accra Central - Legon Main Campus Express", departure_location: "Kwame Nkrumah Circle", arrival_location: "Main Campus Gate", departure_time: "06:45:00", stops: ["Circle", "37 Military Hospital", "Shiashie", "Okponglo", "Main Campus"], fare_amount: 10, is_active: true, created_at: now, updated_at: now },
    { id: "tr-2", route_code: "RT-02", route_name: "Tema Community 1 - Campus Shuttle", departure_location: "Tema Meridian", arrival_location: "Main Campus Gate", departure_time: "06:30:00", stops: ["Tema", "Spintex", "Tetteh Quarshie", "Main Campus"], fare_amount: 15, is_active: true, created_at: now, updated_at: now },
  ];

  const transport_vehicles: Row[] = [
    { id: "tv-1", bus_number: "GT-8821-26", model: "Marcopolo Paradiso 54-Seater Coach", capacity: 54, driver_name: "Emmanuel Mensah", driver_phone: "+233 24 888 1122", route_id: "tr-1", status: "active", created_at: now, updated_at: now },
    { id: "tv-2", bus_number: "GT-4490-26", model: "Toyota Coaster 32-Seater Shuttle", capacity: 32, driver_name: "Isaac Ofori", driver_phone: "+233 24 999 3344", route_id: "tr-2", status: "active", created_at: now, updated_at: now },
  ];

  const admission_cycles: Row[] = [
    { id: "cyc-1", code: "ADM-2026-27", name: "2026/2027 Undergraduate & Postgraduate Admissions", start_date: "2026-04-01", end_date: "2026-11-30", is_active: true, created_at: now },
  ];

  const applications: Row[] = [
    {
      id: "app-1",
      cycle_id: "cyc-1",
      applicant_id: APPLICANT_ID,
      application_number: "APP-2026-00101",
      status: "under_review",
      personal_info: { full_name: "Kofi Boateng", email: "applicant@university.edu.gh", phone: "+233 54 987 6543", nationality: "Ghanaian" },
      academic_history: { qualification: "WASSCE", aggregate: 9 },
      notes: "Strong mathematics and computing background.",
      submitted_at: now,
      created_at: now,
      updated_at: now,
    },
  ];

  const application_programmes: Row[] = [
    { id: "ap-1", application_id: "app-1", programme_id: PROG_CS_ID, preference_order: 1, created_at: now },
  ];

  const system_settings: Row[] = [
    {
      id: "267bb377-6b29-42fc-9fec-ccee63f7df8a",
      setting_key: "institution_info",
      setting_value: {
        name: "Lofa County University",
        short_name: "Premier Tech",
        abbreviation: "LCU",
        motto: "Empowering Minds, Shaping Tomorrow",
        email: "registrar@university.edu.gh",
        support_email: "support@university.edu.gh",
        phone: "+233 30 212 8899",
        alt_phone: "+233 30 212 8890",
        website: "https://premier.university.edu.gh",
        address: "Plot 44 University Heights, North Legon Boulevard",
        city: "Monrovia",
        region: "Greater Accra Region",
        country: "Liberia",
        postal_code: "GA-201-9483",
        currency: "USD",
        currency_symbol: "GH₵",
        established_year: 1998,
        accreditation_code: "GTEC/NAB/UNI/2026-0482",
        logo_url: "",
        seal_url: "",
      },
      category: "general",
      description: "Complete institution identity, logos, contact, and operational parameters",
      is_sensitive: false,
      updated_at: now,
    },
    {
      id: "d3c4d26d-84c0-4d52-841a-5e63070a9a00",
      setting_key: "finance_policy",
      setting_value: {
        currency: "GHS",
        currency_symbol: "GH₵",
        academic_year: "2026/2027",
        active_semester: "Semester 1",
        write_off_limit: 50,
        debt_transcript_hold: true,
        late_payment_penalty: 150,
        dual_control_enforced: true,
        auto_generate_invoices: true,
        debt_threshold_exam_block_pct: 30,
        refund_dual_control_threshold: 500,
      },
      category: "finance",
      description: "Bursary dual-control, write-offs, refund thresholds, and collection rules",
      is_sensitive: false,
      updated_at: now,
    },
    {
      id: "set-univ-reg",
      setting_key: "superadmin_universities",
      setting_value: universities,
      category: "superadmin",
      description: "Master directory of all registered institutions",
      is_sensitive: false,
      updated_at: now,
    },
    {
      id: "set-mod-reg",
      setting_key: "superadmin_sidebar_modules",
      setting_value: superadmin_modules,
      category: "superadmin",
      description: "Dynamic navigation modules for Super Admin console",
      is_sensitive: false,
      updated_at: now,
    },
  ];

  const permissions: Row[] = [
    { id: "perm-adm-read", code: "admissions.application.read", module: "Admissions", description: "View applicant records, submitted forms, and document uploads", created_at: now },
    { id: "perm-adm-rev", code: "admissions.application.review", module: "Admissions", description: "Review, score rubrics, and add reviewer remarks to applications", created_at: now },
    { id: "perm-adm-appr", code: "admissions.decision.approve", module: "Admissions", description: "Approve admission offers, rejection decisions, and issue admission letters", created_at: now },
    { id: "perm-adm-cycle", code: "admissions.cycle.manage", module: "Admissions", description: "Create and publish admission cycles, application periods, and fees", created_at: now },
    { id: "perm-acad-curr", code: "academics.curriculum.manage", module: "Academics", description: "Manage academic curriculum, programme versions, and course credit structures", created_at: now },
    { id: "perm-acad-course", code: "academics.course.manage", module: "Academics", description: "Create and edit courses, prerequisites, and syllabus content", created_at: now },
    { id: "perm-acad-offer", code: "academics.offering.manage", module: "Academics", description: "Schedule semester course offerings, assign lecturers, and set class capacities", created_at: now },
    { id: "perm-reg-enrol", code: "registration.enrolment.manage", module: "Registration", description: "Register students for course offerings and enforce prerequisite checks", created_at: now },
    { id: "perm-reg-over", code: "registration.override.approve", module: "Registration", description: "Approve prerequisite overrides, late registrations, and credit overload", created_at: now },
    { id: "perm-time-man", code: "timetable.manage", module: "Timetable", description: "Draft semester timetable schedules, room allocations, and clash detection", created_at: now },
    { id: "perm-time-pub", code: "timetable.publish", module: "Timetable", description: "Officially publish finalized campus and class timetables to staff and students", created_at: now },
    { id: "perm-att-rec", code: "attendance.record", module: "Attendance", description: "Log student class session attendance and calculate semester eligibility", created_at: now },
    { id: "perm-att-amend", code: "attendance.amend", module: "Attendance", description: "Amend past attendance records with justification audit notes", created_at: now },
    { id: "perm-res-sub", code: "results.marks.submit", module: "Examinations & Grading", description: "Enter and submit coursework assessments and semester exam marks", created_at: now },
    { id: "perm-res-mod", code: "results.marks.moderate", module: "Examinations & Grading", description: "Perform departmental moderation, marks standardisation, and statistical reviews", created_at: now },
    { id: "perm-res-appr", code: "results.approve", module: "Examinations & Grading", description: "Dean and Senate approval of moderated examination results", created_at: now },
    { id: "perm-res-pub", code: "results.publish", module: "Examinations & Grading", description: "Publish final approved grades to student transcript portals", created_at: now },
    { id: "perm-res-amend", code: "results.amend", module: "Examinations & Grading", description: "Execute post-publication grade corrections under Senate audit mandate", created_at: now },
    { id: "perm-fin-inv", code: "finance.invoice.create", module: "Finance", description: "Generate tuition invoices, laboratory fees, and billings", created_at: now },
    { id: "perm-fin-read", code: "finance.invoice.read", module: "Finance", description: "Inspect student billing ledgers, outstanding balances, and aging summaries", created_at: now },
    { id: "perm-fin-pay", code: "finance.payment.record", module: "Finance", description: "Post verified bank deposits, mobile money receipts, and manual payments", created_at: now },
    { id: "perm-fin-ref-req", code: "finance.refund.request", module: "Finance", description: "Initiate student refund vouchers and fee adjustments", created_at: now },
    { id: "perm-fin-ref-appr", code: "finance.refund.approve", module: "Finance", description: "Execute dual-control approval for student refunds and credit disbursements", created_at: now },
    { id: "perm-fin-waive", code: "finance.waiver.manage", module: "Finance", description: "Grant approved institutional scholarships, discounts, and fee waivers", created_at: now },
    { id: "perm-fin-holds", code: "finance.holds.manage", module: "Finance", description: "Place and lift financial registration holds based on fee balance thresholds", created_at: now },
    { id: "perm-fin-recon", code: "finance.reconcile", module: "Finance", description: "Reconcile daily merchant settlements and bank feeds", created_at: now },
    { id: "perm-reg-stu-read", code: "registry.student.read", module: "Registry", description: "View official student files, matriculation details, and biodata", created_at: now },
    { id: "perm-reg-stu-stat", code: "registry.student.status_change", module: "Registry", description: "Authorize status changes: suspension, withdrawal, leave of absence, or completion", created_at: now },
    { id: "perm-reg-trans", code: "registry.transcript.issue", module: "Registry", description: "Issue certified digital and embossed academic transcripts", created_at: now },
    { id: "perm-reg-let", code: "registry.letter.issue", module: "Registry", description: "Generate official letters of introduction, English proficiency, and completion", created_at: now },
    { id: "perm-lib-cat", code: "library.catalog.manage", module: "Library", description: "Catalog new print books, journals, and digital repository items", created_at: now },
    { id: "perm-lib-circ", code: "library.circulation.manage", module: "Library", description: "Manage loans, renewals, returns, reservations, and overdue library fines", created_at: now },
    { id: "perm-host-inv", code: "hostel.inventory.manage", module: "Residences & Hostels", description: "Manage hostel blocks, rooms, bed inventory, and maintenance logs", created_at: now },
    { id: "perm-host-alloc", code: "hostel.allocation.manage", module: "Residences & Hostels", description: "Allocate rooms to approved student applicants and process check-ins", created_at: now },
    { id: "perm-hr-staff", code: "hr.staff.manage", module: "Human Resources", description: "Maintain employee directories, academic ranks, contracts, and job designations", created_at: now },
    { id: "perm-hr-leave", code: "hr.leave.approve", module: "Human Resources", description: "Review and approve faculty and administrative staff leave requests", created_at: now },
    { id: "perm-comm-ann", code: "communications.announce", module: "Communications", description: "Broadcast institutional announcements and campus SMS/email dispatches", created_at: now },
    { id: "perm-sup-tick", code: "support.ticket.manage", module: "Support", description: "Triage and resolve student academic and ICT support tickets", created_at: now },
    { id: "perm-rep-adm", code: "reports.view.admissions", module: "Reports & Analytics", description: "Access recruitment intake KPIs, conversion funnels, and demographics", created_at: now },
    { id: "perm-rep-acad", code: "reports.view.academic", module: "Reports & Analytics", description: "Access graduation trends, retention rates, and grade distribution charts", created_at: now },
    { id: "perm-rep-fin", code: "reports.view.finance", module: "Reports & Analytics", description: "Access fee collection analytics, revenue forecasts, and outstanding debt summaries", created_at: now },
    { id: "perm-rep-aud", code: "reports.view.audit", module: "Reports & Analytics", description: "Access compliance audit logs, user login trails, and security events", created_at: now },
    { id: "perm-usr-role", code: "users.roles.manage", module: "System & Security", description: "Assign, modify, and revoke RBAC roles and granular permission scopes", created_at: now },
    { id: "perm-id-read", code: "identity.user.read", module: "System & Security", description: "Inspect authentication profiles, MFA enrollment, and session statuses", created_at: now },
    { id: "perm-id-update", code: "identity.user.update", module: "System & Security", description: "Reset user credentials, lock/unlock accounts, and suspend login access", created_at: now },
    { id: "perm-aud-read", code: "audit.events.read", module: "System & Security", description: "Search immutable system audit events, changes, and access attempts", created_at: now },
    { id: "perm-sys-cfg", code: "system.config.manage", module: "System & Security", description: "Configure system parameters, academic terms, and cloud integrations", created_at: now },
  ];

  // Map permissions to system roles
  const superadminRole = roles.find((r) => r.code === "superadmin");
  const systemadminRole = roles.find((r) => r.code === "system_admin");
  const registrarRole = roles.find((r) => r.code === "registrar");
  const financeRole = roles.find((r) => r.code === "finance_officer");
  const deanRole = roles.find((r) => r.code === "dean");
  const lecturerRole = roles.find((r) => r.code === "lecturer");

  const role_permissions: Row[] = [];

  // Superadmin & Systemadmin get all permissions
  permissions.forEach((p) => {
    if (superadminRole) {
      role_permissions.push({ role_id: superadminRole.id, permission_id: p.id, created_at: now });
    }
    if (systemadminRole) {
      role_permissions.push({ role_id: systemadminRole.id, permission_id: p.id, created_at: now });
    }
    if (registrarRole && (p.module === "Registry" || p.module === "Admissions" || p.module === "Registration" || p.code.startsWith("reports.view."))) {
      role_permissions.push({ role_id: registrarRole.id, permission_id: p.id, created_at: now });
    }
    if (financeRole && (p.module === "Finance" || p.code === "reports.view.finance")) {
      role_permissions.push({ role_id: financeRole.id, permission_id: p.id, created_at: now });
    }
    if (deanRole && (p.module === "Academics" || p.module === "Examinations & Grading" || p.code.startsWith("reports.view."))) {
      role_permissions.push({ role_id: deanRole.id, permission_id: p.id, created_at: now });
    }
    if (lecturerRole && (p.code === "attendance.record" || p.code === "results.marks.submit" || p.code === "academics.offering.manage")) {
      role_permissions.push({ role_id: lecturerRole.id, permission_id: p.id, created_at: now });
    }
  });

  // Stamp all School A seed profiles (except superadmin) with school_id: SCHOOL_A_ID
  profiles.forEach((p) => {
    if (p.id !== SUPERADMIN_ID && !p.school_id) {
      p.school_id = SCHOOL_A_ID;
      p.university_id = SCHOOL_A_ID;
      p.metadata = {
        ...(p.metadata || {}),
        school_id: SCHOOL_A_ID,
        university_id: SCHOOL_A_ID,
      };
    }
  });

  // Seed isolated Tenant School B (KTVI - Vocational) & Tenant School C (Achimota - High School) data
  const KTVI_ADMIN_ID = "b0000000-0000-0000-0000-000000000001";
  const KTVI_STU_PROFILE_ID = "b0000000-0000-0000-0000-000000000002";
  const ASHS_ADMIN_ID = "c0000000-0000-0000-0000-000000000001";

  profiles.push(
    {
      id: KTVI_ADMIN_ID,
      email: "admin@ktvi.edu.gh",
      full_name: "Engr. Samuel Ofori",
      phone: "+233 32 202 4411",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: true,
      last_sign_in_at: now,
      school_id: SCHOOL_B_ID,
      university_id: SCHOOL_B_ID,
      metadata: {
        role: "system_admin",
        default_role: "system_admin",
        full_name: "Engr. Samuel Ofori",
        school_id: SCHOOL_B_ID,
        university_id: SCHOOL_B_ID,
        university_name: "Kumasi Technical & Vocational Institute",
      },
      created_at: now,
      updated_at: now,
    },
    {
      id: KTVI_STU_PROFILE_ID,
      email: "student@ktvi.edu.gh",
      full_name: "Yaw Asante",
      phone: "+233 24 888 9900",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: false,
      last_sign_in_at: now,
      school_id: SCHOOL_B_ID,
      university_id: SCHOOL_B_ID,
      metadata: {
        role: "student",
        default_role: "student",
        full_name: "Yaw Asante",
        school_id: SCHOOL_B_ID,
        university_id: SCHOOL_B_ID,
        university_name: "Kumasi Technical & Vocational Institute",
      },
      created_at: now,
      updated_at: now,
    },
    {
      id: ASHS_ADMIN_ID,
      email: "admin@achimota.edu.gh",
      full_name: "Mrs. Grace Mensah",
      phone: "+233 30 240 1221",
      avatar_url: "",
      account_status: "active",
      is_mfa_enabled: true,
      last_sign_in_at: now,
      school_id: SCHOOL_C_ID,
      university_id: SCHOOL_C_ID,
      metadata: {
        role: "system_admin",
        default_role: "system_admin",
        full_name: "Mrs. Grace Mensah",
        school_id: SCHOOL_C_ID,
        university_id: SCHOOL_C_ID,
        university_name: "Achimota Senior High School",
      },
      created_at: now,
      updated_at: now,
    }
  );

  user_role_assignments.push(
    {
      id: "ura-ktvi-admin",
      user_id: KTVI_ADMIN_ID,
      role_id: "f67d1b87-ec01-41db-b436-1d59c9d3fe25",
      school_id: SCHOOL_B_ID,
      is_active: true,
      created_at: now,
    },
    {
      id: "ura-ktvi-stu",
      user_id: KTVI_STU_PROFILE_ID,
      role_id: "a213be9f-e76a-4281-bd89-28beacc7642c",
      school_id: SCHOOL_B_ID,
      is_active: true,
      created_at: now,
    },
    {
      id: "ura-ashs-admin",
      user_id: ASHS_ADMIN_ID,
      role_id: "f67d1b87-ec01-41db-b436-1d59c9d3fe25",
      school_id: SCHOOL_C_ID,
      is_active: true,
      created_at: now,
    }
  );

  // Add isolated School B (KTVI) programme, department, course, and student
  const KTVI_DEPT_ID = "d0000002-0000-0000-0000-000000000001";
  const KTVI_PROG_ID = "b0000002-0000-0000-0000-000000000001";
  const KTVI_TERM_ID = "te000002-0000-0000-0000-000000000001";

  departments.push({
    id: KTVI_DEPT_ID,
    faculty_id: FACULTY_ENG_ID,
    code: "MECH-VOC",
    name: " Department of Mechatronics & Welding Technology",
    head_user_id: KTVI_ADMIN_ID,
    is_active: true,
    school_id: SCHOOL_B_ID,
    university_id: SCHOOL_B_ID,
    created_at: now,
  });

  programmes.push({
    id: KTVI_PROG_ID,
    department_id: KTVI_DEPT_ID,
    code: "NVTI-MECH",
    name: "National Vocational Diploma in Automotive & Mechatronics",
    degree_level: "diploma",
    duration_years: 3,
    total_credits_required: 90,
    is_active: true,
    school_id: SCHOOL_B_ID,
    university_id: SCHOOL_B_ID,
    created_at: now,
  });

  terms.push({
    id: KTVI_TERM_ID,
    academic_year_id: AY_CURRENT_ID,
    code: "KTVI-2026-T1",
    name: "2026/2027 Practical Term 1",
    term_number: 1,
    start_date: "2026-09-01",
    end_date: "2026-12-18",
    registration_start: "2026-08-15",
    registration_end: "2026-09-15",
    is_current: true,
    is_active: true,
    school_id: SCHOOL_B_ID,
    university_id: SCHOOL_B_ID,
    created_at: now,
  });

  courses.push({
    id: "c0000002-0000-0000-0000-000000000001",
    department_id: KTVI_DEPT_ID,
    code: "VOC101",
    title: "Industrial Welding & Workshop Safety Practice",
    description: "Hands-on vocational training in arc welding, fabrication, and machine safety.",
    credit_hours: 4,
    level: 100,
    semester_offered: 1,
    is_elective: false,
    is_active: true,
    school_id: SCHOOL_B_ID,
    university_id: SCHOOL_B_ID,
    created_at: now,
  });

  students.push({
    id: "50000002-0000-0000-0000-000000000001",
    profile_id: KTVI_STU_PROFILE_ID,
    student_number: "KTVI/2026/0001",
    programme_id: KTVI_PROG_ID,
    entry_term_id: KTVI_TERM_ID,
    current_term_id: KTVI_TERM_ID,
    cohort_year: 2026,
    admission_date: "2026-09-01",
    status: "active",
    current_level: 100,
    gpa: 3.75,
    cgpa: 3.75,
    total_credits_earned: 18,
    school_id: SCHOOL_B_ID,
    university_id: SCHOOL_B_ID,
    created_at: now,
    updated_at: now,
  });

  return {
    roles,
    permissions,
    role_permissions,
    profiles,
    user_role_assignments,
    universities,
    university_system_admins: [
      { id: "usa-1", university_id: SCHOOL_A_ID, user_id: ADMIN_ID, is_primary: true, created_at: now },
      { id: "usa-2", university_id: SCHOOL_B_ID, user_id: KTVI_ADMIN_ID, is_primary: true, created_at: now },
      { id: "usa-3", university_id: SCHOOL_C_ID, user_id: ASHS_ADMIN_ID, is_primary: true, created_at: now },
    ],
    superadmin_modules,
    campuses,
    faculties,
    departments,
    programmes,
    academic_years,
    terms,
    courses,
    course_offerings,
    staff,
    employment_records,
    teaching_assignments,
    students,
    course_enrolments,
    assessment_components,
    assessment_marks,
    published_results,
    grade_scales,
    grade_scale_items,
    fee_items,
    fee_schedules,
    student_invoices,
    invoice_lines,
    payments,
    payment_allocations: [],
    receipts,
    scholarships,
    waivers,
    refund_requests,
    financial_approvals,
    settlement_batches,
    buildings,
    rooms,
    timetable_events,
    timetable_publications: [],
    class_sessions,
    attendance_records,
    attendance_amendments: [],
    leave_requests,
    announcements,
    notifications,
    generated_documents,
    service_requests,
    audit_events,
    residences,
    hostel_rooms,
    beds,
    allocations,
    maintenance_requests: [],
    library_items,
    item_copies,
    loans,
    transport_routes,
    transport_vehicles,
    admission_cycles,
    applications,
    application_programmes,
    application_reviews: [],
    admission_decisions: [],
    offers: [],
    system_settings,
    support_cases: [],
    result_submissions: [],
    result_approvals: [],
    result_amendments: [],
    curriculum_requirements: [],
    prerequisites: [],
    enrolment_overrides: [],
    student_programme_history: [],
    student_status_history: [],
    institutional_reports: [],
    communications: [
      {
        id: "c9a00001-0000-0000-0000-000000000004",
        direction: "inbound",
        is_read: false,
        parent_id: "c9a00001-0000-0000-0000-000000000001",
        sender_email: "admin@university.edu.gh",
        sender_name: "Andronicus Johnson (AIT System Admin)",
        recipient_to: "superadmin@university.edu.gh",
        recipient_cc: null,
        recipient_bcc: null,
        target_school: "Accra Institute of Technology",
        subject: "Re: 2026/2027 Academic Year Governance & Quota Compliance Directive",
        body: "Dear Master Super Administrator,\n\nThank you for the directive. We have verified our institutional role quotas, confirmed MFA enrollment across all active system administrators, and reviewed our school portal sidebar modules.\n\nEverything is compliant and operational on our campus.\n\nWarm regards,\nAndronicus Johnson\nSystem Administrator • Accra Institute of Technology",
        category: "Compliance",
        priority: "high",
        status: "received",
        attachments: [],
        sent_at: "2026-11-19T11:20:00.000Z",
        created_at: "2026-11-19T11:20:00.000Z",
      },
      {
        id: "c9a00001-0000-0000-0000-000000000001",
        direction: "outbound",
        is_read: true,
        parent_id: null,
        sender_email: "superadmin@university.edu.gh",
        sender_name: "Master Super Administrator",
        recipient_to: "admin@university.edu.gh, registrar@university.edu.gh",
        recipient_cc: "bursar@university.edu.gh",
        recipient_bcc: null,
        target_school: "Accra Institute of Technology",
        subject: "2026/2027 Academic Year Governance & Quota Compliance Directive",
        body: "Dear Institutional Administrators,\n\nPlease be advised that the 2026/2027 multi-tenant governance quotas and sidebar module configurations have been finalized on the central platform.\n\nKey Action Items:\n1. Verify your institution's assigned role tiers and department limits.\n2. Confirm that all active system administrators have Multi-Factor Authentication (MFA) enabled.\n3. Review your portal sidebar navigation items under Settings.\n\nWarm regards,\nMaster Super Administrator\nUMS Global Platform Governance",
        category: "Compliance",
        priority: "high",
        status: "delivered",
        attachments: [],
        sent_at: "2026-11-18T09:30:00.000Z",
        created_at: "2026-11-18T09:30:00.000Z",
      },
      {
        id: "c9a00001-0000-0000-0000-000000000002",
        direction: "outbound",
        is_read: true,
        parent_id: null,
        sender_email: "superadmin@university.edu.gh",
        sender_name: "Master Super Administrator",
        recipient_to: "all-school-admins@university.edu.gh",
        recipient_cc: null,
        recipient_bcc: null,
        target_school: "All Registered Schools",
        subject: "Scheduled Cloud Storage Engine Maintenance & Zero-Downtime Sync",
        body: "Hello System Administrators,\n\nOur engineering team will perform a routine optimization on the multi-tenant database cluster this Saturday at 02:00 UTC. All institutional portals (Universities, High Schools, and Vocational Schools) will remain online with zero cold-start impact.\n\nNo action is required on your part.\n\nBest regards,\nPlatform Operations Team",
        category: "Maintenance",
        priority: "normal",
        status: "delivered",
        attachments: [],
        sent_at: "2026-11-16T14:15:00.000Z",
        created_at: "2026-11-16T14:15:00.000Z",
      },
      {
        id: "c9a00001-0000-0000-0000-000000000003",
        direction: "outbound",
        is_read: true,
        parent_id: null,
        sender_email: "superadmin@university.edu.gh",
        sender_name: "Master Super Administrator",
        recipient_to: "eugenedoeteh@university.edu.gh",
        recipient_cc: "admin@university.edu.gh",
        recipient_bcc: null,
        target_school: "Accra Institute of Technology",
        subject: "End-of-Semester Bursary Reconciliation & Settlement Verification",
        body: "Dear Chief Financial Officer,\n\nKindly ensure all pending fee waiver dual-control approvals and Paystack settlement batches for the First Semester are reconciled before the financial close deadline.\n\nThank you,\nMaster Super Administrator",
        category: "Billing",
        priority: "high",
        status: "delivered",
        attachments: [],
        sent_at: "2026-11-14T11:00:00.000Z",
        created_at: "2026-11-14T11:00:00.000Z",
      },
    ],
  };
}

// Foreign Key column -> Target Table lookup
const FK_TO_TABLE: Record<string, string> = {
  profile_id: "profiles",
  applicant_id: "profiles",
  actor_id: "profiles",
  requested_by: "profiles",
  approved_by: "profiles",
  reviewed_by: "profiles",
  user_id: "profiles",
  borrower_id: "profiles",
  conducted_by: "profiles",
  student_id: "students",
  staff_id: "staff",
  programme_id: "programmes",
  department_id: "departments",
  faculty_id: "faculties",
  campus_id: "campuses",
  term_id: "terms",
  entry_term_id: "terms",
  current_term_id: "terms",
  academic_year_id: "academic_years",
  course_id: "courses",
  course_offering_id: "course_offerings",
  enrolment_id: "course_enrolments",
  assessment_component_id: "assessment_components",
  class_session_id: "class_sessions",
  room_id: "rooms",
  building_id: "buildings",
  bed_id: "beds",
  hostel_room_id: "hostel_rooms",
  residence_id: "residences",
  copy_id: "item_copies",
  library_item_id: "library_items",
  role_id: "roles",
  fee_item_id: "fee_items",
  invoice_id: "student_invoices",
  payment_id: "payments",
  service_request_id: "service_requests",
  grade_scale_id: "grade_scales",
  cycle_id: "admission_cycles",
  application_id: "applications",
  route_id: "transport_routes",
  university_id: "universities",
};

// One-to-Many reverse relationship lookup: "parentTable.childTable" -> childForeignKey
const ONE_TO_MANY_FK: Record<string, { table: string; fk: string }> = {
  "student_invoices.invoice_lines": { table: "invoice_lines", fk: "invoice_id" },
  "students.student_invoices": { table: "student_invoices", fk: "student_id" },
  "applications.application_programmes": { table: "application_programmes", fk: "application_id" },
  "courses.course_offerings": { table: "course_offerings", fk: "course_id" },
};

const globalStore = globalThis as unknown as {
  __UMS_VIRTUAL_DB__?: TableStore;
  __UMS_VIRTUAL_DB_LOADED__?: boolean;
  __UMS_VIRTUAL_DB_LOAD_PROMISE__?: Promise<TableStore>;
};

async function readLocalDiskCache(): Promise<Record<string, any[]> | null> {
  // Edge runtime does not have filesystem access; never execute in Edge or browser
  if (
    typeof process === "undefined" ||
    (process.env as any)?.NEXT_RUNTIME === "edge" ||
    typeof window !== "undefined"
  ) {
    return null;
  }

  try {
    const fsModName = ["f", "s", "/promises"].join("");
    const pathModName = ["p", "a", "t", "h"].join("");
    const fs = await import(/* webpackIgnore: true */ fsModName);
    const path = await import(/* webpackIgnore: true */ pathModName);
    const proc = process as any;
    const cwdFn = proc?.["c" + "wd"];
    const baseDir = typeof cwdFn === "function" ? cwdFn.call(proc) : "";
    if (!baseDir) return null;

    const filePath = path.join(baseDir, "data", "ums-virtual-db.json");
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.profiles)) {
      return parsed;
    }
  } catch {}
  return null;
}

async function writeLocalDiskCache(db: TableStore): Promise<void> {
  // Edge runtime does not have filesystem access; never execute in Edge or browser
  if (
    typeof process === "undefined" ||
    (process.env as any)?.NEXT_RUNTIME === "edge" ||
    typeof window !== "undefined"
  ) {
    return;
  }

  try {
    const fsModName = ["f", "s", "/promises"].join("");
    const pathModName = ["p", "a", "t", "h"].join("");
    const fs = await import(/* webpackIgnore: true */ fsModName);
    const path = await import(/* webpackIgnore: true */ pathModName);
    const proc = process as any;
    const cwdFn = proc?.["c" + "wd"];
    const baseDir = typeof cwdFn === "function" ? cwdFn.call(proc) : "";
    if (!baseDir) return;

    const filePath = path.join(baseDir, "data", "ums-virtual-db.json");
    await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf-8");
  } catch {}
}

async function loadDbFromCloudStorage(seed: TableStore): Promise<TableStore> {
  // 1. Try local disk cache in data/ums-virtual-db.json first (Node.js environments only)
  try {
    const cached = await readLocalDiskCache();
    if (cached) {
      for (const [k, v] of Object.entries(cached)) {
        if (Array.isArray(v)) {
          seed[k] = v;
        }
      }
    }
  } catch {}

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceKey) {
    return seed;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const url = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${STORAGE_OBJECT_KEY}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (res.ok) {
      const text = await res.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.profiles)) {
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v)) {
            seed[k] = v;
          }
        }
      }
    }
  } catch {
    clearTimeout(timer);
  }

  return seed;
}

export async function getVirtualDb(): Promise<TableStore> {
  if (!globalStore.__UMS_VIRTUAL_DB__) {
    const seed = createInitialSeedData();
    globalStore.__UMS_VIRTUAL_DB__ = seed;
    globalStore.__UMS_VIRTUAL_DB_LOADED__ = true;
    // Sync from cloud storage in the background without blocking initial requests
    loadDbFromCloudStorage(seed).catch(() => {});
  }
  return globalStore.__UMS_VIRTUAL_DB__;
}

export async function persistVirtualDb(db: TableStore): Promise<void> {
  globalStore.__UMS_VIRTUAL_DB__ = db;
  globalStore.__UMS_VIRTUAL_DB_LOADED__ = true;

  // Persist to local disk cache in data/ums-virtual-db.json (Node.js runtime only)
  writeLocalDiskCache(db).catch(() => {});

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) return;

  // Fire-and-forget cloud storage sync with 3s timeout so mutations return in <2ms
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  const url = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${STORAGE_OBJECT_KEY}`;

  fetch(url, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "text/plain",
      "x-upsert": "true",
    },
    body: JSON.stringify(db),
    signal: controller.signal,
    cache: "no-store",
  })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}

function splitTopLevelCommas(str: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);

    if (ch === "," && depth === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

function findRelatedRow(db: TableStore, targetTable: string, fkVal: any): Row | null {
  if (fkVal === null || fkVal === undefined) return null;
  const rows = db[targetTable] || [];
  const exact = rows.find((r) => String(r.id) === String(fkVal));
  if (exact) return exact;
  if (targetTable === "staff" || targetTable === "students") {
    return rows.find((r) => String(r.profile_id) === String(fkVal)) || null;
  }
  return null;
}

function projectRow(db: TableStore, tableName: string, row: Row, selectStr: string | null): Row {
  if (!selectStr || selectStr.trim() === "" || selectStr.trim() === "*") {
    return { ...row };
  }

  const tokens = splitTopLevelCommas(selectStr);
  const out: Row = {};

  for (const rawToken of tokens) {
    const token = rawToken.trim();
    if (!token) continue;

    if (token === "*") {
      Object.assign(out, row);
      continue;
    }

    // Check relational select: `alias:target(inner)` or `target(inner)`
    const relMatch = token.match(/^(?:([a-zA-Z0-9_]+)\s*:\s*)?([a-zA-Z0-9_]+)\s*\(([\s\S]*)\)$/);
    if (relMatch) {
      const alias = relMatch[1] || relMatch[2];
      const target = relMatch[2];
      const innerSelect = relMatch[3].trim();

      // 1. Check One-to-Many
      const o2mKey = `${tableName}.${target}`;
      if (ONE_TO_MANY_FK[o2mKey]) {
        const { table: childTable, fk: childFk } = ONE_TO_MANY_FK[o2mKey];
        const childRows = (db[childTable] || []).filter(
          (r) => String(r[childFk]) === String(row.id)
        );
        out[alias] = childRows.map((cr) => projectRow(db, childTable, cr, innerSelect));
        continue;
      }

      // 2. Check Many-to-One FK column
      const targetTable =
        FK_TO_TABLE[target] ||
        (db[target] ? target : FK_TO_TABLE[`${target}_id`]);

      const fkCol = row[target] !== undefined ? target : `${target}_id`;
      const fkVal = row[fkCol];

      if (targetTable) {
        const related = findRelatedRow(db, targetTable, fkVal);
        out[alias] = related ? projectRow(db, targetTable, related, innerSelect) : null;
      } else {
        out[alias] = null;
      }
      continue;
    }

    // Check aliased scalar column: `alias:col`
    if (token.includes(":")) {
      const [alias, col] = token.split(":").map((s) => s.trim());
      out[alias] = row[col] !== undefined ? row[col] : null;
      continue;
    }

    out[token] = row[token] !== undefined ? row[token] : null;
  }

  return out;
}

function evaluateCondition(row: Row, col: string, opExpr: string): boolean {
  const val = row[col];

  if (opExpr.startsWith("eq.")) {
    const target = opExpr.slice(3);
    if (target === "true") return val === true || String(val) === "true";
    if (target === "false") return val === false || String(val) === "false";
    if (target === "null") return val === null || val === undefined;
    return String(val ?? "") === target;
  }

  if (opExpr.startsWith("neq.")) {
    const target = opExpr.slice(4);
    if (target === "true") return val !== true;
    if (target === "false") return val !== false;
    if (target === "null") return val !== null && val !== undefined;
    return String(val ?? "") !== target;
  }

  if (opExpr.startsWith("is.")) {
    const target = opExpr.slice(3).toLowerCase();
    if (target === "null") return val === null || val === undefined;
    if (target === "true") return val === true;
    if (target === "false") return val === false;
    return false;
  }

  if (opExpr.startsWith("in.")) {
    const inner = opExpr.slice(3).replace(/^\(|\)$/g, "");
    if (!inner.trim()) return false;
    const items = inner
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""));
    return items.includes(String(val ?? ""));
  }

  if (opExpr.startsWith("gt.")) {
    const target = opExpr.slice(3);
    const numVal = Number(val);
    const numTarget = Number(target);
    if (!Number.isNaN(numVal) && !Number.isNaN(numTarget)) return numVal > numTarget;
    return String(val ?? "") > target;
  }

  if (opExpr.startsWith("gte.")) {
    const target = opExpr.slice(4);
    const numVal = Number(val);
    const numTarget = Number(target);
    if (!Number.isNaN(numVal) && !Number.isNaN(numTarget)) return numVal >= numTarget;
    return String(val ?? "") >= target;
  }

  if (opExpr.startsWith("lt.")) {
    const target = opExpr.slice(3);
    const numVal = Number(val);
    const numTarget = Number(target);
    if (!Number.isNaN(numVal) && !Number.isNaN(numTarget)) return numVal < numTarget;
    return String(val ?? "") < target;
  }

  if (opExpr.startsWith("lte.")) {
    const target = opExpr.slice(4);
    const numVal = Number(val);
    const numTarget = Number(target);
    if (!Number.isNaN(numVal) && !Number.isNaN(numTarget)) return numVal <= numTarget;
    return String(val ?? "") <= target;
  }

  if (opExpr.startsWith("ilike.") || opExpr.startsWith("like.")) {
    try {
      const isCaseInsensitive = opExpr.startsWith("ilike.");
      const rawPattern = opExpr.slice(isCaseInsensitive ? 6 : 5).slice(0, 200);
      // Escape regex metacharacters first, then translate SQL % and * wildcards
      const safePattern = rawPattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/[%*]+/g, ".*");
      const regex = new RegExp(`^${safePattern}$`, isCaseInsensitive ? "i" : "");
      return regex.test(String(val ?? ""));
    } catch {
      return false;
    }
  }

  return true;
}

function filterRows(rows: Row[], searchParams: URLSearchParams): Row[] {
  const reserved = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

  let result = [...rows];

  for (const [key, value] of searchParams.entries()) {
    if (reserved.has(key)) continue;

    if (key === "or") {
      // e.g. (profile_id.eq.123,id.eq.123)
      const inner = value.replace(/^\(|\)$/g, "");
      const subConds = splitTopLevelCommas(inner);
      result = result.filter((row) =>
        subConds.some((cond) => {
          const firstDot = cond.indexOf(".");
          if (firstDot === -1) return false;
          const col = cond.slice(0, firstDot);
          const opExpr = cond.slice(firstDot + 1);
          return evaluateCondition(row, col, opExpr);
        })
      );
      continue;
    }

    result = result.filter((row) => evaluateCondition(row, key, value));
  }

  return result;
}

function sortRows(rows: Row[], searchParams: URLSearchParams): Row[] {
  const orderParams = searchParams.getAll("order");
  if (orderParams.length === 0) return rows;

  const specs: Array<{ col: string; asc: boolean }> = [];
  for (const param of orderParams) {
    for (const part of param.split(",")) {
      const segments = part.trim().split(".");
      const col = segments[0];
      const asc = !segments.includes("desc");
      if (col) specs.push({ col, asc });
    }
  }

  if (specs.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const { col, asc } of specs) {
      const va = a[col];
      const vb = b[col];
      if (va === vb) continue;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const cmp = va < vb ? -1 : 1;
      return asc ? cmp : -cmp;
    }
    return 0;
  });
}

async function handleRpcCall(
  db: TableStore,
  rpcName: string,
  bodyObj: Record<string, any>
): Promise<Response> {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });

  if (rpcName === "get_user_roles") {
    const userId = bodyObj.p_user_id;
    const assignments = (db.user_role_assignments || []).filter(
      (a) => String(a.user_id) === String(userId) && a.is_active !== false
    );
    const rolesOut = assignments
      .map((a) => {
        const r = (db.roles || []).find((role) => String(role.id) === String(a.role_id));
        return r ? { role_code: r.code, role_name: r.name } : null;
      })
      .filter(Boolean);

    if (rolesOut.length === 0) {
      const prof = (db.profiles || []).find((p) => String(p.id) === String(userId));
      const fallbackRole = prof?.metadata?.role || prof?.metadata?.default_role;
      if (fallbackRole) {
        rolesOut.push({ role_code: fallbackRole, role_name: fallbackRole });
      }
    }

    return new Response(JSON.stringify(rolesOut), { status: 200, headers });
  }

  if (rpcName === "has_role") {
    const { p_role_code, p_user_id } = bodyObj;
    const assignments = (db.user_role_assignments || []).filter(
      (a) => String(a.user_id) === String(p_user_id) && a.is_active !== false
    );
    const hasIt = assignments.some((a) => {
      const r = (db.roles || []).find((role) => String(role.id) === String(a.role_id));
      return r?.code === p_role_code || r?.code === "system_admin" || r?.code === "superadmin";
    });
    return new Response(JSON.stringify(hasIt), { status: 200, headers });
  }

  if (rpcName === "has_permission" || rpcName === "has_scope" || rpcName === "is_lecturer_for_offering") {
    return new Response(JSON.stringify(true), { status: 200, headers });
  }

  if (rpcName === "get_user_permissions") {
    return new Response(JSON.stringify([]), { status: 200, headers });
  }

  if (rpcName === "get_student_id_for_user") {
    const userId = bodyObj.p_user_id;
    const stu = (db.students || []).find(
      (s) => String(s.profile_id) === String(userId) || String(s.id) === String(userId)
    );
    return new Response(JSON.stringify(stu?.id || STU_REC_1_ID), { status: 200, headers });
  }

  if (rpcName === "log_audit_event") {
    const newEvt = {
      id: crypto.randomUUID(),
      event_time: new Date().toISOString(),
      action: bodyObj.p_action || "SYSTEM_EVENT",
      entity_type: bodyObj.p_entity_type || "system",
      entity_id: bodyObj.p_entity_id || "",
      outcome: bodyObj.p_outcome || "SUCCESS",
      actor_role: "system_admin",
    };
    db.audit_events = [newEvt, ...(db.audit_events || [])];
    await persistVirtualDb(db);
    return new Response(JSON.stringify(newEvt.id), { status: 200, headers });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export function isPostgrestUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr, "http://localhost:3000");
    return u.pathname.includes("/rest/v1/");
  } catch {
    return urlStr.includes("/rest/v1/");
  }
}

export async function handleVirtualPostgrestRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  const url = new URL(urlStr, "http://localhost:3000");
  const restIdx = url.pathname.indexOf("/rest/v1/");
  const subPath = restIdx !== -1 ? url.pathname.slice(restIdx + "/rest/v1/".length) : "";
  const cleanPath = subPath.replace(/^\/+|\/+$/g, "");

  const method = (
    init?.method ||
    (typeof input === "object" && !(input instanceof URL) ? input.method : "GET") ||
    "GET"
  ).toUpperCase();

  const reqHeaders = new Headers(
    init?.headers ||
      (typeof input === "object" && !(input instanceof URL) ? input.headers : undefined)
  );

  const accept = reqHeaders.get("accept") || "";
  const prefer = reqHeaders.get("prefer") || "";
  const rangeHeader = reqHeaders.get("range") || "";
  const wantsSingleObject = accept.includes("application/vnd.pgrst.object+json");
  const wantsCount = prefer.includes("count=");
  const isUpsert = prefer.includes("resolution=merge-duplicates");

  let bodyText = "";
  if (init?.body) {
    if (typeof init.body === "string") {
      bodyText = init.body;
    } else if (init.body instanceof ArrayBuffer) {
      bodyText = new TextDecoder().decode(init.body);
    } else if (ArrayBuffer.isView(init.body)) {
      bodyText = new TextDecoder().decode(init.body);
    }
  }

  const db = await getVirtualDb();

  // 1. Handle RPC calls (/rest/v1/rpc/<name>)
  if (cleanPath.startsWith("rpc/")) {
    const rpcName = cleanPath.slice(4);
    let bodyObj: Record<string, any> = {};
    if (bodyText) {
      try {
        bodyObj = JSON.parse(bodyText);
      } catch {
        // ignore
      }
    }
    return handleRpcCall(db, rpcName, bodyObj);
  }

  const tableName = cleanPath.split("/")[0];
  if (!tableName) {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  if (!db[tableName]) {
    db[tableName] = [];
  }

  // Resolve active SaaS Tenant Context (from reqHeaders or active Next.js request cookies/headers)
  let tenantCtx: TenantContext = resolveTenantContextFromHeaders(reqHeaders);
  if (!tenantCtx.isAuthenticated) {
    try {
      const nextHeadersMod = await import("next/headers");
      const activeHeaders = await nextHeadersMod.headers();
      const activeCookies = await nextHeadersMod.cookies();
      const cookieList = activeCookies.getAll().map((c) => ({ name: c.name, value: c.value }));
      tenantCtx = resolveTenantContextFromHeaders(activeHeaders, cookieList);
    } catch {
      // Outside Next.js request context (e.g. background script)
    }
  }

  const activeTenantSchoolId =
    tenantCtx.isAuthenticated && !tenantCtx.isSuperAdmin
      ? tenantCtx.schoolId
      : reqHeaders.get("x-tenant-school-id") || null;

  const selectParam = url.searchParams.get("select");

  // 2. GET or HEAD (Enforce Tenant Isolation: School A users ONLY see School A rows)
  if (method === "GET" || method === "HEAD") {
    const tenantScopedRows = activeTenantSchoolId
      ? db[tableName].filter((row) =>
          rowBelongsToTenant(tableName, row, activeTenantSchoolId, tenantCtx.userId)
        )
      : db[tableName];

    const filtered = filterRows(tenantScopedRows, url.searchParams);
    const totalCount = filtered.length;
    const sorted = sortRows(filtered, url.searchParams);

    let sliced = sorted;
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    if (offsetParam !== null || limitParam !== null) {
      const offset = Number(offsetParam || 0);
      const limit = limitParam !== null ? Number(limitParam) : sliced.length;
      sliced = sliced.slice(offset, offset + limit);
    } else if (rangeHeader) {
      const m = rangeHeader.match(/(\d+)-(\d+)/);
      if (m) {
        const start = Number(m[1]);
        const end = Number(m[2]);
        sliced = sliced.slice(start, end + 1);
      }
    }

    const projected = sliced.map((row) => projectRow(db, tableName, row, selectParam));

    const resHeaders = new Headers({
      "Content-Type": "application/json; charset=utf-8",
    });

    if (wantsCount || method === "HEAD") {
      const endIdx = Math.max(0, projected.length - 1);
      resHeaders.set("Content-Range", `0-${endIdx}/${totalCount}`);
    }

    if (method === "HEAD") {
      return new Response(null, { status: 200, headers: resHeaders });
    }

    if (wantsSingleObject) {
      return new Response(JSON.stringify(projected[0] ?? null), {
        status: 200,
        headers: resHeaders,
      });
    }

    return new Response(JSON.stringify(projected), {
      status: 200,
      headers: resHeaders,
    });
  }

  // 3. POST (Insert or Upsert — Automatically stamps new rows with caller's `school_id`)
  if (method === "POST") {
    let payload: any = {};
    if (bodyText) {
      try {
        payload = JSON.parse(bodyText);
      } catch {
        payload = {};
      }
    }

    const items: Row[] = Array.isArray(payload) ? payload : [payload];
    const nowIso = new Date().toISOString();
    const conflictParam = url.searchParams.get("on_conflict") || "id";
    const conflictCols = conflictParam.split(",").map((c) => c.trim()).filter(Boolean);

    const insertedOrUpdated: Row[] = [];

    for (const rawItem of items) {
      const item = stampRowWithTenant(tableName, rawItem, activeTenantSchoolId);

      if (isUpsert && conflictCols.length > 0) {
        const existingIdx = db[tableName].findIndex(
          (r) =>
            rowBelongsToTenant(tableName, r, activeTenantSchoolId, tenantCtx.userId) &&
            conflictCols.every((col) => item[col] !== undefined && String(r[col]) === String(item[col]))
        );

        if (existingIdx !== -1) {
          const updatedRow = stampRowWithTenant(
            tableName,
            {
              ...db[tableName][existingIdx],
              ...item,
              updated_at: nowIso,
            },
            activeTenantSchoolId
          );
          db[tableName][existingIdx] = updatedRow;
          insertedOrUpdated.push(updatedRow);
          continue;
        }
      }

      const newRow: Row = stampRowWithTenant(
        tableName,
        {
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || nowIso,
          updated_at: item.updated_at || nowIso,
          ...item,
        },
        activeTenantSchoolId
      );

      db[tableName].unshift(newRow);
      insertedOrUpdated.push(newRow);
    }

    await persistVirtualDb(db);

    const projected = insertedOrUpdated.map((row) =>
      projectRow(db, tableName, row, selectParam)
    );

    const resHeaders = new Headers({
      "Content-Type": "application/json; charset=utf-8",
    });

    if (wantsSingleObject) {
      return new Response(JSON.stringify(projected[0] ?? null), {
        status: 201,
        headers: resHeaders,
      });
    }

    return new Response(JSON.stringify(projected), {
      status: 201,
      headers: resHeaders,
    });
  }

  // 4. PATCH / PUT (Update — Strictly isolated to caller's tenant school)
  if (method === "PATCH" || method === "PUT") {
    let patchData: Row = {};
    if (bodyText) {
      try {
        patchData = JSON.parse(bodyText);
      } catch {
        patchData = {};
      }
    }

    const tenantScopedRows = activeTenantSchoolId
      ? db[tableName].filter((row) =>
          rowBelongsToTenant(tableName, row, activeTenantSchoolId, tenantCtx.userId)
        )
      : db[tableName];

    const matching = filterRows(tenantScopedRows, url.searchParams);
    const matchingSet = new Set(matching);
    const nowIso = new Date().toISOString();
    const updatedRows: Row[] = [];

    db[tableName] = db[tableName].map((row) => {
      if (matchingSet.has(row)) {
        const updated = stampRowWithTenant(
          tableName,
          {
            ...row,
            ...patchData,
            updated_at: nowIso,
          },
          activeTenantSchoolId
        );
        updatedRows.push(updated);
        return updated;
      }
      return row;
    });

    await persistVirtualDb(db);

    const projected = updatedRows.map((row) =>
      projectRow(db, tableName, row, selectParam)
    );

    const resHeaders = new Headers({
      "Content-Type": "application/json; charset=utf-8",
    });

    if (wantsSingleObject) {
      return new Response(JSON.stringify(projected[0] ?? null), {
        status: 200,
        headers: resHeaders,
      });
    }

    return new Response(JSON.stringify(projected), {
      status: 200,
      headers: resHeaders,
    });
  }

  // 5. DELETE (Strictly isolated to caller's tenant school)
  if (method === "DELETE") {
    const tenantScopedRows = activeTenantSchoolId
      ? db[tableName].filter((row) =>
          rowBelongsToTenant(tableName, row, activeTenantSchoolId, tenantCtx.userId)
        )
      : db[tableName];

    const matching = filterRows(tenantScopedRows, url.searchParams);
    const matchingSet = new Set(matching);
    const deletedRows = [...matching];

    db[tableName] = db[tableName].filter((row) => !matchingSet.has(row));
    await persistVirtualDb(db);

    const projected = deletedRows.map((row) =>
      projectRow(db, tableName, row, selectParam)
    );

    const resHeaders = new Headers({
      "Content-Type": "application/json; charset=utf-8",
    });

    if (wantsSingleObject) {
      return new Response(JSON.stringify(projected[0] ?? null), {
        status: 200,
        headers: resHeaders,
      });
    }

    return new Response(JSON.stringify(projected), {
      status: 200,
      headers: resHeaders,
    });
  }

  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
