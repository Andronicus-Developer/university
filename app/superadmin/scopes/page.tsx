"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Building2,
  Plus,
  Search,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  Trash2,
  Settings,
  Users,
  Shield,
  Sliders,
  Filter,
  Check,
} from "lucide-react";

interface ScopeItem {
  id: string;
  name: string;
  code: string;
  scopeType: "Campus" | "Faculty" | "Department" | "Cohort";
  institution_id: string;
  institution: string;
  assignedUsersCount: number;
  description: string;
  status?: "active" | "inactive";
  capacity?: number;
  dualControlRequired?: boolean;
  isolationLevel?: "strict" | "shared";
  created_at?: string;
  updated_at?: string;
}

interface SchoolOption {
  id: string;
  name: string;
  code: string;
}

export default function DepartmentCampusScopesPage() {
  const [scopes, setScopes] = useState<ScopeItem[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

  // Configure Modal State
  const [activeScope, setActiveScope] = useState<ScopeItem | null>(null);
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configureError, setConfigureError] = useState<string | null>(null);
  const [configureSuccess, setConfigureSuccess] = useState<string | null>(null);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Define New Scope Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newScopeData, setNewScopeData] = useState({
    name: "",
    code: "",
    scopeType: "Campus" as ScopeItem["scopeType"],
    institution_id: "",
    institution: "",
    description: "",
    capacity: 150,
    dualControlRequired: false,
    isolationLevel: "strict" as "strict" | "shared",
  });

  // Edit Form State (synced when activeScope changes)
  const [editFormData, setEditFormData] = useState<Partial<ScopeItem>>({});

  useEffect(() => {
    fetchScopesAndSchools();
  }, []);

  const fetchScopesAndSchools = async () => {
    setIsLoading(true);
    try {
      const [scopesRes, schoolsRes] = await Promise.all([
        fetch("/api/superadmin/scopes"),
        fetch("/api/superadmin/schools"),
      ]);

      if (scopesRes.ok) {
        const scopesData = await scopesRes.json();
        setScopes(Array.isArray(scopesData) ? scopesData : []);
      }

      if (schoolsRes.ok) {
        const schoolsData = await schoolsRes.json();
        if (Array.isArray(schoolsData)) {
          setSchools(
            schoolsData.map((s: any) => ({
              id: s.id,
              name: s.name,
              code: s.code,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch scopes data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenConfigure = (scope: ScopeItem) => {
    setActiveScope(scope);
    setEditFormData({
      id: scope.id,
      name: scope.name,
      code: scope.code,
      scopeType: scope.scopeType,
      institution_id: scope.institution_id || "",
      institution: scope.institution,
      description: scope.description,
      status: scope.status || "active",
      capacity: scope.capacity ?? 100,
      dualControlRequired: scope.dualControlRequired ?? false,
      isolationLevel: scope.isolationLevel ?? "strict",
      assignedUsersCount: scope.assignedUsersCount ?? 0,
    });
    setConfigureError(null);
    setConfigureSuccess(null);
    setShowDeleteConfirm(false);
    setIsConfigureOpen(true);
  };

  const handleCloseConfigure = () => {
    setIsConfigureOpen(false);
    setActiveScope(null);
    setConfigureError(null);
    setConfigureSuccess(null);
    setShowDeleteConfirm(false);
  };

  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScope) return;

    setIsSaving(true);
    setConfigureError(null);
    setConfigureSuccess(null);

    try {
      const res = await fetch("/api/superadmin/scopes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update scope configuration");
      }

      setConfigureSuccess("Scope configuration updated successfully.");
      setScopes((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      setActiveScope(data);

      setTimeout(() => {
        setIsConfigureOpen(false);
      }, 1200);
    } catch (err: any) {
      setConfigureError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScope = async () => {
    if (!activeScope) return;

    setIsDeleting(true);
    setConfigureError(null);

    try {
      const res = await fetch(`/api/superadmin/scopes?id=${encodeURIComponent(activeScope.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete scope");
      }

      setScopes((prev) => prev.filter((s) => s.id !== activeScope.id));
      handleCloseConfigure();
    } catch (err: any) {
      setConfigureError(err.message || "Failed to delete scope.");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCreate = () => {
    const defaultSchool = schools.length > 0 ? schools[0] : null;
    setNewScopeData({
      name: "",
      code: "",
      scopeType: "Campus",
      institution_id: defaultSchool ? defaultSchool.id : "",
      institution: defaultSchool ? defaultSchool.name : "Global Scope",
      description: "",
      capacity: 150,
      dualControlRequired: false,
      isolationLevel: "strict",
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScopeData.name.trim()) {
      setCreateError("Scope name is required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/superadmin/scopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newScopeData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create scope");
      }

      setScopes((prev) => [data, ...prev]);
      setIsCreateOpen(false);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create scope.");
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = scopes.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.scopeType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.institution.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      selectedTypeFilter === "ALL" || s.scopeType.toUpperCase() === selectedTypeFilter.toUpperCase();

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Sub-Header: Breadcrumbs + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          <span className="text-slate-800 font-semibold">Department & Campus Scopes</span>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Define New Scope</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search scope, code, type, campus..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Scope Types</option>
              <option value="CAMPUS">Campus</option>
              <option value="FACULTY">Faculty</option>
              <option value="DEPARTMENT">Department</option>
              <option value="COHORT">Cohort</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {filtered.length} {filtered.length === 1 ? "scope configured" : "scopes configured"}
        </div>
      </div>

      {/* Scopes Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="text-xs font-medium text-slate-500">Loading department and campus scopes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3 px-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No Scopes Found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchTerm || selectedTypeFilter !== "ALL"
                ? "No scopes match your current search or filter criteria."
                : "No institutional scopes have been configured yet. Define campuses, faculties, departments, or cohorts to partition authorization boundaries."}
            </p>
            {!searchTerm && selectedTypeFilter === "ALL" && (
              <button
                onClick={handleOpenCreate}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Define First Scope</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Scope Identifier</th>
                  <th className="py-3 px-4">Scope Type</th>
                  <th className="py-3 px-4">Institution Context</th>
                  <th className="py-3 px-4">Isolation & Security</th>
                  <th className="py-3 px-4">Assigned Personnel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{s.name}</span>
                            {s.code && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                                {s.code}
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-slate-500 line-clamp-1">{s.description || "No description provided"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {s.scopeType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{s.institution || "Global Scope"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <ShieldCheck
                          className={`h-3.5 w-3.5 ${
                            s.isolationLevel === "shared" ? "text-amber-500" : "text-emerald-500"
                          }`}
                        />
                        <span className="capitalize">{s.isolationLevel || "strict"}</span>
                        {s.dualControlRequired && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[9.5px] bg-indigo-50 text-indigo-700 font-semibold">
                            Dual-Control
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900">{s.assignedUsersCount || 0} users</span>
                      {s.capacity && (
                        <span className="text-[10.5px] text-slate-400 ml-1">/ {s.capacity} max</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          s.status === "inactive"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            s.status === "inactive" ? "bg-slate-400" : "bg-emerald-500"
                          }`}
                        />
                        {s.status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenConfigure(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold transition-all cursor-pointer border border-transparent hover:border-blue-200 shadow-2xs"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>Configure</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIGURE SCOPE MODAL */}
      {isConfigureOpen && activeScope && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Configure Scope: {activeScope.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID: <span className="font-mono">{activeScope.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseConfigure}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notifications inside modal */}
            {configureError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{configureError}</span>
              </div>
            )}
            {configureSuccess && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{configureSuccess}</span>
              </div>
            )}

            {/* Modal Body */}
            <form onSubmit={handleSaveConfiguration} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Primary Configuration */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  <span>General Scope Parameters</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Scope Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Scope Code / Identifier <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.code || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono uppercase focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Scope Level / Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.scopeType || "Campus"}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          scopeType: e.target.value as ScopeItem["scopeType"],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Campus">Campus</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Department">Department</option>
                      <option value="Cohort">Cohort</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Institution Context
                    </label>
                    <select
                      value={editFormData.institution_id || ""}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const school = schools.find((s) => s.id === selectedId);
                        setEditFormData({
                          ...editFormData,
                          institution_id: selectedId,
                          institution: school ? school.name : "Global Scope",
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Global Platform (All Institutions)</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name} ({school.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scope Description
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.description || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Brief description of administrative authority or campus facilities"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Boundary Governance & Security */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Isolation & Governance Controls</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Administrative Status
                    </label>
                    <select
                      value={editFormData.status || "active"}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          status: e.target.value as "active" | "inactive",
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="active">Active (Operational)</option>
                      <option value="inactive">Inactive (Suspended)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data Isolation Level
                    </label>
                    <select
                      value={editFormData.isolationLevel || "strict"}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          isolationLevel: e.target.value as "strict" | "shared",
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="strict">Strict (Dedicated partition & access boundaries)</option>
                      <option value="shared">Shared (Sub-scope data inherits parent scope)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Personnel Capacity Limit
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editFormData.capacity ?? 100}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          capacity: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Maximum users allowed in this scope</p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2 cursor-pointer pt-3">
                      <input
                        type="checkbox"
                        checked={Boolean(editFormData.dualControlRequired)}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            dualControlRequired: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Require Dual-Control Authorization
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1 ml-6">
                      Requires two admin approvals for high-privilege operations in this scope
                    </p>
                  </div>
                </div>
              </div>

              {/* Danger Zone: Delete Scope */}
              <div className="pt-3 border-t border-slate-100">
                {!showDeleteConfirm ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                    <div>
                      <div className="text-xs font-semibold text-red-900">Danger Zone</div>
                      <div className="text-[11px] text-red-600">
                        Permanently remove this scope and detach all linked scopes.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Delete Scope
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-red-100 border border-red-300 space-y-2">
                    <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span>Are you sure you want to delete this scope?</span>
                    </div>
                    <p className="text-[11px] text-red-800">
                      This action cannot be undone. Any personnel scoped exclusively to this unit will be unassigned.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={handleDeleteScope}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        <span>Confirm Deletion</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseConfigure}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEFINE NEW SCOPE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Define New Scope</h3>
                  <p className="text-xs text-slate-500">
                    Create a campus, faculty, department, or cohort partition
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateScope} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Campus (Cantonments), Faculty of Sciences"
                  value={newScopeData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoCode = name.slice(0, 6).toUpperCase().replace(/\s+/g, "-");
                    setNewScopeData({
                      ...newScopeData,
                      name,
                      code: newScopeData.code ? newScopeData.code : autoCode,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scope Code / Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CAMPUS-MAIN, FCIS"
                    value={newScopeData.code}
                    onChange={(e) =>
                      setNewScopeData({ ...newScopeData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono uppercase focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scope Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newScopeData.scopeType}
                    onChange={(e) =>
                      setNewScopeData({
                        ...newScopeData,
                        scopeType: e.target.value as ScopeItem["scopeType"],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Campus">Campus</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Department">Department</option>
                    <option value="Cohort">Cohort</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Institution Context
                </label>
                <select
                  value={newScopeData.institution_id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const school = schools.find((s) => s.id === selectedId);
                    setNewScopeData({
                      ...newScopeData,
                      institution_id: selectedId,
                      institution: school ? school.name : "Global Scope",
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Global Platform (All Institutions)</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newScopeData.description}
                  onChange={(e) =>
                    setNewScopeData({ ...newScopeData, description: e.target.value })
                  }
                  placeholder="Operational details and campus boundaries"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Isolation Level
                  </label>
                  <select
                    value={newScopeData.isolationLevel}
                    onChange={(e) =>
                      setNewScopeData({
                        ...newScopeData,
                        isolationLevel: e.target.value as "strict" | "shared",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="strict">Strict Partition</option>
                    <option value="shared">Shared Sub-Scope</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Personnel Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newScopeData.capacity}
                    onChange={(e) =>
                      setNewScopeData({ ...newScopeData, capacity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Scope</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
