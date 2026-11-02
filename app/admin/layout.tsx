"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutGrid,
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  CalendarDays,
  FileCheck2,
  CheckSquare,
  CreditCard,
  CalendarRange,
  Megaphone,
  BookMarked,
  BusFront,
  Building2,
  Sliders,
  LogOut,
  Search,
  Bell,
  MessageSquare,
  Maximize2,
  Clock,
  Calendar,
  ChevronDown,
  ShieldCheck,
  FileText,
  BarChart3,
  UserPlus,
  Menu,
  X,
  Loader2,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavCategory {
  title: string;
  items: {
    id: string;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const [userName, setUserName] = useState<string>("System Admin");
  const [userEmail, setUserEmail] = useState<string>("admin@university.edu.gh");
  const [userRole, setUserRole] = useState<string>("System Administrator");
  const [academicYear, setAcademicYear] = useState<string>("2026 / 2027");
  const [schoolName, setSchoolName] = useState<string>("Accra Institute of Technology");
  const [schoolAbbr, setSchoolAbbr] = useState<string>("AIT");
  const [schoolLogo, setSchoolLogo] = useState<string>("");
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Live date & time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const day = now.getDate();
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedTime = `${day} ${month} ${year} - ${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
      setCurrentTime(formattedTime);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load user data and academic year from Supabase
  useEffect(() => {
    async function loadAdminData() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email || "admin@university.edu.gh");
        const metaName = user.user_metadata?.full_name || "System Administrator";
        setUserName(metaName);
        setUserRole(user.user_metadata?.role || "Super Administrator");

        try {
          const { count } = await (supabase as any)
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
          if (count !== null) setUnreadNotifications(count);
        } catch {
          // ignore
        }
      }

      try {
        const { data: years } = await (supabase as any)
          .from("academic_years")
          .select("code, name, is_current")
          .order("is_current", { ascending: false })
          .limit(1);

        if (years && years.length > 0 && (years[0] as any)?.code) {
          setAcademicYear((years[0] as any).code);
        }
      } catch {
        // Fallback default
      }

      // Fetch School / Institution Info directly from database
      try {
        const res = await fetch("/api/settings/institution");
        if (res.ok) {
          const data = await res.json();
          if (data?.name) {
            setSchoolName(data.name);
            if (data.abbreviation) setSchoolAbbr(data.abbreviation);
            if (data.logo_url) setSchoolLogo(data.logo_url);
            return;
          }
        }
      } catch {
        // Fallback directly to supabase table
      }

      try {
        const { data: settingRow } = await (supabase as any)
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "institution_info")
          .maybeSingle();

        if (settingRow?.setting_value?.name) {
          setSchoolName(settingRow.setting_value.name);
          if (settingRow.setting_value.abbreviation) {
            setSchoolAbbr(settingRow.setting_value.abbreviation);
          }
          if (settingRow.setting_value.logo_url) {
            setSchoolLogo(settingRow.setting_value.logo_url);
          }
        }
      } catch (err) {
        console.warn("Could not load institution info from DB:", err);
      }
    }

    loadAdminData();

    // Listen for live institution settings changes from /admin/settings
    const handleInstitutionUpdate = (e: any) => {
      if (e.detail?.name) setSchoolName(e.detail.name);
      if (e.detail?.abbreviation) setSchoolAbbr(e.detail.abbreviation);
      if (e.detail?.logoUrl !== undefined) setSchoolLogo(e.detail.logoUrl);
      if (e.detail?.logo_url !== undefined) setSchoolLogo(e.detail.logo_url);
    };

    window.addEventListener("institution_updated", handleInstitutionUpdate);
    return () => {
      window.removeEventListener("institution_updated", handleInstitutionUpdate);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      if (typeof document !== "undefined") {
        document.cookie.split(";").forEach((c) => {
          const name = c.split("=")[0]?.trim();
          if (name && /^sb-.*-auth-token/.test(name)) {
            document.cookie = `${name}=; Max-Age=0; path=/`;
          }
        });
      }
      window.location.assign("/");
    } catch {
      setIsSigningOut(false);
      window.location.assign("/");
    }
  };

  const navCategories: NavCategory[] = [
    {
      title: "Core Administration",
      items: [
        { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: LayoutGrid },
        { id: "students", label: "Students", href: "/admin/students", icon: GraduationCap },
        { id: "teachers", label: "Teachers & Faculty", href: "/admin/teachers", icon: UserCheck },
        { id: "staff", label: "Staff Members", href: "/admin/staff", icon: Users },
        { id: "admissions", label: "Admissions", href: "/admin/admissions", icon: UserPlus, badge: "New" },
      ],
    },
    {
      title: "Academics & Schedule",
      items: [
        { id: "courses", label: "Courses & Subjects", href: "/admin/courses", icon: BookOpen },
        { id: "routine", label: "Class Routine", href: "/admin/routine", icon: CalendarDays },
        { id: "exams", label: "Examinations", href: "/admin/exams", icon: FileCheck2 },
        { id: "attendance", label: "Attendance", href: "/admin/attendance", icon: CheckSquare },
      ],
    },
    {
      title: "Finance & Accounts",
      items: [
        { id: "fees", label: "Fees & Invoices", href: "/admin/fees", icon: CreditCard },
        { id: "reports", label: "Financial Reports", href: "/admin/reports", icon: BarChart3 },
      ],
    },
    {
      title: "Campus Services",
      items: [
        { id: "leave", label: "Leave Requests", href: "/admin/leave", icon: CalendarRange },
        { id: "notices", label: "Notice Board", href: "/admin/notices", icon: Megaphone },
        { id: "library", label: "Library", href: "/admin/library", icon: BookMarked },
        { id: "transport", label: "Transport & Fleet", href: "/admin/transport", icon: BusFront },
        { id: "hostels", label: "Hostels & Housing", href: "/admin/hostels", icon: Building2 },
      ],
    },
    {
      title: "Security & System",
      items: [
        { id: "users", label: "Users & RBAC", href: "/admin/users", icon: ShieldCheck },
        { id: "audit", label: "Audit Logs", href: "/admin/audit", icon: FileText },
        { id: "settings", label: "System Settings", href: "/admin/settings", icon: Sliders },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 bg-white">
        <Link href="/admin/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20 shrink-0 overflow-hidden">
            {schoolLogo ? (
              <img src={schoolLogo} alt={schoolName} className="h-full w-full object-cover" />
            ) : (
              (schoolAbbr || "AIT").slice(0, 4)
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate max-w-[165px]"
              title={schoolName}
            >
              {schoolName}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Admin Portal
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Links (Static Fixed Width, Scrollable Nav) */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200">
        {navCategories.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </div>

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.id === "dashboard" && pathname === "/admin");

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-semibold"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-blue-50 text-blue-600 border border-blue-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Modern Sidebar Footer with User Details and Prominent Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        {/* User Card */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 mb-2.5 shadow-2xs">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate leading-snug">
              {userName}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {userRole}
            </div>
          </div>
        </div>

        {/* Prominent Modern Logout Button with Functionality */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100/90 text-red-600 hover:text-red-700 text-xs font-semibold transition-all border border-red-200/80 shadow-2xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
          title="Sign out of system"
        >
          {isSigningOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
              <span>Signing out...</span>
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4 text-red-600" />
              <span>Log Out</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans antialiased">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>

      {/* Static Desktop Sidebar: Permanent fixed width, border-r, clean & steady */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:z-40 border-r border-slate-200/80 shadow-xs">
        {sidebarContent}
      </aside>

      {/* Main Viewport Container (offset by sidebar width on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-64">
        {/* Top App Bar */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          {/* Left: Mobile hamburger + Search input */}
          <div className="flex items-center gap-3 flex-1 max-w-xs sm:max-w-md">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students, staff, modules, courses..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
              />
              <span className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded">
                ⌘K
              </span>
            </div>
          </div>

          {/* Center: Live Date & Time pill */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[12px] text-slate-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>
              Date & time: <span className="font-semibold text-slate-800">{currentTime || "Loading..."}</span>
            </span>
          </div>

          {/* Right: Academic Year & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Academic Year Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-semibold shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Academic Year: {academicYear}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>

            {/* Quick Actions Stack */}
            <div className="flex items-center gap-1.5">
              {/* Region Flag */}
              <div
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-sm cursor-default"
                title="Ghana University Region"
              >
                🇬🇭
              </div>

              {/* Notifications */}
              <Link
                href="/admin/settings#notifications"
                className="relative h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </Link>

              {/* Chat Messages */}
              <Link
                href="/admin/settings#messages"
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                title="Messages"
              >
                <MessageSquare className="h-4 w-4" />
              </Link>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }}
                className="hidden md:flex h-8 w-8 rounded-lg hover:bg-slate-100 items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Toggle Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>

              {/* Profile Avatar & Dropdown */}
              <div className="relative pl-2 border-l border-slate-200 ml-1">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 hidden sm:block" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900">{userName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>
                    </div>

                    <Link
                      href="/admin/users"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                      <span>Roles & Access Control</span>
                    </Link>

                    <Link
                      href="/admin/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-600"
                    >
                      <Sliders className="h-3.5 w-3.5 text-emerald-600" />
                      <span>System Settings</span>
                    </Link>

                    <Link
                      href="/admin/audit"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-purple-600"
                    >
                      <FileText className="h-3.5 w-3.5 text-purple-600" />
                      <span>Audit Trail</span>
                    </Link>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer text-left font-medium"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

