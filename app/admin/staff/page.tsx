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
import { resolveStaffEntityType } from "@/lib/id-numbering/config";
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Briefcase,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Clock,
  Phone,
} from "lucide-react";

interface StaffRecord {
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
  metadata?: Record<string, any>;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface RoleOption {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface StaffStats {
  total: number;
  active: number;
  onLeave: number;
  fullTime: number;
}

interface StaffFormState {
  full_name: string;
  email: string;
  phone: string;
  staff_number: string;
  job_title: string;
  department_id: string;
  assigned_unit: string;
  employment_type: string;
  hire_date: string;
  status: string;
  role_code: string;
  salary_grade: string;
  password: string;
}

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "contract", label: "Contract" },
  { value: "adjunct", label: "Adjunct" },
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

function generateNextStaffNumber(existing: StaffRecord[], year: number, idPrefix: string) {
  const prefix = `${idPrefix}${year}`;
  let maxSeq = 0;
  for (const s of existing) {
    const sn = String(s.staff_number || "").toUpperCase();
    if (sn.startsWith(prefix)) {
      const numPart = parseInt(sn.slice(prefix.length), 10);
      if (!Number.isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export default function StaffDirectoryPage() {
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [schoolType, setSchoolType] = useState<PortalSchoolType>("university");

  const portalConfig: SchoolPortalConfig = useMemo(
    () => getSchoolPortalConfig(schoolType),
    [schoolType]
  );
  const formSpec = useMemo(
    () => getSchoolFormConfig(schoolType).adminStaff,
    [schoolType]
  );

  const [stats, setStats] = useState<StaffStats>({
    total: 0,
    active: 0,
    onLeave: 0,
    fullTime: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRecord | null>(null);
  const [nextIdPreviews, setNextIdPreviews] = useState<Record<string, string>>({});
  const [manualIdOverride, setManualIdOverride] = useState<boolean>(false);

  const [currentYear, setCurrentYear] = useState(2026);
  const [todayIso, setTodayIso] = useState("2026-10-31");

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    setTodayIso(new Date().toISOString().split("T")[0]);
  }, []);

  const [formData, setFormData] = useState<StaffFormState>({
    full_name: "",
    email: "",
    phone: "",
    staff_number: "",
    job_title: "",
    department_id: "",
    assigned_unit: "",
    employment_type: "full_time",
    hire_date: todayIso,
    status: "active",
    role_code: "bursar",
    salary_grade: "",
    password: "",
  });

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to load staff directory.");
        return;
      }

      if (data.school_type) {
        setSchoolType(toPortalSchoolType(data.school_type));
      }
      if (data.next_id_previews && typeof data.next_id_previews === "object") {
        setNextIdPreviews(data.next_id_previews);
      }
      setStaffList(data.staff || []);
      setDepartments(data.departments || []);
      setRoles(data.roles || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error loading staff directory.");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const roleChoices = useMemo(() => {
    const merged = [...formSpec.roleOptions];
    for (const r of roles) {
      if (!merged.some((m) => m.code === r.code)) {
        merged.push({ code: r.code, name: r.name });
      }
    }
    return formSpec.roleOptions;
  }, [formSpec.roleOptions, roles]);

  const selectedRolePreview = useMemo(() => {
    const entity = resolveStaffEntityType(formData.role_code, schoolType, false);
    return (
      nextIdPreviews[entity] ||
      nextIdPreviews.staff ||
      generateNextStaffNumber(staffList, currentYear, formSpec.idPrefix)
    );
  }, [formData.role_code, schoolType, nextIdPreviews, staffList, currentYear, formSpec.idPrefix]);

  const openCreateModal = () => {
    setEditingStaff(null);
    setManualIdOverride(false);
    const defaultRole = formSpec.roleOptions[0]?.code || "bursar";
    const defaultEntity = resolveStaffEntityType(defaultRole, schoolType, false);
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      staff_number:
        nextIdPreviews[defaultEntity] ||
        nextIdPreviews.staff ||
        generateNextStaffNumber(staffList, currentYear, formSpec.idPrefix),
      job_title: formSpec.roleOptions[0]?.name || "",
      department_id:
        formSpec.showDepartmentDropdown && schoolType === "university"
          ? departments[0]?.id || ""
          : "",
      assigned_unit:
        formSpec.officeOptions[0] ||
        (departments[0]?.name ? departments[0].name : "Central Administration"),
      employment_type: "full_time",
      hire_date: todayIso,
      status: "active",
      role_code: defaultRole,
      salary_grade: "",
      password: "",
    });
    setModalMode("create");
  };

  const openEditModal = (staff: StaffRecord) => {
    const meta = staff.metadata || {};
    setEditingStaff(staff);
    setManualIdOverride(true);
    setFormData({
      full_name: staff.full_name,
      email: staff.email,
      phone: staff.phone || "",
      staff_number: staff.staff_number,
      job_title: staff.job_title,
      department_id: staff.department_id || "",
      assigned_unit:
        meta.assigned_unit || staff.department_name || formSpec.officeOptions[0] || "",
      employment_type: staff.employment_type,
      hire_date: staff.hire_date || todayIso,
      status: staff.status,
      role_code: staff.role_code || formSpec.roleOptions[0]?.code || "hr_officer",
      salary_grade: staff.salary_grade || "",
      password: "",
    });
    setModalMode("edit");
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const selectedRoleSpec = formSpec.roleOptions.find((r) => r.code === formData.role_code);
    const resolvedUnit = formData.department_id
      ? departments.find((d) => d.id === formData.department_id)?.name || formData.assigned_unit
      : formData.assigned_unit;

    const metadataPayload = {
      school_type: schoolType,
      assigned_unit: resolvedUnit || "Central Administration",
      school_type_role_label: selectedRoleSpec?.name || formData.job_title,
    };

    try {
      const isEdit = modalMode === "edit" && editingStaff;
      const res = await fetch("/api/admin/staff", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editingStaff.id } : {}),
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          auto_generate_id: !isEdit && !manualIdOverride,
          staff_number:
            !isEdit && !manualIdOverride ? "" : formData.staff_number,
          job_title: formData.job_title,
          department_id: formData.department_id || null,
          employment_type: formData.employment_type,
          hire_date: formData.hire_date,
          status: formData.status,
          role_code: formData.role_code,
          salary_grade: formData.salary_grade,
          metadata: metadataPayload,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Unable to save staff record.");
        return;
      }

      const assignedStaffNumber =
        data.staff?.staff_number || formData.staff_number;
      showNotification(
        "success",
        isEdit
          ? `Staff member "${formData.full_name}" (${assignedStaffNumber}) updated successfully.`
          : `Staff member "${formData.full_name}" (${assignedStaffNumber}) registered successfully.`
      );
      setModalMode(null);
      setEditingStaff(null);
      await fetchStaff();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while saving staff member.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/staff?id=${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to delete staff member.");
        return;
      }

      showNotification(
        "success",
        `Staff member "${deleteTarget.full_name}" (${deleteTarget.staff_number}) deleted.`
      );
      setDeleteTarget(null);
      await fetchStaff();
    } catch (err: any) {
      showNotification("error", err.message || "Network error while deleting staff member.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffList.filter((s) => {
      const unitLabel = s.metadata?.assigned_unit || s.department_name || "";
      const matchesSearch =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        s.staff_number.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.job_title.toLowerCase().includes(q) ||
        s.role_name.toLowerCase().includes(q) ||
        unitLabel.toLowerCase().includes(q);
      const matchesDept =
        departmentFilter === "all" ||
        s.department_id === departmentFilter ||
        unitLabel === departmentFilter;
      const matchesRole = roleFilter === "all" || s.role_code === roleFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesDept && matchesRole && matchesStatus;
    });
  }, [staffList, searchQuery, departmentFilter, roleFilter, statusFilter]);

  const exportCSV = () => {
    const headers =
      "Staff ID,Full Name,Email,Phone,Position,Portal Role,Unit,Employment Type,Salary Grade,Hire Date,Status\n";
    const rows = filteredStaff
      .map(
        (s) =>
          `"${s.staff_number}","${s.full_name.replace(/"/g, '""')}","${s.email}","${s.phone}","${s.job_title.replace(/"/g, '""')}","${s.role_name}","${(s.metadata?.assigned_unit || s.department_name || "Central Administration").replace(/"/g, '""')}","${s.employment_type}","${s.salary_grade}","${s.hire_date}","${s.status}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff_${schoolType}_${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <Link href="/admin/dashboard" className="text-[#0D9488] hover:underline">
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
            disabled={filteredStaff.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-50 text-xs font-semibold text-[#475569] shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
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
              Total Staff
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.total}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Administrative & support</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Active Personnel
            </p>
            <p className="text-2xl font-bold text-[#059669] mt-1">{stats.active}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">On active duty</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Full-Time Staff
            </p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.fullTime}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {stats.total - stats.fullTime} contract / part-time
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#3B82F6] flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Staff On Leave
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.onLeave}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">Approved leave status</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
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
            placeholder={`Search by name, ${formSpec.idLabel.toLowerCase()}, email, title, or role...`}
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#0D9488] focus:bg-white"
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
              <option value="all">All Units / Offices</option>
              {formSpec.showDepartmentDropdown &&
                departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              {formSpec.officeOptions.map((off) => (
                <option key={off} value={off}>
                  {off}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              {roleChoices.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
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
            onClick={fetchStaff}
            title="Refresh Staff Directory"
            className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">{formSpec.idLabel}</th>
                <th className="py-3 px-4">Position & Role</th>
                <th className="py-3 px-4">{formSpec.unitLabel}</th>
                <th className="py-3 px-4">Type & Hire Date</th>
                <th className="py-3 px-4">Salary Grade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#0D9488]" />
                      <span>Loading live staff records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((s) => {
                  const initials = s.full_name
                    ? s.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "SF";
                  const unitText =
                    s.metadata?.assigned_unit || s.department_name || "Central Administration";

                  return (
                    <tr key={s.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center font-bold text-xs shrink-0">
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
                        {s.staff_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1E293B]">{s.job_title}</div>
                        <div className="text-[10px] text-[#0D9488] font-medium">
                          {s.role_name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#475569]">{unitText}</td>
                      <td className="py-3.5 px-4">
                        <div className="uppercase text-[10px] font-bold text-[#475569]">
                          {s.employment_type.replace(/_/g, " ")}
                        </div>
                        <div className="text-[11px] text-[#64748B]">Hired {s.hire_date}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#475569]">
                        {s.salary_grade || <span className="text-[#94A3B8]">—</span>}
                      </td>
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
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F0FDFA] text-[#334155] hover:text-[#0D9488] border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
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
                    {staffList.length === 0
                      ? `No staff registered yet. Click "${formSpec.addTitle}" above.`
                      : "No staff records match your active search or filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Staff Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0 bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  {modalMode === "edit"
                    ? `${formSpec.editTitlePrefix} — ${editingStaff?.staff_number}`
                    : formSpec.addTitle}
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  {modalMode === "edit" ? formSpec.editSubtitle : formSpec.addSubtitle}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setEditingStaff(null);
                }}
                className="text-[#94A3B8] hover:text-[#1E293B] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cynthia Boateng"
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
                                staff_number: selectedRolePreview,
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
                    placeholder={selectedRolePreview || formSpec.idPlaceholder}
                    value={
                      modalMode === "create" && !manualIdOverride
                        ? selectedRolePreview
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
                  {modalMode === "create" && !manualIdOverride && selectedRolePreview && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Preview for selected role:{" "}
                      <span className="font-mono font-semibold text-slate-700">
                        {selectedRolePreview}
                      </span>{" "}
                      (assigned atomically on save)
                    </p>
                  )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    {getSchoolFormConfig(schoolType).portalLabel} Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role_code}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      const match = formSpec.roleOptions.find((r) => r.code === nextRole);
                      setFormData((prev) => ({
                        ...prev,
                        role_code: nextRole,
                        job_title:
                          !prev.job_title ||
                          formSpec.roleOptions.some((ro) => ro.name === prev.job_title)
                            ? match?.name || prev.job_title
                            : prev.job_title,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  >
                    {roleChoices.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Position / Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formSpec.jobTitlePlaceholder}
                    value={formData.job_title}
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  />
                </div>
              </div>

              {/* Dynamic Unit / Department / Office Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {schoolType === "university" ? (
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      {formSpec.unitLabel}
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={(e) =>
                        setFormData({ ...formData, department_id: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                    >
                      <option value="">Central Administration</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : schoolType === "high_school" ? (
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      {formSpec.unitLabel}
                    </label>
                    <select
                      value={formData.assigned_unit}
                      onChange={(e) =>
                        setFormData({ ...formData, assigned_unit: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                    >
                      {formSpec.officeOptions.map((off) => (
                        <option key={off} value={off}>
                          {off}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      {formSpec.unitLabel}
                    </label>
                    <select
                      value={formData.department_id || formData.assigned_unit}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isDept = departments.some((d) => d.id === val);
                        setFormData({
                          ...formData,
                          department_id: isDept ? val : "",
                          assigned_unit: isDept
                            ? departments.find((d) => d.id === val)?.name || ""
                            : val,
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                    >
                      <optgroup label="Center Offices">
                        {formSpec.officeOptions.map((off) => (
                          <option key={off} value={off}>
                            {off}
                          </option>
                        ))}
                      </optgroup>
                      {departments.length > 0 && (
                        <optgroup label="Trade Workshops / Classes">
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Salary Grade (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ADM-GR-05"
                    value={formData.salary_grade}
                    onChange={(e) =>
                      setFormData({ ...formData, salary_grade: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
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
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
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
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Employment Status
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
                    setEditingStaff(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-semibold shadow-xs cursor-pointer"
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
                    Delete Staff Member
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Are you sure you want to permanently delete{" "}
                    <span className="font-bold text-[#1E293B]">
                      {deleteTarget.full_name}
                    </span>{" "}
                    (<span className="font-mono">{deleteTarget.staff_number}</span>)?
                    This removes their HR employment record, role assignments, and
                    linked portal authentication account.
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
