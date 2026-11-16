"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
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
  GraduationCap,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import type { SystemAdminItem, UniversityItem } from "@/lib/superadmin/service";

export default function SystemAdminsPage() {
  const [admins, setAdmins] = useState<SystemAdminItem[]>([]);
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnivFilter, setSelectedUnivFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [univId, setUnivId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName || !email || !password || !univId) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedUniv = universities.find((u) => u.id === univId);
      const res = await fetch("/api/superadmin/system-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          university_id: univId,
          university_name: selectedUniv?.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create system admin");
      }

      setSuccessMsg(`System Admin credentials created for ${data.email}!`);
      setFullName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg("");
      }, 1500);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = admins.filter((a) => {
    const matchesSearch =
      a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.university_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUniv = selectedUnivFilter === "all" || a.university_id === selectedUnivFilter;
    return matchesSearch && matchesUniv;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-purple-400" />
            System Administrators Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Provision, manage, and govern elevated campus-level administrator accounts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Provision System Admin
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search administrator name, email..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedUnivFilter}
            onChange={(e) => setSelectedUnivFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
          >
            <option value="all">All Universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{filtered.length}</strong> administrators
          </span>
        </div>
      </div>

      {/* Administrators Table */}
      <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <span className="text-xs">Loading administrators from Supabase...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No system administrators found. Click &quot;Provision System Admin&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400 uppercase text-[10.5px]">
                  <th className="pb-3 font-semibold">Administrator</th>
                  <th className="pb-3 font-semibold">Assigned University</th>
                  <th className="pb-3 font-semibold">Role Code</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Created Date</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {filtered.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 font-medium text-white flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm shadow-blue-500/20">
                        {admin.full_name?.slice(0, 2).toUpperCase() || "SA"}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100">{admin.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                          <span>{admin.email}</span>
                          <button
                            onClick={() => copyToClipboard(admin.email, admin.id)}
                            className="text-slate-400 hover:text-white"
                            title="Copy email"
                          >
                            {copiedId === admin.id ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-200">
                      <span className="flex items-center gap-1.5 font-medium">
                        <GraduationCap className="h-3.5 w-3.5 text-purple-400" />
                        {admin.university_name || "Primary Institution"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-[10.5px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md">
                        system_admin
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {admin.account_status || "active"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(admin.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-[11px] text-slate-400 italic">Universal Scope</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Provision System Admin */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
            <div className="h-14 px-6 border-b border-slate-800 bg-[#0B1120] flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <ShieldAlert className="h-5 w-5 text-purple-400" />
                Add System Admin Login Details
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  {successMsg}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Assign to University *
                </label>
                <select
                  required
                  value={univId}
                  onChange={(e) => setUnivId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Samuel K. Mensah"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Login Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin.mensah@university.edu.gh"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Initial Password (Minimum 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 111 2233"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Provisioning in Supabase...
                    </>
                  ) : (
                    "Save & Authorize Admin"
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

