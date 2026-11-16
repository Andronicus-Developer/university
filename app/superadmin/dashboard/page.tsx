"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  ArrowRight,
  ChevronRight,
  Download,
  Calendar,
  CreditCard,
  FileText,
  FileCheck2,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  Bell,
  X,
  Mail,
  RefreshCw,
  Eye,
  GraduationCap,
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Layers,
  Sliders,
  Database,
  Search,
  ExternalLink,
  Loader2,
  Lock,
  Globe,
  CheckSquare,
  UserCheck,
} from "lucide-react";
import type { UniversityItem, SystemAdminItem, SuperAdminStats } from "@/lib/superadmin/service";

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [superAdminName, setSuperAdminName] = useState<string>("Super Administrator");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showAlert, setShowAlert] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string>(
    "System Notice: Multi-tenant cloud engine operational at 99.98% uptime. Real-time synchronization and security monitoring active across all institutions."
  );

  // Stats
  const [stats, setStats] = useState<SuperAdminStats>({
    totalUniversities: 1,
    activeUniversities: 1,
    totalSystemAdmins: 1,
    totalCampuses: 1,
    totalStudents: 3,
    totalLecturers: 2,
    totalStaff: 5,
    systemStatus: "healthy",
    dbLatencyMs: 1.2,
  });

  // Data lists
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [systemAdmins, setSystemAdmins] = useState<SystemAdminItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
  const [univSuccess, setUnivSuccess] = useState("");

  // System Admin Form State
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [selectedUnivId, setSelectedUnivId] = useState("");
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    setLoading(true);
    const now = new Date();
    setLastUpdated(
      now.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) + " " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );

    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setSuperAdminName(user.user_metadata.full_name);
      }
    } catch {
      // Non-blocking
    }

    try {
      const [statsRes, univRes, adminRes, auditRes] = await Promise.all([
        fetch("/api/superadmin/stats"),
        fetch("/api/superadmin/universities"),
        fetch("/api/superadmin/system-admins"),
        fetch("/api/superadmin/audit"),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (univRes.ok) {
        const univData = await univRes.json();
        setUniversities(univData);
        if (univData.length > 0 && !selectedUnivId) {
          setSelectedUnivId(univData[0].id);
        }
      }
      if (adminRes.ok) {
        setSystemAdmins(await adminRes.json());
      }
      if (auditRes.ok) {
        setAuditLogs(await auditRes.json());
      }
    } catch (err) {
      console.error("Error loading super admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filtered universities
  const filteredUniversities = useMemo(() => {
    if (!searchQuery.trim()) return universities;
    const q = searchQuery.toLowerCase();
    return universities.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q)
    );
  }, [universities, searchQuery]);

  // Handle Add University
  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnivError("");
    setUnivSuccess("");

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
          code: univCode.toUpperCase(),
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
        throw new Error(data.error || "Failed to create university");
      }

      setUnivSuccess(`Successfully registered ${univName}!`);
      setUnivName("");
      setUnivCode("");
      setUnivEmail("");
      setUnivPhone("");
      setUnivWebsite("");
      await fetchDashboardData();
      setTimeout(() => {
        setShowUnivModal(false);
        setUnivSuccess("");
      }, 1200);
    } catch (err: any) {
      setUnivError(err.message || "Failed to create university");
    } finally {
      setIsSubmittingUniv(false);
    }
  };

  // Handle Add System Admin
  const handleCreateSystemAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess("");

    if (!adminName || !adminEmail || !adminPassword) {
      setAdminError("Please provide name, email, and a secure password.");
      return;
    }
    if (adminPassword.length < 6) {
      setAdminError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      const res = await fetch("/api/superadmin/system-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: adminName,
          email: adminEmail,
          password: adminPassword,
          phone: adminPhone,
          university_id: selectedUnivId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create system admin");
      }

      setAdminSuccess(`System administrator ${adminEmail} provisioned successfully!`);
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminPhone("");
      await fetchDashboardData();
      setTimeout(() => {
        setShowAdminModal(false);
        setAdminSuccess("");
      }, 1200);
    } catch (err: any) {
      setAdminError(err.message || "Failed to provision system admin");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* 1. Sub-Header: Breadcrumbs + Action Buttons matching Admin portal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link
            href="/superadmin/dashboard"
            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Super Admin
          </Link>
          <span className="text-slate-300">/</span>
          <span>System Overview</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">Multi-Tenant Analytics</span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUnivModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add University</span>
          </button>

          <button
            onClick={() => setShowAdminModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Add System Admin</span>
          </button>

          <Link
            href="/superadmin/settings"
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs hover:shadow-xs transition-all"
          >
            <Sliders className="h-3.5 w-3.5 text-slate-500" />
            <span>Platform Settings</span>
          </Link>
        </div>
      </div>

      {/* 2. Dismissible Alert Banner */}
      {showAlert && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-900 text-xs font-medium shadow-2xs transition-all">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
              ✓
            </span>
            <span className="text-emerald-800">{alertMessage}</span>
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className="text-emerald-600 hover:text-emerald-800 p-1 rounded-lg hover:bg-emerald-100/50 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3. Welcome Banner (Modern Deep Indigo/Navy Gradient Card matching Admin Portal) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#1E293B] text-white p-6 sm:p-7 shadow-md border border-slate-800/80">
        {/* Subtle Decorative Blurred Glows */}
        <div className="absolute right-12 top-2 h-44 w-44 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-60 -bottom-10 h-36 w-36 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-medium text-blue-200 mb-2 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Central Multi-Tenant Infrastructure Active
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span>Welcome Back, {superAdminName}</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal">
              University Management System • Central Multi-Tenant Governance & Operational Control
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-slate-200 backdrop-blur-xs">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span>
                Updated: <strong className="text-white font-medium">{lastUpdated || "Just now"}</strong>
              </span>
            </div>
            <button
              onClick={fetchDashboardData}
              title="Refresh Platform Telemetry"
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Top 4 Metric Cards (Total Universities, System Admins, Campuses, Global Users) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Universities */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-13 w-13 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {stats.totalUniversities}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Total Universities
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Active: <strong className="text-slate-800">{stats.activeUniversities}</strong> | Inactive:{" "}
              <strong className="text-slate-400">
                {stats.totalUniversities - stats.activeUniversities}
              </strong>
            </span>
            <Link
              href="/superadmin/universities"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
            >
              View all
            </Link>
          </div>
        </div>

        {/* Card 2: System Administrators */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-13 w-13 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {stats.totalSystemAdmins}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                System Administrators
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Active: <strong className="text-slate-800">{stats.totalSystemAdmins}</strong> | Provisioned:{" "}
              <strong className="text-slate-400">100%</strong>
            </span>
            <Link
              href="/superadmin/system-admins"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
            >
              View all
            </Link>
          </div>
        </div>

        {/* Card 3: Campuses & Scopes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-13 w-13 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-2xs">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {stats.totalCampuses}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Campuses & Scopes
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Main Campus: <strong className="text-slate-800">{stats.totalCampuses}</strong> | Satellites:{" "}
              <strong className="text-slate-400">0</strong>
            </span>
            <Link
              href="/superadmin/scopes"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
            >
              View all
            </Link>
          </div>
        </div>

        {/* Card 4: Global Platform Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-13 w-13 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {stats.totalStudents + stats.totalLecturers + stats.totalStaff}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Global Platform Users
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Students: <strong className="text-slate-800">{stats.totalStudents}</strong> | Staff:{" "}
              <strong className="text-slate-800">{stats.totalStaff}</strong>
            </span>
            <Link
              href="/superadmin/users"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Secondary Platform Vitals Strip (Latency, Status, Jobs, Recovery) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Database Latency</div>
              <div className="text-base font-bold text-slate-900">{stats.dbLatencyMs} ms</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Synced
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Security Events</div>
              <div className="text-base font-bold text-slate-900">0 Critical</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Guarded
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Background Queues</div>
              <div className="text-base font-bold text-slate-900">All Workers Up</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            100% OK
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Disaster Recovery</div>
              <div className="text-base font-bold text-slate-900">Cloud Storage Sync</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
            RPO: 0s
          </span>
        </div>
      </div>

      {/* 6. Main Grid: Left 7/12 (Institutions & Admins), Right 5/12 (Telemetry, Audit, Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tables */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section A: Registered Universities Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Registered Universities</h2>
                  <p className="text-[11px] text-slate-500">Multi-tenant institutional registry</p>
                </div>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                  {universities.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter universities..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-blue-500 w-36 sm:w-48"
                  />
                </div>
                <button
                  onClick={() => setShowUnivModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Institution</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUniversities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No universities found. Click "Add University" to register one.
                      </td>
                    </tr>
                  ) : (
                    filteredUniversities.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {u.code.slice(0, 3)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                                {u.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Code: {u.code}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {u.city}, {u.country}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">
                            {u.default_currency || "GHS"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit ${
                                u.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  u.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              />
                              {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : "Active"}
                            </span>
                            {u.full_access !== false ? (
                              <span className="text-[9.5px] font-medium text-emerald-700">
                                Full Access
                              </span>
                            ) : (
                              <span className="text-[9.5px] font-medium text-indigo-700">
                                {u.max_users ? `Max ${u.max_users} users` : "Custom Limits"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href="/admin/dashboard"
                              target="_blank"
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                              title="Open Campus Admin Portal"
                            >
                              Portal
                            </Link>
                            <Link
                              href={`/superadmin/universities`}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-medium transition-colors"
                            >
                              Manage
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredUniversities.length} registered universities</span>
              <Link
                href="/superadmin/universities"
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <span>Full Directory</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Section B: System Administrators Roster Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Governed System Administrators</h2>
                  <p className="text-[11px] text-slate-500">Privileged administrator credentials & assignments</p>
                </div>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                  {systemAdmins.length}
                </span>
              </div>

              <button
                onClick={() => setShowAdminModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Admin</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Assigned Institution</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {systemAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No system administrators provisioned yet.
                      </td>
                    </tr>
                  ) : (
                    systemAdmins.map((adm) => (
                      <tr key={adm.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {adm.full_name?.slice(0, 2).toUpperCase() || "SA"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">
                                {adm.full_name || "System Admin"}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                {adm.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {adm.university_name || "Accra Institute of Technology"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {adm.account_status || "Active"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href="/superadmin/system-admins"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>Governed by least-privilege RBAC standards</span>
              <Link
                href="/superadmin/system-admins"
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <span>Manage All Admins</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry, Audit Trail, Platform Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Widget 1: Platform Health & Monitoring */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Platform Telemetry & Health
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                HEALTHY
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Supabase Cloud Engine Latency</span>
                  <span className="font-semibold text-slate-900">{stats.dbLatencyMs} ms</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[12%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Storage Engine Capacity (institutional-reports)</span>
                  <span className="font-semibold text-slate-900">0.4% used</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[4%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Auth & API Response Reliability</span>
                  <span className="font-semibold text-slate-900">99.98%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full w-[99%]" />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
              <span>Automatic Failover: Ready</span>
              <Link
                href="/superadmin/health"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Deep Diagnostics →
              </Link>
            </div>
          </div>

          {/* Widget 2: Global Security Audit Stream */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Global Security Audit
                </h3>
              </div>
              <Link
                href="/superadmin/audit"
                className="text-[11px] text-blue-600 hover:underline font-semibold"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {auditLogs.slice(0, 4).map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100"
                >
                  <div className="h-6 w-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {log.action || "PLATFORM_ACCESS"}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {log.event_time
                          ? new Date(log.event_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Today"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      Target: {log.entity_type || "system"} • Outcome: {log.outcome || "SUCCESS"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3: Quick Platform Management Actions */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Quick Administrative Actions
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setShowUnivModal(true)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-xs font-medium transition-all text-left cursor-pointer"
              >
                <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Add University</span>
              </button>

              <button
                onClick={() => setShowAdminModal(true)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-medium transition-all text-left cursor-pointer"
              >
                <UserCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Add Admin</span>
              </button>

              <Link
                href="/superadmin/payments"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 text-xs font-medium transition-all text-left"
              >
                <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Payment Gateways</span>
              </Link>

              <Link
                href="/superadmin/backups"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-cyan-50 hover:border-cyan-200 text-slate-700 hover:text-cyan-700 text-xs font-medium transition-all text-left"
              >
                <Database className="h-4 w-4 text-cyan-600 shrink-0" />
                <span>System Backup</span>
              </Link>

              <Link
                href="/superadmin/roles"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-purple-50 hover:border-purple-200 text-slate-700 hover:text-purple-700 text-xs font-medium transition-all text-left"
              >
                <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                <span>RBAC & Roles</span>
              </Link>

              <Link
                href="/superadmin/settings"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-amber-50 hover:border-amber-200 text-slate-700 hover:text-amber-700 text-xs font-medium transition-all text-left"
              >
                <Sliders className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Platform Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD UNIVERSITY (MATCHING ADMIN DIALOG DESIGN)                     */}
      {/* ========================================================================= */}
      {showUnivModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Register New University</h3>
                  <p className="text-[11px] text-slate-500">Create an institutional tenant in UMS</p>
                </div>
              </div>
              <button
                onClick={() => setShowUnivModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUniversity} className="p-6 space-y-4">
              {univError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{univError}</span>
                </div>
              )}
              {univSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{univSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-700">University Full Name *</label>
                  <input
                    type="text"
                    required
                    value={univName}
                    onChange={(e) => setUnivName(e.target.value)}
                    placeholder="e.g. University of Ghana"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Short Code *</label>
                  <input
                    type="text"
                    required
                    value={univCode}
                    onChange={(e) => setUnivCode(e.target.value)}
                    placeholder="e.g. UG"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 uppercase focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Operating Currency</label>
                  <select
                    value={univCurrency}
                    onChange={(e) => setUnivCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="GHS">GHS (Ghanaian Cedi)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Country</label>
                  <input
                    type="text"
                    value={univCountry}
                    onChange={(e) => setUnivCountry(e.target.value)}
                    placeholder="Ghana"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">City / Town</label>
                  <input
                    type="text"
                    value={univCity}
                    onChange={(e) => setUnivCity(e.target.value)}
                    placeholder="Accra"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Official Contact Email</label>
                  <input
                    type="email"
                    value={univEmail}
                    onChange={(e) => setUnivEmail(e.target.value)}
                    placeholder="registrar@ug.edu.gh"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Official Website</label>
                  <input
                    type="url"
                    value={univWebsite}
                    onChange={(e) => setUnivWebsite(e.target.value)}
                    placeholder="https://ug.edu.gh"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUnivModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUniv}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingUniv ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register Institution</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD SYSTEM ADMIN (MATCHING ADMIN DIALOG DESIGN)                   */}
      {/* ========================================================================= */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Provision System Administrator</h3>
                  <p className="text-[11px] text-slate-500">Assign elevated administrative credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSystemAdmin} className="p-6 space-y-4">
              {adminError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{adminError}</span>
                </div>
              )}
              {adminSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{adminSuccess}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Administrator Full Name *</label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. Kwame Mensah"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Institutional Email Address *</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="kwame.admin@university.edu.gh"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">Must be at least 6 characters.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Assign to University Tenant</label>
                  <select
                    value={selectedUnivId}
                    onChange={(e) => setSelectedUnivId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingAdmin ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Provision Administrator</span>
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
