# University Management System (UMS) - Supabase Database, Auth & RBAC Architecture

This repository contains the complete database implementation, Supabase Auth integration, user RBAC (Role-Based Access Control) system, storage bucket configurations, and Row Level Security (RLS) policies for the University Management System.

---

## 1. Architecture Overview

### 1.0 System Administrator Default Login Details
The database migration [`20261029000009_seed_system_admin_user.sql`](migrations/20261029000009_seed_system_admin_user.sql) and `seed.sql` automatically seed the default system administrator account with full privileges:

- **Email:** `admin@university.edu.gh`
- **Password:** `Admin@123456`
- **Assigned Role:** `system_admin` (System Administrator)
- **Permissions:** Full access to all 80+ permissions across all modules
- **Authorized Dashboard:** `/admin/dashboard`

On the login page, you can type these credentials or click the **"Quick Fill"** button to populate them instantly.

### 1.1 Supabase Auth & Profile Lifecycle
1. When a user registers or is invited via Supabase Auth (`auth.users`), the trigger `on_auth_user_created` fires `public.handle_new_user()`.
2. It automatically creates an authoritative profile in `public.profiles` (`id`, `email`, `full_name`, `phone`, `account_status`, `avatar_url`, `metadata`).
3. It assigns the baseline `applicant` role (or role specified in metadata) in `public.user_role_assignments`.
4. When an applicant is admitted and registers, `convert_applicant_to_student()` converts the record to a permanent student profile, creates the authoritative `public.students` record, and assigns the `student` role.

### 1.2 User Roles (17 Distinct Roles from Spec Section 4)
| Role Code | Role Name | Scope & Responsibilities |
| :--- | :--- | :--- |
| `system_admin` | System Administrator | Configuration, technical health, user RBAC administration, system integrations |
| `vice_chancellor` | Vice-Chancellor / Executive | Executive leadership oversight, strategic dashboards, read-only analytics |
| `registrar` | Registrar | Authoritative student records, academic calendar, graduation, transcripts, certifications |
| `academic_affairs_officer` | Academic Affairs Officer | Curriculum setup, programme requirements, semester calendar, results admin |
| `dean` | Faculty Dean | Scoped faculty oversight, academic workload, teaching allocations, result moderation |
| `head_of_department` | Head of Department (HOD) | Scoped department courses, course offerings, teaching assignments, mark reviews |
| `admissions_officer` | Admissions Officer | Applications processing, document verification, scoring, admission recommendations |
| `finance_officer` | Finance Officer / Bursar | Fee schedules, invoices, payment verification, receipts, reconciliation, refunds |
| `lecturer` | Lecturer / Instructor | Assigned course offerings, class lists, attendance recording, assessment mark entry |
| `academic_advisor` | Academic Advisor | Assigned advisees, academic progression monitoring, advising case notes |
| `student` | Student | Personal profile, registration, timetable, published grades, invoices & payments |
| `applicant` | Applicant | Save-and-resume application form, document upload, status check, offer response |
| `librarian` | Librarian | Bibliographic catalogue, copy tracking, circulation desk, loans, reservations, fines |
| `hostel_officer` | Hostel Officer | Residence halls, room inventories, bed space allocation, check-in/out, maintenance |
| `hr_officer` | Human Resources Officer | Staff records, contracts, leave management, teaching loads, HR records |
| `auditor` | Internal / External Auditor | Immutable audit logs, financial transaction evidence, compliance audit |
| `parent_sponsor` | Parent / Sponsor | Read-only view of sponsored student balance statements and notices |

---

## 2. Granular Permissions & Role-Permission Matrix

RBAC is enforced via centralized permissions:
- `has_role(p_role_code, p_user_id)`
- `has_permission(p_permission_code, p_user_id)`
- `has_scope(p_role_code, p_scope_type, p_scope_id, p_user_id)`
- `get_user_roles(p_user_id)`
- `get_user_permissions(p_user_id)`

### Core Security Definer Properties:
All RBAC helper functions run with `SECURITY DEFINER` and `SET search_path = public` to prevent privilege escalation and search path injection attacks.

---

## 3. Database Schema Migration Breakdown

The database is structured in versioned SQL migrations located in `supabase/migrations/`:

