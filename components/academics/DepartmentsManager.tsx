"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle,
  ChevronRight,
  Edit2,
  Info,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
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
  school_name: string;
  school_code: string;
  school_type?: CanonicalSchoolType;
  code: string;
  name: string;
  head_of_department: string;
  description: string;
  is_active: boolean;
  programs_count: number;
  created_at?: string;
}

interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  linkedProgramsCount: number;
  withHeadCount: number;
}

interface DepartmentsManagerProps {
  mode: "admin" | "superadmin";
}

function getHelperToneClasses(tone: "blue" | "emerald" | "amber" | "red"): string {
  if (tone === "amber") {
    return "bg-amber-50 border-amber-200 text-amber-800";
  }
  if (tone === "emerald") {
    return "bg-emerald-50 border-emerald-200 text-emerald-800";
  }
  if (tone === "red") {
    return "bg-red-50 border-red-200 text-red-800";
  }
  return "bg-blue-50 border-blue-200 text-blue-800";
}

function getSchoolTagClasses(schoolType?: string | null): string {
  const canonical = normalizeSchoolType(schoolType);
  if (canonical === "vocational_school") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }
  if (canonical === "high_school") {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  return "bg-blue-50 text-blue-700 border border-blue-200";
}

export function DepartmentsManager({ mode }: DepartmentsManagerProps) {
  const router = useRouter();
  const isSuperAdmin = mode === "superadmin";
  const apiBase = isSuperAdmin ? "/api/superadmin/departments" : "/api/admin/departments";
  const dashboardHref = isSuperAdmin ? "/superadmin/dashboard" : "/admin/dashboard";

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolType, setSchoolType] = useState<CanonicalSchoolType | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [stats, setStats] = useState<DepartmentStats>({
    totalDepartments: 0,
    activeDepartments: 0,
    linkedProgramsCount: 0,
    withHeadCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [schoolFilter, setSchoolFilter] = useState("all");

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedDept, setSelectedDept] = useState<DepartmentItem | null>(null);
  const [formData, setFormData] = useState({
    schoolId: "",
    code: "",
    name: "",
    headOfDepartment: "",
    description: "",
    isActive: true,
  });

  const term = useMemo(
    () => getSchoolTerminology(isSuperAdmin ? "university" : schoolType).departments,
    [isSuperAdmin, schoolType]
  );

  const showNotification = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiBase, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to load ${term.plural.toLowerCase()}`);
      }

      if (!isSuperAdmin && data?.restricted && data?.redirectTo) {
        setIsRedirecting(true);
        router.replace(data.redirectTo);
        return;
      }

      if (data?.school_type) {
        setSchoolType(normalizeSchoolType(data.school_type));
      }

      setDepartments(data.departments || []);
      if (Array.isArray(data.schools)) {
        setSchools(
          data.schools.map((s: any) => ({
            ...s,
            school_type: normalizeSchoolType(s.school_type),
          }))
        );
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error("Error loading departments:", err);
      showNotification("error", err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [apiBase]);

  const selectedFilterSchool = useMemo(() => {
    if (!isSuperAdmin || schoolFilter === "all") return null;
    return schools.find((s) => s.id === schoolFilter) || null;
  }, [isSuperAdmin, schoolFilter, schools]);

  const selectedFilterTerm = useMemo(
    () =>
      selectedFilterSchool
        ? getSchoolTerminology(selectedFilterSchool.school_type).departments
        : null,
    [selectedFilterSchool]
  );

  const selectedModalSchool = useMemo(() => {
    if (!isSuperAdmin || !formData.schoolId) return null;
    return schools.find((s) => s.id === formData.schoolId) || null;
  }, [isSuperAdmin, schools, formData.schoolId]);

  const selectedModalTerm = useMemo(
    () =>
      selectedModalSchool
        ? getSchoolTerminology(selectedModalSchool.school_type).departments
        : null,
    [selectedModalSchool]
  );

  const isModalSchoolIneligible = Boolean(
    isSuperAdmin && selectedModalTerm && !selectedModalTerm.allowed
  );

  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.head_of_department.toLowerCase().includes(q) ||
        d.school_name.toLowerCase().includes(q) ||
        d.school_code.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && d.is_active) ||
        (statusFilter === "inactive" && !d.is_active);

      const matchesSchool =
        !isSuperAdmin || schoolFilter === "all" || d.school_id === schoolFilter;

      return matchesSearch && matchesStatus && matchesSchool;
    });
  }, [departments, searchQuery, statusFilter, schoolFilter, isSuperAdmin]);

  const handleOpenAddModal = () => {
    let defaultSchool = "";
    if (isSuperAdmin) {
      const filtered =
        schoolFilter !== "all"
          ? schools.find((s) => s.id === schoolFilter)
          : null;
      if (filtered && getSchoolTerminology(filtered.school_type).departments.allowed) {
        defaultSchool = filtered.id;
      } else {
        defaultSchool =
          schools.find(
            (s) => getSchoolTerminology(s.school_type).departments.allowed
          )?.id || "";
      }
    }

    setFormData({
      schoolId: defaultSchool,
      code: "",
      name: "",
      headOfDepartment: "",
      description: "",
      isActive: true,
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (dept: DepartmentItem) => {
    setSelectedDept(dept);
    setFormData({
      schoolId: dept.school_id || "",
      code: dept.code,
      name: dept.name,
      headOfDepartment: dept.head_of_department || "",
      description: dept.description || "",
      isActive: dept.is_active,
    });
    setShowEditModal(true);
  };

  const handleOpenDeleteModal = (dept: DepartmentItem) => {
    setSelectedDept(dept);
    setShowDeleteModal(true);
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification(
        "error",
        `${term.codeLabel} and ${term.nameLabel.toLowerCase()} are required.`
      );
      return;
    }
    if (isSuperAdmin && !formData.schoolId) {
      showNotification("error", "Please select a school for this department.");
      return;
    }
    if (isSuperAdmin && selectedModalTerm && !selectedModalTerm.allowed) {
      showNotification("error", selectedModalTerm.superAdminHelperBadge);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isSuperAdmin ? { school_id: formData.schoolId } : {}),
          code: formData.code.trim(),
          name: formData.name.trim(),
          head_of_department: formData.headOfDepartment.trim(),
          description: formData.description.trim(),
          is_active: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to create ${term.singular.toLowerCase()}`);
      }

      showNotification(
        "success",
        `${term.singular} ${formData.code.toUpperCase()} created successfully!`
      );
      setShowAddModal(false);
      await fetchDepartments();
    } catch (err: any) {
      showNotification(
        "error",
        err.message || `Failed to create ${term.singular.toLowerCase()}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;

    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification(
        "error",
        `${term.codeLabel} and ${term.nameLabel.toLowerCase()} are required.`
      );
      return;
    }
    if (isSuperAdmin && !formData.schoolId) {
      showNotification("error", "Please select an assigned school.");
      return;
    }
    if (isSuperAdmin && selectedModalTerm && !selectedModalTerm.allowed) {
      showNotification("error", selectedModalTerm.superAdminHelperBadge);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDept.id,
          ...(isSuperAdmin ? { school_id: formData.schoolId } : {}),
          code: formData.code.trim(),
          name: formData.name.trim(),
          head_of_department: formData.headOfDepartment.trim(),
          description: formData.description.trim(),
          is_active: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to update ${term.singular.toLowerCase()}`);
      }

      showNotification(
        "success",
        `${term.singular} ${formData.code.toUpperCase()} updated successfully!`
      );
      setShowEditModal(false);
      setSelectedDept(null);
      await fetchDepartments();
    } catch (err: any) {
      showNotification(
        "error",
        err.message || `Failed to update ${term.singular.toLowerCase()}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDept) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `${apiBase}?id=${encodeURIComponent(selectedDept.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to delete ${term.singular.toLowerCase()}`);
      }

      showNotification(
        "success",
        `${term.singular} ${selectedDept.code} removed successfully!`
      );
      setShowDeleteModal(false);
      setSelectedDept(null);
      await fetchDepartments();
    } catch (err: any) {
      showNotification(
        "error",
        err.message || `Failed to delete ${term.singular.toLowerCase()}`
      );
    } finally {
      setDeleting(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">
          Redirecting to your school&apos;s Classes workspace...
        </p>
      </div>
    );
  }

  const showProgramsColumn = isSuperAdmin || term.showLinkedPrograms;
  const colSpan =
    5 + (isSuperAdmin ? 1 : 0) + (showProgramsColumn ? 1 : 0);

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
              href={dashboardHref}
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              {isSuperAdmin ? "System Overview" : "Dashboard"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span>{isSuperAdmin ? "Cross-Tenant Academics" : "Academics & Schedule"}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold">
              {isSuperAdmin ? "Departments" : term.plural}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-600" />
            <span>
              {isSuperAdmin ? "Global Departments Directory" : term.pageTitle}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSuperAdmin
              ? "Create, edit, filter, and assign academic departments across eligible schools (Universities and Vocational Schools)."
              : term.pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDepartments}
            title={`Refresh ${term.plural.toLowerCase()}`}
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
            <span>{isSuperAdmin ? "Add Department" : term.addButtonLabel}</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div
        className={`grid gap-4 ${
          showProgramsColumn ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"
        }`}
      >
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {stats.totalDepartments}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Total {isSuperAdmin ? "Departments" : term.plural}
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
                {stats.activeDepartments}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Active {isSuperAdmin ? "Departments" : term.plural}
              </div>
            </div>
          </div>
        </div>

        {showProgramsColumn && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-indigo-600 leading-tight">
                  {stats.linkedProgramsCount}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  Linked Programs
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-purple-600 leading-tight">
                {stats.withHeadCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                With {isSuperAdmin ? "Department Head" : term.headLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isSuperAdmin
                  ? "Search by department code, name, head, or school..."
                  : term.searchPlaceholder
              }
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

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(["all", "active", "inactive"] as const).map((statusVal) => (
              <button
                key={statusVal}
                onClick={() => setStatusFilter(statusVal)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                  statusFilter === statusVal
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {statusVal === "all" ? "All Statuses" : statusVal}
              </button>
            ))}
          </div>

          {isSuperAdmin && schools.length > 0 && (
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
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
        </div>

        {isSuperAdmin && selectedFilterSchool && selectedFilterTerm && (
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
                <th className="py-3 px-4">
                  {isSuperAdmin ? "Department Name" : term.nameLabel}
                </th>
                {isSuperAdmin && <th className="py-3 px-4">School</th>}
                <th className="py-3 px-4">
                  {isSuperAdmin ? "Head of Department" : term.headLabel}
                </th>
                {showProgramsColumn && <th className="py-3 px-4">Programs</th>}
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>
                      Loading {isSuperAdmin ? "departments" : term.plural.toLowerCase()}...
                    </span>
                  </td>
                </tr>
              ) : filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept) => {
                  const rowDeptTerm = getSchoolTerminology(dept.school_type).departments;
                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {dept.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{dept.name}</div>
                        {dept.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {dept.description}
                          </div>
                        )}
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">
                              {dept.school_name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              {dept.school_code}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSchoolTagClasses(
                                dept.school_type
                              )}`}
                            >
                              {rowDeptTerm.superAdminRowTag}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-slate-700">
                        {dept.head_of_department || (
                          <span className="text-slate-400 italic">Not assigned</span>
                        )}
                      </td>
                      {showProgramsColumn && (
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {dept.programs_count}{" "}
                          {dept.programs_count === 1 ? "Program" : "Programs"}
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            dept.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              dept.is_active ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {dept.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(dept)}
                            title={`Edit ${isSuperAdmin ? "Department" : term.singular}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(dept)}
                            title={`Delete ${isSuperAdmin ? "Department" : term.singular}`}
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
                  <td colSpan={colSpan} className="py-12 text-center text-slate-400">
                    <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-600">
                      No {isSuperAdmin ? "departments" : term.plural.toLowerCase()} found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery || schoolFilter !== "all"
                        ? "Try adjusting your search or filter settings."
                        : `Click '${
                            isSuperAdmin ? "Add Department" : term.addButtonLabel
                          }' above to create the first ${
                            isSuperAdmin ? "department" : term.singular.toLowerCase()
                          }.`}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {(showAddModal || (showEditModal && selectedDept)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Layers className="h-5 w-5 text-blue-600" />
                <span>
                  {showEditModal && selectedDept
                    ? `${isSuperAdmin ? "Edit Department" : term.editModalPrefix} (${selectedDept.code})`
                    : isSuperAdmin
                    ? "Add Academic Department"
                    : term.addModalTitle}
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

            <form
              onSubmit={showEditModal ? handleUpdateDepartment : handleCreateDepartment}
              className="p-6 space-y-4"
            >
              <div className="space-y-3">
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Assign School *
                      </label>
                      <select
                        required
                        value={formData.schoolId}
                        onChange={(e) =>
                          setFormData({ ...formData, schoolId: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                      >
                        <option value="">Select a school...</option>
                        {schools.map((s) => {
                          const eligible = getSchoolTerminology(s.school_type).departments
                            .allowed;
                          return (
                            <option key={s.id} value={s.id} disabled={!eligible}>
                              {s.name} ({s.code}) — {getSchoolTypeLabel(s.school_type)}
                              {!eligible ? " (Not eligible — use Programs)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedModalSchool && selectedModalTerm && (
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
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {isSuperAdmin ? "Department Code" : term.codeLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder={
                        isSuperAdmin
                          ? selectedModalTerm?.codePlaceholder || "e.g. CS"
                          : term.codePlaceholder
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {isSuperAdmin ? "Department Name" : term.nameLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={
                        isSuperAdmin
                          ? selectedModalTerm?.namePlaceholder ||
                            "e.g. Department of Computer Science"
                          : term.namePlaceholder
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {isSuperAdmin
                      ? selectedModalTerm?.headLabel || "Head of Department"
                      : term.headLabel}
                  </label>
                  <input
                    type="text"
                    value={formData.headOfDepartment}
                    onChange={(e) =>
                      setFormData({ ...formData, headOfDepartment: e.target.value })
                    }
                    placeholder={
                      isSuperAdmin
                        ? selectedModalTerm?.headPlaceholder || "e.g. Dr. Kwame Mensah"
                        : term.headPlaceholder
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={
                      isSuperAdmin
                        ? selectedModalTerm?.descriptionPlaceholder ||
                          "Brief mandate, academic focus, or administrative scope..."
                        : term.descriptionPlaceholder
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs resize-none"
                  />
                </div>

                <div className="pt-1">
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
                      {isSuperAdmin ? "Active Department" : term.activeCheckboxLabel}
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
                      {showEditModal
                        ? "Save Changes"
                        : isSuperAdmin
                        ? "Save Department"
                        : `Save ${term.singular}`}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-14 px-6 border-b border-slate-100 bg-red-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-red-700 text-sm">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>
                  {isSuperAdmin ? "Delete Department" : term.deleteModalTitle}
                </span>
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
                Are you sure you want to permanently delete the{" "}
                {(isSuperAdmin ? "department" : term.singular.toLowerCase())}{" "}
                <strong className="text-slate-900 font-bold">
                  {selectedDept.name} ({selectedDept.code})
                </strong>
                ?
              </p>
              {showProgramsColumn && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] leading-relaxed">
                  <strong>Note:</strong> Linked academic programs in this school will
                  remain active with their department set to Unassigned.
                </div>
              )}

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
                  onClick={handleDeleteDepartment}
                  disabled={deleting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>
                      {isSuperAdmin ? "Delete Department" : term.deleteModalTitle}
                    </span>
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
