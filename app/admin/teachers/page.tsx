"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getSchoolPortalConfig,
  toPortalSchoolType,
  type PortalSchoolType,
  type SchoolPortalConfig,
} from "@/config/schoolPortalConfig";
import { getSchoolFormConfig } from "@/config/schoolFormConfig";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Download,
  BookOpen,
  Briefcase,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Phone,
} from "lucide-react";

interface AssignedCourse {
  course_id: string;
  course_code: string;
  course_name: string;
}

interface TeacherRecord {
  id: string;
  profile_id: string;
  staff_number: string;
  full_name: string;
  email: string;
  phone: string;
  department_id: string | null;
  department_name: string;
  department_code: string;
  job_title: string;
  employment_type: string;
  hire_date: string;
  status: string;
  role_code: string;
  role_name: string;
  salary_grade: string;
  assigned_courses: AssignedCourse[];
  metadata?: Record<string, any>;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface ProgrammeOption {
  id: string;
  name: string;
  code: string;
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
  department_id: string | null;
}

interface SubjectOption {
  id: string;
  code: string;
  name: string;
  programme_id?: string | null;
}

interface VocationalModuleOption {
  id: string;
  code: string;
  name: string;
  department_id?: string | null;
}

interface RoleOption {
  id: string;
  code: string;
  name: string;
}

interface TeacherStats {
  total: number;
  active: number;
  fullTime: number;
  assignedCoursesCount: number;
}

interface TeacherFormState {
  full_name: string;
  email: string;
  phone: string;
  staff_number: string;
  job_title: string;
  department_id: string;
  employment_type: string;
  hire_date: string;
  status: string;
  role_code: string;
  salary_grade: string;
  course_ids: string[];
  password: string;
  // University metadata
  highest_qualification: string;
  specialization: string;
  // High School metadata
  assigned_class_id: string;
  is_class_teacher: boolean;
  teaching_subject_ids: string[];
  teaching_qualification: string;
  // Vocational metadata
  trade_certification_no: string;
  industry_experience_years: string;
  assigned_module_ids: string[];
}

const STAFF_STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On Leave" },
  { value: "retired", label: "Retired" },
  { value: "terminated", label: "Terminated" },
];

function statusBadgeStyle(status: string) {
  switch (status) {
    case "active":
      return "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]";
    case "on_leave":
      return "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]";
    case "retired":
      return "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]";
    default:
      return "bg-red-50 text-red-700 border-red-200";
  }
}

