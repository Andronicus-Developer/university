"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  GraduationCap,
  Layers,
  Clock,
  Award,
} from "lucide-react";

interface CourseItem {
  id: string;
  department_id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  contact_hours: number;
  course_type: string;
  is_active: boolean;
  department_name: string;
  department_code: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
}

interface CourseStats {
  totalCourses: number;
  activeCourses: number;
  coreCourses: number;
  electiveCourses: number;
}

export default function CoursesCatalogPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [stats, setStats] = useState<CourseStats>({
    totalCourses: 0,
    activeCourses: 0,
    coreCourses: 0,
    electiveCourses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Notifications
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Selected for edit/delete
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    departmentId: "",
    credits: 3.0,
    contactHours: 3,
    courseType: "core",
    description: "",
    isActive: true,
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load courses");
      }

      setCourses(data.courses || []);
      setDepartments(data.departments || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      console.error("Error fetching courses:", err);
      showNotification("error", err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openAddModal = () => {
    setFormData({
      code: "",
      name: "",
      departmentId: departments[0]?.id || "",
      credits: 3.0,
      contactHours: 3,
      courseType: "core",
      description: "",
      isActive: true,
    });
    setShowAddModal(true);
  };

  const openEditModal = (course: CourseItem) => {
    setSelectedCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      departmentId: course.department_id,
      credits: course.credits,
      contactHours: course.contact_hours,
      courseType: course.course_type,
      description: course.description || "",
      isActive: course.is_active,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (course: CourseItem) => {
    setSelectedCourse(course);
    setShowDeleteModal(true);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification("error", "Course code and name are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          department_id: formData.departmentId || departments[0]?.id,
          credits: formData.credits,
          contact_hours: formData.contactHours,
          course_type: formData.courseType,
          description: formData.description,
          is_active: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Failed to create course");
        return;
      }

      showNotification("success", `Course ${formData.code} created successfully!`);
      setShowAddModal(false);
      fetchCourses();
    } catch (err: any) {
      showNotification("error", err.message || "Could not save course");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCourse.id,
          code: formData.code,
          name: formData.name,
          department_id: formData.departmentId,
          credits: formData.credits,
          contact_hours: formData.contactHours,
          course_type: formData.courseType,
          description: formData.description,
          is_active: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Failed to update course");
        return;
      }

      showNotification("success", `Course ${formData.code} updated successfully!`);
      setShowEditModal(false);
      fetchCourses();
    } catch (err: any) {
      showNotification("error", err.message || "Could not update course");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses?id=${encodeURIComponent(selectedCourse.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Failed to delete course");
        return;
      }

      showNotification("success", `Course ${selectedCourse.code} removed from database.`);
      setShowDeleteModal(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (err: any) {
      showNotification("error", err.message || "Could not delete course");
    } finally {
      setDeleting(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (typeFilter !== "all" && c.course_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold transition-all ${
            toast.type === "success"
              ? "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]"
              : "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Academics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Courses & Curriculum Catalog
          </h1>
          <p className="text-xs text-[#64748B]">
            Maintain authoritative university course units, credit weightings, and departmental affiliations in database.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Course</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Courses
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">{stats.totalCourses}</h3>
            <span className="text-[11px] text-emerald-600 font-medium">Catalog units</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Active Courses
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeCourses}</h3>
            <span className="text-[11px] text-[#64748B] font-medium">In active curriculum</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Core Modules
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">{stats.coreCourses}</h3>
            <span className="text-[11px] text-[#64748B] font-medium">Required study units</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Elective Modules
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">{stats.electiveCourses}</h3>
            <span className="text-[11px] text-[#64748B] font-medium">Specialized choices</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code (e.g. CS101), course title, or department..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === "all" ? "bg-white text-[#1E293B] shadow-2xs" : "hover:text-[#1E293B]"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter("core")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === "core" ? "bg-white text-blue-600 shadow-2xs" : "hover:text-blue-600"
              }`}
            >
              Core
            </button>
            <button
              onClick={() => setTypeFilter("elective")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === "elective" ? "bg-white text-indigo-600 shadow-2xs" : "hover:text-indigo-600"
              }`}
            >
              Elective
            </button>
            <button
              onClick={() => setTypeFilter("general")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === "general" ? "bg-white text-amber-600 shadow-2xs" : "hover:text-amber-600"
              }`}
            >
              General
            </button>
          </div>

          <button
            onClick={fetchCourses}
            title="Refresh courses"
            className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Course Name & Description</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Contact Hrs</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                      {c.code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1E293B]">
                      <div>{c.name}</div>
                      {c.description && (
                        <div className="text-[11px] text-[#64748B] font-normal line-clamp-1 max-w-[320px]">
                          {c.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#475569]">
                      <span className="font-medium">{c.department_name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#1E293B] font-bold">
                      {c.credits.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B]">
                      {c.contact_hours} hrs/wk
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.course_type === "core"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : c.course_type === "elective"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {c.course_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.is_active
                            ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                            : "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            c.is_active ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {c.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Course"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(c)}
                          title="Delete Course"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#94A3B8]">
                    {loading
                      ? "Querying courses catalog from Supabase..."
                      : "No courses found. Click 'Add Course' to provision one in the database."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">Provision New Course Unit</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS201"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono uppercase focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures and Algorithms"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    max={12}
                    required
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Contact Hours/Wk</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={formData.contactHours}
                    onChange={(e) => setFormData({ ...formData, contactHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Course Type</label>
                  <select
                    value={formData.courseType}
                    onChange={(e) => setFormData({ ...formData, courseType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="core">Core Required</option>
                    <option value="elective">Elective</option>
                    <option value="general">General University</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Course Description</label>
                <textarea
                  rows={2}
                  placeholder="Outline topics covered and course objectives..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Catalog Status</label>
                <select
                  value={formData.isActive ? "true" : "false"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="true">Active in Curriculum</option>
                  <option value="false">Archived / Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving to Database..." : "Save Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Edit Course: {selectedCourse.code}
                </h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCourse} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono uppercase focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    max={12}
                    required
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Contact Hours/Wk</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={formData.contactHours}
                    onChange={(e) => setFormData({ ...formData, contactHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Course Type</label>
                  <select
                    value={formData.courseType}
                    onChange={(e) => setFormData({ ...formData, courseType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="core">Core Required</option>
                    <option value="elective">Elective</option>
                    <option value="general">General University</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Course Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Catalog Status</label>
                <select
                  value={formData.isActive ? "true" : "false"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="true">Active in Curriculum</option>
                  <option value="false">Archived / Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Course Modal */}
      {showDeleteModal && selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">Delete Course Unit?</h3>
                <p className="text-xs text-[#64748B]">This removes the course from the catalog database.</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] p-3 rounded-xl border border-[#FECACA] text-xs text-[#991B1B]">
              <p>
                Are you sure you want to delete <span className="font-bold">{selectedCourse.code}</span> (
                {selectedCourse.name})?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCourse(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleting ? "Deleting..." : "Delete Course"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
