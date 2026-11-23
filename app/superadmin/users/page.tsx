"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Mail,
  Shield,
  Building2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Trash2,
  KeyRound,
  Edit3,
  X,
  Phone,
  Calendar,
  AlertCircle,
  Loader2,
  MoreVertical,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  account_status: "active" | "suspended" | "locked" | "deleted";
  status?: "active" | "suspended" | "locked" | "deleted";
  school_id?: string | null;
  institution: string;
  mfa_enabled: boolean;
  created_at: string;
}

interface SchoolOption {
  id: string;
  name: string;
  code?: string;
}

const ROLE_OPTIONS = [
  { code: "superadmin", label: "Super Administrator" },
  { code: "system_admin", label: "System Administrator" },
  { code: "vice_chancellor", label: "Vice-Chancellor / Executive" },
  { code: "registrar", label: "Registrar" },
  { code: "academic_affairs_officer", label: "Academic Affairs Officer" },
  { code: "dean", label: "Faculty Dean" },
  { code: "head_of_department", label: "Head of Department" },
  { code: "finance_officer", label: "Finance Officer / Bursar" },
  { code: "lecturer", label: "Lecturer / Instructor" },
  { code: "academic_advisor", label: "Academic Advisor" },
  { code: "student", label: "Student" },
  { code: "applicant", label: "Applicant" },
  { code: "hr_officer", label: "Human Resources Officer" },
  { code: "librarian", label: "Librarian" },
  { code: "hostel_officer", label: "Hostel Officer" },
  { code: "auditor", label: "Auditor" },
  { code: "parent_sponsor", label: "Parent / Sponsor" },
];

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "security" | "danger">("overview");

  // Edit form states
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editSchoolId, setEditSchoolId] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Action status / feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Provision user modal state
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionFullName, setProvisionFullName] = useState("");
  const [provisionEmail, setProvisionEmail] = useState("");
  const [provisionPassword, setProvisionPassword] = useState("");
  const [provisionPhone, setProvisionPhone] = useState("");
  const [provisionRole, setProvisionRole] = useState("system_admin");
  const [provisionSchoolId, setProvisionSchoolId] = useState("");
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionFeedback, setProvisionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const openProvisionModal = () => {
    setProvisionFullName("");
    setProvisionEmail("");
    setProvisionPassword("");
    setProvisionPhone("");
    setProvisionRole("system_admin");
    setProvisionSchoolId(schools.length > 0 ? schools[0].id : "");
    setProvisionFeedback(null);
    setIsProvisionOpen(true);
  };

  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionFullName.trim() || !provisionEmail.trim() || !provisionRole) {
      setProvisionFeedback({ type: "error", message: "Full Name, Email Address, and Role are required." });
      return;
    }

    setProvisionLoading(true);
    setProvisionFeedback(null);

    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: provisionFullName.trim(),
          email: provisionEmail.trim(),
          password: provisionPassword.trim() || undefined,
          phone: provisionPhone.trim() || undefined,
          role: provisionRole,
          school_id: provisionSchoolId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to provision user");
      }

      setProvisionFeedback({ type: "success", message: `User "${data.full_name || provisionFullName}" provisioned successfully!` });
      await loadUsers();
      setTimeout(() => {
        setIsProvisionOpen(false);
      }, 1200);
    } catch (err: any) {
      setProvisionFeedback({ type: "error", message: err.message || "Failed to provision user." });
    } finally {
      setProvisionLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/superadmin/users");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(
            data.map((u: any) => ({
              ...u,
              status: u.account_status || u.status || "active",
              account_status: u.account_status || u.status || "active",
            }))
          );
        }
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchools = async () => {
    try {
      const res = await fetch("/api/superadmin/schools");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSchools(data.map((s: any) => ({ id: s.id, name: s.name, code: s.code })));
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadUsers();
    loadSchools();

    const handleRefresh = () => {
      loadUsers();
    };
    window.addEventListener("school_deleted", handleRefresh);
    return () => {
      window.removeEventListener("school_deleted", handleRefresh);
    };
  }, []);

  const openManageModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditFullName(user.full_name || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditRole(user.role || "student");
    setEditSchoolId(user.school_id || "");
    setNewPassword("");
    setFeedback(null);
    setActiveTab("overview");
    setDeleteConfirmOpen(false);
    setIsManaging(true);
  };

  const closeManageModal = () => {
    setIsManaging(false);
    setSelectedUser(null);
    setDeleteConfirmOpen(false);
    setFeedback(null);
  };

  // 1. Status Change (Suspend / Activate / Lock)
  const handleStatusChange = async (newStatus: "active" | "suspended" | "locked") => {
    if (!selectedUser) return;
    if (selectedUser.role === "superadmin") {
      setFeedback({ type: "error", message: "Master Super Administrator cannot be suspended or locked." });
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          account_status: newStatus,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to update user status");
      }

      const updatedStatusUser = {
        ...selectedUser,
        account_status: newStatus,
        status: newStatus,
      };
      setSelectedUser(updatedStatusUser);
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? updatedStatusUser : u)));

      const label = newStatus === "active" ? "activated" : newStatus === "suspended" ? "suspended" : "locked";
      setFeedback({ type: "success", message: `User account has been successfully ${label}.` });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Action failed." });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Update Details
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          full_name: editFullName.trim(),
          phone: editPhone.trim(),
          role: selectedUser.role === "superadmin" ? "superadmin" : editRole,
          school_id: editSchoolId || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to update user details");
      }

      const matchedSchool = schools.find((s) => s.id === editSchoolId);
      const updatedUser: UserProfile = {
        ...selectedUser,
        full_name: editFullName.trim(),
        phone: editPhone.trim(),
        role: selectedUser.role === "superadmin" ? "superadmin" : editRole,
        school_id: editSchoolId || null,
        institution:
          selectedUser.role === "superadmin"
            ? "UMS Central Platform"
            : matchedSchool
            ? matchedSchool.name
            : "Unassigned",
      };

      setSelectedUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? updatedUser : u)));
      setFeedback({ type: "success", message: "User details updated successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save changes." });
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      setFeedback({ type: "error", message: "Password must be at least 6 characters long." });
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          password: newPassword,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to reset password");
      }

      setNewPassword("");
      setFeedback({ type: "success", message: `Password successfully updated for ${selectedUser.email}.` });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update password." });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (selectedUser.role === "superadmin" || selectedUser.email === "superadmin@university.edu.gh") {
      setFeedback({ type: "error", message: "Master Super Administrator cannot be deleted." });
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/superadmin/users?id=${encodeURIComponent(selectedUser.id)}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      closeManageModal();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to delete user." });
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term) ||
      (u.institution && u.institution.toLowerCase().includes(term));

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const userStatus = u.account_status || u.status || "active";
    const matchesStatus = statusFilter === "all" || userStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const isSuperAdmin = (u: UserProfile) =>
    u.role === "superadmin" || u.email === "superadmin@university.edu.gh";

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
          <span className="text-slate-800 font-semibold">Users & Directory</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openProvisionModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Provision User</span>
          </button>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, role, or school..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="locked">Locked</option>
          </select>

          <span className="text-xs text-slate-500 ml-2">
            Showing <strong className="text-slate-800">{filtered.length}</strong> of {users.length}
          </span>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs">Loading directory records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No users found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search filters."
                : "No users have been registered in the database yet."}
            </p>
            {!searchTerm && roleFilter === "all" && statusFilter === "all" && (
              <button
                onClick={openProvisionModal}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Provision First User</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Institution Context</th>
                  <th className="py-3 px-4">MFA Status</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => {
                  const status = u.account_status || u.status || "active";
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {u.full_name?.slice(0, 2).toUpperCase() || "US"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {isSuperAdmin(u) && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  MASTER
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold uppercase">
                          {u.role.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {u.institution}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.mfa_enabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {u.mfa_enabled ? "MFA Active" : "No MFA"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : status === "suspended" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Suspended
                          </span>
                        ) : status === "locked" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <Lock className="h-3 w-3 text-red-600" />
                            Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            {status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openManageModal(u)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANAGE USER MODAL */}
      {isManaging && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {selectedUser.full_name?.slice(0, 2).toUpperCase() || "US"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{selectedUser.full_name}</span>
                    {isSuperAdmin(selectedUser) && (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                        PROTECTED
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={closeManageModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 bg-white">
              <button
                onClick={() => {
                  setActiveTab("overview");
                  setFeedback(null);
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Overview & Status
              </button>
              <button
                onClick={() => {
                  setActiveTab("edit");
                  setFeedback(null);
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeTab === "edit"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Edit Profile
              </button>
              <button
                onClick={() => {
                  setActiveTab("security");
                  setFeedback(null);
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeTab === "security"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Security & Password
              </button>
              <button
                onClick={() => {
                  setActiveTab("danger");
                  setFeedback(null);
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeTab === "danger"
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Danger Zone
              </button>
            </div>

            {/* Feedback Message */}
            {feedback && (
              <div
                className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: OVERVIEW & STATUS CONTROLS */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Current Status Box */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Current Account Status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {selectedUser.account_status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Active & Accessible
                          </span>
                        ) : selectedUser.account_status === "suspended" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Suspended (Access Blocked)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                            <Lock className="h-3 w-3 text-red-600" />
                            Locked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick State Toggle Buttons */}
                    <div className="flex items-center gap-2">
                      {isSuperAdmin(selectedUser) ? (
                        <span className="text-[11px] text-slate-400 italic">Protected account</span>
                      ) : selectedUser.account_status === "active" ? (
                        <>
                          <button
                            onClick={() => handleStatusChange("suspended")}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Suspend</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange("locked")}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Lock</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStatusChange("active")}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Reactivate Account</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 text-[11px] block">Role</span>
                      <span className="font-semibold text-slate-800 capitalize">
                        {selectedUser.role.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 text-[11px] block">Institution</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {selectedUser.institution}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 text-[11px] block">Phone</span>
                      <span className="font-semibold text-slate-800">
                        {selectedUser.phone || "Not set"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 text-[11px] block">Created Date</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: EDIT PROFILE */}
              {activeTab === "edit" && (
                <form onSubmit={handleSaveDetails} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address (Identity)
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      disabled
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      User email addresses are permanently anchored to their unique credentials.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+233 XX XXX XXXX"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  {!isSuperAdmin(selectedUser) && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Assigned System Role
                        </label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                        >
                          {ROLE_OPTIONS.filter((r) => r.code !== "superadmin").map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tenant School Assignment
                        </label>
                        <select
                          value={editSchoolId}
                          onChange={(e) => setEditSchoolId(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                        >
                          <option value="">No School Assigned (Unassigned)</option>
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.code ? `(${s.code})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? "Saving..." : "Save Profile Changes"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: SECURITY & PASSWORD */}
              {activeTab === "security" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                    <KeyRound className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Direct Password Reset</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Set a new password directly for this user. The new credentials will apply immediately across both local virtual storage and authenticated sessions.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters..."
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs font-mono"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading || !newPassword}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? "Resetting..." : "Update Password"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: DANGER ZONE (DELETE) */}
              {activeTab === "danger" && (
                <div className="space-y-4">
                  {isSuperAdmin(selectedUser) ? (
                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
                      <p className="font-bold flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-purple-600" />
                        Master Super Administrator Protected
                      </p>
                      <p className="mt-1 text-purple-700 text-[11px]">
                        The primary super administrator account cannot be deleted or suspended. This safety guard guarantees continuous platform accessibility.
                      </p>
                    </div>
                  ) : !deleteConfirmOpen ? (
                    <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-red-900">Delete User Account</h4>
                        <p className="text-[11px] text-red-700 mt-0.5">
                          Permanently delete this user from the directory, role mappings, and authentication engine.
                        </p>
                      </div>
                      <button
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete User</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-red-100 border border-red-300 space-y-3 animate-in fade-in">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-red-950">Confirm Permanent Deletion</h4>
                          <p className="text-[11px] text-red-800 mt-0.5">
                            Are you sure you want to permanently delete <strong>{selectedUser.full_name}</strong> ({selectedUser.email})? This action cannot be undone.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={handleDeleteUser}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                        >
                          {actionLoading ? "Deleting..." : "Yes, Delete Permanently"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmOpen(false)}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROVISION USER MODAL */}
      {isProvisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Provision New User</h3>
                  <p className="text-xs text-slate-500">
                    Create credentials, assign functional role, and configure institutional school context
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProvisionOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notifications */}
            {provisionFeedback && (
              <div
                className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  provisionFeedback.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {provisionFeedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{provisionFeedback.message}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleProvisionUser} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kwesi Appiah"
                  value={provisionFullName}
                  onChange={(e) => setProvisionFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. kwesi.appiah@university.edu.gh"
                    value={provisionEmail}
                    onChange={(e) => setProvisionEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +233 24 123 4567"
                    value={provisionPhone}
                    onChange={(e) => setProvisionPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password
                </label>
                <input
                  type="text"
                  placeholder="Defaults to Pass@123456"
                  value={provisionPassword}
                  onChange={(e) => setProvisionPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Leave blank to auto-assign default temporary password: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono text-[10px]">Pass@123456</code>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={provisionRole}
                    onChange={(e) => setProvisionRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign School / Institution <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={provisionSchoolId}
                    onChange={(e) => setProvisionSchoolId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">UMS Central Platform (Global)</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {schools.length === 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    No institutions registered yet. You can provision platform-level users or create a school first from the Schools menu.
                  </span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisionLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {provisionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Provision User</span>
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
