"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit2,
  GraduationCap,
  Info,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  type CanonicalSchoolType,
  getSchoolTerminology,
  getSchoolTypeLabel,
  normalizeSchoolType,
} from "@/lib/academics/school-terminology";

interface SchoolOption {
  id: string;
  name: string;
  code: string;
  school_type: CanonicalSchoolType;
}

interface DepartmentItem {
  id: string;
  school_id: string;
  name: string;
  code: string;
}

interface ProgramItem {
  id: string;
  school_id: string;
  school_name: string;
  school_code: string;
  school_type?: CanonicalSchoolType;
  department_id: string | null;
  code: string;
  name: string;
  degree_level: string;
  duration_years: number;
  total_credits: number;
  is_active: boolean;
  department_name: string;
  department_code: string;
}

interface ProgramStats {
  totalPrograms: number;
  activePrograms: number;
  undergraduateCount: number;
  postgraduateCount: number;
  diplomaCount: number;
}

function getHelperToneClasses(tone: "blue" | "emerald" | "amber" | "red"): string {
  if (tone === "emerald") {
    return "bg-emerald-50 border-emerald-200 text-emerald-800";
  }
  if (tone === "amber") {
    return "bg-amber-50 border-amber-200 text-amber-800";
  }
  if (tone === "red") {
    return "bg-red-50 border-red-200 text-red-800";
  }
  return "bg-blue-50 border-blue-200 text-blue-800";
}

