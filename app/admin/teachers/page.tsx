"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
}

interface DepartmentOption {
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
}

const ACADEMIC_RANKS = [
  "Professor",
  "Associate Professor",
  "Senior Lecturer",
  "Lecturer",
  "Assistant Lecturer",
  "Adjunct Lecturer",
  "Teaching Instructor",
  "Faculty Dean",
  "Academic Advisor",
];

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "adjunct", label: "Adjunct" },
  { value: "contract", label: "Contract" },
];

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

function generateNextFacultyNumber(existing: TeacherRecord[], year: number) {
  const prefix = `FAC${year}`;
  let maxSeq = 0;
  for (const t of existing) {
    if (t.staff_number.toUpperCase().startsWith(prefix)) {
      const numPart = parseInt(t.staff_number.slice(prefix.length), 10);
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
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
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

      setTeachers(data.teachers || []);
      setDepartments(data.departments || []);
      setCourses(data.courses || []);
      setRoles(data.roles || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error loading faculty records.");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const openCreateModal = () => {
    setEditingTeacher(null);
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      staff_number: generateNextFacultyNumber(teachers, currentYear),
      job_title: "Senior Lecturer",
      department_id: departments[0]?.id || "",
      employment_type: "full_time",
      hire_date: todayIso,
      status: "active",
      role_code: "lecturer",
      salary_grade: "",
      course_ids: [],
      password: "",
    });
    setModalMode("create");
  };

  const openEditModal = (teacher: TeacherRecord) => {
    setEditingTeacher(teacher);
    setFormData({
      full_name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone || "",
      staff_number: teacher.staff_number,
      job_title: teacher.job_title,
      department_id: teacher.department_id || "",
      employment_type: teacher.employment_type,
      hire_date: teacher.hire_date || todayIso,
      status: teacher.status,
      role_code: teacher.role_code || "lecturer",
      salary_grade: teacher.salary_grade || "",
      course_ids: teacher.assigned_courses.map((c) => c.course_id),
      password: "",
    });
    setModalMode("edit");
  };

  const toggleCourseSelection = (courseId: string) => {
    setFormData((prev) => {
      const exists = prev.course_ids.includes(courseId);
      return {
        ...prev,
        course_ids: exists
          ? prev.course_ids.filter((id) => id !== courseId)
          : [...prev.course_ids, courseId],
      };
    });
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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
          staff_number: formData.staff_number,
          job_title: formData.job_title,
          department_id: formData.department_id || null,
          employment_type: formData.employment_type,
          hire_date: formData.hire_date,
          status: formData.status,
          role_code: formData.role_code,
          salary_grade: formData.salary_grade,
          course_ids: formData.course_ids,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Unable to save faculty member.");
        return;
      }

      showNotification(
        "success",
        isEdit
          ? `Faculty member "${formData.full_name}" (${formData.staff_number}) updated successfully.`
          : `Faculty member "${formData.full_name}" (${formData.staff_number}) added successfully.`
      );
      setModalMode(null);
      setEditingTeacher(null);
      await fetchTeachers();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while saving faculty member.");
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
        showNotification("error", data.error || "Failed to delete faculty member.");
        return;
      }

      showNotification(
        "success",
        `Faculty member "${deleteTarget.full_name}" (${deleteTarget.staff_number}) deleted from database.`
      );
      setDeleteTarget(null);
      await fetchTeachers();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while deleting faculty.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teachers.filter((t) => {
      const matchesSearch =
        !q ||
        t.full_name.toLowerCase().includes(q) ||
        t.staff_number.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.job_title.toLowerCase().includes(q) ||
        t.department_name.toLowerCase().includes(q);
      const matchesDept =
        departmentFilter === "all" || t.department_id === departmentFilter;
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesType =
        typeFilter === "all" || t.employment_type === typeFilter;
      return matchesSearch && matchesDept && matchesStatus && matchesType;
    });
  }, [teachers, searchQuery, departmentFilter, statusFilter, typeFilter]);

  const exportCSV = () => {
    const headers =
      "Staff ID,Full Name,Email,Phone,Academic Title,Role,Department,Employment Type,Assigned Courses,Hire Date,Status\n";
    const rows = filteredTeachers
      .map((t) => {
        const courseCodes = t.assigned_courses.map((c) => c.course_code).join("; ");
        return `"${t.staff_number}","${t.full_name.replace(/"/g, '""')}","${t.email}","${t.phone}","${t.job_title.replace(/"/g, '""')}","${t.role_name}","${(t.department_name || "Unassigned").replace(/"/g, '""')}","${t.employment_type}","${courseCodes}","${t.hire_date}","${t.status}"`;
      })
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faculty_directory_${todayIso}.csv`;
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
            <span className="text-[#1E293B] font-semibold">Faculty & Teachers</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Teaching Faculty & Academic Staff
          </h1>
          <p className="text-xs text-[#64748B]">
            Create, edit, and delete professors, lecturers, department heads, and course teaching assignments.
          </p>
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
            <span>Add Faculty Member</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Total Faculty
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.total}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Academic & teaching staff</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#3B82F6] flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Active Faculty
            </p>
            <p className="text-2xl font-bold text-[#059669] mt-1">{stats.active}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Currently in service</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Full-Time Faculty
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.fullTime}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {stats.total - stats.fullTime} adjunct / contract
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Assigned Courses
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {stats.assignedCoursesCount}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Active term offerings</p>
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
            placeholder="Search by faculty name, staff ID, email, academic rank, or department..."
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
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              {EMPLOYMENT_TYPES.map((t) => (
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
            title="Refresh Faculty"
            className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Academic Rank & Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned Courses</th>
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
                      <span>Loading live faculty records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTeachers.length > 0 ? (
                filteredTeachers.map((t) => {
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
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1E293B]">{t.job_title}</div>
                        <div className="text-[10px] text-[#64748B]">{t.role_name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#475569]">
                        {t.department_name || (
                          <span className="text-[#94A3B8]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {t.assigned_courses.length > 0 ? (
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
                            title="Edit Faculty & Courses"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#334155] hover:text-[#2563EB] border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            title="Delete Faculty Member"
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
                      ? 'No faculty members registered yet. Click "Add Faculty Member" to create the first faculty record.'
                      : "No faculty records match your active search or filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Faculty Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  {modalMode === "edit"
                    ? `Edit Faculty Member — ${editingTeacher?.staff_number}`
                    : "Add New Faculty Member"}
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  {modalMode === "edit"
                    ? "Update academic rank, department placement, RBAC role, and course teaching load."
                    : "Provisions a live Supabase Auth account, academic staff record, and course assignments."}
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

            <form
              onSubmit={handleSaveTeacher}
              className="p-6 space-y-4 overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Kwame Asare"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Faculty Staff ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FAC20260001"
                    value={formData.staff_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        staff_number: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Institutional Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. k.asare@university.edu.gh"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +233 20 000 0000"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Academic Rank / Title <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={
                      ACADEMIC_RANKS.includes(formData.job_title)
                        ? formData.job_title
                        : "Senior Lecturer"
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  >
                    {ACADEMIC_RANKS.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Academic Portal Role
                  </label>
                  <select
                    value={formData.role_code}
                    onChange={(e) =>
                      setFormData({ ...formData, role_code: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  >
                    {roles.length > 0 ? (
                      roles.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="lecturer">Lecturer</option>
                        <option value="head_of_department">Head of Department</option>
                        <option value="dean">Faculty Dean</option>
                        <option value="academic_advisor">Academic Advisor</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) =>
                      setFormData({ ...formData, department_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
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
                    Salary Grade (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ACAD-SL-04"
                    value={formData.salary_grade}
                    onChange={(e) =>
                      setFormData({ ...formData, salary_grade: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>
              </div>

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
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  >
                    {EMPLOYMENT_TYPES.map((t) => (
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
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
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
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  >
                    {STAFF_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Course Assignments */}
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
                            onChange={() => toggleCourseSelection(course.id)}
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
                    No active courses found in catalogue yet. You can create courses under Courses & Subjects and assign them here.
                  </div>
                )}
              </div>

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
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
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
                      : "Add Faculty Member"}
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
                    Delete Faculty Member
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Are you sure you want to permanently delete{" "}
                    <span className="font-bold text-[#1E293B]">
                      {deleteTarget.full_name}
                    </span>{" "}
                    (<span className="font-mono">{deleteTarget.staff_number}</span>)?
                    This removes their faculty record, course assignments, and linked
                    portal login account.
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