| Migration File | Domain Covered | Key Entities |
| :--- | :--- | :--- |
| `20261029000001_foundation_and_rbac.sql` | Identity & RBAC | `profiles`, `roles`, `permissions`, `role_permissions`, `user_role_assignments`, `user_scopes`, `audit_events` |
| `20261029000002_organization_and_academics.sql` | University Structure & Curriculum | `campuses`, `faculties`, `departments`, `buildings`, `rooms`, `academic_years`, `terms`, `programmes`, `programme_versions`, `courses`, `curriculum_requirements`, `prerequisites`, `course_offerings`, `teaching_assignments` |
| `20261029000003_admissions_and_students.sql` | Admissions & Student Records | `admission_cycles`, `applications`, `application_programmes`, `application_documents`, `application_reviews`, `admission_decisions`, `offers`, `students`, `student_status_history`, `student_programme_history`, `student_holds`, `emergency_contacts` |
| `20261029000004_registration_timetable_attendance.sql` | Enrolments, Scheduling & Attendance | `registration_periods`, `course_enrolments`, `enrolment_overrides`, `credit_load_snapshots`, `timetable_events`, `room_allocations`, `timetable_publications`, `class_sessions`, `attendance_records`, `attendance_amendments` |
| `20261029000005_assessment_and_grading.sql` | Assessment, Grading & Moderation | `grade_scales`, `grade_scale_items`, `assessment_components`, `assessment_marks`, `result_submissions`, `result_approvals`, `published_results`, `result_amendments` |
| `20261029000006_finance_and_payments.sql` | Student Finance & Payments | `fee_items`, `fee_schedules`, `student_invoices`, `invoice_lines`, `payment_attempts`, `payments`, `payment_allocations`, `receipts`, `refund_requests`, `scholarships`, `waivers`, `settlement_batches` |
| `20261029000007_registry_library_hostel_hr_support_system.sql` | Campus Operations | `document_templates`, `service_requests`, `generated_documents`, `document_issuance_events`, `library_items`, `item_copies`, `loans`, `reservations`, `library_fines`, `residences`, `hostel_rooms`, `beds`, `accommodation_applications`, `allocations`, `occupancy_events`, `maintenance_requests`, `staff`, `employment_records`, `leave_requests`, `leave_balances`, `staff_documents`, `teaching_loads`, `announcements`, `notification_templates`, `notifications`, `delivery_attempts`, `support_cases`, `case_assignments`, `case_comments`, `case_events`, `system_settings`, `integration_configs`, `job_runs`, `export_jobs`, `feature_flags` |
| `20261029000008_supabase_storage_setup.sql` | Supabase Storage | 5 Storage Buckets & granular storage RLS policies |

---

## 4. Supabase Storage Buckets

1. `application-documents` (Private):
   - WASSCE/A-Level certificates, birth certificates, transcripts, passport photos.
   - Access: Applicants can upload and read documents in their own directory (`{auth.uid()}/*`). Admissions reviewers, Registrar, and System Admins have institution-wide read access.
2. `student-documents` (Private):
   - Digitally generated official transcripts, enrollment verification letters, completion letters.
   - Access: Students can read documents issued to their student number/profile ID. Registry officers can upload and manage.
3. `staff-documents` (Private):
   - Employment contracts, appraisal records, sensitive HR documents.
   - Access: Restricted to HR Officers and individual staff members.
4. `course-materials` (Private):
   - Syllabus, course slides, assignment rubrics, project guidelines.
   - Access: Lecturers assigned to the course offering can upload; students enrolled in the offering can view and download.
5. `public-assets` (Public):
   - University logo, faculty shields, public prospectus, campus maps.

---

## 5. Security & Separation of Duties

- **Immutability of Audit Events**: `audit_events` cannot be modified or deleted (`BEFORE UPDATE OR DELETE` trigger).
- **Dual Control for Refunds**: A user who requests a refund cannot approve it (`check_refund_separation_of_duties()`).
- **Separation of Duties on Grades**: A lecturer who submits a mark sheet cannot act as the approver (`check_result_approval_separation_of_duties()`).
- **Idempotent Financial Transactions**: Payment webhooks and manual payment entries are guarded by unique provider references and idempotency keys (`process_verified_payment()`).
- **Financial Hold Automation**: Clearing outstanding balances automatically lifts financial registration holds.

---

## 6. How to Run Migrations in Supabase

### Local Development / Supabase CLI:
```bash
# Start local Supabase instance
supabase start

# Apply all migrations in order
supabase db reset

# Or manually run migrations against a remote Supabase project:
supabase db push
```

### Direct PostgreSQL / Supabase SQL Editor:
Run the files in `supabase/migrations/` in numerical order from `00001` through `00008`, followed by `seed.sql`.

