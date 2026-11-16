"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Plus,
  Search,
  Mail,
  Lock,
  Phone,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  KeyRound,
  Copy,
  Check,
  UserCheck,
  Edit2,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import type { SystemAdminItem, UniversityItem } from "@/lib/superadmin/service";

export default function SystemAdminsPage() {
  const [admins, setAdmins] = useState<SystemAdminItem[]>([]);
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnivFilter, setSelectedUnivFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [univId, setUnivId] = useState("");
  const [accountStatus, setAccountStatus] = useState("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete modal state
  const [deletingAdmin, setDeletingAdmin] = useState<SystemAdminItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [adminRes, univRes] = await Promise.all([
        fetch("/api/superadmin/system-admins"),
        fetch("/api/superadmin/universities"),
      ]);

      if (adminRes.ok) setAdmins(await adminRes.json());
      if (univRes.ok) {
        const uList = await univRes.json();
        setUniversities(uList);
        if (uList.length > 0 && !univId) {
          setUnivId(uList[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load system admins:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setAccountStatus("active");
    if (universities.length > 0) setUnivId(universities[0].id);
    setErrorMsg("");
    setShowModal(true);
  };

  const openEditModal = (adm: SystemAdminItem) => {
    setEditingId(adm.id);
    setFullName(adm.full_name);
    setEmail(adm.email);
    setPassword(""); // Keep blank unless changing
    setPhone(adm.phone || "");
    setUnivId(adm.university_id || (universities[0]?.id || ""));
    setAccountStatus(adm.account_status || "active");
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName || !email || !univId) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    if (!editingId && (!password || password.length < 6)) {
      setErrorMsg("Initial password must be at least 6 characters.");
      return;
    }

    if (password && password.length > 0 && password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedUniv = universities.find((u) => u.id === univId);
      const payload: any = {
        id: editingId || undefined,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        university_id: univId,
        university_name: selectedUniv?.name,
        account_status: accountStatus,
      };
      if (password) {
        payload.password = password;
      }

      const res = await fetch("/api/superadmin/system-admins", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save administrator");
      }

      setSuccessMsg(
        editingId
          ? `Updated administrator credentials for ${email}`
          : `Provisioned administrator credentials for ${email}`
      );
      setShowModal(false);
      await loadData();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/system-admins?id=${encodeURIComponent(deletingAdmin.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete administrator");
      }

      setSuccessMsg(`Administrator account ${deletingAdmin.email} has been revoked.`);
      setDeletingAdmin(null);
      await loadData();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to delete administrator");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = admins.filter((a) => {
    const matchesSearch =
      a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.university_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUniv =
      selectedUnivFilter === "all" || a.university_id === selectedUnivFilter;
    return matchesSearch && matchesUniv;
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
          <span className="text-slate-800 font-semibold">System Administrators</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Provision Administrator</span>
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
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
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, university..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedUnivFilter}
            onChange={(e) => setSelectedUnivFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
          >
            <option value="all">All Universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.code})
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filtered.length}</strong> of {admins.length}
          </span>
        </div>
      </div>

      {/* System Admins Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-xs">Loading administrators from database...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No system administrators match your query. Click &quot;Provision Administrator&quot; to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Assigned Institution</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {adm.full_name?.slice(0, 2).toUpperCase() || "SA"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {adm.full_name || "System Admin"}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{adm.email}</span>
                            <button
                              onClick={() => copyToClipboard(adm.email, adm.id)}
                              className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                              title="Copy email"
                            >
                              {copiedId === adm.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{adm.university_name || "Primary Institution"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-600">{adm.phone || "—"}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          adm.account_status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            adm.account_status === "active" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {adm.account_status ? adm.account_status.charAt(0).toUpperCase() + adm.account_status.slice(1) : "Active"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(adm)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors cursor-pointer"
                          title="Edit Administrator"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingAdmin(adm)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                          title="Delete Administrator"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          href="/admin/dashboard"
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                        >
                          Portal
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Provision / Edit Administrator */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <span>{editingId ? "Edit System Administrator" : "Provision System Administrator"}</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Administrator Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Kwame Mensah"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Institutional Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kwame.admin@institution.edu.gh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {editingId ? "Reset Password (leave empty to keep current)" : "Temporary Initial Password *"}
                  </label>
                  <input
                    type="password"
                    required={!editingId}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingId ? "Leave blank to preserve password" : "••••••••••••"}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Assign to University *
                  </label>
                  <select
                    value={univId}
                    onChange={(e) => setUnivId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                  >
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Account Status
                    </label>
                    <select
                      value={accountStatus}
                      onChange={(e) => setAccountStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Phone Contact
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingId ? "Save Changes" : "Provision Credentials"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-red-200 shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Revoke Administrator Access?
            </h3>

            <p className="mt-2 text-xs text-slate-600 text-center">
              Are you sure you want to delete and revoke administrator credentials for{" "}
              <strong className="text-slate-900">{deletingAdmin.full_name}</strong> ({deletingAdmin.email})?
              They will no longer be able to log in to the system.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdmin}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Revoke Access</span>
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