function generateNextFacultyNumber(existing: TeacherRecord[], year: number, idPrefix: string) {
  const prefix = `${idPrefix}${year}`;
  let maxSeq = 0;
  for (const t of existing) {
    const sn = String(t.staff_number || "").toUpperCase();
    if (sn.startsWith(prefix)) {
      const numPart = parseInt(sn.slice(prefix.length), 10);
      if (!Number.isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export default function TeachersManagementPage() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [vocationalModules, setVocationalModules] = useState<VocationalModuleOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [schoolType, setSchoolType] = useState<PortalSchoolType>("university");

  const portalConfig: SchoolPortalConfig = useMemo(
    () => getSchoolPortalConfig(schoolType),
    [schoolType]
  );
  const formSpec = useMemo(
    () => getSchoolFormConfig(schoolType).academicStaff,
    [schoolType]
  );

  const [stats, setStats] = useState<TeacherStats>({
    total: 0,
    active: 0,
    fullTime: 0,
    assignedCoursesCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherRecord | null>(null);
  const [nextIdPreview, setNextIdPreview] = useState<string>("");
  const [manualIdOverride, setManualIdOverride] = useState<boolean>(false);

  const [currentYear, setCurrentYear] = useState(2026);
  const [todayIso, setTodayIso] = useState("2026-10-31");

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    setTodayIso(new Date().toISOString().split("T")[0]);
  }, []);

  const [formData, setFormData] = useState<TeacherFormState>({
    full_name: "",
    email: "",
    phone: "",
    staff_number: "",
    job_title: "Senior Lecturer",
    department_id: "",
    employment_type: "full_time",
    hire_date: todayIso,
    status: "active",
    role_code: "lecturer",
    salary_grade: "",
    course_ids: [],
    password: "",
    highest_qualification: "PhD",
    specialization: "",
    assigned_class_id: "",
    is_class_teacher: false,
    teaching_subject_ids: [],
    teaching_qualification: "B.Ed",
    trade_certification_no: "",
    industry_experience_years: "",
    assigned_module_ids: [],
  });

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teachers", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to load faculty records.");
        return;
      }

      if (data.school_type) {
        setSchoolType(toPortalSchoolType(data.school_type));
      }
      if (data.next_staff_id_preview) {
        setNextIdPreview(String(data.next_staff_id_preview));
      }
      setTeachers(data.teachers || []);
      setDepartments(data.departments || []);
      setProgrammes(data.programmes || []);
      setCourses(data.courses || []);
      setSubjects(data.subjects || []);
      setVocationalModules(data.vocational_modules || []);
      setRoles(data.roles || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error loading records.");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const programmeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of programmes) m.set(p.id, `${p.name} (${p.code})`);
    return m;
  }, [programmes]);

  const subjectById = useMemo(() => {
    const m = new Map<string, SubjectOption>();
    for (const s of subjects) m.set(s.id, s);
    return m;
  }, [subjects]);

  const moduleById = useMemo(() => {
    const m = new Map<string, VocationalModuleOption>();
    for (const mod of vocationalModules) m.set(mod.id, mod);
    return m;
  }, [vocationalModules]);

  const openCreateModal = () => {
    setEditingTeacher(null);
    setManualIdOverride(false);
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      staff_number:
        nextIdPreview ||
        generateNextFacultyNumber(teachers, currentYear, formSpec.idPrefix),
      job_title: formSpec.ranks[0] || "Lecturer",
      department_id: formSpec.showDepartment ? departments[0]?.id || "" : "",
      employment_type: formSpec.employmentTypes[0]?.value || "full_time",
      hire_date: todayIso,
      status: "active",
      role_code: formSpec.defaultRoleCode,
      salary_grade: "",
      course_ids: [],
      password: "",
      highest_qualification: formSpec.qualifications[0] || "PhD",
      specialization: "",
      assigned_class_id: programmes[0]?.id || "",
      is_class_teacher: false,
      teaching_subject_ids: [],
      teaching_qualification: formSpec.qualifications[0] || "B.Ed",
      trade_certification_no: "",
      industry_experience_years: "5",
      assigned_module_ids: [],
    });
    setModalMode("create");
  };

  const openEditModal = (teacher: TeacherRecord) => {
    const meta = teacher.metadata && typeof teacher.metadata === "object" ? teacher.metadata : {};
    setEditingTeacher(teacher);
    setManualIdOverride(true);
    setFormData({
      full_name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone || "",
      staff_number: teacher.staff_number,
      job_title: teacher.job_title || formSpec.ranks[0],
      department_id: teacher.department_id || "",
      employment_type: teacher.employment_type || "full_time",
      hire_date: teacher.hire_date || todayIso,
      status: teacher.status || "active",
      role_code: teacher.role_code || formSpec.defaultRoleCode,
      salary_grade: teacher.salary_grade || "",
      course_ids: (teacher.assigned_courses || []).map((c) => c.course_id),
      password: "",
      highest_qualification: meta.highest_qualification || formSpec.qualifications[0] || "PhD",
      specialization: meta.specialization || "",
      assigned_class_id: meta.assigned_class_id || "",
      is_class_teacher: Boolean(meta.is_class_teacher),
      teaching_subject_ids: Array.isArray(meta.teaching_subject_ids)
        ? meta.teaching_subject_ids
        : [],
      teaching_qualification: meta.teaching_qualification || formSpec.qualifications[0] || "B.Ed",
      trade_certification_no: meta.trade_certification_no || "",
      industry_experience_years:
        meta.industry_experience_years != null ? String(meta.industry_experience_years) : "",
      assigned_module_ids: Array.isArray(meta.assigned_module_ids)
        ? meta.assigned_module_ids
        : [],
    });
    setModalMode("edit");
  };

  const toggleIdInList = (
    key: "course_ids" | "teaching_subject_ids" | "assigned_module_ids",
    targetId: string
  ) => {
    setFormData((prev) => {
      const current = prev[key];
      const next = current.includes(targetId)
        ? current.filter((x) => x !== targetId)
        : [...current, targetId];
      return { ...prev, [key]: next };
    });
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let metadataPayload: Record<string, any> = {};
    if (schoolType === "university") {
      metadataPayload = {
        school_type: "university",
        academic_rank: formData.job_title,
        highest_qualification: formData.highest_qualification,
        specialization: formData.specialization.trim(),
      };
    } else if (schoolType === "high_school") {
      const subjectNames = formData.teaching_subject_ids
        .map((id) => {
          const s = subjectById.get(id);
          return s ? `${s.code} — ${s.name}` : "";
        })
        .filter(Boolean);
      metadataPayload = {
        school_type: "high_school",
        assigned_class_id: formData.assigned_class_id || null,
        assigned_class_name: formData.assigned_class_id
          ? programmeNameById.get(formData.assigned_class_id) || ""
          : "",
        is_class_teacher: formData.is_class_teacher,
        teaching_subject_ids: formData.teaching_subject_ids,
        teaching_subject_names: subjectNames,
        teaching_qualification: formData.teaching_qualification,
      };
    } else {
      const moduleNames = formData.assigned_module_ids
        .map((id) => {
          const mod = moduleById.get(id);
          return mod ? `${mod.code} — ${mod.name}` : "";
        })
        .filter(Boolean);
      metadataPayload = {
        school_type: "vocational",
        trade_certification_no: formData.trade_certification_no.trim(),
        industry_experience_years: formData.industry_experience_years
          ? Number(formData.industry_experience_years)
          : 0,
        teaching_qualification: formData.teaching_qualification,
        assigned_module_ids: formData.assigned_module_ids,
        assigned_module_names: moduleNames,
      };
    }

    try {
      const isEdit = modalMode === "edit" && editingTeacher;
      const res = await fetch("/api/admin/teachers", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editingTeacher.id } : {}),
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          auto_generate_id: !isEdit && !manualIdOverride,
          staff_number:
            !isEdit && !manualIdOverride ? "" : formData.staff_number,
          job_title: formData.job_title,
          department_id: formSpec.showDepartment ? formData.department_id || null : null,
          employment_type: formData.employment_type,
          hire_date: formData.hire_date,
          status: formData.status,
          role_code: formData.role_code,
          salary_grade: formData.salary_grade,
          course_ids: schoolType === "university" ? formData.course_ids : [],
          metadata: metadataPayload,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Unable to save record.");
        return;
      }

      const assignedStaffNumber =
        data.teacher?.staff_number || formData.staff_number;
      showNotification(
        "success",
        isEdit
          ? `${portalConfig.instructorSingular} "${formData.full_name}" (${assignedStaffNumber}) updated successfully.`
          : `${portalConfig.instructorSingular} "${formData.full_name}" (${assignedStaffNumber}) added successfully.`
      );
      setModalMode(null);
      setEditingTeacher(null);
      await fetchTeachers();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while saving record.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/teachers?id=${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to delete record.");
        return;
      }

      showNotification(
        "success",
        `${portalConfig.instructorSingular} "${deleteTarget.full_name}" (${deleteTarget.staff_number}) deleted.`
      );
      setDeleteTarget(null);
      await fetchTeachers();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while deleting record.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teachers.filter((t) => {
      const meta = t.metadata || {};
      const matchesSearch =
        !q ||
        t.full_name.toLowerCase().includes(q) ||
        t.staff_number.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.job_title.toLowerCase().includes(q) ||
        (t.department_name || "").toLowerCase().includes(q) ||
        String(meta.specialization || "").toLowerCase().includes(q) ||
        String(meta.trade_certification_no || "").toLowerCase().includes(q) ||
        String(meta.assigned_class_name || "").toLowerCase().includes(q);

      const matchesUnit =
        departmentFilter === "all" ||
        (schoolType === "high_school"
          ? meta.assigned_class_id === departmentFilter
          : t.department_id === departmentFilter);

      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesType = typeFilter === "all" || t.employment_type === typeFilter;
      return matchesSearch && matchesUnit && matchesStatus && matchesType;
    });
  }, [teachers, searchQuery, departmentFilter, statusFilter, typeFilter, schoolType]);

  const exportCSV = () => {
    const headers =
      "ID,Full Name,Email,Phone,Title,Unit/Class,Details,Employment Type,Status\n";
    const rows = filteredTeachers
      .map((t) => {
        const m = t.metadata || {};
        const unit =
          schoolType === "high_school"
            ? m.assigned_class_name || "Subject Teacher"
            : t.department_name || "Unassigned";
        const detail =
          schoolType === "high_school"
            ? `${m.teaching_qualification || ""} | ${(m.teaching_subject_names || []).join("; ")}`
            : schoolType === "vocational"
            ? `${m.trade_certification_no || ""} | ${(m.assigned_module_names || []).join("; ")}`
            : `${m.highest_qualification || ""} | ${m.specialization || ""}`;
        return `"${t.staff_number}","${t.full_name.replace(/"/g, '""')}","${t.email}","${t.phone}","${t.job_title}","${unit}","${detail.replace(/"/g, '""')}","${t.employment_type}","${t.status}"`;
      })
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${portalConfig.instructorPlural.toLowerCase().replace(/\s+/g, "_")}_${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <Link href="/admin/dashboard" className="text-[#3B82F6] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">
              {formSpec.breadcrumbLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
              {formSpec.pageTitle}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${portalConfig.badgeClasses}`}
            >
              {portalConfig.portalBadge}
            </span>
          </div>
          <p className="text-xs text-[#64748B]">{formSpec.pageSubtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={filteredTeachers.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-50 text-xs font-semibold text-[#475569] shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{formSpec.addTitle}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Total {portalConfig.instructorPlural}
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.total}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Instructional staff</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#3B82F6] flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Active {portalConfig.instructorPlural}
            </p>
            <p className="text-2xl font-bold text-[#059669] mt-1">{stats.active}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Currently teaching</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Full-Time {portalConfig.instructorPlural}
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.fullTime}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {stats.total - stats.fullTime} part-time / contract
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              {schoolType === "high_school"
                ? "Assigned Subjects"
                : schoolType === "vocational"
                ? "Practical Modules"
                : "Assigned Courses"}
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {stats.assignedCoursesCount}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Active teaching loads</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold ${
            notification.type === "success"
              ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search by name, ${formSpec.idLabel.toLowerCase()}, email, qualification, or assignment...`}
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <Filter className="h-3.5 w-3.5 text-[#94A3B8]" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {schoolType === "high_school" ? (
                <>
                  <option value="all">All Classes / Forms</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="all">
                    {schoolType === "vocational"
                      ? "All Trade Workshops"
                      : "All Departments"}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              {formSpec.employmentTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {STAFF_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchTeachers}
            title="Refresh"
            className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Faculty / Teachers / Instructors Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">{portalConfig.instructorSingular}</th>
                <th className="py-3 px-4">{formSpec.idLabel}</th>
                <th className="py-3 px-4">
                  {schoolType === "vocational"
                    ? "License & Experience"
                    : schoolType === "high_school"
                    ? "Role & Qualification"
                    : "Rank & Qualification"}
                </th>
                <th className="py-3 px-4">
                  {schoolType === "high_school"
                    ? "Assigned Class"
                    : formSpec.departmentLabel}
                </th>
                <th className="py-3 px-4">
                  {schoolType === "high_school"
                    ? "Teaching Subjects"
                    : schoolType === "vocational"
                    ? "Practical Modules"
                    : "Assigned Courses"}
                </th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#3B82F6]" />
                      <span>Loading live instructional staff records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTeachers.length > 0 ? (
                filteredTeachers.map((t) => {
                  const meta = t.metadata || {};
                  const initials = t.full_name
                    ? t.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "FC";

                  return (
                    <tr key={t.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#1E293B]">{t.full_name}</div>
                            <div className="text-[11px] text-[#64748B]">{t.email}</div>
                            {t.phone && (
                              <div className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
                                <Phone className="h-2.5 w-2.5" />
                                <span>{t.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-[#334155]">
                        {t.staff_number}
                      </td>

                      {/* Rank / Qualification / License */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1E293B]">{t.job_title}</div>
                        <div className="text-[10px] text-[#64748B]">
                          {schoolType === "vocational"
                            ? [
                                meta.trade_certification_no
                                  ? `Lic: ${meta.trade_certification_no}`
                                  : "",
                                meta.industry_experience_years != null
                                  ? `${meta.industry_experience_years} yrs exp`
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" · ") || t.role_name
                            : schoolType === "high_school"
                            ? meta.teaching_qualification || t.role_name
                            : [meta.highest_qualification, meta.specialization]
                                .filter(Boolean)
                                .join(" · ") || t.role_name}
                        </div>
                      </td>

                      {/* Unit / Assigned Class */}
                      <td className="py-3.5 px-4 text-[#475569]">
                        {schoolType === "high_school" ? (
                          <div>
                            <div className="font-medium text-[#1E293B]">
                              {meta.assigned_class_name ||
                                (meta.assigned_class_id
                                  ? programmeNameById.get(meta.assigned_class_id)
                                  : "") ||
                                "Floating / All Forms"}
                            </div>
                            {meta.is_class_teacher && (
                              <span className="inline-flex mt-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Class Teacher
                              </span>
                            )}
                          </div>
                        ) : (
                          t.department_name || (
                            <span className="text-[#94A3B8]">Unassigned</span>
                          )
                        )}
                      </td>

                      {/* Assigned Courses / Subjects / Modules */}
                      <td className="py-3.5 px-4">
                        {schoolType === "high_school" ? (
                          Array.isArray(meta.teaching_subject_names) &&
                          meta.teaching_subject_names.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {meta.teaching_subject_names.map((sn: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-semibold"
                                >
                                  {sn.split(" — ")[0]}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#94A3B8]">None assigned</span>
                          )
                        ) : schoolType === "vocational" ? (
                          Array.isArray(meta.assigned_module_names) &&
                          meta.assigned_module_names.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {meta.assigned_module_names.map((mn: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold"
                                >
                                  {mn.split(" — ")[0]}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#94A3B8]">None assigned</span>
                          )
                        ) : t.assigned_courses.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {t.assigned_courses.map((c) => (
                              <span
                                key={c.course_id}
                                title={c.course_name}
                                className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] border border-blue-100 font-mono text-[10px] font-semibold"
                              >
                                {c.course_code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#94A3B8]">None assigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-[#64748B]">
                        {t.employment_type.replace(/_/g, " ")}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeStyle(
                            t.status
                          )}`}
                        >
                          {t.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#334155] hover:text-[#2563EB] border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-red-50 text-[#64748B] hover:text-red-600 border border-[#E2E8F0] hover:border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#94A3B8]">
                    {teachers.length === 0
                      ? `No ${portalConfig.instructorPlural.toLowerCase()} registered yet. Click "${formSpec.addTitle}" above.`
                      : "No records match your active search or filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0 bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  {modalMode === "edit"
                    ? `${formSpec.editTitlePrefix} — ${editingTeacher?.staff_number}`
                    : formSpec.addTitle}
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  {modalMode === "edit" ? formSpec.editSubtitle : formSpec.addSubtitle}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setEditingTeacher(null);
                }}
                className="text-[#94A3B8] hover:text-[#1E293B] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-6 space-y-4 overflow-y-auto">
              {/* Row 1: Name & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formSpec.namePlaceholder}
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-xs font-bold text-[#334155]">
                      {formSpec.idLabel}{" "}
                      {manualIdOverride || modalMode === "edit" ? (
                        <span className="text-red-500">*</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-blue-600">
                          (Auto)
                        </span>
                      )}
                    </label>
                    {modalMode === "create" && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualIdOverride((prev) => {
                            const next = !prev;
                            if (!next) {
                              setFormData((f) => ({
                                ...f,
                                staff_number:
                                  nextIdPreview ||
                                  generateNextFacultyNumber(
                                    teachers,
                                    currentYear,
                                    formSpec.idPrefix
                                  ),
                              }));
                            }
                            return next;
                          });
                        }}
                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        {manualIdOverride ? "Use auto-ID" : "Manual override"}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required={modalMode === "edit" || manualIdOverride}
                    readOnly={modalMode === "create" && !manualIdOverride}
                    placeholder={nextIdPreview || formSpec.idPlaceholder}
                    value={
                      modalMode === "create" && !manualIdOverride
                        ? nextIdPreview || formData.staff_number
                        : formData.staff_number
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        staff_number: e.target.value.toUpperCase(),
                      })
                    }
                    className={`w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#1E293B] ${
                      modalMode === "create" && !manualIdOverride
                        ? "bg-slate-100/80 text-slate-600 cursor-default"
                        : "bg-[#F8FAFC]"
                    }`}
                  />
                  {modalMode === "create" && !manualIdOverride && nextIdPreview && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Preview: <span className="font-mono font-semibold text-slate-700">{nextIdPreview}</span> (assigned atomically on save)
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Institutional Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={formSpec.emailPlaceholder}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +233 24 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  />
                </div>
              </div>

              {/* Rank/Designation & Qualification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    {formSpec.rankLabel} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={
                      formSpec.ranks.includes(formData.job_title)
                        ? formData.job_title
                        : formSpec.ranks[0]
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  >
                    {formSpec.ranks.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    {formSpec.qualificationLabel}
                  </label>
                  <select
                    value={
                      schoolType === "university"
                        ? formData.highest_qualification
                        : formData.teaching_qualification
                    }
                    onChange={(e) =>
                      schoolType === "university"
                        ? setFormData({
                            ...formData,
                            highest_qualification: e.target.value,
                          })
                        : setFormData({
                            ...formData,
                            teaching_qualification: e.target.value,
                          })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  >
                    {formSpec.qualifications.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SCHOOL-TYPE SPECIFIC MIDDLE SECTION */}
              {schoolType === "university" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      {formSpec.departmentLabel}
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={(e) =>
                        setFormData({ ...formData, department_id: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                    >
                      <option value="">Unassigned Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Specialization / Research Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems & Machine Learning"
                      value={formData.specialization}
                      onChange={(e) =>
                        setFormData({ ...formData, specialization: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                    />
                  </div>
                </div>
              )}

              {schoolType === "high_school" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Assigned Class / Form
                    </label>
                    <select
                      value={formData.assigned_class_id}
                      onChange={(e) =>
                        setFormData({ ...formData, assigned_class_id: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                    >
                      <option value="">Subject Teacher Only (Multiple Classes)</option>
                      {programmes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_class_teacher}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_class_teacher: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-emerald-400 text-emerald-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">
                          Designated Class Teacher
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          Homeroom / Form Master responsibility
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {schoolType === "vocational" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      {formSpec.departmentLabel}
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={(e) =>
                        setFormData({ ...formData, department_id: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                    >
                      <option value="">Select Trade Workshop...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Trade Certification / Master License No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NVTI-MC-2024-882"
                      value={formData.trade_certification_no}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trade_certification_no: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#1E293B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Years of Industry Experience
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={formData.industry_experience_years}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          industry_experience_years: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                    />
                  </div>
                </div>
              )}

              {/* Role & Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Portal Role
                  </label>
                  <select
                    value={formData.role_code}
                    onChange={(e) =>
                      setFormData({ ...formData, role_code: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  >
                    {formSpec.roleOptions.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Salary Grade (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={formSpec.salaryPlaceholder}
                    value={formData.salary_grade}
                    onChange={(e) =>
                      setFormData({ ...formData, salary_grade: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  />
                </div>
              </div>

              {/* Employment Type, Hire Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Employment Type
                  </label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) =>
                      setFormData({ ...formData, employment_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  >
                    {formSpec.employmentTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Hire Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.hire_date}
                    onChange={(e) =>
                      setFormData({ ...formData, hire_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  >
                    {STAFF_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MULTI-SELECT SECTION PER SCHOOL TYPE */}
              {schoolType === "university" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#334155]">
                      Assigned Courses ({formData.course_ids.length} selected)
                    </label>
                    {formData.course_ids.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, course_ids: [] })}
                        className="text-[11px] font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                  {courses.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {courses.map((course) => {
                        const checked = formData.course_ids.includes(course.id);
                        return (
                          <label
                            key={course.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              checked
                                ? "bg-[#EFF6FF] border-[#93C5FD] text-[#1E3A8A]"
                                : "bg-white border-[#E2E8F0] text-[#334155] hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleIdInList("course_ids", course.id)}
                              className="rounded border-slate-300 text-[#3B82F6]"
                            />
                            <span className="truncate">
                              <span className="font-mono font-bold">{course.code}</span>{" "}
                              — {course.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] text-[#94A3B8]">
                      No courses created yet. Add courses under Courses & Credit Hours to assign them here.
                    </div>
                  )}
                </div>
              )}

              {schoolType === "high_school" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#334155]">
                      Teaching Subject(s) ({formData.teaching_subject_ids.length} selected)
                    </label>
                    {formData.teaching_subject_ids.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, teaching_subject_ids: [] })
                        }
                        className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                  {subjects.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {subjects.map((sub) => {
                        const checked = formData.teaching_subject_ids.includes(sub.id);
                        return (
                          <label
                            key={sub.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              checked
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                : "bg-white border-[#E2E8F0] text-[#334155] hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleIdInList("teaching_subject_ids", sub.id)
                              }
                              className="rounded border-slate-300 text-emerald-600"
                            />
                            <span className="truncate">
                              <span className="font-mono font-bold">{sub.code}</span> —{" "}
                              {sub.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] text-[#94A3B8]">
                      No high school subjects added yet. Add subjects under Subjects to assign them here.
                    </div>
                  )}
                </div>
              )}

              {schoolType === "vocational" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#334155]">
                      Assigned Practical Modules ({formData.assigned_module_ids.length}{" "}
                      selected)
                    </label>
                    {formData.assigned_module_ids.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, assigned_module_ids: [] })
                        }
                        className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                  {vocationalModules.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {vocationalModules.map((mod) => {
                        const checked = formData.assigned_module_ids.includes(mod.id);
                        return (
                          <label
                            key={mod.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              checked
                                ? "bg-amber-50 border-amber-300 text-amber-900"
                                : "bg-white border-[#E2E8F0] text-[#334155] hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleIdInList("assigned_module_ids", mod.id)
                              }
                              className="rounded border-slate-300 text-amber-600"
                            />
                            <span className="truncate">
                              <span className="font-mono font-bold">{mod.code}</span> —{" "}
                              {mod.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] text-[#94A3B8]">
                      No practical workshop modules created yet. Add modules under Modules / Practicals to assign them here.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  {modalMode === "edit"
                    ? "Reset Portal Password (Optional)"
                    : "Initial Portal Password (Optional)"}
                </label>
                <input
                  type="password"
                  minLength={8}
                  placeholder={
                    modalMode === "edit"
                      ? "Leave blank to keep existing password (min. 8 characters)"
                      : "Min. 8 characters (auto-generated if left blank)"
                  }
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                />
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode(null);
                    setEditingTeacher(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>
                    {saving
                      ? "Saving..."
                      : modalMode === "edit"
                      ? "Save Changes"
                      : formSpec.addTitle}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">
                    Delete {portalConfig.instructorSingular}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Are you sure you want to permanently delete{" "}
                    <span className="font-bold text-[#1E293B]">
                      {deleteTarget.full_name}
                    </span>{" "}
                    (<span className="font-mono">{deleteTarget.staff_number}</span>)?
                    This removes their teaching record, assignments, and linked portal login account.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                >
                  {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{deleting ? "Deleting..." : "Delete Permanently"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
