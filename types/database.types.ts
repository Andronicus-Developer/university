export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountStatus =
  | "invited"
  | "pending_verification"
  | "active"
  | "suspended"
  | "locked"
  | "deactivated";

export type ScopeType =
  | "institution"
  | "faculty"
  | "department"
  | "course_offering"
  | "cohort";

export type SystemRoleCode =
  | "system_admin"
  | "vice_chancellor"
  | "registrar"
  | "academic_affairs_officer"
  | "dean"
  | "head_of_department"
  | "admissions_officer"
  | "finance_officer"
  | "lecturer"
  | "academic_advisor"
  | "student"
  | "applicant"
  | "librarian"
  | "hostel_officer"
  | "hr_officer"
  | "auditor"
  | "parent_sponsor";

export type PermissionCode =
  | "users.roles.manage"
  | "identity.user.read"
  | "identity.user.update"
  | "audit.events.read"
  | "admissions.cycle.manage"
  | "admissions.application.read"
  | "admissions.application.submit"
  | "admissions.application.review"
  | "admissions.decision.approve"
  | "academics.curriculum.manage"
  | "academics.course.manage"
  | "academics.offering.manage"
  | "registration.enrolment.manage"
  | "registration.override.approve"
  | "timetable.manage"
  | "timetable.publish"
  | "attendance.record"
  | "attendance.amend"
  | "results.marks.submit"
  | "results.marks.moderate"
  | "results.approve"
  | "results.publish"
  | "results.amend"
  | "finance.invoice.create"
  | "finance.invoice.read"
  | "finance.payment.record"
  | "finance.refund.request"
  | "finance.refund.approve"
  | "finance.waiver.manage"
  | "finance.holds.manage"
  | "finance.reconcile"
  | "registry.student.read"
  | "registry.student.status_change"
  | "registry.transcript.issue"
  | "registry.letter.issue"
  | "library.catalog.manage"
  | "library.circulation.manage"
  | "hostel.inventory.manage"
  | "hostel.allocation.manage"
  | "hr.staff.manage"
  | "hr.leave.approve"
  | "communications.announce"
  | "support.ticket.manage"
  | "reports.view.admissions"
  | "reports.view.academic"
  | "reports.view.finance"
  | "reports.view.audit"
  | "system.config.manage";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          account_status: AccountStatus;
          is_mfa_enabled: boolean;
          last_sign_in_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          account_status?: AccountStatus;
          is_mfa_enabled?: boolean;
          last_sign_in_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          account_status?: AccountStatus;
          is_mfa_enabled?: boolean;
          last_sign_in_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          is_system_role: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          is_system_role?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          is_system_role?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          module: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          module: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          module?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_role_assignments: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          is_active: boolean;
          granted_by: string | null;
          granted_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          is_active?: boolean;
          granted_by?: string | null;
          granted_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          is_active?: boolean;
          granted_by?: string | null;
          granted_at?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      user_scopes: {
        Row: {
          id: string;
          assignment_id: string;
          scope_type: ScopeType;
          scope_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          scope_type: ScopeType;
          scope_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          scope_type?: ScopeType;
          scope_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          event_time: string;
          actor_id: string | null;
          actor_role: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          outcome: string;
          request_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          reason: string | null;
          approval_reference: string | null;
          old_values: Json | null;
          new_values: Json | null;
        };
        Insert: {
          id?: string;
          event_time?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          outcome?: string;
          request_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          reason?: string | null;
          approval_reference?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
        };
        Update: {
          id?: string;
          event_time?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          outcome?: string;
          request_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          reason?: string | null;
          approval_reference?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
        };
        Relationships: [];
      };
      campuses: {
        Row: {
          id: string;
          code: string;
          name: string;
          location: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          location?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          location?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      faculties: {
        Row: {
          id: string;
          campus_id: string;
          code: string;
          name: string;
          description: string | null;
          dean_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campus_id: string;
          code: string;
          name: string;
          description?: string | null;
          dean_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campus_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          dean_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          faculty_id: string;
          code: string;
          name: string;
          description: string | null;
          hod_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          faculty_id: string;
          code: string;
          name: string;
          description?: string | null;
          hod_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          faculty_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          hod_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      programmes: {
        Row: {
          id: string;
          department_id: string;
          code: string;
          name: string;
          degree_level: string;
          duration_years: number;
          total_credits_required: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          code: string;
          name: string;
          degree_level?: string;
          duration_years?: number;
          total_credits_required?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          code?: string;
          name?: string;
          degree_level?: string;
          duration_years?: number;
          total_credits_required?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          department_id: string;
          code: string;
          name: string;
          description: string | null;
          credits: number;
          contact_hours: number;
          course_type: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          code: string;
          name: string;
          description?: string | null;
          credits?: number;
          contact_hours?: number;
          course_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          credits?: number;
          contact_hours?: number;
          course_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_offerings: {
        Row: {
          id: string;
          term_id: string;
          course_id: string;
          section: string;
          room_id: string | null;
          delivery_mode: string;
          capacity: number;
          enrolled_count: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          term_id: string;
          course_id: string;
          section?: string;
          room_id?: string | null;
          delivery_mode?: string;
          capacity?: number;
          enrolled_count?: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          term_id?: string;
          course_id?: string;
          section?: string;
          room_id?: string | null;
          delivery_mode?: string;
          capacity?: number;
          enrolled_count?: number;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          profile_id: string;
          student_number: string;
          application_id: string | null;
          programme_id: string;
          programme_version_id: string | null;
          current_term_id: string | null;
          cohort_year: number;
          entry_term_id: string;
          admission_date: string;
          status: string;
          current_level: number;
          gpa: number;
          cgpa: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          student_number: string;
          application_id?: string | null;
          programme_id: string;
          programme_version_id?: string | null;
          current_term_id?: string | null;
          cohort_year: number;
          entry_term_id: string;
          admission_date?: string;
          status?: string;
          current_level?: number;
          gpa?: number;
          cgpa?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          student_number?: string;
          application_id?: string | null;
          programme_id?: string;
          programme_version_id?: string | null;
          current_term_id?: string | null;
          cohort_year?: number;
          entry_term_id?: string;
          admission_date?: string;
          status?: string;
          current_level?: number;
          gpa?: number;
          cgpa?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_enrolments: {
        Row: {
          id: string;
          student_id: string;
          course_offering_id: string;
          term_id: string;
          enrolment_status: string;
          registered_at: string;
          final_grade: string | null;
          grade_points: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_offering_id: string;
          term_id: string;
          enrolment_status?: string;
          registered_at?: string;
          final_grade?: string | null;
          grade_points?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_offering_id?: string;
          term_id?: string;
          enrolment_status?: string;
          registered_at?: string;
          final_grade?: string | null;
          grade_points?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_invoices: {
        Row: {
          id: string;
          student_id: string;
          term_id: string;
          invoice_number: string;
          total_amount: number;
          paid_amount: number;
          balance_amount: number;
          currency: string;
          status: string;
          issue_date: string;
          due_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          term_id: string;
          invoice_number: string;
          total_amount?: number;
          paid_amount?: number;
          balance_amount?: number;
          currency?: string;
          status?: string;
          issue_date?: string;
          due_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          term_id?: string;
          invoice_number?: string;
          total_amount?: number;
          paid_amount?: number;
          balance_amount?: number;
          currency?: string;
          status?: string;
          issue_date?: string;
          due_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          payment_attempt_id: string | null;
          student_id: string;
          amount: number;
          currency: string;
          provider: string;
          provider_reference: string;
          verified_at: string;
          payment_method: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_attempt_id?: string | null;
          student_id: string;
          amount: number;
          currency?: string;
          provider: string;
          provider_reference: string;
          verified_at?: string;
          payment_method?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_attempt_id?: string | null;
          student_id?: string;
          amount?: number;
          currency?: string;
          provider?: string;
          provider_reference?: string;
          verified_at?: string;
          payment_method?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      published_results: {
        Row: {
          id: string;
          enrolment_id: string;
          total_marks: number;
          letter_grade: string;
          grade_points: number;
          is_published: boolean;
          published_at: string;
          published_by: string | null;
        };
        Insert: {
          id?: string;
          enrolment_id: string;
          total_marks: number;
          letter_grade: string;
          grade_points: number;
          is_published?: boolean;
          published_at?: string;
          published_by?: string | null;
        };
        Update: {
          id?: string;
          enrolment_id?: string;
          total_marks?: number;
          letter_grade?: string;
          grade_points?: number;
          is_published?: boolean;
          published_at?: string;
          published_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: { p_role_code: string; p_user_id?: string };
        Returns: boolean;
      };
      has_permission: {
        Args: { p_permission_code: string; p_user_id?: string };
        Returns: boolean;
      };
      has_scope: {
        Args: {
          p_role_code: string;
          p_scope_type: ScopeType;
          p_scope_id: string;
          p_user_id?: string;
        };
        Returns: boolean;
      };
      get_user_roles: {
        Args: { p_user_id?: string };
        Returns: { role_code: string; role_name: string; is_active: boolean }[];
      };
      get_user_permissions: {
        Args: { p_user_id?: string };
        Returns: { permission_code: string; module: string }[];
      };
      get_student_id_for_user: {
        Args: { p_user_id?: string };
        Returns: string | null;
      };
      convert_applicant_to_student: {
        Args: {
          p_application_id: string;
          p_student_number: string;
          p_programme_id: string;
          p_cohort_year: number;
          p_entry_term_id: string;
        };
        Returns: string;
      };
      publish_results_for_offering: {
        Args: {
          p_offering_id: string;
          p_publisher_id?: string;
        };
        Returns: number;
      };
      process_verified_payment: {
        Args: {
          p_provider_reference: string;
          p_amount: number;
          p_currency: string;
          p_payment_method?: string;
          p_idempotency_key?: string;
        };
        Returns: string;
      };
      log_audit_event: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id: string;
          p_outcome?: string;
          p_reason?: string;
          p_approval_ref?: string;
          p_old_values?: Json;
          p_new_values?: Json;
        };
        Returns: string;
      };
    };
  };
}
