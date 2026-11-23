"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signOutUser } from "@/lib/auth/signout";
import {
  formatSchoolMonogram,
  resolveClientTenantContext,
} from "@/lib/saas/useTenantInstitution";
import { UnlinkedSchoolNotice } from "@/components/saas/UnlinkedSchoolNotice";
import {
  LayoutGrid,
  BookOpen,
  Users,
  CalendarDays,
  CheckSquare,
  FileCheck2,
  FileText,
  ShieldCheck,
  MessageSquare,
  GraduationCap,
  UserCheck,
  Megaphone,
  Bell,
  Clock,
  Calendar,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Wrench,
  Award,
  Layers,
  School,
  Hammer,
  Sparkles,
  ClipboardCheck,
  Briefcase,
  SlidersHorizontal,
} from "lucide-react";

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Institution & User Info
  const [userName, setUserName] = useState<string>("Teacher / Instructor");
  const [userEmail, setUserEmail] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [schoolAbbr, setSchoolAbbr] = useState<string>("");
  const [schoolLogo, setSchoolLogo] = useState<string>("");
  const [schoolType, setSchoolType] = useState<"high_school" | "vocational_school">("high_school");
  const [activeTerm, setActiveTerm] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Live date & time ticking clock
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const day = now.getDate();
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const formatted = `${day} ${month} ${year} • ${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
      setCurrentTime(formatted);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load tenant profile & user details
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const tenantRes = await resolveClientTenantContext();
      if (!isMounted) return;

      if (tenantRes.status === "unauthenticated") {
        window.location.replace("/?redirectedFrom=" + encodeURIComponent(window.location.pathname));
        return;
      }

      const activeUser = tenantRes.user;
      setUserEmail(activeUser.email || "");
      setUserName(activeUser.user_metadata?.full_name || "Teacher / Instructor");

      if (tenantRes.status === "unlinked") {
        setTenantError(tenantRes.error);
        return;
      }

      setTenantError(null);
      setSchoolName(tenantRes.schoolName);
      setSchoolAbbr(tenantRes.schoolAbbr);
      setSchoolLogo(tenantRes.schoolLogo);
      if (tenantRes.schoolType === "vocational_school" || tenantRes.schoolType === "high_school") {
        setSchoolType(tenantRes.schoolType);
      }

      if (tenantRes.schoolId) {
        try {
          const supabase = createClient();
          const { data: terms } = await (supabase as any)
            .from("terms")
            .select("name, code")
            .eq("school_id", tenantRes.schoolId)
            .order("is_active", { ascending: false })
            .limit(1);
          if (terms && terms.length > 0 && isMounted) {
            setActiveTerm(terms[0].name || terms[0].code || "");
          }
        } catch {}
      }
    }

    loadData();

    const handleSwitch = (e: any) => {
      if (e.detail?.schoolType) {
        setSchoolType(e.detail.schoolType);
      }
    };
    window.addEventListener("switch_school_type_view", handleSwitch);
    return () => {
      isMounted = false;
      window.removeEventListener("switch_school_type_view", handleSwitch);
    };
  }, []);

  const handleToggleSchoolType = (type: "high_school" | "vocational_school") => {
    setSchoolType(type);
    window.dispatchEvent(new CustomEvent("switch_school_type_view", { detail: { schoolType: type } }));
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
    } finally {
      window.location.assign("/");
    }
  };

  // Dynamic Navigation based on school type
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/teacher/dashboard",
      icon: LayoutGrid,
      badge: null,
    },
    {
      id: "classes",
      label: schoolType === "vocational_school" ? "Workshops & Batches" : "Classes & Timetable",
      href: "/teacher/classes",
      icon: schoolType === "vocational_school" ? Wrench : BookOpen,
      badge: schoolType === "vocational_school" ? "3 Labs" : "4 Periods",
    },
    {
      id: "attendance",
      label: "Attendance & Roll Call",
      href: "/teacher/attendance",
      icon: UserCheck,
      badge: null,
    },
    {
      id: "gradebook",
      label: schoolType === "vocational_school" ? "Trade Competency Rubric" : "CA Marks & Gradebook",
      href: "/teacher/gradebook",
      icon: ClipboardCheck,
      badge: "Pending",
    },
    ...(schoolType === "vocational_school"
      ? [
          {
            id: "workshops",
            label: "Apprenticeship & Safety",
            href: "/teacher/workshops",
            icon: Hammer,
            badge: "NVTI",
          },
        ]
      : []),
    {
      id: "messages",
      label: "Parent Communications",
      href: "/teacher/messages",
      icon: MessageSquare,
      badge: unreadCount > 0 ? `${unreadCount}` : null,
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50/60 overflow-hidden text-slate-800 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200/90 shrink-0 z-30 select-none">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 bg-white">
          <Link href="/teacher/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 overflow-hidden ${
              schoolType === "vocational_school"
                ? "bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-700 shadow-amber-500/20"
                : "bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-700 shadow-emerald-500/20"
            }`}>
              {schoolLogo ? (
                <img src={schoolLogo} alt={schoolName} className="h-full w-full object-cover" />
              ) : (
                formatSchoolMonogram(schoolAbbr, schoolName)
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 tracking-tight truncate leading-tight" title={schoolName}>
                {schoolName || "—"}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {schoolType === "vocational_school" ? "Vocational Faculty" : "High School Faculty"}
              </span>
            </div>
          </Link>
        </div>

        {/* Quick School Type Switcher in Sidebar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>School Mode</span>
            <SlidersHorizontal className="h-3 w-3 text-slate-400" />
          </div>
          <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-xl text-[11px] font-bold">
            <button
              type="button"
              onClick={() => handleToggleSchoolType("high_school")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                schoolType === "high_school"
                  ? "bg-white text-emerald-800 shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <School className="h-3 w-3" />
              <span>High School</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleSchoolType("vocational_school")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                schoolType === "vocational_school"
                  ? "bg-white text-amber-900 shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wrench className="h-3 w-3" />
              <span>Vocational</span>
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-2 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
            Teacher Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? schoolType === "vocational_school"
                      ? "bg-amber-50 text-amber-900 font-bold border border-amber-200/80 shadow-2xs"
                      : "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${
                    isActive
                      ? schoolType === "vocational_school" ? "text-amber-600" : "text-emerald-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "bg-slate-200/80 text-slate-700"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Sign Out */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {userName.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">{userName}</span>
                <span className="text-[10px] text-slate-500 truncate">
                  {schoolType === "vocational_school" ? "Master Instructor" : "Subject Master"}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* School Type Indicator Pill */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                schoolType === "vocational_school"
                  ? "bg-amber-100/80 text-amber-900 border border-amber-300"
                  : "bg-emerald-100/80 text-emerald-900 border border-emerald-300"
              }`}>
                <span className={`h-2 w-2 rounded-full animate-pulse ${
                  schoolType === "vocational_school" ? "bg-amber-600" : "bg-emerald-600"
                }`} />
                {schoolType === "vocational_school" ? "Vocational School Teacher Portal" : "High School Teacher Portal"}
              </span>

              <span className="hidden sm:inline-block text-xs font-medium text-slate-400">
                {activeTerm}
              </span>
            </div>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-3">
            {/* Live Time */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200/70 px-3 py-1.5 rounded-xl font-medium">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{currentTime}</span>
            </div>

            {/* Notifications */}
            <Link
              href="/teacher/messages"
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              title="Parent Messages & Alerts"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </Link>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {userName.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-none">{userName}</span>
                <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                  {schoolAbbr ? `${schoolAbbr} Faculty` : "Faculty"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8">
          {tenantError ? (
            <UnlinkedSchoolNotice
              error={tenantError}
              onSignOut={handleSignOut}
              isSigningOut={isSigningOut}
            />
          ) : (
            children
          )}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85%] bg-white h-full shadow-2xl z-10 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  {schoolType === "vocational_school" ? <Hammer className="h-4 w-4" /> : <School className="h-4 w-4" />}
                </div>
                <span className="text-xs font-bold text-slate-900 truncate">{schoolName || "—"}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* School Type Switcher Mobile */}
            <div className="my-3">
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleSchoolType("high_school");
                    setMobileOpen(false);
                  }}
                  className={`py-1.5 rounded-lg ${
                    schoolType === "high_school" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
                  }`}
                >
                  High School
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleToggleSchoolType("vocational_school");
                    setMobileOpen(false);
                  }}
                  className={`py-1.5 rounded-lg ${
                    schoolType === "vocational_school" ? "bg-white text-amber-900 shadow-xs" : "text-slate-600"
                  }`}
                >
                  Vocational
                </button>
              </div>
            </div>

            <nav className="flex-1 space-y-1 mt-2">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium ${
                    pathname === item.href
                      ? "bg-emerald-50 text-emerald-900 font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            <button
              onClick={handleSignOut}
              className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
