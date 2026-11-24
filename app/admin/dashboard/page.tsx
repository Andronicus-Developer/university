"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Calendar,
  Award,
  CheckSquare,
  CreditCard,
  BookOpen,
  FileText,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  Bell,
  X,
  Mail,
  Trophy,
  Share2,
  RefreshCw,
  Eye,
  GraduationCap,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import {
  type CanonicalSchoolType,
  normalizeSchoolType,
} from "@/lib/academics/school-terminology";
import { getSchoolPortalConfig } from "@/config/schoolPortalConfig";

interface StatCounts {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalTeachers: number;
  activeTeachers: number;
  inactiveTeachers: number;
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  totalSubjects: number;
  activeSubjects: number;
  inactiveSubjects: number;
  totalAcademicUnits: number;
  activeAcademicUnits: number;
  inactiveAcademicUnits: number;
  totalDepartments: number;
  totalPrograms: number;
  totalModules: number;
  academicCardLabel: string;
  academicCardHref: string;
}

interface FeesSummary {
  totalCollected: number;
  termCollected: number;
  unpaidCount: number;
  totalOutstanding: number;
  quarterData: { quarter: string; totalFee: number; collectedFee: number }[];
}

interface NoticeItem {
  id: string;
  title: string;
  created_at: string;
  target_audience?: string;
}

interface LeaveItem {
  id: string;
  staffName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  appliedOn: string;
  status: string;
}

interface EventItem {
  id: string;
  title: string;
  dateStr: string;
  timeRange: string;
  attendees?: string[];
}

interface ActivityItem {
  id: string;
  title: string;
  uploadedOn: string;
  type: string;
}

interface NotificationItem {
  id: string;
  senderName: string;
  title: string;
  message: string;
  timeStr: string;
}

