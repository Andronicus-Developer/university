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

const SUPERADMIN_ID = "1440ed7e-cb23-4248-a372-f38b20d01554";

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
  ];

  const user_role_assignments: Row[] = [
    { id: "ura-1", user_id: SUPERADMIN_ID, role_id: "9ff88ff1-e423-4ba4-8b98-f7473c98eaea", is_active: true, created_at: now },
  ];

  const universities: Row[] = [];

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
      module_key: "schools",
      label: "Schools & Campuses",
      category: "Core Administration",
      route_path: "/superadmin/schools",
      icon: "Building2",
      badge: "Tenants",
      description: "Register schools, configure multi-tenancy, and manage campuses",
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

  const campuses: Row[] = [];
  const faculties: Row[] = [];
  const departments: Row[] = [];
  const programmes: Row[] = [];
  const academic_years: Row[] = [];
  const terms: Row[] = [];
  const courses: Row[] = [];
  const course_offerings: Row[] = [];

  const staff: Row[] = [];
  const employment_records: Row[] = [];
  const teaching_assignments: Row[] = [];
  const students: Row[] = [];
  const course_enrolments: Row[] = [];

  const assessment_components: Row[] = [];
  const assessment_marks: Row[] = [];
  const published_results: Row[] = [];

  const grade_scales: Row[] = [];
  const grade_scale_items: Row[] = [];

  const fee_items: Row[] = [];
  const fee_schedules: Row[] = [];
  const student_invoices: Row[] = [];
  const invoice_lines: Row[] = [];
  const payments: Row[] = [];
  const receipts: Row[] = [];
  const scholarships: Row[] = [];
  const waivers: Row[] = [];
  const refund_requests: Row[] = [];
  const financial_approvals: Row[] = [];
  const settlement_batches: Row[] = [];

  const buildings: Row[] = [];
  const rooms: Row[] = [];

  const timetable_events: Row[] = [];
  const class_sessions: Row[] = [];
  const attendance_records: Row[] = [];
  const leave_requests: Row[] = [];
  const announcements: Row[] = [];
  const notifications: Row[] = [];
  const generated_documents: Row[] = [];
  const service_requests: Row[] = [];

  const audit_events: Row[] = [
    { id: "aud-1", event_time: now, actor_id: SUPERADMIN_ID, actor_role: "superadmin", action: "PLATFORM_INITIALIZED", entity_type: "system", entity_id: "ums-core", outcome: "SUCCESS", ip_address: "127.0.0.1" },
  ];

  const residences: Row[] = [];
  const hostel_rooms: Row[] = [];
  const beds: Row[] = [];
  const allocations: Row[] = [];

  const library_items: Row[] = [];
  const item_copies: Row[] = [];
  const loans: Row[] = [];

  const transport_routes: Row[] = [];
  const transport_vehicles: Row[] = [];

  const admission_cycles: Row[] = [];
  const applications: Row[] = [];
  const application_programmes: Row[] = [];

  const system_settings: Row[] = [
    {
      id: "267bb377-6b29-42fc-9fec-ccee63f7df8a",
      setting_key: "institution_info",
      setting_value: {
        name: "",
        short_name: "",
        abbreviation: "",
        motto: "",
        email: "",
        support_email: "",
        phone: "",
        alt_phone: "",
        website: "",
        address: "",
        city: "",
        region: "",
        country: "",
        postal_code: "",
        currency: "USD",
        currency_symbol: "$",
        established_year: 2026,
        accreditation_code: "",
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

  return {
    roles,
    permissions,
    role_permissions,
    profiles,
    user_role_assignments,
    universities,
    university_system_admins: [],
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
    communications: [],
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
    return new Response(JSON.stringify(stu?.id || null), { status: 200, headers });
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
