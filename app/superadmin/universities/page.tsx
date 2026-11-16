"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Plus,
  Search,
  Building2,
  Globe,
  Mail,
  Phone,
  ExternalLink,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Lock,
  CheckSquare,
  Square,
  Sliders,
  Info,
} from "lucide-react";
import {
  type UniversityItem,
  AVAILABLE_UNIVERSITY_ROLES,
} from "@/lib/superadmin/service";

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAccess, setFilterAccess] = useState<"all" | "full" | "restricted">("all");
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<"general" | "governance">("general");
  const [editingId, setEditingId] = useState<string | null>(null);

  // General fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [shortName, setShortName] = useState("");
  const [country, setCountry] = useState("Ghana");
  const [city, setCity] = useState("Accra");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [establishedYear, setEstablishedYear] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "maintenance" | "suspended">("active");

  // Governance & Quota fields
  const [fullAccess, setFullAccess] = useState(true);
  const [hasUserLimit, setHasUserLimit] = useState(false);
  const [maxUsers, setMaxUsers] = useState<string>("");
  const [hasDeptLimit, setHasDeptLimit] = useState(false);
  const [maxDepartments, setMaxDepartments] = useState<string>("");
  const [hasRoleLimit, setHasRoleLimit] = useState(false);
  const [maxRoles, setMaxRoles] = useState<string>("");
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Inspect Quotas Modal
  const [inspectUniv, setInspectUniv] = useState<UniversityItem | null>(null);

  // Delete Confirmation Modal state
  const [deletingUniv, setDeletingUniv] = useState<UniversityItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUniversities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/superadmin/universities");
      if (res.ok) {
        setUniversities(await res.json());
      }
    } catch (err) {
      console.error("Failed to load universities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUniversities();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setModalTab("general");
    setName("");
    setCode("");
    setShortName("");
    setCountry("Ghana");
    setCity("Accra");
    setAddress("");
    setEmail("");
    setPhone("");
    setWebsite("");
    setCurrency("GHS");
    setEstablishedYear("");
    setStatus("active");

    // Default governance: Full Access
    setFullAccess(true);
    setHasUserLimit(false);
    setMaxUsers("");
    setHasDeptLimit(false);
    setMaxDepartments("");
    setHasRoleLimit(false);
    setMaxRoles("");
    setAllowedRoles(AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code));

    setErrorMsg("");
    setShowModal(true);
  };

  const openEditModal = (u: UniversityItem) => {
    setEditingId(u.id);
    setModalTab("general");
    setName(u.name);
    setCode(u.code);
    setShortName(u.short_name || "");
    setCountry(u.country || "Ghana");
    setCity(u.city || "Accra");
    setAddress(u.address || "");
    setEmail(u.email || "");
    setPhone(u.phone || "");
    setWebsite(u.website || "");
    setCurrency(u.default_currency || "GHS");
    setEstablishedYear(u.established_year ? String(u.established_year) : "");
    setStatus(u.status || "active");

    // Governance settings
    const isFull = u.full_access !== false;
    setFullAccess(isFull);
    setHasUserLimit(u.max_users !== null && u.max_users !== undefined);
    setMaxUsers(u.max_users ? String(u.max_users) : "");
    setHasDeptLimit(u.max_departments !== null && u.max_departments !== undefined);
    setMaxDepartments(u.max_departments ? String(u.max_departments) : "");
    setHasRoleLimit(u.max_roles !== null && u.max_roles !== undefined);
    setMaxRoles(u.max_roles ? String(u.max_roles) : "");
    setAllowedRoles(
      Array.isArray(u.allowed_roles) && u.allowed_roles.length > 0
        ? u.allowed_roles
        : AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code)
    );

    setErrorMsg("");
    setShowModal(true);
  };

  const toggleRoleSelection = (roleCode: string) => {
    setAllowedRoles((prev) =>
      prev.includes(roleCode) ? prev.filter((r) => r !== roleCode) : [...prev, roleCode]
    );
  };

  const selectCoreAcademicRoles = () => {
    const core = [
      "system_admin",
      "registrar",
      "dean",
      "head_of_department",
      "lecturer",
      "student",
      "finance_officer",
    ];
    setAllowedRoles(core);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name || !code) {
      setErrorMsg("University name and code are required.");
      return;
    }

    if (!fullAccess && hasUserLimit && (!maxUsers || Number(maxUsers) <= 0)) {
      setErrorMsg("Please specify a valid user limit (greater than 0).");
      return;
    }

    if (!fullAccess && hasDeptLimit && (!maxDepartments || Number(maxDepartments) <= 0)) {
      setErrorMsg("Please specify a valid department limit (greater than 0).");
      return;
    }

    if (!fullAccess && allowedRoles.length === 0) {
      setErrorMsg("Please select at least one permitted role for restricted access.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingId || undefined,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        short_name: shortName.trim(),
        country: country.trim(),
        city: city.trim(),
        address: address.trim(),
        email: email.trim(),
        phone: phone.trim(),
        website: website.trim(),
        default_currency: currency,
        currency_symbol: currency === "GHS" ? "GH₵" : "$",
        established_year: establishedYear ? Number(establishedYear) : undefined,
        status,
        full_access: fullAccess,
        max_users: !fullAccess && hasUserLimit && maxUsers ? Number(maxUsers) : null,
        max_departments: !fullAccess && hasDeptLimit && maxDepartments ? Number(maxDepartments) : null,
        max_roles: !fullAccess && hasRoleLimit && maxRoles ? Number(maxRoles) : null,
        allowed_roles: fullAccess ? AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code) : allowedRoles,
      };

      const res = await fetch("/api/superadmin/universities", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save university");
      }

      setSuccessMsg(
        editingId
          ? `Updated ${name} successfully!`
          : `Registered ${name} with specified access limits successfully!`
      );
      setShowModal(false);
      await loadUniversities();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUniversity = async () => {
    if (!deletingUniv) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/superadmin/universities?id=${encodeURIComponent(deletingUniv.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete university");
      }

      setSuccessMsg(
        `University ${deletingUniv.name} has been deleted. All ${
          data.affectedUsersCount ?? "associated"
        } users have had their access revoked.`
      );
      setDeletingUniv(null);
      await loadUniversities();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to delete university");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return universities.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || u.status === filterStatus;
      const matchesAccess =
        filterAccess === "all" ||
        (filterAccess === "full" && u.full_access !== false) ||
        (filterAccess === "restricted" && u.full_access === false);
      return matchesSearch && matchesStatus && matchesAccess;
    });
  }, [universities, searchTerm, filterStatus, filterAccess]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* Sub-Header: Breadcrumbs + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link
              href="/superadmin/dashboard"
              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Super Admin
            </Link>
            <span className="text-slate-300">/</span>
            <span>Core Administration</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">Universities & Governance</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Institutions & Quota Governance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure multi-tenant institutions, user quotas, department limits, and role access tiers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Register University</span>
          </button>
          <button
            onClick={loadUniversities}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search university, code, country..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="all">All Operating Statuses</option>
            <option value="active">Active Only</option>
            <option value="maintenance">Maintenance</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Access Tier Filter */}
          <select
            value={filterAccess}
            onChange={(e) => setFilterAccess(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="all">All Access Tiers</option>
            <option value="full">Full Access (Unrestricted)</option>
            <option value="restricted">Restricted Quotas</option>
          </select>

          <span className="text-xs text-slate-500 hidden sm:inline">
            Showing <strong className="text-slate-800">{filtered.length}</strong> of {universities.length}
          </span>
        </div>
      </div>

      {/* Universities Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-xs">Fetching universities and telemetry...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          No matching universities found. Click &quot;Register University&quot; to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((u) => {
            const isFull = u.full_access !== false;
            return (
              <div
                key={u.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-xs">
                        {u.code.slice(0, 3)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">{u.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-bold text-blue-600">{u.code}</span>
                          {u.short_name && <span className="text-xs text-slate-500">• {u.short_name}</span>}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        u.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : "Active"}
                    </span>
                  </div>

                  {/* Access Governance Badge */}
                  <div className="flex items-center justify-between pt-1">
                    {isFull ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        Full Access (Unrestricted)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <ShieldAlert className="h-3 w-3 text-indigo-600" />
                        Custom Quotas & Roles
                      </span>
                    )}

                    <button
                      onClick={() => setInspectUniv(u)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Inspect Limits
                    </button>
                  </div>

                  {/* Quota Telemetry Bars */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-center">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500">Users Quota</span>
                      <span className="text-xs font-bold text-slate-800">
                        {u.current_users_count ?? 1} / {isFull || !u.max_users ? "∞" : u.max_users}
                      </span>
                    </div>

                    <div className="border-x border-slate-200 px-1">
                      <span className="block text-[10px] font-semibold text-slate-500">Depts Quota</span>
                      <span className="text-xs font-bold text-slate-800">
                        {u.current_departments_count ?? 3} /{" "}
                        {isFull || !u.max_departments ? "∞" : u.max_departments}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500">Allowed Roles</span>
                      <span className="text-xs font-bold text-slate-800">
                        {isFull ? "All (17)" : `${u.allowed_roles?.length || 0} Types`}
                      </span>
                    </div>
                  </div>

                  {u.motto && (
                    <p className="text-[11px] text-slate-500 italic border-l-2 border-blue-400 pl-2">
                      &ldquo;{u.motto}&rdquo;
                    </p>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        {u.city}, {u.country}
                      </span>
                    </div>
                    {u.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700 font-semibold">
                    {u.default_currency}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer"
                      title="Edit University & Governance Limits"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingUniv(u)}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                      title="Delete University (Blocks all users)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <Link
                      href="/admin/dashboard"
                      target="_blank"
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>Portal</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT UNIVERSITY & GOVERNANCE QUOTAS */}
      {/* ========================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>{editingId ? `Edit ${name || "University"}` : "Register New Institution"}</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-white gap-6 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab("general")}
                className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                  modalTab === "general"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>General Information</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab("governance")}
                className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                  modalTab === "governance"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Role & Quota Restrictions</span>
                {!fullAccess && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* TAB 1: GENERAL INFORMATION */}
              {modalTab === "general" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      University Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Accra Metropolitan University"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Short Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. AMU"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs uppercase focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Abbreviation / Short Name
                    </label>
                    <input
                      type="text"
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      placeholder="e.g. Metro Uni"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Operating Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    >
                      <option value="active">Active (Operational)</option>
                      <option value="maintenance">Maintenance Mode</option>
                      <option value="suspended">Suspended (Blocked Access)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Default Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    >
                      <option value="GHS">GHS (GH₵ - Ghanaian Cedi)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@university.edu"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Official Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Campus Main Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Main Campus Boulevard, Cantonments, Accra"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: ROLE & QUOTA RESTRICTIONS */}
              {modalTab === "governance" && (
                <div className="space-y-5">
                  {/* Access Mode Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Access Tier & Governance Model
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setFullAccess(true)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          fullAccess
                            ? "border-emerald-500 bg-emerald-50/40 text-emerald-950 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-800">
                            <Sparkles className="h-4 w-4 text-emerald-600" />
                            Full Access (Unrestricted)
                          </span>
                          <input
                            type="radio"
                            checked={fullAccess}
                            onChange={() => setFullAccess(true)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Institution has unrestricted access to all standard platform roles, unlimited
                          department creation, and uncapped user provisioning.
                        </p>
                      </div>

                      <div
                        onClick={() => setFullAccess(false)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          !fullAccess
                            ? "border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-800">
                            <ShieldAlert className="h-4 w-4 text-indigo-600" />
                            Custom Restrictions & Quotas
                          </span>
                          <input
                            type="radio"
                            checked={!fullAccess}
                            onChange={() => setFullAccess(false)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Strictly restrict the maximum number of users, maximum departments, and specify
                          exactly which roles this institution is allowed to provision.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Restrictive Quota Inputs (Shown only if Full Access is false) */}
                  {!fullAccess ? (
                    <div className="space-y-4 pt-3 border-t border-slate-200">
                      <div className="bg-indigo-50/60 border border-indigo-200 p-3 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
                        <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Multi-Tenant Quota Enforcement:</strong> The limits configured below
                          will be enforced across the tenant. Attempting to exceed these quotas will
                          trigger a restriction block until adjusted by Super Admin.
                        </div>
                      </div>

                      {/* 1. Max Users Limit */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span>Maximum Allowed Users</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasUserLimit}
                              onChange={(e) => {
                                setHasUserLimit(e.target.checked);
                                if (!e.target.checked) setMaxUsers("");
                                else if (!maxUsers) setMaxUsers("100");
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-600 font-medium">Enforce User Limit</span>
                          </label>
                        </div>

                        {hasUserLimit ? (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min="1"
                                placeholder="e.g. 100"
                                value={maxUsers}
                                onChange={(e) => setMaxUsers(e.target.value)}
                                className="w-40 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-xs text-slate-500">total accounts (admins, faculty, students)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">Presets:</span>
                              {[25, 50, 100, 250, 500, 1000].map((preset) => (
                                <button
                                  type="button"
                                  key={preset}
                                  onClick={() => setMaxUsers(String(preset))}
                                  className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">
                            Uncapped user provisioning allowed for this institution.
                          </p>
                        )}
                      </div>

                      {/* 2. Max Departments Limit */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <Layers className="h-4 w-4 text-purple-600" />
                            <span>Maximum Allowed Departments</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasDeptLimit}
                              onChange={(e) => {
                                setHasDeptLimit(e.target.checked);
                                if (!e.target.checked) setMaxDepartments("");
                                else if (!maxDepartments) setMaxDepartments("10");
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-slate-600 font-medium">Enforce Department Limit</span>
                          </label>
                        </div>

                        {hasDeptLimit ? (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min="1"
                                placeholder="e.g. 10"
                                value={maxDepartments}
                                onChange={(e) => setMaxDepartments(e.target.value)}
                                className="w-40 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-xs text-slate-500">academic departments</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">Presets:</span>
                              {[3, 5, 10, 15, 25].map((preset) => (
                                <button
                                  type="button"
                                  key={preset}
                                  onClick={() => setMaxDepartments(String(preset))}
                                  className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:border-purple-300 hover:text-purple-600 transition-colors"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">
                            Unrestricted academic department creation.
                          </p>
                        )}
                      </div>

                      {/* 3. Max Roles Limit */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-indigo-600" />
                            <span>Maximum Distinct Roles</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasRoleLimit}
                              onChange={(e) => {
                                setHasRoleLimit(e.target.checked);
                                if (!e.target.checked) setMaxRoles("");
                                else if (!maxRoles) setMaxRoles("6");
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-600 font-medium">Enforce Roles Count Limit</span>
                          </label>
                        </div>

                        {hasRoleLimit ? (
                          <div className="flex items-center gap-3 pt-1">
                            <input
                              type="number"
                              min="1"
                              max="17"
                              placeholder="e.g. 6"
                              value={maxRoles}
                              onChange={(e) => setMaxRoles(e.target.value)}
                              className="w-40 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-slate-500">max distinct roles assigned simultaneously</span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">
                            No restriction on the count of distinct roles used.
                          </p>
                        )}
                      </div>

                      {/* 4. Permitted Role Types ("What kind of roles they can get") */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-xs font-bold text-slate-900">
                              Permitted Role Types ({allowedRoles.length} of {AVAILABLE_UNIVERSITY_ROLES.length} selected)
                            </label>
                            <p className="text-[10.5px] text-slate-500">
                              Only the selected roles can be provisioned or assigned within this university
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setAllowedRoles(AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code))}
                              className="text-blue-600 hover:underline cursor-pointer font-medium"
                            >
                              All Roles
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={selectCoreAcademicRoles}
                              className="text-indigo-600 hover:underline cursor-pointer font-medium"
                            >
                              Core Academic Only
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => setAllowedRoles([])}
                              className="text-slate-500 hover:underline cursor-pointer font-medium"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                          {AVAILABLE_UNIVERSITY_ROLES.map((r) => {
                            const isChecked = allowedRoles.includes(r.code);
                            return (
                              <label
                                key={r.code}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isChecked
                                    ? "bg-indigo-50/80 border-indigo-200 text-indigo-950 font-medium"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleRoleSelection(r.code)}
                                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate flex items-center justify-between">
                                    <span>{r.name}</span>
                                    <span className="text-[9px] font-mono px-1 rounded bg-slate-100 text-slate-500 ml-1">
                                      {r.code}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1">
                                    {r.category} • {r.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Full Unrestricted Platform Access Enabled</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        This institution operates without user caps, department quotas, or role
                        restrictions. All 17 standard roles and custom roles can be provisioned at will.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {modalTab === "general" ? (
                    <button
                      type="button"
                      onClick={() => setModalTab("governance")}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Next: Configure Quotas & Roles →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModalTab("general")}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      ← Back to General Info
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{editingId ? "Save Changes" : "Register Institution"}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: INSPECT GOVERNANCE LIMITS & ROLES */}
      {/* ========================================================= */}
      {inspectUniv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{inspectUniv.name}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Code: {inspectUniv.code}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectUniv(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Access Mode Banner */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                inspectUniv.full_access !== false
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-indigo-50 border-indigo-200 text-indigo-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {inspectUniv.full_access !== false ? (
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-indigo-600" />
                )}
                <span className="font-bold">
                  {inspectUniv.full_access !== false
                    ? "Full Platform Access (Unrestricted)"
                    : "Enforced Multi-Tenant Quotas"}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {inspectUniv.status}
              </span>
            </div>

            {/* Quota Telemetry */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Users</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {inspectUniv.current_users_count ?? 1} /{" "}
                  {inspectUniv.full_access !== false || !inspectUniv.max_users
                    ? "∞"
                    : inspectUniv.max_users}
                </div>
                <div className="text-[10px] text-slate-400">
                  {inspectUniv.max_users ? `${inspectUniv.max_users} max cap` : "Unlimited"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Depts</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {inspectUniv.current_departments_count ?? 3} /{" "}
                  {inspectUniv.full_access !== false || !inspectUniv.max_departments
                    ? "∞"
                    : inspectUniv.max_departments}
                </div>
                <div className="text-[10px] text-slate-400">
                  {inspectUniv.max_departments
                    ? `${inspectUniv.max_departments} max cap`
                    : "Unlimited"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Distinct Roles</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {inspectUniv.current_roles_count ?? 3} /{" "}
                  {inspectUniv.full_access !== false || !inspectUniv.max_roles
                    ? "∞"
                    : inspectUniv.max_roles}
                </div>
                <div className="text-[10px] text-slate-400">
                  {inspectUniv.max_roles ? `${inspectUniv.max_roles} max roles` : "Uncapped"}
                </div>
              </div>
            </div>

            {/* Allowed Roles Roster */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">
                  Role Permitted Status
                </span>
                <span className="text-[11px] text-slate-500">
                  {inspectUniv.full_access !== false
                    ? "All 17 Roles Permitted"
                    : `${inspectUniv.allowed_roles?.length || 0} Permitted`}
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
                {AVAILABLE_UNIVERSITY_ROLES.map((r) => {
                  const isPermitted =
                    inspectUniv.full_access !== false ||
                    (Array.isArray(inspectUniv.allowed_roles) &&
                      inspectUniv.allowed_roles.includes(r.code));
                  return (
                    <div
                      key={r.code}
                      className="px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">{r.name}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                          {r.code}
                        </span>
                      </div>
                      {isPermitted ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Permitted
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          Restricted
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const target = inspectUniv;
                  setInspectUniv(null);
                  openEditModal(target);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Modify Quotas & Limits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================= */}
      {deletingUniv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-red-200 shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Delete {deletingUniv.name}?
            </h3>

            <div className="mt-3 p-3.5 rounded-xl bg-red-50/80 border border-red-200 text-xs text-red-800 leading-relaxed">
              <strong>CRITICAL WARNING:</strong> When this university is deleted, all of its system
              administrators, faculty members, and students will <strong>immediately lose access and be blocked</strong> from accessing the system.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingUniv(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUniversity}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Decommissioning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Delete & Revoke Access</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
