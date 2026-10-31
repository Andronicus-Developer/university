"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Award,
  UserCheck,
  Phone,
} from "lucide-react";

interface StudentRecord {
  id: string;
  profile_id: string;
  student_number: string;
  full_name: string;
  email: string;
  phone: string;
  account_status: string;
  programme_id: string;
  programme_name: string;
  programme_code: string;
  degree_level: string;
  entry_term_id: string | null;
  entry_term_name: string;
  cohort_year: number;
  current_level: number;
  status: string;
  admission_date: string;
  gpa: number;
  cgpa: number;
}

interface ProgrammeOption {
  id: string;
  name: string;
  code: string;
  degree_level: string;
  is_active: boolean;
}

interface TermOption {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface StudentStats {
  total: number;
  active: number;
  admitted: number;
  graduated: number;
  inactive: number;
  avgCgpa: number;
}

interface StudentFormState {
  full_name: string;
  email: string;
  phone: string;
  student_number: string;
  programme_id: string;
  entry_term_id: string;
  cohort_year: number;
  current_level: number;
  status: string;
  admission_date: string;
  gpa: string;
  cgpa: string;
  password: string;
}

const STUDENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "admitted", label: "Admitted" },
  { value: "deferred", label: "Deferred" },
  { value: "leave_of_absence", label: "Leave of Absence" },
  { value: "suspended", label: "Suspended" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "completed", label: "Completed" },
  { value: "graduated", label: "Graduated" },
];

const LEVEL_OPTIONS = [100, 200, 300, 400, 500, 600, 700, 800];

function statusBadgeStyle(status: string) {
  switch (status) {
    case "active":
      return "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]";
    case "admitted":
      return "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]";
    case "graduated":
    case "completed":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "suspended":
    case "withdrawn":
    case "deceased":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]";
  }
}

