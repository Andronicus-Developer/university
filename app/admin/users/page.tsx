"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Lock,
  UserCheck,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Mail,
  User,
  Phone,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Users,
  CheckCircle2,
} from "lucide-react";

interface RoleItem {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  account_status: string;
  created_at: string;
  role_code: string;
  role_name: string;
}

export default function UsersRBACPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Notifications / Alert
  const [statusAlert, setStatusAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Action Loading
  const [submitting, setSubmitting] = useState(false);

  // Active User for Edit/Delete
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    roleCode: "student",
    accountStatus: "active",
    showPassword: false,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    id: "",
    fullName: "",
    email: "",
    phone: "",
    roleCode: "student",
    accountStatus: "active",
    password: "",
    showPassword: false,
  });

  // ============================================================================
  // Fetch Users & Roles from API
  // ============================================================================
  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load users");
      }

      setRoles(data.roles || []);

      const formattedUsers: UserItem[] = (data.users || []).map((u: any) => {
        const assignment = u.user_role_assignments?.[0];
        const role = assignment?.role;
        return {
          id: u.id,
          email: u.email,
          full_name: u.full_name || "Unnamed User",
          phone: u.phone || "",
          avatar_url: u.avatar_url,
          account_status: u.account_status || "active",
          created_at: new Date(u.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          role_code: role?.code || "student",
          role_name: role?.name || "Student",
        };
      });

      setUsers(formattedUsers);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setStatusAlert({ type: "error", text: err.message || "Could not load users." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === "all" || u.role_code === roleFilter;
      const matchesStatus = statusFilter === "all" || u.account_status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // ============================================================================
  // Handle Create User
  // ============================================================================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || !createForm.fullName) {
      setStatusAlert({ type: "error", text: "Please fill in all required fields." });
      return;
    }
    if (createForm.password.length < 8) {
      setStatusAlert({ type: "error", text: "Password must be at least 8 characters long." });
      return;
    }

    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          full_name: createForm.fullName,
          phone: createForm.phone,
          role_code: createForm.roleCode,
          account_status: createForm.accountStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setStatusAlert({
        type: "success",
        text: `User ${createForm.fullName} (${createForm.email}) created and assigned role successfully!`,
      });

      setCreateModalOpen(false);
      setCreateForm({
        fullName: "",
        email: "",
        password: "",
        phone: "",
        roleCode: "student",
        accountStatus: "active",
        showPassword: false,
      });

      await fetchUsersAndRoles();
    } catch (err: any) {
      setStatusAlert({ type: "error", text: err.message || "Failed to provision user." });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // Open & Handle Edit User
  // ============================================================================
  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setEditForm({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone || "",
      roleCode: user.role_code,
      accountStatus: user.account_status,
      password: "",
      showPassword: false,
    });
    setEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.fullName) {
      setStatusAlert({ type: "error", text: "Full name is required." });
      return;
    }

    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editForm.id,
          email: editForm.email,
          full_name: editForm.fullName,
          phone: editForm.phone,
          role_code: editForm.roleCode,
          account_status: editForm.accountStatus,
          password: editForm.password || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setStatusAlert({
        type: "success",
        text: `User ${editForm.fullName} updated and saved to database!`,
      });

      setEditModalOpen(false);
      await fetchUsersAndRoles();
    } catch (err: any) {
      setStatusAlert({ type: "error", text: err.message || "Failed to update user." });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // Open & Handle Delete User
  // ============================================================================
  const openDeleteModal = (user: UserItem) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch(`/api/admin/users?id=${selectedUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setStatusAlert({
        type: "success",
        text: `User ${selectedUser.full_name} (${selectedUser.email}) removed from system.`,
      });

      setDeleteModalOpen(false);
      setSelectedUser(null);
      await fetchUsersAndRoles();
    } catch (err: any) {
      setStatusAlert({ type: "error", text: err.message || "Failed to delete user." });
    } finally {
      setSubmitting(false);
    }
  };

  // Role pill color mapping
  const getRoleBadgeStyle = (code: string) => {
    switch (code) {
      case "system_admin":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "vice_chancellor":
      case "registrar":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "academic_affairs_officer":
      case "dean":
      case "head_of_department":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "finance_officer":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "lecturer":
      case "academic_advisor":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "librarian":
      case "hostel_officer":
      case "hr_officer":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "auditor":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "student":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14 font-sans text-slate-800">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-blue-600 font-semibold">Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold">Security & System</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Users & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create new accounts, reassign documented roles, manage credentials, and remove users directly in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsersAndRoles}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create User & Assign Role</span>
          </button>
        </div>
      </div>

      {/* Global Status Message Banner */}
      {statusAlert && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold shadow-2xs ${
            statusAlert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusAlert.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{statusAlert.text}</span>
          </div>
          <button
            onClick={() => setStatusAlert(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-current cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-2xl font-black text-slate-900 leading-tight">{users.length}</div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Total System Users</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-2xl font-black text-emerald-600 leading-tight">
            {users.filter((u) => u.account_status === "active").length}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Active Accounts</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-2xl font-black text-blue-600 leading-tight">
            {users.filter((u) => u.role_code === "system_admin" || u.role_code === "registrar").length}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Administrators</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-2xl font-black text-purple-600 leading-tight">
            {roles.length}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">RBAC Roles Defined</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="all">All Roles ({roles.length})</option>
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">User / Identity</th>
                <th className="py-3.5 px-4">Contact Handle</th>
                <th className="py-3.5 px-4">Assigned Documented Role</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* User */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.full_name}
                            className="h-9 w-9 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                            {u.full_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">{u.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{u.email}</div>
                      {u.phone && <div className="text-[10px] text-slate-500 font-mono">{u.phone}</div>}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getRoleBadgeStyle(
                          u.role_code
                        )}`}
                      >
                        {u.role_name}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.account_status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : u.account_status === "suspended"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.account_status === "active" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {u.account_status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{u.created_at}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all cursor-pointer"
                          title="Edit User & Reassign Role"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => openDeleteModal(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                          title="Delete User from System"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Querying Supabase Auth and Profiles...</span>
                      </div>
                    ) : (
                      "No matching users found."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: CREATE USER & ASSIGN ROLE */}
      {/* ===================================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Provision User & Assign Role</h3>
                  <p className="text-[11px] text-slate-500">Creates credentials in Supabase Auth and assigns documented role.</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    placeholder="e.g. Dr. Kwame Mensah"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="user@university.edu.gh"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={createForm.showPassword ? "text" : "password"}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, showPassword: !createForm.showPassword })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {createForm.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+233..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={createForm.accountStatus}
                    onChange={(e) => setCreateForm({ ...createForm, accountStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Documented Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Institutional Role *</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-3 h-4 w-4 text-blue-600" />
                  <select
                    value={createForm.roleCode}
                    onChange={(e) => setCreateForm({ ...createForm, roleCode: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selected role defines accessible dashboards, navigation items, and Supabase RLS security policies.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Creating User..." : "Save to Database"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: EDIT USER & REASSIGN ROLE */}
      {/* ===================================================================== */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit User & Modify Role Assignment</h3>
                  <p className="text-[11px] text-slate-500">Update profile details, permissions, or reset authentication password.</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Handle</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editForm.accountStatus}
                    onChange={(e) => setEditForm({ ...editForm, accountStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Reassign Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Institutional Role *</label>
                <select
                  value={editForm.roleCode}
                  onChange={(e) => setEditForm({ ...editForm, roleCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700 focus:bg-white focus:border-blue-600 focus:outline-none cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Reset Password */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <div className="relative">
                  <input
                    type={editForm.showPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Enter new password (optional)"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, showPassword: !editForm.showPassword })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {editForm.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Saving Updates..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: DELETE USER CONFIRMATION */}
      {/* ===================================================================== */}
      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm User Deletion</h3>
                <p className="text-[11px] text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900">{selectedUser.full_name}</strong> ({selectedUser.email})?
              This will remove their credentials from Supabase Auth, delete their profile records, and revoke all assigned roles.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{submitting ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
