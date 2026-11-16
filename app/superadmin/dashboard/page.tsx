"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ShieldAlert,
  Building2,
  Users,
  Activity,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Mail,
  Lock,
  Globe,
  Sliders,
  FileCheck,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { UniversityItem, SystemAdminItem, SuperAdminStats } from "@/lib/superadmin/service";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [systemAdmins, setSystemAdmins] = useState<SystemAdminItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showUnivModal, setShowUnivModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // University Form State
  const [univName, setUnivName] = useState("");
  const [univCode, setUnivCode] = useState("");
  const [univCountry, setUnivCountry] = useState("Ghana");
  const [univCity, setUnivCity] = useState("Accra");
  const [univEmail, setUnivEmail] = useState("");
  const [univPhone, setUnivPhone] = useState("");
  const [univWebsite, setUnivWebsite] = useState("");
  const [univCurrency, setUnivCurrency] = useState("USD");
  const [isSubmittingUniv, setIsSubmittingUniv] = useState(false);
  const [univError, setUnivError] = useState("");

  // System Admin Form State
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [selectedUnivId, setSelectedUnivId] = useState("");
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, univRes, adminRes, auditRes] = await Promise.all([
        fetch("/api/superadmin/stats"),
        fetch("/api/superadmin/universities"),
        fetch("/api/superadmin/system-admins"),
        fetch("/api/superadmin/audit"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (univRes.ok) {
        const uData = await univRes.json();
        setUniversities(uData);
        if (uData.length > 0 && !selectedUnivId) {
          setSelectedUnivId(uData[0].id);
        }
      }
      if (adminRes.ok) setSystemAdmins(await adminRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (err) {
      console.error("Error loading super admin dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Add University
  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnivError("");
    if (!univName || !univCode) {
      setUnivError("Please enter university name and short code.");
      return;
    }

    setIsSubmittingUniv(true);
    try {
      const res = await fetch("/api/superadmin/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: univName,
          code: univCode,
          country: univCountry,
          city: univCity,
          email: univEmail,
          phone: univPhone,
          website: univWebsite,
          default_currency: univCurrency,
          currency_symbol: univCurrency === "GHS" ? "GH₵" : "$",
          status: "active",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register university");
      }

      // Reset and close
      setUnivName("");
      setUnivCode("");
      setUnivEmail("");
      setUnivPhone("");
      setUnivWebsite("");
      setShowUnivModal(false);
      await fetchData();
    } catch (err: any) {
      setUnivError(err.message || "An error occurred");
    } finally {
      setIsSubmittingUniv(false);
    }
  };

  // Handle Add System Admin
  const handleCreateSystemAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess("");

    if (!adminName || !adminEmail || !adminPassword || !selectedUnivId) {
      setAdminError("Please fill out all required fields.");
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      const selectedUniv = universities.find((u) => u.id === selectedUnivId);
      const res = await fetch("/api/superadmin/system-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: adminName,
          email: adminEmail,
          password: adminPassword,
          phone: adminPhone,
          university_id: selectedUnivId,
          university_name: selectedUniv?.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create system admin");
      }

      setAdminSuccess(`Successfully provisioned System Admin credentials for ${data.email}!`);
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminPhone("");
      setTimeout(() => {
        setShowAdminModal(false);
        setAdminSuccess("");
      }, 1500);
      await fetchData();
    } catch (err: any) {
      setAdminError(err.message || "An error occurred");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              Global Tenant Command Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform Mission Control
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Super Administrator governance across all registered universities, campus operations, and provisioned system admin credentials.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowUnivModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add University
            </button>
            <button
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              <ShieldAlert className="h-4 w-4 text-purple-400" />
              Add System Admin
            </button>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-purple-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Universities */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Universities
            </span>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-white">
              {stats?.totalUniversities ?? universities.length}
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {stats?.activeUniversities ?? universities.length} Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Multi-tenant institutional nodes</p>
        </div>

        {/* System Admins */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              System Admins
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-white">
              {systemAdmins.length}
            </div>
            <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
              Provisioned
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Campus-level root administrators</p>
        </div>

        {/* Total Campuses */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Campuses
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-white">
              {stats?.totalCampuses ?? 1}
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              Operational
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Physical branches & teaching centers</p>
        </div>

        {/* Database & Vitals */}
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Telemetry Health
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-white">
              {stats?.dbLatencyMs ?? 4}ms
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              Supabase DB
            </span>
          </div>
          <p className="text-[11px] text-slate-400">PostgreSQL response latency</p>
        </div>
      </div>

      {/* Main Grid: Registered Universities & System Admins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Universities Registry (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-purple-400" />
                  Registered Universities
                </h2>
                <p className="text-xs text-slate-400">
                  Institutions governed under this Super Administrator instance
                </p>
              </div>
              <button
                onClick={() => setShowUnivModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add University
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                <span className="text-xs">Fetching universities from database...</span>
              </div>
            ) : universities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No universities registered yet. Click &quot;Add University&quot; to register your first institution.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-slate-400 uppercase text-[10.5px]">
                      <th className="pb-3 font-semibold">University</th>
                      <th className="pb-3 font-semibold">Code</th>
                      <th className="pb-3 font-semibold">Location</th>
                      <th className="pb-3 font-semibold">Currency</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40 text-slate-300">
                    {universities.map((univ) => (
                      <tr key={univ.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 font-medium text-white flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {univ.code?.slice(0, 3) || "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100">{univ.name}</div>
                            {univ.website && (
                              <a
                                href={univ.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10.5px] text-purple-400 hover:underline inline-flex items-center gap-1"
                              >
                                {univ.website.replace(/^https?:\/\//, "")}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-purple-300 font-bold">{univ.code}</td>
                        <td className="py-3 text-slate-300">
                          {univ.city}, {univ.country}
                        </td>
                        <td className="py-3">
                          <span className="font-mono bg-slate-700/50 px-2 py-0.5 rounded text-[11px] text-slate-200">
                            {univ.default_currency}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              univ.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {univ.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href="/superadmin/universities"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* System Audit Events Stream */}
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-purple-400" />
                Live Security & Audit Trail
              </h2>
              <Link
                href="/superadmin/audit"
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                View all logs &rarr;
              </Link>
            </div>

            <div className="space-y-2">
              {auditLogs.slice(0, 5).map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-slate-200 capitalize">
                        {log.action?.replace(/_/g, " ") || "Audit Event"}
                      </span>
                      <span className="text-slate-400 text-[11px] ml-2">
                        Actor: {log.actor_role || "system"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10.5px] text-slate-400 font-mono shrink-0">
                    {new Date(log.event_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: System Administrators Provisioned */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-purple-400" />
                  System Administrators
                </h2>
                <p className="text-[11px] text-slate-400">Directly provisioned by Super Admin</p>
              </div>
              <button
                onClick={() => setShowAdminModal(true)}
                className="h-7 w-7 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white cursor-pointer"
                title="Add System Admin"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {systemAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-700/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100 text-xs truncate">
                      {admin.full_name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      system_admin
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">{admin.email}</div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10.5px]">
                    <span className="text-slate-400 truncate">{admin.university_name || "Assigned"}</span>
                    <span className="text-emerald-400 font-medium">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Governance Shortcuts
            </h3>
            <div className="space-y-2 text-xs">
              <Link
                href="/superadmin/universities"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-400" />
                  Manage All Universities
                </span>
                <span className="text-slate-400">&rarr;</span>
              </Link>
              <Link
                href="/superadmin/system-admins"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-blue-400" />
                  Provision System Admin Accounts
                </span>
                <span className="text-slate-400">&rarr;</span>
              </Link>
              <Link
                href="/superadmin/modules"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-amber-400" />
                  Institutional Feature Flags
                </span>
                <span className="text-slate-400">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD UNIVERSITY ================= */}
      {showUnivModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-slate-800 bg-[#0B1120] flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <GraduationCap className="h-5 w-5 text-purple-400" />
                Register New University
              </div>
              <button
                onClick={() => setShowUnivModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUniversity} className="p-6 space-y-4">
              {univError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {univError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    University Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={univName}
                    onChange={(e) => setUnivName(e.target.value)}
                    placeholder="e.g. Accra Metropolitan University"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    University Short Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={univCode}
                    onChange={(e) => setUnivCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AMU"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Default Currency
                  </label>
                  <select
                    value={univCurrency}
                    onChange={(e) => setUnivCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="GHS">GHS (GH₵)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={univCountry}
                    onChange={(e) => setUnivCountry(e.target.value)}
                    placeholder="e.g. Ghana"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    City / Metropolis
                  </label>
                  <input
                    type="text"
                    value={univCity}
                    onChange={(e) => setUnivCity(e.target.value)}
                    placeholder="e.g. Accra"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={univEmail}
                    onChange={(e) => setUnivEmail(e.target.value)}
                    placeholder="registrar@amu.edu.gh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Official Phone
                  </label>
                  <input
                    type="text"
                    value={univPhone}
                    onChange={(e) => setUnivPhone(e.target.value)}
                    placeholder="+233 30 200 0000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Official Website
                  </label>
                  <input
                    type="url"
                    value={univWebsite}
                    onChange={(e) => setUnivWebsite(e.target.value)}
                    placeholder="https://amu.edu.gh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUnivModal(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUniv}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingUniv ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register University"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD SYSTEM ADMIN ================= */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-slate-800 bg-[#0B1120] flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <ShieldAlert className="h-5 w-5 text-purple-400" />
                Add System Admin Login Details
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSystemAdmin} className="p-6 space-y-4">
              {adminError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {adminError}
                </div>
              )}
              {adminSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  {adminSuccess}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Assign to University *
                </label>
                <select
                  required
                  value={selectedUnivId}
                  onChange={(e) => setSelectedUnivId(e.target.value)}
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
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Dr. Samuel K. Mensah"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="sysadmin@university.edu.gh"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Secure Password (Minimum 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingAdmin ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    "Create System Admin"
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

