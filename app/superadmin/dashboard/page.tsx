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
  Info,
} from "lucide-react";
import {
  type UniversityItem,
  type SystemAdminItem,
  type SuperAdminStats,
  AVAILABLE_UNIVERSITY_ROLES,
} from "@/lib/superadmin/service";

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
    totalUniversities: 0,
    activeUniversities: 0,
    totalSystemAdmins: 0,
    totalCampuses: 0,
    totalStudents: 0,
    totalLecturers: 0,
    totalStaff: 0,
    systemStatus: "healthy",
    dbLatencyMs: 1.2,
  });

  // Data lists
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [systemAdmins, setSystemAdmins] = useState<SystemAdminItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [inboundReplies, setInboundReplies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [countrySortOrder, setCountrySortOrder] = useState<"asc" | "desc">("asc");

  // Modals
  const [showUnivModal, setShowUnivModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // School Modal & Form State (matching Schools Page Register Form)
  const [univModalTab, setUnivModalTab] = useState<"general" | "governance">("general");
  const [univName, setUnivName] = useState("");
  const [univCode, setUnivCode] = useState("");
  const [univShortName, setUnivShortName] = useState("");
  const [univSchoolType, setUnivSchoolType] = useState<"university" | "high_school" | "vocational_school">("university");
  const [univCountry, setUnivCountry] = useState("Ghana");
  const [univCity, setUnivCity] = useState("Accra");
  const [univAddress, setUnivAddress] = useState("");
  const [univEmail, setUnivEmail] = useState("");
  const [univPhone, setUnivPhone] = useState("");
  const [univWebsite, setUnivWebsite] = useState("");
  const [univCurrency, setUnivCurrency] = useState("GHS");
  const [univEstablishedYear, setUnivEstablishedYear] = useState("");
  const [univStatus, setUnivStatus] = useState<"active" | "inactive" | "maintenance" | "suspended" | "deleted">("active");

  // Governance & Quota fields
  const [univFullAccess, setUnivFullAccess] = useState(true);
  const [univHasUserLimit, setUnivHasUserLimit] = useState(false);
  const [univMaxUsers, setUnivMaxUsers] = useState<string>("");
  const [univHasDeptLimit, setUnivHasDeptLimit] = useState(false);
  const [univMaxDepartments, setUnivMaxDepartments] = useState<string>("");
  const [univHasRoleLimit, setUnivHasRoleLimit] = useState(false);
  const [univMaxRoles, setUnivMaxRoles] = useState<string>("");
  const [univAllowedRoles, setUnivAllowedRoles] = useState<string[]>([]);

  const [isSubmittingUniv, setIsSubmittingUniv] = useState(false);
  const [univError, setUnivError] = useState("");
  const [univSuccess, setUnivSuccess] = useState("");

  const openAddSchoolModal = () => {
    setUnivModalTab("general");
    setUnivName("");
    setUnivCode("");
    setUnivShortName("");
    setUnivSchoolType("university");
    setUnivCountry("Ghana");
    setUnivCity("Accra");
    setUnivAddress("");
    setUnivEmail("");
    setUnivPhone("");
    setUnivWebsite("");
    setUnivCurrency("GHS");
    setUnivEstablishedYear("");
    setUnivStatus("active");

    setUnivFullAccess(true);
    setUnivHasUserLimit(false);
    setUnivMaxUsers("");
    setUnivHasDeptLimit(false);
    setUnivMaxDepartments("");
    setUnivHasRoleLimit(false);
    setUnivMaxRoles("");
    setUnivAllowedRoles(AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code));

    setUnivError("");
    setUnivSuccess("");
    setShowUnivModal(true);
  };

  const toggleUnivRoleSelection = (roleCode: string) => {
    setUnivAllowedRoles((prev) =>
      prev.includes(roleCode) ? prev.filter((r) => r !== roleCode) : [...prev, roleCode]
    );
  };

  const selectUnivCoreAcademicRoles = () => {
    const core = [
      "system_admin",
      "registrar",
      "dean",
      "head_of_department",
      "lecturer",
      "student",
      "finance_officer",
    ];
    setUnivAllowedRoles(core);
  };

  // System Admin Form State
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminAccountStatus, setAdminAccountStatus] = useState("active");
  const [selectedUnivId, setSelectedUnivId] = useState("");
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  const openProvisionAdminModal = () => {
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    setAdminPhone("");
    setAdminAccountStatus("active");
    if (universities.length > 0) {
      setSelectedUnivId(universities[0].id);
    }
    setAdminError("");
    setAdminSuccess("");
    setShowAdminModal(true);
  };

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
      const [statsRes, univRes, adminRes, auditRes, commRes] = await Promise.all([
        fetch("/api/superadmin/stats"),
        fetch("/api/superadmin/schools"),
        fetch("/api/superadmin/system-admins"),
        fetch("/api/superadmin/audit"),
        fetch("/api/superadmin/communications"),
      ]);

      let loadedUnivs: UniversityItem[] = [];
      let loadedAdmins: SystemAdminItem[] = [];

      if (univRes.ok) {
        const univData = await univRes.json();
        loadedUnivs = Array.isArray(univData) ? univData : [];
        setUniversities(loadedUnivs);
        if (loadedUnivs.length > 0 && !selectedUnivId) {
          setSelectedUnivId(loadedUnivs[0].id);
        }
      }
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        loadedAdmins = Array.isArray(adminData) ? adminData : [];
        setSystemAdmins(loadedAdmins);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (loadedUnivs.length === 0) {
          statsData.totalUniversities = 0;
          statsData.activeUniversities = 0;
          statsData.totalCampuses = 0;
          statsData.totalSystemAdmins = 0;
          statsData.totalStudents = 0;
          statsData.totalLecturers = 0;
          statsData.totalStaff = 0;
        }
        setStats(statsData);
      }
      if (auditRes.ok) {
        setAuditLogs(await auditRes.json());
      }
      if (commRes.ok) {
        const commList = await commRes.json();
        if (Array.isArray(commList)) {
          setInboundReplies(commList.filter((c: any) => c.direction === "inbound"));
        }
      }
    } catch (err) {
      console.error("Error loading super admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleGlobalSearch = (e: any) => {
      if (e.detail && typeof e.detail.query === "string") {
        setSearchQuery(e.detail.query);
      }
    };

    window.addEventListener("global_search_query", handleGlobalSearch);
    return () => window.removeEventListener("global_search_query", handleGlobalSearch);
  }, []);

  // Filtered and country-sorted universities
  const filteredUniversities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? [...universities]
      : universities.filter(
          (u) =>
            (u.name || "").toLowerCase().includes(q) ||
            (u.code || "").toLowerCase().includes(q) ||
            (u.city || "").toLowerCase().includes(q) ||
            (u.country || "").toLowerCase().includes(q)
        );

    list.sort((a, b) => {
      const countryA = (a.country || "Ghana").toLowerCase();
      const countryB = (b.country || "Ghana").toLowerCase();
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      const cmp =
        countrySortOrder === "asc"
          ? countryA.localeCompare(countryB)
          : countryB.localeCompare(countryA);
      return cmp || nameA.localeCompare(nameB);
    });

    return list;
  }, [universities, searchQuery, countrySortOrder]);

  // Handle Add School (matching Schools page)
  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnivError("");
    setUnivSuccess("");

    if (!univName || !univCode) {
      setUnivError("School name and code are required.");
      return;
    }

    if (!univFullAccess && univHasUserLimit && (!univMaxUsers || Number(univMaxUsers) <= 0)) {
      setUnivError("Please specify a valid user limit (greater than 0).");
      return;
    }

    if (!univFullAccess && univHasDeptLimit && (!univMaxDepartments || Number(univMaxDepartments) <= 0)) {
      setUnivError("Please specify a valid department limit (greater than 0).");
      return;
    }

    if (!univFullAccess && univAllowedRoles.length === 0) {
      setUnivError("Please select at least one permitted role for restricted access.");
      return;
    }

    setIsSubmittingUniv(true);
    try {
      const payload = {
        name: univName.trim(),
        code: univCode.trim().toUpperCase(),
        short_name: univShortName.trim(),
        school_type: univSchoolType,
        institution_type: univSchoolType,
        country: univCountry.trim(),
        city: univCity.trim(),
        address: univAddress.trim(),
        email: univEmail.trim(),
        phone: univPhone.trim(),
        website: univWebsite.trim(),
        default_currency: univCurrency,
        currency_symbol: univCurrency === "GHS" ? "GH₵" : "$",
        established_year: univEstablishedYear ? Number(univEstablishedYear) : undefined,
        status: univStatus,
        full_access: univFullAccess,
        max_users: !univFullAccess && univHasUserLimit && univMaxUsers ? Number(univMaxUsers) : null,
        max_departments: !univFullAccess && univHasDeptLimit && univMaxDepartments ? Number(univMaxDepartments) : null,
        max_roles: !univFullAccess && univHasRoleLimit && univMaxRoles ? Number(univMaxRoles) : null,
        allowed_roles: univFullAccess ? AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code) : univAllowedRoles,
      };

      const res = await fetch("/api/superadmin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register school");
      }

      setUnivSuccess(`Registered ${univName} with specified access limits successfully!`);
      await fetchDashboardData();
      setTimeout(() => {
        setShowUnivModal(false);
        setUnivSuccess("");
      }, 1200);
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

    if (!adminName.trim() || !adminEmail.trim() || !adminPassword) {
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
          full_name: adminName.trim(),
          email: adminEmail.trim(),
          password: adminPassword,
          phone: adminPhone.trim(),
          account_status: adminAccountStatus,
          university_id: selectedUnivId || (universities.length > 0 ? universities[0].id : undefined),
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
      setAdminAccountStatus("active");
      await fetchDashboardData();
      setTimeout(() => {
        setShowAdminModal(false);
        setAdminSuccess("");
      }, 1000);
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
            onClick={openAddSchoolModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add School</span>
          </button>

          <button
            onClick={openProvisionAdminModal}
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span>Welcome Back, {superAdminName}</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal">
              School Management System • Central Multi-Tenant Governance & Operational Control
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
                Total Schools
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
              href="/superadmin/schools"
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
              <strong className="text-slate-400">{stats.totalSystemAdmins > 0 ? "100%" : "0%"}</strong>
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
                  <h2 className="text-sm font-bold text-slate-900">Registered Schools</h2>
                  <p className="text-[11px] text-slate-500">Multi-tenant institutional registry</p>
                </div>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                  {universities.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCountrySortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-xs font-semibold transition-all cursor-pointer"
                  title="Sort schools by country"
                >
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                  <span>Country ({countrySortOrder === "asc" ? "A→Z" : "Z→A"})</span>
                  <span className="text-[11px] opacity-75">⇅</span>
                </button>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter schools, country..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-blue-500 w-36 sm:w-44"
                  />
                </div>
                <button
                  onClick={openAddSchoolModal}
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
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          setCountrySortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                        }
                        className="inline-flex items-center gap-1 hover:text-blue-600 cursor-pointer uppercase font-bold"
                        title="Click to sort by country"
                      >
                        <span>Location / Country</span>
                        <span className="text-[11px]">⇅</span>
                      </button>
                    </th>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUniversities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No schools found. Click "Add School" to register one.
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                                  {u.name}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                  (u.school_type || u.institution_type) === "high_school"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : (u.school_type || u.institution_type) === "vocational_school"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}>
                                  {(u.school_type || u.institution_type) === "high_school"
                                    ? "High School"
                                    : (u.school_type || u.institution_type) === "vocational_school"
                                    ? "Vocational"
                                    : "University"}
                                </span>
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
                              href={`/superadmin/schools`}
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
              <span>Showing {filteredUniversities.length} registered schools</span>
              <Link
                href="/superadmin/schools"
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
                onClick={openProvisionAdminModal}
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
                          {adm.university_name || "—"}
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

        {/* Right Column: Inbox Replies, Telemetry, Audit Trail, Platform Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Widget 0: Received Email Replies (Inbox) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Mail className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Received Email Replies (Inbox)
                </h3>
              </div>
              <Link
                href="/superadmin/communications?folder=inbox"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>Open Inbox ({inboundReplies.length})</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {inboundReplies.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No incoming email replies yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {inboundReplies.slice(0, 3).map((reply) => (
                  <Link
                    key={reply.id}
                    href="/superadmin/communications?folder=inbox"
                    className={`block p-3 rounded-xl border transition-all ${
                      !reply.is_read
                        ? "bg-blue-50/60 border-blue-200 hover:bg-blue-100/50"
                        : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!reply.is_read && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 animate-pulse" />
                        )}
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {reply.sender_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {reply.target_school || "School Reply"}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-blue-700 truncate mt-0.5">
                      {reply.subject}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {reply.body}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

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
                onClick={openAddSchoolModal}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-xs font-medium transition-all text-left cursor-pointer"
              >
                <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Add School</span>
              </button>

              <button
                onClick={openProvisionAdminModal}
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
      {/* MODAL 1: ADD SCHOOL (IDENTICAL TO SCHOOLS PAGE REGISTER FORM)             */}
      {/* ========================================================================= */}
      {showUnivModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>Register New School</span>
              </div>
              <button
                onClick={() => setShowUnivModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-white gap-6 shrink-0">
              <button
                type="button"
                onClick={() => setUnivModalTab("general")}
                className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                  univModalTab === "general"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>General Information</span>
              </button>

              <button
                type="button"
                onClick={() => setUnivModalTab("governance")}
                className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                  univModalTab === "governance"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Role & Quota Restrictions</span>
                {!univFullAccess && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>

            <form onSubmit={handleCreateUniversity} className="flex-1 overflow-y-auto p-6 space-y-4">
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

              {/* TAB 1: GENERAL INFORMATION */}
              {univModalTab === "general" && (
                <div className="grid grid-cols-2 gap-4">
                  {/* School Type Selector */}
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      School Type *
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setUnivSchoolType("university")}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          univSchoolType === "university"
                            ? "border-blue-500 bg-blue-50/70 text-blue-900 shadow-2xs ring-1 ring-blue-500"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className={`h-4 w-4 ${univSchoolType === "university" ? "text-blue-600" : "text-slate-500"}`} />
                          <span className="text-xs font-bold">University</span>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-tight">
                          Tertiary & Degree Institution
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUnivSchoolType("high_school")}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          univSchoolType === "high_school"
                            ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-2xs ring-1 ring-emerald-500"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GraduationCap className={`h-4 w-4 ${univSchoolType === "high_school" ? "text-emerald-600" : "text-slate-500"}`} />
                          <span className="text-xs font-bold">High School</span>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-tight">
                          Secondary & Senior High
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUnivSchoolType("vocational_school")}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          univSchoolType === "vocational_school"
                            ? "border-amber-500 bg-amber-50/70 text-amber-900 shadow-2xs ring-1 ring-amber-500"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className={`h-4 w-4 ${univSchoolType === "vocational_school" ? "text-amber-600" : "text-slate-500"}`} />
                          <span className="text-xs font-bold">Vocational</span>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-tight">
                          TVET & Technical Trades
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      School Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={univName}
                      onChange={(e) => setUnivName(e.target.value)}
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
                      value={univCode}
                      onChange={(e) => setUnivCode(e.target.value.toUpperCase())}
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
                      value={univShortName}
                      onChange={(e) => setUnivShortName(e.target.value)}
                      placeholder="e.g. Metro Uni"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Operating Status
                    </label>
                    <select
                      value={univStatus}
                      onChange={(e) => setUnivStatus(e.target.value as any)}
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
                      value={univCurrency}
                      onChange={(e) => setUnivCurrency(e.target.value)}
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
                      value={univCountry}
                      onChange={(e) => setUnivCountry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={univCity}
                      onChange={(e) => setUnivCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={univEmail}
                      onChange={(e) => setUnivEmail(e.target.value)}
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
                      value={univPhone}
                      onChange={(e) => setUnivPhone(e.target.value)}
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
                      value={univAddress}
                      onChange={(e) => setUnivAddress(e.target.value)}
                      placeholder="Main Campus Boulevard, Cantonments, Accra"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: ROLE & QUOTA RESTRICTIONS */}
              {univModalTab === "governance" && (
                <div className="space-y-5">
                  {/* Access Mode Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Access Tier & Governance Model
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setUnivFullAccess(true)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          univFullAccess
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
                            checked={univFullAccess}
                            onChange={() => setUnivFullAccess(true)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Institution has unrestricted access to all standard platform roles, unlimited
                          department creation, and uncapped user provisioning.
                        </p>
                      </div>

                      <div
                        onClick={() => setUnivFullAccess(false)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          !univFullAccess
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
                            checked={!univFullAccess}
                            onChange={() => setUnivFullAccess(false)}
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
                  {!univFullAccess ? (
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
                              checked={univHasUserLimit}
                              onChange={(e) => {
                                setUnivHasUserLimit(e.target.checked);
                                if (!e.target.checked) setUnivMaxUsers("");
                                else if (!univMaxUsers) setUnivMaxUsers("100");
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-600 font-medium">Enforce User Limit</span>
                          </label>
                        </div>

                        {univHasUserLimit ? (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min="1"
                                placeholder="e.g. 100"
                                value={univMaxUsers}
                                onChange={(e) => setUnivMaxUsers(e.target.value)}
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
                                  onClick={() => setUnivMaxUsers(String(preset))}
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
                              checked={univHasDeptLimit}
                              onChange={(e) => {
                                setUnivHasDeptLimit(e.target.checked);
                                if (!e.target.checked) setUnivMaxDepartments("");
                                else if (!univMaxDepartments) setUnivMaxDepartments("10");
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-slate-600 font-medium">Enforce Department Limit</span>
                          </label>
                        </div>

                        {univHasDeptLimit ? (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min="1"
                                placeholder="e.g. 10"
                                value={univMaxDepartments}
                                onChange={(e) => setUnivMaxDepartments(e.target.value)}
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
                                  onClick={() => setUnivMaxDepartments(String(preset))}
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
                              checked={univHasRoleLimit}
                              onChange={(e) => {
                                setUnivHasRoleLimit(e.target.checked);
                                if (!e.target.checked) setUnivMaxRoles("");
                                else if (!univMaxRoles) setUnivMaxRoles("6");
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-600 font-medium">Enforce Roles Count Limit</span>
                          </label>
                        </div>

                        {univHasRoleLimit ? (
                          <div className="flex items-center gap-3 pt-1">
                            <input
                              type="number"
                              min="1"
                              max="17"
                              placeholder="e.g. 6"
                              value={univMaxRoles}
                              onChange={(e) => setUnivMaxRoles(e.target.value)}
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

                      {/* 4. Permitted Role Types */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-xs font-bold text-slate-900">
                              Permitted Role Types ({univAllowedRoles.length} of {AVAILABLE_UNIVERSITY_ROLES.length} selected)
                            </label>
                            <p className="text-[10.5px] text-slate-500">
                              Only the selected roles can be provisioned or assigned within this school
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setUnivAllowedRoles(AVAILABLE_UNIVERSITY_ROLES.map((r) => r.code))}
                              className="text-blue-600 hover:underline cursor-pointer font-medium"
                            >
                              All Roles
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={selectUnivCoreAcademicRoles}
                              className="text-indigo-600 hover:underline cursor-pointer font-medium"
                            >
                              Core Academic Only
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => setUnivAllowedRoles([])}
                              className="text-slate-500 hover:underline cursor-pointer font-medium"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                          {AVAILABLE_UNIVERSITY_ROLES.map((r) => {
                            const isChecked = univAllowedRoles.includes(r.code);
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
                                  onChange={() => toggleUnivRoleSelection(r.code)}
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
                  {univModalTab === "general" ? (
                    <button
                      type="button"
                      onClick={() => setUnivModalTab("governance")}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Next: Configure Quotas & Roles →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUnivModalTab("general")}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      ← Back to General Info
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUnivModal(false)}
                    className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUniv}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {isSubmittingUniv ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <span>Register School</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD SYSTEM ADMIN (MATCHING PROVISION SYSTEM ADMIN FORM)          */}
      {/* ========================================================================= */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <span>Provision System Administrator</span>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Administrator Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
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
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="kwame.admin@institution.edu.gh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Temporary Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Assign to School *
                  </label>
                  <select
                    value={selectedUnivId}
                    onChange={(e) => setSelectedUnivId(e.target.value)}
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
                      value={adminAccountStatus}
                      onChange={(e) => setAdminAccountStatus(e.target.value)}
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
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isSubmittingAdmin ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Provision Credentials</span>
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