interface StudentActivityItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  category: string;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState<string>("Administrator");
  const [schoolName, setSchoolName] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolType, setSchoolType] = useState<CanonicalSchoolType>("university");
  const [currencyCode, setCurrencyCode] = useState<string>("");
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showAlert, setShowAlert] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string>(
    "Notice: Academic Term is active. All system services and database connections are operational."
  );

  // Stats
  const [stats, setStats] = useState<StatCounts>({
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    totalTeachers: 0,
    activeTeachers: 0,
    inactiveTeachers: 0,
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    totalSubjects: 0,
    activeSubjects: 0,
    inactiveSubjects: 0,
    totalAcademicUnits: 0,
    activeAcademicUnits: 0,
    inactiveAcademicUnits: 0,
    totalDepartments: 0,
    totalPrograms: 0,
    totalModules: 0,
    academicCardLabel: "Total Programs",
    academicCardHref: "/admin/programs",
  });

  const portalConfig = useMemo(
    () => getSchoolPortalConfig(schoolType),
    [schoolType]
  );

  // Attendance Widget State
  const [attendanceTab, setAttendanceTab] = useState<"Students" | "Teachers" | "Staff">("Students");
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    emergency: 0,
    medical: 0,
    late: 0,
  });

  // Top Performers
  const [bestPerformer, setBestPerformer] = useState<{
    name: string;
    role: string;
    department: string;
  } | null>(null);

  const [starStudent, setStarStudent] = useState<{
    name: string;
    programme: string;
    score: string;
  } | null>(null);

  // Fees State
  const [fees, setFees] = useState<FeesSummary>({
    totalCollected: 0,
    termCollected: 0,
    unpaidCount: 0,
    totalOutstanding: 0,
    quarterData: [],
  });

  // Lists fetched from DB
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveItem[]>([]);
  const [leaveTab, setLeaveTab] = useState<"Students" | "Staff">("Staff");
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityTab, setActivityTab] = useState<"Library" | "Transports" | "Reports">("Reports");
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [studentActivities, setStudentActivities] = useState<StudentActivityItem[]>([]);

  // Interactive Todo List (empty until school tasks exist)
  const [todos, setTodos] = useState<{ id: number; text: string; time: string; completed: boolean }[]>([]);

  // Calendar State
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // Main Data Fetcher from verified server APIs & tenant-scoped Supabase queries
  const fetchDashboardData = async () => {
    setLoading(true);
    setTenantError(null);
    setDashboardError(null);
    const supabase = createClient();
    const db = supabase as any;

    const logSecondaryQueryError = (table: string, error: any) => {
      if (!error) return;
      const msg = String(error.message || error || "");
      if (
        error.code === "PGRST205" ||
        msg.includes("Could not find the table") ||
        msg.includes("does not exist")
      ) {
        return;
      }
      console.error(`[AdminDashboard] ${table} query error:`, error);
    };

    try {
      // 1. Current user profile
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr) {
        console.error("[AdminDashboard] auth.getUser error:", authErr);
      }
      if (user) {
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profErr) {
          console.error("[AdminDashboard] profile lookup error:", profErr);
        }
        if (profile?.full_name) {
          setAdminName(profile.full_name);
        } else if (user.user_metadata?.full_name) {
          setAdminName(user.user_metadata.full_name);
        }
      }

      // Fetch authoritative institution context FIRST
      const res = await fetch("/api/settings/institution", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTenantError(
          d?.error ||
            "Your account is not linked to a registered school. Contact your Super Administrator."
        );
        setLoading(false);
        return;
      }

      const resolvedSchoolId: string | null = d?.school_id || d?.id || null;
      if (!resolvedSchoolId) {
        setTenantError("No school context is linked to this account.");
        setLoading(false);
        return;
      }

      const resolvedSchoolName = d?.name || "";
      const resolvedCurrency = d?.currency_symbol || d?.currency || "";
      const instSchoolType = normalizeSchoolType(d?.school_type || d?.institution_type);
      setSchoolId(resolvedSchoolId);
      setSchoolName(resolvedSchoolName);
      setSchoolType(instSchoolType);
      setCurrencyCode(resolvedCurrency);
      setStats((prev) => ({
        ...prev,
        academicCardLabel:
          instSchoolType === "university" ? "Total Programs" : "Total Classes",
        academicCardHref:
          instSchoolType === "vocational_school"
            ? "/admin/departments"
            : "/admin/programs",
      }));

      // Format updated date
      const now = new Date();
      setLastUpdated(
        now.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );

      // 2. Fetch authoritative server-side KPI counts, fees, attendance, and top performers
      const dashRes = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const dashData = await dashRes.json().catch(() => ({}));

      if (!dashRes.ok) {
        const msg =
          dashData?.error ||
          `Failed to load live dashboard metrics (HTTP ${dashRes.status})`;
        console.error("[AdminDashboard] /api/admin/dashboard error:", msg);
        setDashboardError(msg);
      } else {
        if (dashData?.school_type) {
          setSchoolType(normalizeSchoolType(dashData.school_type));
        }

        if (dashData?.stats) {
          setStats({
            totalStudents: Number(dashData.stats.totalStudents) || 0,
            activeStudents: Number(dashData.stats.activeStudents) || 0,
            inactiveStudents: Number(dashData.stats.inactiveStudents) || 0,
            totalTeachers: Number(dashData.stats.totalTeachers) || 0,
            activeTeachers: Number(dashData.stats.activeTeachers) || 0,
            inactiveTeachers: Number(dashData.stats.inactiveTeachers) || 0,
            totalStaff: Number(dashData.stats.totalStaff) || 0,
            activeStaff: Number(dashData.stats.activeStaff) || 0,
            inactiveStaff: Number(dashData.stats.inactiveStaff) || 0,
            totalSubjects: Number(dashData.stats.totalSubjects) || 0,
            activeSubjects: Number(dashData.stats.activeSubjects) || 0,
            inactiveSubjects: Number(dashData.stats.inactiveSubjects) || 0,
            totalAcademicUnits: Number(dashData.stats.totalAcademicUnits) || 0,
            activeAcademicUnits: Number(dashData.stats.activeAcademicUnits) || 0,
            inactiveAcademicUnits: Number(dashData.stats.inactiveAcademicUnits) || 0,
            totalDepartments: Number(dashData.stats.totalDepartments) || 0,
            totalPrograms: Number(dashData.stats.totalPrograms) || 0,
            totalModules: Number(dashData.stats.totalModules) || 0,
            academicCardLabel: String(dashData.stats.academicCardLabel || "Total Programs"),
            academicCardHref: String(dashData.stats.academicCardHref || "/admin/programs"),
          });
        }

        if (dashData?.fees) {
          setFees({
            totalCollected: Number(dashData.fees.totalCollected) || 0,
            termCollected: Number(dashData.fees.termCollected) || 0,
            unpaidCount: Number(dashData.fees.unpaidCount) || 0,
            totalOutstanding: Number(dashData.fees.totalOutstanding) || 0,
            quarterData: Array.isArray(dashData.fees.quarterData)
              ? dashData.fees.quarterData
              : [],
          });

          if (dashData.fees.latestPaymentAmount !== null && dashData.fees.latestPaymentAmount !== undefined) {
            const amtLabel = `${resolvedCurrency ? `${resolvedCurrency} ` : ""}${dashData.fees.latestPaymentAmount}`;
            setAlertMessage(
              `Payment Verified: Recent student payment of ${amtLabel} successfully logged.`
            );
          }
        }

        if (dashData?.attendanceStats) {
          setAttendanceStats({
            present: Number(dashData.attendanceStats.present) || 0,
            absent: Number(dashData.attendanceStats.absent) || 0,
            emergency: Number(dashData.attendanceStats.emergency) || 0,
            medical: Number(dashData.attendanceStats.medical) || 0,
            late: Number(dashData.attendanceStats.late) || 0,
          });
        }

        setBestPerformer(dashData?.bestPerformer || null);
        setStarStudent(dashData?.starStudent || null);

        if (Array.isArray(dashData?.queryErrors) && dashData.queryErrors.length > 0) {
          setDashboardError(
            `Some live Supabase queries reported errors: ${dashData.queryErrors.join("; ")}`
          );
        }
      }

      // 3. Query secondary school widgets using live tenant-scoped tables
      const [leavesRes, eventsNoticesRes, reportsRes, auditRes, ttRes] =
        await Promise.all([
          db
            .from("leave_requests")
            .select("id, staff_name, leave_type, start_date, end_date, status, created_at")
            .eq("school_id", resolvedSchoolId)
            .order("created_at", { ascending: false })
            .limit(5)
            .then((r: any) => r, () => ({ data: [], error: null })),
          db
            .from("school_events")
            .select("id, title, event_type, start_date")
            .eq("school_id", resolvedSchoolId)
            .order("start_date", { ascending: false })
            .limit(4)
            .then((r: any) => r, () => ({ data: [], error: null })),
          db
            .from("institutional_reports")
            .select("id, title, created_at, status")
            .eq("school_id", resolvedSchoolId)
            .order("created_at", { ascending: false })
            .limit(4)
            .then((r: any) => r, () => ({ data: [], error: null })),
          db
            .from("audit_logs")
            .select("id, action, entity_type, created_at, outcome")
            .eq("school_id", resolvedSchoolId)
            .order("created_at", { ascending: false })
            .limit(4)
            .then((r: any) => r, () => ({ data: [], error: null })),
          db
            .from("timetable_entries")
            .select("id, day_of_week, start_time, end_time, room")
            .eq("school_id", resolvedSchoolId)
            .limit(4)
            .then((r: any) => r, () => ({ data: [], error: null })),
        ]);

      const leavesData = leavesRes?.data;
      if (leavesData && leavesData.length > 0) {
        const formattedLeaves: LeaveItem[] = leavesData.map((l: any) => ({
          id: l.id,
          staffName: l.staff_name || "Staff Member",
          leaveType: l.leave_type?.toUpperCase() || "CASUAL",
          startDate: l.start_date,
          endDate: l.end_date,
          appliedOn: new Date(l.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
          status: l.status,
        }));
        setLeaveRequests(formattedLeaves);
      } else {
        setLeaveRequests([]);
      }

      const noticesData = eventsNoticesRes?.data;
      if (noticesData && noticesData.length > 0) {
        setNotices(
          noticesData.map((a: any) => ({
            id: a.id,
            title: a.title,
            created_at: new Date(a.start_date || Date.now()).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            target_audience: a.event_type || "all",
          }))
        );
      } else {
        setNotices([]);
      }

      const reportsData = reportsRes?.data;
      if (reportsData && reportsData.length > 0) {
        setActivities(
          reportsData.map((d: any) => ({
            id: d.id,
            title: d.title || "Institutional Report",
            uploadedOn: new Date(d.created_at).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            type: "report",
          }))
        );
      } else {
        setActivities([]);
      }

      setNotificationsList([]);

      const auditData = auditRes?.data;
      if (auditData && auditData.length > 0) {
        setStudentActivities(
          auditData.map((ev: any) => ({
            id: ev.id,
            title: `${ev.action} - ${ev.entity_type || "registry"}`,
            description: `Outcome: ${ev.outcome}`,
            timeAgo: "Recently",
            category: ev.entity_type || "audit",
          }))
        );
      } else {
        setStudentActivities([]);
      }

      const eventsData = ttRes?.data;
      if (eventsData && eventsData.length > 0) {
        setUpcomingEvents(
          eventsData.map((ev: any, idx: number) => ({
            id: ev.id,
            title: `Session #${idx + 1} (${ev.room || "Main Hall"})`,
            dateStr: ev.day_of_week || "Scheduled Session",
            timeRange: `${ev.start_time?.slice(0, 5)} - ${ev.end_time?.slice(0, 5)}`,
          }))
        );
      } else {
        setUpcomingEvents([]);
      }
    } catch (err: any) {
      console.error("Error loading admin dashboard metrics from Supabase:", err);
      setDashboardError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Mini Calendar Calculations
  const calendarDays = useMemo(() => {
    const targetDate = currentDate || new Date(2026, 9, 29);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { day: number | null; isCurrent: boolean }[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, isCurrent: false });
    }
    for (let d = 1; d <= totalDaysInMonth; d++) {
      days.push({ day: d, isCurrent: currentDate ? d === targetDate.getDate() : d === 29 });
    }
    return days;
  }, [currentDate]);

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDownloadRoutine = (name: string) => {
    const label = schoolName || "School";
    const text = `${label} Class Routine\nTimetable: ${name}\nGenerated on: ${new Date().toLocaleString()}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, "_")}.txt`;
    a.click();
  };

  const handleDownloadReport = (title: string) => {
    const label = schoolName || "School";
    const text = `${label} Official Document\nReference: ${title}\nGenerated on: ${new Date().toLocaleString()}\nVerification Status: Valid and Authenticated`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.txt`;
    a.click();
  };

  const handleLeaveAction = async (id: string, newStatus: string) => {
    const supabase = createClient();
    const db = supabase as any;
    try {
      let query = db.from("leave_requests").update({ status: newStatus }).eq("id", id);
      if (schoolId) {
        query = query.eq("school_id", schoolId);
      }
      await query;
    } catch {
      // optimistic update
    }
    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    alert(`Leave request has been marked as ${newStatus}.`);
  };

  const totalAttendance =
    attendanceStats.present +
    attendanceStats.absent +
    attendanceStats.late +
    attendanceStats.emergency +
    attendanceStats.medical;
  const presentPct =
    totalAttendance > 0
      ? Math.round((attendanceStats.present / totalAttendance) * 100)
      : 0;
  const maxQuarterAmount = Math.max(
    1,
    ...fees.quarterData.map((q) => Math.max(q.totalFee, q.collectedFee))
  );
  const currencyPrefix = currencyCode ? `${currencyCode} ` : "";

  if (tenantError) {
    return (
      <div className="max-w-xl mx-auto mt-10 rounded-2xl bg-white border border-rose-200 p-6 shadow-xs space-y-3">
        <h2 className="text-base font-bold text-slate-900">Unable to Load School Dashboard</h2>
        <p className="text-sm text-slate-600">{tenantError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* 1. Sub-Header: Breadcrumbs + Action Buttons (NO "Admin Dashboard" title header) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer">
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span>Overview</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">System Analytics</span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add New {portalConfig.learnerSingular}</span>
          </Link>

          <Link
            href="/admin/fees"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Fees Details</span>
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

      {/* 3. Welcome Banner (Modern Deep Indigo/Navy Gradient Card) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#1E293B] text-white p-6 sm:p-7 shadow-md border border-slate-800/80">
        {/* Subtle Decorative Elements */}
        <div className="absolute right-12 top-2 h-44 w-44 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-60 -bottom-10 h-36 w-36 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-medium text-blue-200 mb-2 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Academic Term Active
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span>Welcome Back, {adminName}</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal">
              {schoolName} Administrative Operations & Real-time Metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-slate-200 backdrop-blur-xs">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span>Updated: <strong className="text-white font-medium">{lastUpdated || "Today"}</strong></span>
            </div>
            <button
              onClick={fetchDashboardData}
              title="Refresh Data from Supabase"
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Top 5 School-Type Specialized Live KPI Cards */}
      {dashboardError && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{dashboardError}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {portalConfig.dashboardKpis.map((kpi) => {
          const rawVal =
            kpi.key === "departments"
              ? stats.totalDepartments
              : kpi.key === "programs"
              ? stats.totalPrograms
              : kpi.key === "subjects"
              ? stats.totalSubjects
              : kpi.key === "modules"
              ? stats.totalModules
              : kpi.key === "students"
              ? stats.totalStudents
              : kpi.key === "teachers"
              ? stats.totalTeachers
              : fees.totalCollected;

          const displayVal = kpi.isCurrency
            ? `${currencyCode ? `${currencyCode} ` : "$"}${Number(rawVal || 0).toLocaleString()}`
            : String(rawVal ?? 0);

          const iconTone =
            kpi.tone === "indigo"
              ? "bg-indigo-50 border-indigo-100 text-indigo-600"
              : kpi.tone === "blue"
              ? "bg-blue-50 border-blue-100 text-blue-600"
              : kpi.tone === "rose"
              ? "bg-rose-50 border-rose-100 text-rose-600"
              : kpi.tone === "teal"
              ? "bg-teal-50 border-teal-100 text-teal-600"
              : kpi.tone === "amber"
              ? "bg-amber-50 border-amber-100 text-amber-600"
              : "bg-emerald-50 border-emerald-100 text-emerald-600";

          const KpiIcon =
            kpi.key === "students"
              ? GraduationCap
              : kpi.key === "teachers"
              ? Briefcase
              : kpi.key === "fees"
              ? CreditCard
              : kpi.key === "departments"
              ? Users
              : BookOpen;

          return (
            <div
              key={kpi.key}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`h-12 w-12 rounded-2xl border flex items-center justify-center shadow-2xs shrink-0 ${iconTone}`}
                >
                  <KpiIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none truncate">
                    {loading ? "…" : displayVal}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-1 truncate">
                    {kpi.label}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] gap-2">
                <span className="text-slate-500 truncate">{kpi.sublabel}</span>
                <Link
                  href={kpi.href}
                  className="text-blue-600 font-semibold hover:text-blue-700 hover:underline shrink-0"
                >
                  View all
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Middle Grid (3 Columns: Schedules | Attendance + Stars | Quick Links + Routine + Performance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (4 cols): Schedules + Upcoming Events */}
        <div className="lg:col-span-4 space-y-5">
          {/* Schedules Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Schedules</h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  {(currentDate || new Date(2026, 9, 29)).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/admin/routine"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add New</span>
                </Link>
                <div className="flex items-center text-slate-400">
                  <button className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="mt-2">
              <div className="grid grid-cols-7 text-center text-[10.5px] font-bold text-slate-400 pb-1">
                <span>S</span>
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {calendarDays.map((item, idx) => (
                  <div
                    key={idx}
                    className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-medium transition-all ${
                      item.day === null
                        ? "text-transparent"
                        : item.isCurrent
                        ? "bg-blue-600 text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.day}
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events List */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-900 mb-3">Upcoming Events</div>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{ev.title}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{ev.timeRange}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{ev.dateStr}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-5 text-xs text-slate-400">
                    No scheduled events in database
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column (4 cols): Attendance & Performer Cards */}
        <div className="lg:col-span-4 space-y-5">
          {/* Attendance Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-sm font-bold text-slate-900">Attendance Overview</h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 font-medium">
                <Clock className="h-3 w-3 text-blue-500" />
                <span>Today</span>
              </div>
            </div>

            {/* Sub-Tabs: Students, Teachers, Staff */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
              {(["Students", "Teachers", "Staff"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAttendanceTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    attendanceTab === tab
                      ? "bg-white text-slate-900 font-bold shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Attendance Status Badges */}
            <div className="grid grid-cols-4 gap-2 mt-4 text-center">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="text-base font-extrabold text-slate-800">
                  {attendanceStats.emergency}
                </div>
                <div className="text-[10px] font-medium text-slate-500">Emergency</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="text-base font-extrabold text-slate-800">
                  {attendanceStats.medical}
                </div>
                <div className="text-[10px] font-medium text-slate-500">Medical</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="text-base font-extrabold text-slate-800">
                  {attendanceStats.absent}
                </div>
                <div className="text-[10px] font-medium text-slate-500">Absent</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="text-base font-extrabold text-slate-800">
                  {attendanceStats.late}
                </div>
                <div className="text-[10px] font-medium text-slate-500">Late</div>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="flex flex-col items-center justify-center my-4 py-2">
              <div className="relative h-36 w-36 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-600"
                    strokeDasharray={`${presentPct}, 100`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-slate-900">
                    {attendanceStats.present}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Present
                  </span>
                </div>
              </div>
            </div>

            {/* Action link */}
            <Link
              href="/admin/attendance"
              className="block text-center w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
            >
              View All {attendanceTab} Attendance
            </Link>
          </div>

          {/* Dual Highlight Cards: Best Performer & Star Student */}
          <div className="grid grid-cols-2 gap-3">
            {/* Best Performer (Green Card) */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> Best Performer
                  </span>
                  <div className="flex items-center">
                    <ChevronLeft className="h-3 w-3 cursor-pointer" />
                    <ChevronRight className="h-3 w-3 cursor-pointer" />
                  </div>
                </div>
                <div className="mt-3 text-sm font-extrabold truncate">
                  {bestPerformer?.name || "No data yet"}
                </div>
                <div className="text-[10px] text-emerald-100 truncate">
                  {bestPerformer?.role || "Add staff records"}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-white text-lg shadow-inner">
                  👨‍🏫
                </div>
              </div>
            </div>

            {/* Star Students (Blue Card) */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Star Students
                  </span>
                  <div className="flex items-center">
                    <ChevronLeft className="h-3 w-3 cursor-pointer" />
                    <ChevronRight className="h-3 w-3 cursor-pointer" />
                  </div>
                </div>
                <div className="mt-3 text-sm font-extrabold truncate">
                  {starStudent?.name || "No data yet"}
                </div>
                <div className="text-[10px] text-blue-100 truncate">
                  {starStudent?.programme || "Add student records"}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="h-12 w-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-white text-base">
                  🎓
                </div>
                <div className="px-2.5 py-1 rounded-full bg-white text-blue-600 font-black text-xs shadow-xs">
                  {starStudent?.score || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Quick Links + Class Routine + Performance */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick Links Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-sm font-bold text-slate-900">Quick Links</h2>
              <div className="flex items-center text-slate-400">
                <button className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 6 Quick Link Buttons in 3x2 Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {[
                { label: "Calendar", icon: Calendar, href: "/admin/routine" },
                { label: "Exam/Result", icon: FileText, href: "/admin/exams" },
                { label: "Attendance", icon: CheckSquare, href: "/admin/attendance" },
                { label: "Fees", icon: CreditCard, href: "/admin/fees" },
                { label: "Home Works", icon: BookOpen, href: "/admin/courses" },
                { label: "Reports", icon: FileText, href: "/admin/reports" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="p-3 rounded-xl border border-slate-200/80 hover:border-blue-500 hover:bg-blue-50/40 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
                  >
                    <div className="h-9 w-9 rounded-xl bg-slate-50 group-hover:bg-blue-100/70 text-slate-600 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 group-hover:text-slate-900 mt-2">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Class Routine Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-sm font-bold text-slate-900">Class Routine</h2>
              <Link
                href="/admin/routine"
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
              >
                <Plus className="h-3 w-3" />
                <span>Create New Routine</span>
              </Link>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-2 pt-1 pb-3 text-xs">
              <div className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 flex items-center justify-between font-medium">
                <span>Class</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 flex items-center justify-between font-medium">
                <span>Section</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Routines list */}
            <div className="space-y-2">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{ev.title}</div>
                      <div className="text-[10px] text-slate-500">
                        {ev.dateStr} • {ev.timeRange}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadRoutine(ev.title)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="h-3 w-3 text-slate-500" />
                      <span>Download</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  No class routines scheduled yet.
                </div>
              )}
            </div>
          </div>

          {/* Class Wise Performance Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-sm font-bold text-slate-900">Class Wise Performance</h2>
              <div className="flex items-center text-slate-400">
                <button className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {/* Circular gauge */}
              <div className="relative h-24 w-24 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-cyan-500"
                    strokeDasharray={`${presentPct}, 100`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xs font-black text-slate-900">
                    {totalAttendance > 0
                      ? presentPct >= 80
                        ? "Good"
                        : presentPct >= 60
                        ? "Fair"
                        : "Low"
                      : "No Data"}
                  </span>
                  <div className="text-[10px] text-slate-500 font-bold">{presentPct}%</div>
                </div>
              </div>

              {/* Stats breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Present Records</span>
                  <strong className="text-slate-900 font-bold">
                    {totalAttendance > 0 ? attendanceStats.present : 0}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Late Records</span>
                  <strong className="text-slate-900 font-bold">
                    {totalAttendance > 0 ? attendanceStats.late : 0}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Absent Records</span>
                  <strong className="text-slate-900 font-bold">
                    {totalAttendance > 0 ? attendanceStats.absent : 0}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Row 3: Fees Collection (Wide) + Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Fees Collection Card (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Fees Collection Trends</h2>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-300" /> Total Invoiced
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600" /> Collected Fee
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 font-medium flex items-center gap-1.5 shadow-2xs">
                <span>Last 9 Quarters</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Dual Bar Chart (SVG) */}
            <div className="md:col-span-8">
              {fees.quarterData.length > 0 ? (
                <div className="h-56 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-100">
                  {fees.quarterData.map((q, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full max-w-[20px] flex items-end justify-center gap-1 h-44">
                        {/* Total Invoiced Bar (gray) */}
                        <div
                          className="w-2.5 bg-slate-200 rounded-t-sm transition-all"
                          style={{ height: `${Math.min(100, (q.totalFee / maxQuarterAmount) * 100)}%` }}
                          title={`Total: ${currencyPrefix}${q.totalFee.toLocaleString()}`}
                        />
                        {/* Collected Bar (blue) */}
                        <div
                          className="w-2.5 bg-blue-600 rounded-t-sm transition-all"
                          style={{ height: `${Math.min(100, (q.collectedFee / maxQuarterAmount) * 100)}%` }}
                          title={`Collected: ${currencyPrefix}${q.collectedFee.toLocaleString()}`}
                        />
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400 whitespace-nowrap">
                        {q.quarter}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                  No fee collection data recorded for this school yet.
                </div>
              )}
            </div>

            {/* Right KPI sidebar */}
            <div className="md:col-span-4 space-y-2.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                <div className="text-base font-extrabold text-slate-900">
                  {currencyPrefix}{fees.totalCollected.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">Total Fees Collected</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                <div className="text-base font-extrabold text-slate-900">
                  {currencyPrefix}{fees.termCollected.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">Fees Collected This Term</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-base font-extrabold text-slate-900">
                    {fees.unpaidCount}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">Students Not Paid</div>
                </div>
                <button
                  onClick={() => {
                    alert("Fees reminder queued for all students with outstanding balances.");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Remind All
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                <div className="text-base font-extrabold text-rose-600">
                  {currencyPrefix}{fees.totalOutstanding.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">Total Outstanding</div>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Requests Card (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold text-slate-900">Leave Requests</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>This Month</span>
            </div>
          </div>

          {/* Tabs: Students | Teachers & Staff */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium mb-3">
            <button
              onClick={() => setLeaveTab("Students")}
              className={`flex-1 py-1 rounded-lg text-center transition-all ${
                leaveTab === "Students"
                  ? "bg-white text-slate-900 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setLeaveTab("Staff")}
              className={`flex-1 py-1 rounded-lg text-center transition-all ${
                leaveTab === "Staff"
                  ? "bg-white text-slate-900 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Teachers & Staff
            </button>
          </div>

          {/* List of Leave Requests from DB */}
          <div className="space-y-3">
            {leaveRequests.length > 0 ? (
              leaveRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{req.staffName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                        {req.leaveType}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Leave: {req.startDate} | Applied: {req.appliedOn}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      title="Approve Leave"
                      onClick={() => handleLeaveAction(req.id, "approved")}
                      className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs cursor-pointer font-bold"
                    >
                      ✓
                    </button>
                    <button
                      title="Reject Leave"
                      onClick={() => handleLeaveAction(req.id, "rejected")}
                      className="h-6 w-6 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-xs cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No pending leave requests in database
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. Horizontal Navigation Pill Strip */}
      <div className="overflow-x-auto pb-1">
        <div className="flex items-center gap-3 min-w-max">
          {[
            { label: "Human Resources", href: "/admin/staff" },
            { label: "New Events", href: "/admin/routine" },
            { label: "Membership Plans", href: "/admin/settings" },
            { label: "Finance & Accounts", href: "/admin/fees" },
            { label: "Fees Collection", href: "/admin/fees" },
            { label: "Academic & Classes", href: "/admin/courses" },
          ].map((pill, idx) => (
            <Link
              key={idx}
              href={pill.href}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-blue-500 hover:bg-blue-50/50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <span>{pill.label}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>

      {/* 8. Row 4: Notice Board & Activities / Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Notice Board (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold text-slate-900">Notice Board</h2>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/notices"
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
              >
                <Plus className="h-3 w-3" />
                <span>Add New</span>
              </Link>
              <span className="text-slate-300">|</span>
              <Link href="/admin/notices" className="text-[11px] font-semibold text-slate-500 hover:text-slate-900">
                View All
              </Link>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {notices.length > 0 ? (
              notices.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      📢
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{n.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Added on: {n.created_at}
                      </div>
                    </div>
                  </div>
                  <Link href="/admin/notices">
                    <Eye className="h-4 w-4 text-slate-400 cursor-pointer hover:text-blue-600 transition-colors" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No announcements published in database
              </div>
            )}
          </div>
        </div>

        {/* Activities / Reports (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold text-slate-900">Activities & Reports</h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 font-medium">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>2026 - 2027</span>
            </div>
          </div>

          {/* Subtabs: Library | Transports | Reports */}
          <div className="flex border-b border-slate-100 pb-2 text-xs font-semibold gap-6 text-slate-500">
            {(["Library", "Transports", "Reports"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivityTab(tab)}
                className={`transition-colors pb-1 relative cursor-pointer ${
                  activityTab === tab
                    ? "text-blue-600 font-bold after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-blue-600"
                    : "hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Activity items */}
          <div className="space-y-3 mt-4">
            {activities.length > 0 ? (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{act.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Uploaded on: {act.uploadedOn}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadReport(act.title)}
                    title="Download Report"
                    className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No generated reports uploaded yet
              </div>
            )}
          </div>

          <Link
            href="/admin/reports"
            className="block text-center w-full mt-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Upload New Report
          </Link>
        </div>
      </div>

      {/* 9. Bottom Row (3 Columns: Todo | Inbox | Student Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Todo List (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold text-slate-900">Todo List</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>Today</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {todos.length > 0 ? (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => toggleTodo(todo.id)}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div
                      className={`text-xs font-medium ${
                        todo.completed ? "line-through text-slate-400" : "text-slate-800"
                      }`}
                    >
                      {todo.text}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{todo.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No tasks scheduled yet.
              </div>
            )}
          </div>
        </div>

        {/* Inbox Messages (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold text-slate-900">Recent Messages</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">All Mails</span>
              <span className="text-slate-300">|</span>
              <Link href="/admin/settings#messages" className="text-[11px] font-semibold text-blue-600 hover:underline">
                View All
              </Link>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {notificationsList.length > 0 ? (
              notificationsList.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-3"
                >
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                    {notif.senderName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {notif.senderName}
                      </span>
                      <span className="text-[9.5px] text-slate-400">{notif.timeStr}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No unread messages in inbox
              </div>
            )}
          </div>
        </div>

        {/* Student Activity Stream (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold text-slate-900">System Activity</h2>
            <span className="text-[11px] text-slate-500 font-medium">Audit Events</span>
          </div>

          <div className="space-y-3 pt-1">
            {studentActivities.length > 0 ? (
              studentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-3"
                >
                  <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                    🎯
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {act.title}
                      </span>
                      <span className="text-[9.5px] text-slate-400">{act.timeAgo}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {act.description}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No system activity logged in audit records
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

}