function getSchoolTagClasses(schoolType?: string | null): string {
  const canonical = normalizeSchoolType(schoolType);
  if (canonical === "high_school") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (canonical === "vocational_school") {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  return "bg-blue-50 text-blue-700 border border-blue-200";
}

export function SuperAdminProgramsManager() {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
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
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
  const [formData, setFormData] = useState({
    schoolId: "",
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
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/programs", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load programs");
      }

      setPrograms(data.programs || []);
      setDepartments(data.departments || []);
      setSchools(
        Array.isArray(data.schools)
          ? data.schools.map((s: any) => ({
              ...s,
              school_type: normalizeSchoolType(s.school_type),
            }))
          : []
      );
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to load programs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const selectedFilterSchool = useMemo(() => {
    if (schoolFilter === "all") return null;
    return schools.find((s) => s.id === schoolFilter) || null;
  }, [schoolFilter, schools]);

  const selectedFilterTerm = useMemo(
    () =>
      selectedFilterSchool
        ? getSchoolTerminology(selectedFilterSchool.school_type).programs
        : null,
    [selectedFilterSchool]
  );

  const selectedModalSchool = useMemo(() => {
    if (!formData.schoolId) return null;
    return schools.find((s) => s.id === formData.schoolId) || null;
  }, [schools, formData.schoolId]);

  const selectedModalTerm = useMemo(
    () =>
      selectedModalSchool
        ? getSchoolTerminology(selectedModalSchool.school_type).programs
        : getSchoolTerminology("university").programs,
    [selectedModalSchool]
  );

  const isModalSchoolIneligible = Boolean(
    selectedModalSchool && !selectedModalTerm.allowed
  );
  const showDeptFieldInModal = selectedModalSchool
    ? selectedModalTerm.showDepartmentField
    : true;

  const modalLevelOptions = useMemo(() => {
    const base = selectedModalTerm.levelOptions;
    if (
      formData.degreeLevel &&
      !base.some((o) => o.value === formData.degreeLevel)
    ) {
      return [{ value: formData.degreeLevel, label: formData.degreeLevel }, ...base];
    }
    return base;
  }, [selectedModalTerm.levelOptions, formData.degreeLevel]);

  const visibleFilterDepts = useMemo(() => {
    if (schoolFilter === "all") return departments;
    if (selectedFilterSchool?.school_type === "high_school") return [];
    return departments.filter((d) => d.school_id === schoolFilter);
  }, [departments, schoolFilter, selectedFilterSchool]);

  const modalSchoolDepts = useMemo(() => {
    if (!formData.schoolId || !showDeptFieldInModal) return [];
    return departments.filter((d) => d.school_id === formData.schoolId);
  }, [departments, formData.schoolId, showDeptFieldInModal]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.department_name.toLowerCase().includes(q) ||
        p.department_code.toLowerCase().includes(q) ||
        p.school_name.toLowerCase().includes(q) ||
        p.school_code.toLowerCase().includes(q);

      const matchesLevel =
        levelFilter === "all" ||
        (levelFilter === "undergraduate" &&
          ["undergraduate", "bachelor"].includes(p.degree_level.toLowerCase())) ||
        (levelFilter === "postgraduate" &&
          ["postgraduate", "master", "doctorate"].includes(p.degree_level.toLowerCase())) ||
        (levelFilter === "diploma" &&
          ["diploma", "certificate"].includes(p.degree_level.toLowerCase()));

      const matchesSchool = schoolFilter === "all" || p.school_id === schoolFilter;
      const matchesDept = deptFilter === "all" || p.department_id === deptFilter;

      return matchesSearch && matchesLevel && matchesSchool && matchesDept;
    });
  }, [programs, searchQuery, levelFilter, schoolFilter, deptFilter]);

  const handleOpenAddModal = () => {
    const filteredSchool =
      schoolFilter !== "all"
        ? schools.find((s) => s.id === schoolFilter)
        : null;
    const defaultSchool =
      filteredSchool && getSchoolTerminology(filteredSchool.school_type).programs.allowed
        ? filteredSchool
        : schools.find(
            (s) => getSchoolTerminology(s.school_type).programs.allowed
          ) || null;

    const defaultSchoolId = defaultSchool?.id || "";
    const defaultTerm = getSchoolTerminology(defaultSchool?.school_type).programs;
    const matchingDepts = defaultTerm.showDepartmentField
      ? departments.filter((d) => d.school_id === defaultSchoolId)
      : [];

    setFormData({
      schoolId: defaultSchoolId,
      code: "",
      name: "",
      departmentId: matchingDepts[0]?.id || "",
      degreeLevel: defaultTerm.defaultLevel,
      durationYears: defaultTerm.defaultDurationYears,
      totalCredits: defaultTerm.defaultCredits,
      isActive: true,
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (prog: ProgramItem) => {
    setSelectedProgram(prog);
    setFormData({
      schoolId: prog.school_id || "",
      code: prog.code,
      name: prog.name,
      departmentId: prog.department_id || "",
      degreeLevel: prog.degree_level,
      durationYears: prog.duration_years,
      totalCredits: prog.total_credits,
      isActive: prog.is_active,
    });
    setShowEditModal(true);
  };

  const handleSchoolSelectInModal = (newSchoolId: string) => {
    const nextSchool = schools.find((s) => s.id === newSchoolId);
    const nextTerm = getSchoolTerminology(nextSchool?.school_type).programs;
    const schoolDepts = nextTerm.showDepartmentField
      ? departments.filter((d) => d.school_id === newSchoolId)
      : [];
    const currentStillValid = schoolDepts.some((d) => d.id === formData.departmentId);

    const levelStillInOptions = nextTerm.levelOptions.some(
      (o) => o.value === formData.degreeLevel
    );

    setFormData({
      ...formData,
      schoolId: newSchoolId,
      departmentId: !nextTerm.showDepartmentField
        ? ""
        : currentStillValid
        ? formData.departmentId
        : schoolDepts[0]?.id || "",
      ...(showEditModal
        ? {}
        : {
            degreeLevel: levelStillInOptions
              ? formData.degreeLevel
              : nextTerm.defaultLevel,
            durationYears: nextTerm.defaultDurationYears,
            totalCredits: nextTerm.defaultCredits,
          }),
    });
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolId) {
      showNotification("error", "Please select a school for this program.");
      return;
    }
    if (selectedModalSchool && !selectedModalTerm.allowed) {
      showNotification("error", selectedModalTerm.superAdminHelperBadge);
      return;
    }
    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification("error", "Code and name are required.");
      return;
    }

    const isEdit = showEditModal && selectedProgram;
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/programs", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: selectedProgram.id } : {}),
          school_id: formData.schoolId,
          code: formData.code.trim(),
          name: formData.name.trim(),
          department_id: showDeptFieldInModal ? formData.departmentId || null : null,
          degree_level: formData.degreeLevel,
          duration_years: Number(formData.durationYears),
          total_credits: Number(formData.totalCredits),
          is_active: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save program");
      }

      showNotification(
        "success",
        isEdit
          ? `${formData.code.toUpperCase()} updated successfully!`
          : `${formData.code.toUpperCase()} created successfully!`
      );
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedProgram(null);
      await fetchPrograms();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save program");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgram = async () => {
    if (!selectedProgram) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/superadmin/programs?id=${encodeURIComponent(selectedProgram.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete program");
      }

      showNotification(
        "success",
        `Program ${selectedProgram.code} removed successfully!`
      );
      setShowDeleteModal(false);
      setSelectedProgram(null);
      await fetchPrograms();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete program");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
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
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-75 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link
              href="/superadmin/dashboard"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              System Overview
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span>Cross-Tenant Academics</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold">Programs</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Award className="h-6 w-6 text-blue-600" />
            <span>Global Academic Programs Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, edit, filter, and assign programs or classes across eligible schools (Universities and High Schools).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPrograms}
            title="Refresh programs"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`}
            />
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Filters */}
      <div className="space-y-2.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by program code, title, department, or school..."
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

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
            {[
              { id: "all", label: "All Levels" },
              { id: "undergraduate", label: "Undergraduate" },
              { id: "postgraduate", label: "Postgraduate" },
              { id: "diploma", label: "Diploma" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLevelFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  levelFilter === tab.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {schools.length > 0 && (
            <select
              value={schoolFilter}
              onChange={(e) => {
                const nextSchool = e.target.value;
                setSchoolFilter(nextSchool);
                if (nextSchool !== "all") {
                  const stillValid = departments.some(
                    (d) => d.id === deptFilter && d.school_id === nextSchool
                  );
                  if (!stillValid) setDeptFilter("all");
                }
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="all">All Schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) — {getSchoolTypeLabel(s.school_type)}
                </option>
              ))}
            </select>
          )}

          {visibleFilterDepts.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="all">All Departments</option>
              {visibleFilterDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedFilterSchool && selectedFilterTerm && (
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${getHelperToneClasses(
              selectedFilterTerm.superAdminBadgeTone
            )}`}
          >
            {selectedFilterTerm.allowed ? (
              <Info className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>
              <strong>{selectedFilterSchool.name}:</strong>{" "}
              {selectedFilterTerm.superAdminHelperBadge}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Program / Class Title</th>
                <th className="py-3 px-4">School</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Level / Track</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Credits / Units</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading programs across all schools...</span>
                  </td>
                </tr>
              ) : filteredPrograms.length > 0 ? (
                filteredPrograms.map((prog) => {
                  const rowProgTerm = getSchoolTerminology(prog.school_type).programs;
                  const isRowHighSchool =
                    normalizeSchoolType(prog.school_type) === "high_school";
                  return (
                    <tr key={prog.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {prog.code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {prog.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">
                            {prog.school_name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {prog.school_code}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSchoolTagClasses(
                              prog.school_type
                            )}`}
                          >
                            {rowProgTerm.superAdminRowTag}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {isRowHighSchool ? (
                          <span className="text-slate-400 italic">N/A (High School)</span>
                        ) : (
                          <>
                            <span>{prog.department_name}</span>{" "}
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({prog.department_code})
                            </span>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {prog.degree_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>
                            {prog.duration_years}{" "}
                            {prog.duration_years === 1 ? "Year" : "Years"}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {prog.total_credits} {rowProgTerm.creditsUnit}
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
                            onClick={() => {
                              setSelectedProgram(prog);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Program"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-600">
                      No academic programs found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery || schoolFilter !== "all"
                        ? "Try adjusting your search or filter selections."
                        : "Click 'Add Program' above to assign a program or class to a school."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {(showAddModal || (showEditModal && selectedProgram)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Award className="h-5 w-5 text-blue-600" />
                <span>
                  {showEditModal && selectedProgram
                    ? `Edit ${selectedModalTerm.singular} (${selectedProgram.code})`
                    : `Add ${selectedModalTerm.singular}`}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Assign School *
                    </label>
                    <select
                      required
                      value={formData.schoolId}
                      onChange={(e) => handleSchoolSelectInModal(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    >
                      <option value="">Select a school...</option>
                      {schools.map((s) => {
                        const eligible = getSchoolTerminology(s.school_type).programs
                          .allowed;
                        return (
                          <option key={s.id} value={s.id} disabled={!eligible}>
                            {s.name} ({s.code}) — {getSchoolTypeLabel(s.school_type)}
                            {!eligible ? " (Not eligible — use Departments)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedModalSchool && (
                    <div
                      className={`px-3 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-2 ${getHelperToneClasses(
                        selectedModalTerm.superAdminBadgeTone
                      )}`}
                    >
                      {selectedModalTerm.allowed ? (
                        <Info className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{selectedModalTerm.superAdminHelperBadge}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {selectedModalTerm.codeLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder={selectedModalTerm.codePlaceholder}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {selectedModalTerm.nameLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={selectedModalTerm.namePlaceholder}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                {showDeptFieldInModal && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Academic Department (Filtered to selected school)
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) =>
                        setFormData({ ...formData, departmentId: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    >
                      <option value="">Unassigned / General</option>
                      {modalSchoolDepts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {selectedModalTerm.levelLabel}
                    </label>
                    <select
                      value={formData.degreeLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, degreeLevel: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    >
                      {modalLevelOptions.map((opt) => (
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
                      onChange={(e) =>
                        setFormData({ ...formData, durationYears: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {selectedModalTerm.creditsLabel}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={formData.totalCredits}
                      onChange={(e) =>
                        setFormData({ ...formData, totalCredits: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {selectedModalTerm.activeCheckboxLabel}
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || isModalSchoolIneligible}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>
                      {showEditModal ? "Save Changes" : `Save ${selectedModalTerm.singular}`}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
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
                Are you sure you want to permanently delete the record{" "}
                <strong className="text-slate-900 font-bold">
                  {selectedProgram.name} ({selectedProgram.code})
                </strong>{" "}
                from{" "}
                <strong className="text-slate-900 font-bold">
                  {selectedProgram.school_name}
                </strong>
                ?
              </p>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] leading-relaxed">
                <strong>Warning:</strong> This deletes the record and any linked curriculum versions.
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
                    <span>Delete</span>
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
