"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutGrid,
  User,
  GraduationCap,
  ClipboardList,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileCheck2,
  Award,
  TrendingUp,
  Receipt,
  CreditCard,
  FileText,
  Sparkles,
  ScrollText,
  HelpCircle,
  Library,
  Building2,
  Megaphone,
  LifeBuoy,
  Bell,
  FolderOpen,
  Settings,
  Search,
  Maximize2,
  Clock,
  Calendar,
  ChevronDown,
  Menu,
  X,
  Loader2,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface StudentLayoutProps {
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

export default function StudentLayout({ children }: StudentLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const [studentName, setStudentName] = useState<string>("Ama Johnson");
  const [studentNumber, setStudentNumber] = useState<string>("STU20260001");
  const [programmeName, setProgrammeName] = useState<string>("BSc Computer Science");
  const [studentLevel, setStudentLevel] = useState<string>("Level 100");
  const [userEmail, setUserEmail] = useState<string>("ama.johnson@university.edu.gh");
  const [academicYear, setAcademicYear] = useState<string>("2026 / 2027");
  const [schoolName, setSchoolName] = useState<string>("Accra Institute of Technology");
  const [schoolAbbr, setSchoolAbbr] = useState<string>("AIT");
  const [schoolLogo, setSchoolLogo] = useState<string>("");
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Live date & time counter
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
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedTime = `${day} ${month} ${year} - ${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
      setCurrentTime(formattedTime);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load student profile & academic status from Supabase
  useEffect(() => {
    async function loadStudentData() {
      const supabase = createClient();
      const db = supabase as any;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserEmail(user.email || "ama.johnson@university.edu.gh");

          // Check students table
          const { data: stu } = await db
            .from("students")
            .select("*, profile:profile_id(full_name, email), programme:programme_id(name, code)")
            .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();

          if (stu) {
            if (stu.profile?.full_name) setStudentName(stu.profile.full_name);
            if (stu.student_number) setStudentNumber(stu.student_number);
            if (stu.programme?.name) setProgrammeName(stu.programme.name);
            if (stu.current_level) setStudentLevel(`Level ${stu.current_level}`);
          } else {
            // Fallback to first student if admin is browsing portal
            const { data: firstStu } = await db
              .from("students")
              .select("*, profile:profile_id(full_name, email), programme:programme_id(name, code)")
              .limit(1)
              .maybeSingle();

            if (firstStu) {
              if (firstStu.profile?.full_name) setStudentName(firstStu.profile.full_name);
              if (firstStu.student_number) setStudentNumber(firstStu.student_number);
              if (firstStu.programme?.name) setProgrammeName(firstStu.programme.name);
              if (firstStu.current_level) setStudentLevel(`Level ${firstStu.current_level}`);
            }
          }

          // Fetch notifications count
          try {
            const { count } = await db
              .from("notifications")
              .select("*", { count: "exact", head: true })
              .eq("is_read", false);
            if (count !== null) setUnreadNotifications(count);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn("Could not load student auth details:", err);
      }

      try {
        const { data: years } = await db
          .from("academic_years")
          .select("code, name, is_current")
          .order("is_current", { ascending: false })
          .limit(1);

        if (years && years.length > 0 && years[0]?.code) {
          setAcademicYear(years[0].code);
        }
      } catch {
        // keep fallback
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
        const { data: settingRow } = await db
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

    loadStudentData();

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

  // Section 7.2: Official Student Portal Sidebar Menu Items (23 Items)
  const navCategories: NavCategory[] = [
    {
      title: "Core Workspace",
      items: [
        { id: "dashboard", label: "Dashboard", href: "/student/dashboard", icon: LayoutGrid },
        { id: "profile", label: "My Profile", href: "/student/profile", icon: User },
        { id: "programme", label: "My Programme", href: "/student/programme", icon: GraduationCap },
      ],
    },
    {
      title: "Academics & Enrolment",
      items: [
        { id: "registration", label: "Course Registration", href: "/student/registration", icon: ClipboardList, badge: "Open" },
        { id: "enrolments", label: "Course Enrolments", href: "/student/enrolments", icon: BookOpen },
        { id: "timetable", label: "Timetable", href: "/student/timetable", icon: CalendarDays },
        { id: "attendance", label: "Attendance", href: "/student/attendance", icon: CheckSquare },
        { id: "assessments", label: "Assignments/Assessment", href: "/student/assessments", icon: FileCheck2 },
        { id: "results", label: "Results and GPA/CGPA", href: "/student/results", icon: Award },
        { id: "progress", label: "Academic Progress", href: "/student/progress", icon: TrendingUp },
      ],
    },
    {
      title: "Finance & Accounts",
      items: [
        { id: "fee-statement", label: "Fee Statement", href: "/student/fee-statement", icon: Receipt },
        { id: "invoices", label: "Invoices and Payments", href: "/student/invoices", icon: CreditCard },
        { id: "receipts", label: "Receipts", href: "/student/receipts", icon: FileText },
        { id: "scholarships", label: "Scholarships/Sponsorships", href: "/student/scholarships", icon: Sparkles },
      ],
    },
    {
      title: "Registry & Campus Services",
      items: [
        { id: "transcripts", label: "Transcript and Letters", href: "/student/transcripts", icon: ScrollText },
        { id: "service-requests", label: "Service Requests", href: "/student/service-requests", icon: HelpCircle },
        { id: "library", label: "Library", href: "/student/library", icon: Library },
        { id: "hostel", label: "Hostel/Accommodation", href: "/student/hostel", icon: Building2 },
      ],
    },
    {
      title: "Communications & Account",
      items: [
        { id: "announcements", label: "Announcements", href: "/student/announcements", icon: Megaphone },
        { id: "support-tickets", label: "Support Tickets", href: "/student/support-tickets", icon: LifeBuoy },
        { id: "notifications", label: "Notifications", href: "/student/notifications", icon: Bell },
        { id: "documents", label: "Documents", href: "/student/documents", icon: FolderOpen },
        { id: "settings", label: "Settings and Security", href: "/student/settings", icon: Settings },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 bg-white">
        <Link href="/student/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20 shrink-0 overflow-hidden">
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
            <span className="text-[11px] font-medium text-blue-600">
              Student Portal
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

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200">
        {navCategories.map((category) => (
          <div key={category.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {category.title}
            </div>
            {category.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/student/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive
                          ? "text-blue-600"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wide">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Student Profile Card Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-100 shadow-xs">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase ring-2 ring-blue-100 shrink-0">
            {studentName.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-800 truncate">
                {studentName}
              </span>
              <ShieldCheck className="h-3 w-3 text-blue-600 shrink-0" />
            </div>
            <span className="text-[10px] text-slate-500 font-medium truncate">
              {studentNumber} • {studentLevel}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            disabled={isSigningOut}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          >
            {isSigningOut ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* Desktop Sidebar (Fixed 248px width) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 bg-white shadow-xs z-30 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 lg:px-8 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 z-20 shrink-0">
          {/* Mobile menu trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick Search Bar */}
            <div className="relative hidden sm:block w-72 md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses, timetables, fees..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Live Clock Badge */}
            {currentTime && (
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* Academic Year Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] font-semibold text-blue-700">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>AY: {academicYear}</span>
            </div>

            {/* Notification Bell */}
            <Link
              href="/student/notifications"
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
              )}
            </Link>

            {/* Profile Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200/70"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-blue-100">
                  {studentName.charAt(0)}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {studentName}
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold leading-tight">
                    {studentNumber}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{studentName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                    <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                      {programmeName}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/student/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      View Profile
                    </Link>
                    <Link
                      href="/student/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-400" />
                      Account & Security
                    </Link>
                  </div>
                  <div className="p-1 border-t border-slate-100">
                    <button
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      {isSigningOut ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

