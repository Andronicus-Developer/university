"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Award,
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
  BookOpen,
  Building2,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";

interface ProgramItem {
  id: string;
  department_id: string;
  code: string;
  name: string;
  degree_level: string;
  duration_years: number;
  total_credits: number;
  is_active: boolean;
  department_name: string;
  department_code: string;
  created_at?: string;
  updated_at?: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
}

interface ProgramStats {
  totalPrograms: number;
  activePrograms: number;
  undergraduateCount: number;
  postgraduateCount: number;
  diplomaCount: number;
}

const DEGREE_LEVEL_OPTIONS = [
  { value: "undergraduate", label: "Undergraduate (Bachelor's)" },
  { value: "postgraduate", label: "Postgraduate (Master's / Ph.D.)" },
  { value: "diploma", label: "Diploma" },
  { value: "certificate", label: "Certificate" },
  { value: "doctorate", label: "Doctorate / Ph.D." },
];

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [stats, setStats] = useState<ProgramStats>({
    totalPrograms: 0,
    activePrograms: 0,
    undergraduateCount: 0,
    postgraduateCount: 0,
    diplomaCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  // Notifications
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Selected for edit/delete
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    departmentId: "",
    degreeLevel: "undergraduate",
    durationYears: 4,
    totalCredits: 120,
    isActive: true,
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/programs");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load academic programs");
      }

      setPrograms(data.programs || []);
      setDepartments(data.departments || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error("Error loading programs:", err);
      showNotification("error", err.message || "Failed to load academic programs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.department_name.toLowerCase().includes(q) ||
        p.department_code.toLowerCase().includes(q);

      const matchesLevel =
        levelFilter === "all" ||
        (levelFilter === "undergraduate" &&
          ["undergraduate", "bachelor"].includes(p.degree_level.toLowerCase())) ||
        (levelFilter === "postgraduate" &&
          ["postgraduate", "master", "doctorate"].includes(p.degree_level.toLowerCase())) ||
        (levelFilter === "diploma" &&
          ["diploma", "certificate"].includes(p.degree_level.toLowerCase()));

      const matchesDept = deptFilter === "all" || p.department_id === deptFilter;

      return matchesSearch && matchesLevel && matchesDept;
    });
  }, [programs, searchQuery, levelFilter, deptFilter]);

  // Handle Open Create
  const handleOpenAddModal = () => {
    setFormData({
      code: "",
      name: "",
      departmentId: departments[0]?.id || "",
      degreeLevel: "undergraduate",
      durationYears: 4,
      totalCredits: 120,
      isActive: true,
    });
    setShowAddModal(true);
  };

  // Handle Open Edit
  const handleOpenEditModal = (prog: ProgramItem) => {
    setSelectedProgram(prog);
    setFormData({
      code: prog.code,
      name: prog.name,
      departmentId: prog.department_id,
      degreeLevel: prog.degree_level,
      durationYears: prog.duration_years,
      totalCredits: prog.total_credits,
      isActive: prog.is_active,
    });
    setShowEditModal(true);
  };

  // Handle Open Delete
  const handleOpenDeleteModal = (prog: ProgramItem) => {
    setSelectedProgram(prog);
    setShowDeleteModal(true);
  };

  // Create Program
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification("error", "Program code and program name are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code.trim(),
          name: formData.name.trim(),
          department_id: formData.departmentId,
          degree_level: formData.degreeLevel,
          duration_years: Number(formData.durationYears),
          total_credits: Number(formData.totalCredits),
          is_active: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create program");
      }

      showNotification("success", `Program ${formData.code.toUpperCase()} created successfully!`);
      setShowAddModal(false);
      await fetchPrograms();
    } catch (err: any) {
      console.error("Create program error:", err);
      showNotification("error", err.message || "Failed to create program");
    } finally {
      setSaving(false);
    }
  };

  // Update Program
  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;

    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification("error", "Program code and program name are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/programs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProgram.id,
          code: formData.code.trim(),
          name: formData.name.trim(),
          department_id: formData.departmentId,
          degree_level: formData.degreeLevel,
          duration_years: Number(formData.durationYears),
          total_credits: Number(formData.totalCredits),
          is_active: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update program");
      }

      showNotification("success", `Program ${formData.code.toUpperCase()} updated successfully!`);
      setShowEditModal(false);
      setSelectedProgram(null);
      await fetchPrograms();
    } catch (err: any) {
      console.error("Update program error:", err);
      showNotification("error", err.message || "Failed to update program");
    } finally {
      setSaving(false);
    }
  };

  // Delete Program
  const handleDeleteProgram = async () => {
    if (!selectedProgram) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/programs?id=${selectedProgram.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete program");
      }

      showNotification("success", `Program ${selectedProgram.code} removed successfully!`);
      setShowDeleteModal(false);
      setSelectedProgram(null);
      await fetchPrograms();
    } catch (err: any) {
      console.error("Delete program error:", err);
      showNotification("error", err.message || "Failed to delete program");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-700 hover:underline">
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span>Academics & Schedule</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold">Programs</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Award className="h-6 w-6 text-blue-600" />
            <span>Academic Programs Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure degree offerings, curricular duration, and graduation credit requirements in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPrograms}
            title="Refresh programs"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Program</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Programs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {stats.totalPrograms}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Total Academic Programs
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Active Programs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-600 leading-tight">
                {stats.activePrograms}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Active & Enrolling
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Undergraduate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-indigo-600 leading-tight">
                {stats.undergraduateCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Undergraduate Degrees
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Postgraduate & Diplomas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-purple-600 leading-tight">
                {stats.postgraduateCount + stats.diplomaCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Postgraduate & Diplomas
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by program name, code, or department..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Level Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setLevelFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              levelFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Degrees
          </button>
          <button
            onClick={() => setLevelFilter("undergraduate")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              levelFilter === "undergraduate"
                ? "bg-white text-indigo-600 shadow-2xs"
                : "text-slate-600 hover:text-indigo-600"
            }`}
          >
            Undergraduate
          </button>
          <button
            onClick={() => setLevelFilter("postgraduate")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              levelFilter === "postgraduate"
                ? "bg-white text-purple-600 shadow-2xs"
                : "text-slate-600 hover:text-purple-600"
            }`}
          >
            Postgraduate
          </button>
          <button
            onClick={() => setLevelFilter("diploma")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              levelFilter === "diploma"
                ? "bg-white text-emerald-600 shadow-2xs"
                : "text-slate-600 hover:text-emerald-600"
            }`}
          >
            Diploma
          </button>
        </div>

        {/* Department Filter Dropdown */}
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Programs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Program Code</th>
                <th className="py-3 px-4">Program Title</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading academic programs from Supabase...</span>
                  </td>
                </tr>
              ) : filteredPrograms.length > 0 ? (
                filteredPrograms.map((prog) => (
                  <tr key={prog.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {prog.code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{prog.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{prog.department_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({prog.department_code})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ["undergraduate", "bachelor"].includes(prog.degree_level.toLowerCase())
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : ["postgraduate", "master", "doctorate"].includes(prog.degree_level.toLowerCase())
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {prog.degree_level}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{prog.duration_years} {prog.duration_years === 1 ? "Year" : "Years"}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {prog.total_credits} Credits
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          prog.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            prog.is_active ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {prog.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(prog)}
                          title="Edit Program"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(prog)}
                          title="Delete Program"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-600">No academic programs found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery
                        ? "Try adjusting your search query or degree level filter."
                        : "Click 'Add Program' above to register the first academic program."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD PROGRAM                                                      */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Award className="h-5 w-5 text-blue-600" />
                <span>Add Academic Program</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Program Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. BSC-CS"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Program Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. B.Sc. Computer Science"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Academic Department *
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Degree Level
                    </label>
                    <select
                      value={formData.degreeLevel}
                      onChange={(e) => setFormData({ ...formData, degreeLevel: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    >
                      {DEGREE_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Duration (Years)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={formData.durationYears}
                      onChange={(e) => setFormData({ ...formData, durationYears: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Total Credits Req.
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={formData.totalCredits}
                      onChange={(e) => setFormData({ ...formData, totalCredits: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Active Program (Available for new student admissions)
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <span>Save Program</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PROGRAM                                                     */}
      {/* ========================================================================= */}
      {showEditModal && selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Edit2 className="h-5 w-5 text-blue-600" />
                <span>Edit Academic Program ({selectedProgram.code})</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProgram} className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Program Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. BSC-CS"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Program Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. B.Sc. Computer Science"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Academic Department *
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Degree Level
                    </label>
                    <select
                      value={formData.degreeLevel}
                      onChange={(e) => setFormData({ ...formData, degreeLevel: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    >
                      {DEGREE_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Duration (Years)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={formData.durationYears}
                      onChange={(e) => setFormData({ ...formData, durationYears: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Total Credits Req.
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={formData.totalCredits}
                      onChange={(e) => setFormData({ ...formData, totalCredits: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Active Program (Available for new student admissions)
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION                                              */}
      {/* ========================================================================= */}
      {showDeleteModal && selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-14 px-6 border-b border-slate-100 bg-red-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-red-700 text-sm">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>Delete Program</span>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete the program{" "}
                <strong className="text-slate-900 font-bold">
                  {selectedProgram.name} ({selectedProgram.code})
                </strong>{" "}
                from Supabase database?
              </p>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] leading-relaxed">
                <strong>Warning:</strong> This will delete this program and its associated curriculum versions.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProgram}
                  disabled={deleting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Program</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
