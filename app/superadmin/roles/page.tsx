"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  KeyRound,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Users,
  CheckSquare,
  Square,
  Filter,
  Eye,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { RoleItem, PermissionItem } from "@/lib/superadmin/service";

export default function SuperAdminRolesPage() {
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [searchRole, setSearchRole] = useState("");
  const [roleTypeFilter, setRoleTypeFilter] = useState<"all" | "system" | "custom">("all");
  const [searchPerm, setSearchPerm] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");

  // Notifications
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role Modals
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
  const [inspectRole, setInspectRole] = useState<RoleItem | null>(null);

  // Permission Modals
  const [showCreatePermModal, setShowCreatePermModal] = useState(false);
  const [showEditPermModal, setShowEditPermModal] = useState(false);
  const [showDeletePermModal, setShowDeletePermModal] = useState(false);
  const [selectedPerm, setSelectedPerm] = useState<PermissionItem | null>(null);

  // Role Form State
  const [roleForm, setRoleForm] = useState({
    id: "",
    code: "",
    name: "",
    description: "",
    typical_restrictions: "",
    is_system_role: false,
    permission_ids: [] as string[],
  });
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Permission Form State
  const [permForm, setPermForm] = useState({
    id: "",
    code: "",
    module: "General",
    description: "",
  });
  const [isSubmittingPerm, setIsSubmittingPerm] = useState(false);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/superadmin/roles"),
        fetch("/api/superadmin/permissions"),
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      }
      if (permsRes.ok) {
        const permsData = await permsRes.json();
        setPermissions(Array.isArray(permsData) ? permsData : []);
      }
    } catch (err: any) {
      console.error("Error loading roles/permissions:", err);
      setStatusMessage({ type: "error", text: "Failed to load roles and permissions data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group permissions by module for the matrix selector
  const permissionsByModule = useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    permissions.forEach((p) => {
      const mod = p.module || "General";
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    });
    return map;
  }, [permissions]);

  const uniqueModules = useMemo(() => {
    return Array.from(new Set(permissions.map((p) => p.module || "General"))).sort();
  }, [permissions]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchRole.toLowerCase()) ||
        r.code.toLowerCase().includes(searchRole.toLowerCase()) ||
        r.description.toLowerCase().includes(searchRole.toLowerCase());
      const matchesType =
        roleTypeFilter === "all" ||
        (roleTypeFilter === "system" && r.is_system_role) ||
        (roleTypeFilter === "custom" && !r.is_system_role);
      return matchesSearch && matchesType;
    });
  }, [roles, searchRole, roleTypeFilter]);

  // Filtered Permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesSearch =
        p.code.toLowerCase().includes(searchPerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchPerm.toLowerCase()) ||
        p.module.toLowerCase().includes(searchPerm.toLowerCase());
      const matchesMod = selectedModule === "all" || p.module === selectedModule;
      return matchesSearch && matchesMod;
    });
  }, [permissions, searchPerm, selectedModule]);

  // Handle Role Creation
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.code || !roleForm.name) {
      setStatusMessage({ type: "error", text: "Role code and name are required." });
      return;
    }

    setIsSubmittingRole(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create role");
      }

      setStatusMessage({ type: "success", text: `Role '${roleForm.name}' successfully created!` });
      setShowCreateRoleModal(false);
      setRoleForm({
        id: "",
        code: "",
        name: "",
        description: "",
        typical_restrictions: "",
        is_system_role: false,
        permission_ids: [],
      });
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Open Edit Role Modal
  const openEditRole = (role: RoleItem) => {
    setInspectRole(role);
    setRoleForm({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description || "",
      typical_restrictions: role.typical_restrictions || "",
      is_system_role: role.is_system_role,
      permission_ids: role.permission_ids || [],
    });
    setShowEditRoleModal(true);
  };

  // Handle Role Update
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.id || !roleForm.name) {
      setStatusMessage({ type: "error", text: "Role name is required." });
      return;
    }

    setIsSubmittingRole(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setStatusMessage({ type: "success", text: `Role '${roleForm.name}' updated successfully.` });
      setShowEditRoleModal(false);
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Open Delete Role Modal
  const openDeleteRole = (role: RoleItem) => {
    setInspectRole(role);
    setShowDeleteRoleModal(true);
  };

  // Handle Role Deletion
  const handleDeleteRole = async () => {
    if (!inspectRole) return;
    setIsSubmittingRole(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/superadmin/roles?id=${inspectRole.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete role");
      }

      setStatusMessage({ type: "success", text: `Role '${inspectRole.name}' deleted successfully.` });
      setShowDeleteRoleModal(false);
      setInspectRole(null);
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Toggle permission in role form
  const togglePermission = (permId: string) => {
    setRoleForm((prev) => {
      const exists = prev.permission_ids.includes(permId);
      return {
        ...prev,
        permission_ids: exists
          ? prev.permission_ids.filter((id) => id !== permId)
          : [...prev.permission_ids, permId],
      };
    });
  };

  // Toggle all permissions for a module
  const toggleModulePermissions = (moduleName: string) => {
    const modPermIds = (permissionsByModule[moduleName] || []).map((p) => p.id);
    const allSelected = modPermIds.every((id) => roleForm.permission_ids.includes(id));

    setRoleForm((prev) => {
      if (allSelected) {
        return {
          ...prev,
          permission_ids: prev.permission_ids.filter((id) => !modPermIds.includes(id)),
        };
      } else {
        const set = new Set([...prev.permission_ids, ...modPermIds]);
        return {
          ...prev,
          permission_ids: Array.from(set),
        };
      }
    });
  };

  // Handle Permission Creation
  const handleCreatePerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permForm.code || !permForm.module) {
      setStatusMessage({ type: "error", text: "Permission code and module are required." });
      return;
    }

    setIsSubmittingPerm(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create permission");
      }

      setStatusMessage({ type: "success", text: `Permission '${permForm.code}' created successfully!` });
      setShowCreatePermModal(false);
      setPermForm({ id: "", code: "", module: "General", description: "" });
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmittingPerm(false);
    }
  };

  // Open Edit Permission
  const openEditPerm = (perm: PermissionItem) => {
    setSelectedPerm(perm);
    setPermForm({
      id: perm.id,
      code: perm.code,
      module: perm.module,
      description: perm.description,
    });
    setShowEditPermModal(true);
  };

  // Handle Permission Update
  const handleUpdatePerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permForm.id || !permForm.code) {
      setStatusMessage({ type: "error", text: "Permission code is required." });
      return;
    }

    setIsSubmittingPerm(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/superadmin/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update permission");
      }

      setStatusMessage({ type: "success", text: `Permission '${permForm.code}' updated successfully.` });
      setShowEditPermModal(false);
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmittingPerm(false);
    }
  };

  // Open Delete Permission
  const openDeletePerm = (perm: PermissionItem) => {
    setSelectedPerm(perm);
    setShowDeletePermModal(true);
  };

  // Handle Permission Delete
  const handleDeletePerm = async () => {
    if (!selectedPerm) return;
    setIsSubmittingPerm(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/superadmin/permissions?id=${selectedPerm.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete permission");
      }

      setStatusMessage({ type: "success", text: `Permission '${selectedPerm.code}' deleted successfully.` });
      setShowDeletePermModal(false);
      setSelectedPerm(null);
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmittingPerm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* Sub-Header: Breadcrumbs + Tab Switcher + Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link
              href="/superadmin/dashboard"
              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Super Admin
            </Link>
            <span className="text-slate-300">/</span>
            <span>Governance & Security</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">Central RBAC & Permissions</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Roles & Permissions Governance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enforce Section 4 least-privilege standards, custom role definitions, and granular permission sets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {activeTab === "roles" ? (
            <button
              onClick={() => {
                setRoleForm({
                  id: "",
                  code: "",
                  name: "",
                  description: "",
                  typical_restrictions: "",
                  is_system_role: false,
                  permission_ids: [],
                });
                setShowCreateRoleModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom Role</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setPermForm({ id: "", code: "", module: "General", description: "" });
                setShowCreatePermModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Permission</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Toast / Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("roles")}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "roles"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>System & Custom Roles ({roles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("permissions")}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "permissions"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Granular Permissions ({permissions.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ROLES MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Total Governed Roles</span>
                <ShieldCheck className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{roles.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Multi-tenant role catalogue</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Core System Roles</span>
                <Lock className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {roles.filter((r) => r.is_system_role).length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Protected baseline profiles</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Custom Defined Roles</span>
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {roles.filter((r) => !r.is_system_role).length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Tailored institutional roles</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Active User Assignments</span>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {roles.reduce((acc, r) => acc + (r.assigned_users_count || 0), 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Bound cross-institution profiles</div>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchRole}
                onChange={(e) => setSearchRole(e.target.value)}
                placeholder="Search role by name, code, or description..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500">Filter:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setRoleTypeFilter("all")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    roleTypeFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  All ({roles.length})
                </button>
                <button
                  onClick={() => setRoleTypeFilter("system")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    roleTypeFilter === "system" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  System ({roles.filter((r) => r.is_system_role).length})
                </button>
                <button
                  onClick={() => setRoleTypeFilter("custom")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    roleTypeFilter === "custom" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  Custom ({roles.filter((r) => !r.is_system_role).length})
                </button>
              </div>
            </div>
          </div>

          {/* Roles Grid */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading RBAC roles and permissions...</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No roles match your search</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your query or role type filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRoles.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            r.code === "superadmin"
                              ? "bg-purple-50 text-purple-600 border border-purple-100"
                              : r.is_system_role
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          }`}
                        >
                          <ShieldCheck className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {r.code}
                            </span>
                            {r.is_system_role ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                <Lock className="h-2.5 w-2.5" />
                                System
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Action Menu */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditRole(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Role & Permissions"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteRole(r)}
                          disabled={r.code === "superadmin" || r.code === "system_admin"}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            r.code === "superadmin" || r.code === "system_admin"
                              ? "text-slate-200 cursor-not-allowed"
                              : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                          }`}
                          title={
                            r.code === "superadmin" || r.code === "system_admin"
                              ? "Root governance role cannot be deleted"
                              : "Delete Role"
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{r.name}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                        {r.description}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                      <strong className="text-slate-800">Restriction:</strong>{" "}
                      {r.typical_restrictions || "Enforces Section 4 separation of duties baseline."}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-[11px]">
                        {r.permissions_count} Permissions
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {r.assigned_users_count || 0}
                      </span>
                    </div>

                    <button
                      onClick={() => openEditRole(r)}
                      className="text-slate-600 hover:text-blue-600 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Edit Scope</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GRANULAR PERMISSIONS DIRECTORY */}
      {/* ============================================================== */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Granular Permissions</span>
                <KeyRound className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{permissions.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Section 4.1 permission matrix</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Functional Modules</span>
                <Layers className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{uniqueModules.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Domain security boundaries</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Audit & Security Scopes</span>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {permissions.filter((p) => p.module === "System & Security" || p.module === "Audit").length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">High-privilege capabilities</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Active Role Bindings</span>
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {permissions.reduce((acc, p) => acc + (p.roles_count || 0), 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Cross-role permission mappings</div>
            </div>
          </div>

          {/* Search & Module Filter */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchPerm}
                onChange={(e) => setSearchPerm(e.target.value)}
                placeholder="Search permission code or description..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500">Module:</span>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Modules ({permissions.length})</option>
                {uniqueModules.map((m) => (
                  <option key={m} value={m}>
                    {m} ({(permissionsByModule[m] || []).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Permissions Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Permission Code</th>
                    <th className="py-3 px-4">Module Category</th>
                    <th className="py-3 px-4">Capability Description</th>
                    <th className="py-3 px-4 text-center">Bound Roles</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading permissions registry...
                      </td>
                    </tr>
                  ) : filteredPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No permissions found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredPermissions.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {p.code}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {p.module}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[400px] text-slate-600">
                          {p.description || "Grants functional access within domain."}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px]">
                            {p.roles_count || 0} roles
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditPerm(p)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Edit Permission"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openDeletePerm(p)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete Permission"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE ROLE */}
      {/* ============================================================== */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Define Custom RBAC Role</h3>
                  <p className="text-[11px] text-slate-500">
                    Create a new privileged role and bind granular permission scopes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. exams_officer"
                    value={roleForm.code}
                    onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Lowercase alphanumeric with underscores</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Examinations Officer"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Summarize the core duties and authority of this role..."
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Typical Restrictions</label>
                <input
                  type="text"
                  placeholder="e.g. No direct access to financial transactions; marks lock upon senate submission"
                  value={roleForm.typical_restrictions}
                  onChange={(e) => setRoleForm({ ...roleForm, typical_restrictions: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Permission Matrix */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-900">
                    Assign Permissions ({roleForm.permission_ids.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setRoleForm({
                          ...roleForm,
                          permission_ids: permissions.map((p) => p.id),
                        })
                      }
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setRoleForm({ ...roleForm, permission_ids: [] })}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                  {Object.entries(permissionsByModule).map(([modName, modPerms]) => {
                    const allSelected = modPerms.every((p) => roleForm.permission_ids.includes(p.id));
                    return (
                      <div key={modName} className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800">{modName}</span>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(modName)}
                            className="text-[10px] text-blue-600 hover:underline font-medium cursor-pointer"
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {modPerms.map((p) => {
                            const checked = roleForm.permission_ids.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all ${
                                  checked
                                    ? "bg-blue-50/80 border-blue-200 text-blue-900 font-medium"
                                    : "bg-white border-slate-200/70 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(p.id)}
                                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0">
                                  <div className="font-mono truncate">{p.code}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{p.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save & Provision Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT ROLE & PERMISSIONS */}
      {/* ============================================================== */}
      {showEditRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit Role: <span className="text-blue-600 font-mono">{roleForm.code}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Update role identity and adjust granular permission assignments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Code</label>
                  <input
                    type="text"
                    disabled
                    value={roleForm.code}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Immutable identifier used across codebase</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Typical Restrictions</label>
                <input
                  type="text"
                  value={roleForm.typical_restrictions}
                  onChange={(e) => setRoleForm({ ...roleForm, typical_restrictions: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Permission Matrix */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-900">
                    Assigned Permissions ({roleForm.permission_ids.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setRoleForm({
                          ...roleForm,
                          permission_ids: permissions.map((p) => p.id),
                        })
                      }
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setRoleForm({ ...roleForm, permission_ids: [] })}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                  {Object.entries(permissionsByModule).map(([modName, modPerms]) => {
                    const allSelected = modPerms.every((p) => roleForm.permission_ids.includes(p.id));
                    return (
                      <div key={modName} className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800">{modName}</span>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(modName)}
                            className="text-[10px] text-blue-600 hover:underline font-medium cursor-pointer"
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {modPerms.map((p) => {
                            const checked = roleForm.permission_ids.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all ${
                                  checked
                                    ? "bg-blue-50/80 border-blue-200 text-blue-900 font-medium"
                                    : "bg-white border-slate-200/70 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(p.id)}
                                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0">
                                  <div className="font-mono truncate">{p.code}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{p.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditRoleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE ROLE */}
      {/* ============================================================== */}
      {showDeleteRoleModal && inspectRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center">
              <Trash2 className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Role: {inspectRole.name}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to permanently delete this role? Any active users currently
                assigned to this role will have their role assignment revoked.
              </p>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Security Notice:</span>
              </div>
              <p className="text-[11px] text-red-700">
                This action is audited in the global compliance trail. It cannot be undone once confirmed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteRoleModal(false);
                  setInspectRole(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                disabled={isSubmittingRole}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isSubmittingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE PERMISSION */}
      {/* ============================================================== */}
      {showCreatePermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Define Granular Permission</h3>
                  <p className="text-[11px] text-slate-500">Register a new atomic capability code</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreatePermModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePerm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permission Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. scholarship.award.approve"
                  value={permForm.code}
                  onChange={(e) => setPermForm({ ...permForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Format: `domain.entity.action` (e.g. `results.marks.submit`)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Functional Module <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finance, Admissions, Registry"
                  value={permForm.module}
                  onChange={(e) => setPermForm({ ...permForm, module: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="State the exact capability and boundary of this permission..."
                  value={permForm.description}
                  onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreatePermModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPerm}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingPerm && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Register Permission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT PERMISSION */}
      {/* ============================================================== */}
      {showEditPermModal && selectedPerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Permission</h3>
                  <p className="text-[11px] text-slate-500">Update permission specification</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditPermModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePerm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permission Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={permForm.code}
                  onChange={(e) => setPermForm({ ...permForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Functional Module <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={permForm.module}
                  onChange={(e) => setPermForm({ ...permForm, module: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={permForm.description}
                  onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditPermModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPerm}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingPerm && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Permission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE PERMISSION */}
      {/* ============================================================== */}
      {showDeletePermModal && selectedPerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center">
              <Trash2 className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Permission: <span className="font-mono text-red-600">{selectedPerm.code}</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to delete this permission? It will be automatically unlinked from
                all roles ({selectedPerm.roles_count || 0} active bindings).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeletePermModal(false);
                  setSelectedPerm(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePerm}
                disabled={isSubmittingPerm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isSubmittingPerm && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