function generateNextStudentNumber(existing: StudentRecord[], year: number) {
  const prefix = `STU${year}`;
  let maxSeq = 0;
  for (const s of existing) {
    if (s.student_number.toUpperCase().startsWith(prefix)) {
      const numPart = parseInt(s.student_number.slice(prefix.length), 10);
      if (!Number.isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export default function StudentsManagementPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [stats, setStats] = useState<StudentStats>({
    total: 0,
    active: 0,
    admitted: 0,
    graduated: 0,
    inactive: 0,
    avgCgpa: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal states
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);

  const [currentYear, setCurrentYear] = useState(2026);
  const [todayIso, setTodayIso] = useState("2026-10-31");

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    setTodayIso(new Date().toISOString().split("T")[0]);
  }, []);

  const [formData, setFormData] = useState<StudentFormState>({
    full_name: "",
    email: "",
    phone: "",
    student_number: "",
    programme_id: "",
    entry_term_id: "",
    cohort_year: currentYear,
    current_level: 100,
    status: "active",
    admission_date: todayIso,
    gpa: "0.00",
    cgpa: "0.00",
    password: "",
  });

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to load student records.");
        return;
      }

      setStudents(data.students || []);
      setProgrammes(data.programmes || []);
      setTerms(data.terms || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error loading student records.");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const openCreateModal = () => {
    const defaultProg = programmes[0]?.id || "";
    const activeTerm = terms.find((t) => t.is_active)?.id || terms[0]?.id || "";
    setEditingStudent(null);
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      student_number: generateNextStudentNumber(students, currentYear),
      programme_id: defaultProg,
      entry_term_id: activeTerm,
      cohort_year: currentYear,
      current_level: 100,
      status: "active",
      admission_date: todayIso,
      gpa: "0.00",
      cgpa: "0.00",
      password: "",
    });
    setModalMode("create");
  };

  const openEditModal = (student: StudentRecord) => {
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name,
      email: student.email,
      phone: student.phone || "",
      student_number: student.student_number,
      programme_id: student.programme_id,
      entry_term_id: student.entry_term_id || "",
      cohort_year: student.cohort_year,
      current_level: student.current_level,
      status: student.status,
      admission_date: student.admission_date || todayIso,
      gpa: student.gpa.toFixed(2),
      cgpa: student.cgpa.toFixed(2),
      password: "",
    });
    setModalMode("edit");
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.programme_id) {
      showNotification(
        "error",
        "Please select an academic programme before saving the student record."
      );
      return;
    }

    setSaving(true);
    try {
      const isEdit = modalMode === "edit" && editingStudent;
      const res = await fetch("/api/admin/students", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editingStudent.id } : {}),
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          student_number: formData.student_number,
          programme_id: formData.programme_id,
          entry_term_id: formData.entry_term_id || null,
          cohort_year: Number(formData.cohort_year),
          current_level: Number(formData.current_level),
          status: formData.status,
          admission_date: formData.admission_date,
          gpa: parseFloat(formData.gpa) || 0,
          cgpa: parseFloat(formData.cgpa) || 0,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Unable to save student record.");
        return;
      }

      showNotification(
        "success",
        isEdit
          ? `Student "${formData.full_name}" (${formData.student_number}) updated successfully.`
          : `Student "${formData.full_name}" (${formData.student_number}) registered successfully.`
      );
      setModalMode(null);
      setEditingStudent(null);
      await fetchStudents();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while saving student.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/students?id=${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to delete student record.");
        return;
      }

      showNotification(
        "success",
        `Student "${deleteTarget.full_name}" (${deleteTarget.student_number}) deleted from database.`
      );
      setDeleteTarget(null);
      await fetchStudents();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while deleting student.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        s.student_number.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.programme_name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesProg =
        programmeFilter === "all" || s.programme_id === programmeFilter;
      const matchesLevel =
        levelFilter === "all" || s.current_level === Number(levelFilter);
      return matchesSearch && matchesStatus && matchesProg && matchesLevel;
    });
  }, [students, searchQuery, statusFilter, programmeFilter, levelFilter]);

  const exportCSV = () => {
    const headers =
      "Student Number,Full Name,Email,Phone,Programme,Level,Cohort,CGPA,Status,Admission Date\n";
    const rows = filteredStudents
      .map(
        (s) =>
          `"${s.student_number}","${s.full_name.replace(/"/g, '""')}","${s.email}","${s.phone}","${s.programme_name.replace(/"/g, '""')}",${s.current_level},${s.cohort_year},${s.cgpa.toFixed(2)},"${s.status}","${s.admission_date}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_directory_${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <Link href="/admin/dashboard" className="text-[#3B82F6] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Student Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Authoritative Student Records
          </h1>
          <p className="text-xs text-[#64748B]">
            Create, edit, and delete student accounts, academic programme placements, and lifecycle statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={filteredStudents.length === 0}
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
            <span>Add New Student</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Total Students
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.total}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Registered in database
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#3B82F6] flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Active & Admitted
            </p>
            <p className="text-2xl font-bold text-[#059669] mt-1">
              {stats.active + stats.admitted}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {stats.active} active · {stats.admitted} newly admitted
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Graduated / Completed
            </p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.graduated}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {stats.inactive} deferred / inactive
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Average CGPA
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">
              {stats.avgCgpa.toFixed(2)}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">4.00 cumulative scale</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
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

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student number, name, email, phone, or programme..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <Filter className="h-3.5 w-3.5 text-[#94A3B8]" />
            <select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Levels</option>
              {LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  Level {lvl}
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
              {STUDENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchStudents}
            title="Refresh Students"
            className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Programme</th>
                <th className="py-3 px-4">Level & Cohort</th>
                <th className="py-3 px-4">CGPA</th>
                <th className="py-3 px-4">Admission Date</th>
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
                      <span>Loading live student database records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((s) => {
                  const initials = s.full_name
                    ? s.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "ST";

                  return (
                    <tr key={s.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#1E293B]">{s.full_name}</div>
                            <div className="text-[11px] text-[#64748B]">{s.email}</div>
                            {s.phone && (
                              <div className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
                                <Phone className="h-2.5 w-2.5" />
                                <span>{s.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#334155]">
                        {s.student_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#1E293B]">
                          {s.programme_name || "Unassigned"}
                        </div>
                        {s.programme_code && (
                          <div className="text-[10px] font-mono text-[#64748B]">
                            {s.programme_code}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#334155]">
                          Level {s.current_level}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Cohort {s.cohort_year}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#334155]">
                        {s.cgpa.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">{s.admission_date}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeStyle(
                            s.status
                          )}`}
                        >
                          {s.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(s)}
                            title="Edit Student"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#334155] hover:text-[#2563EB] border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            title="Delete Student"
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
                    {students.length === 0
                      ? 'No students registered yet. Click "Add New Student" to create the first student record.'
                      : "No student records match your active search or filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Student Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  {modalMode === "edit"
                    ? `Edit Student — ${editingStudent?.student_number}`
                    : "Register New Student"}
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  {modalMode === "edit"
                    ? "Update authoritative academic, profile, and portal login details."
                    : "Provisions a live Supabase Auth account, user profile, student role, and academic record."}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setEditingStudent(null);
                }}
                className="text-[#94A3B8] hover:text-[#1E293B] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveStudent}
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
                    placeholder="e.g. Ama Mensah"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Student Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STU20260001"
                    value={formData.student_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        student_number: e.target.value.toUpperCase(),
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
                    placeholder="e.g. ama.mensah@university.edu.gh"
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
                    placeholder="e.g. +233 24 000 0000"
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
                    Academic Programme <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.programme_id}
                    onChange={(e) =>
                      setFormData({ ...formData, programme_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  >
                    <option value="">Select programme...</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Entry Term
                  </label>
                  <select
                    value={formData.entry_term_id}
                    onChange={(e) =>
                      setFormData({ ...formData, entry_term_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  >
                    <option value="">Default active term</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Current Level
                  </label>
                  <select
                    value={formData.current_level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        current_level: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  >
                    {LEVEL_OPTIONS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Level {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Cohort Year
                  </label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    required
                    value={formData.cohort_year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cohort_year: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Enrolment Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  >
                    {STUDENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Admission Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.admission_date}
                    onChange={(e) =>
                      setFormData({ ...formData, admission_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Term GPA (0.00 - 4.00)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={formData.gpa}
                    onChange={(e) =>
                      setFormData({ ...formData, gpa: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Cumulative CGPA (0.00 - 4.00)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={formData.cgpa}
                    onChange={(e) =>
                      setFormData({ ...formData, cgpa: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#1E293B] focus:outline-none focus:border-[#3B82F6] focus:bg-white"
                  />
                </div>
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
                    setEditingStudent(null);
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
                      : "Register Student"}
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
                    Delete Student Record
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Are you sure you want to permanently delete{" "}
                    <span className="font-bold text-[#1E293B]">
                      {deleteTarget.full_name}
                    </span>{" "}
                    (<span className="font-mono">{deleteTarget.student_number}</span>)?
                    This removes their student record, enrolments, and linked portal
                    authentication account.
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
