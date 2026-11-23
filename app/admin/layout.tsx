"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signOutUser } from "@/lib/auth/signout";
import GlobalSearchBar from "@/app/components/GlobalSearchBar";
import {
  getSchoolTerminology,
  normalizeSchoolType,
} from "@/lib/academics/school-terminology";
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
  Wrench,
  Layers,
  Briefcase,
  Boxes,
  Activity,
  Database,
  Sparkles,
  Folder,
  Check,
  Award,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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
  ShieldCheck,
  FileText,
  BarChart3,
  UserPlus,
  Award,
  Wrench,
  Layers,
  Briefcase,
  Boxes,
  Clock,
  Activity,
  Database,
  Sparkles,
  Folder,
  Check,
  Bell,
  Search,
};

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
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const [userName, setUserName] = useState<string>("System Admin");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("System Administrator");
  const [academicYear, setAcademicYear] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [schoolAbbr, setSchoolAbbr] = useState<string>("");
  const [schoolLogo, setSchoolLogo] = useState<string>("");
  const [schoolType, setSchoolType] = useState<string>("");
  const [tenantLoaded, setTenantLoaded] = useState<boolean>(false);
  const [isSuperAdminTenant, setIsSuperAdminTenant] = useState<boolean>(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<NavCategory[]>([]);
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
    let isMounted = true;
    async function loadAdminData() {
      try {
        const supabase = createClient();

        let currentUser: any = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          currentUser = user;
        } catch (err) {
          console.warn("Client getUser check error:", err);
        }

        // If client-side session is absent, try server session fallback before redirecting
        if (!currentUser) {
          try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
              const body = await res.json();
              if (body?.user) {
                currentUser = body.user;
              }
            }
          } catch {}
        }

        if (!currentUser) {
          if (isMounted) {
            window.location.replace("/?redirectedFrom=" + encodeURIComponent(window.location.pathname));
          }
          return;
        }

        if (!isMounted) return;

        setUserEmail(currentUser.email || "");
        const metaName = currentUser.user_metadata?.full_name || "System Administrator";
        setUserName(metaName);

        const rawRole = currentUser.user_metadata?.role || "system_admin";
        const formattedRole =
          rawRole === "system_admin"
            ? "System Administrator"
            : rawRole === "super_admin"
            ? "Super Administrator"
            : rawRole
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c: string) => c.toUpperCase());
        setUserRole(formattedRole);

        // Fetch Tenant School / Institution Info FIRST so every subsequent query is scoped to school_id
        let currentSchoolType = "";
        let tenantSchoolId: string | null = null;
        try {
          const res = await fetch("/api/settings/institution");
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (isMounted) {
              setTenantError(
                data?.error ||
                  "Your account is not linked to a registered school. Contact your Super Administrator."
              );
            }
            return;
          }

          tenantSchoolId = data?.school_id || data?.id || null;
          if (!tenantSchoolId && !data?.is_super_admin) {
            if (isMounted) {
              setTenantError(
                "Your account is not linked to a registered school. Contact your Super Administrator."
              );
            }
            return;
          }

          if (isMounted) {
            setTenantError(null);
            setIsSuperAdminTenant(Boolean(data?.is_super_admin));
            setTenantLoaded(true);
            if (data?.name) setSchoolName(data.name);
            if (data?.abbreviation) setSchoolAbbr(data.abbreviation);
            if (data?.logo_url) setSchoolLogo(data.logo_url);
            if (data?.school_type) {
              currentSchoolType = normalizeSchoolType(data.school_type);
              setSchoolType(currentSchoolType);
            }
          }
        } catch {
          if (isMounted) {
            setTenantError(
              "Unable to verify your school assignment. Please refresh or contact support."
            );
          }
          return;
        }

        try {
          const { count } = await (supabase as any)
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", currentUser.id)
            .eq("is_read", false);
          if (count !== null && isMounted) setUnreadNotifications(count);
        } catch {
          // ignore
        }

        if (tenantSchoolId) {
          try {
            const { data: years } = await (supabase as any)
              .from("academic_years")
              .select("code, name, is_current")
              .eq("school_id", tenantSchoolId)
              .order("is_current", { ascending: false })
              .limit(1);

            if (years && years.length > 0 && (years[0] as any)?.code && isMounted) {
              setAcademicYear((years[0] as any).code);
            }
          } catch {
            // Academic year not configured yet
          }
        }

        // Fetch dynamic configurable school sidebar menu items once school_type is resolved
        if (currentSchoolType) {
          try {
            const resMenu = await fetch(
              `/api/admin/sidebar-menu?school_type=${encodeURIComponent(currentSchoolType)}`
            );
            if (resMenu.ok) {
              const menuItems = await resMenu.json();
              if (Array.isArray(menuItems) && menuItems.length > 0 && isMounted) {
                const grouped: Record<string, NavCategory> = {};
                for (const m of menuItems) {
                  const catTitle = m.category || "Core Administration";
                  if (!grouped[catTitle]) {
                    grouped[catTitle] = { title: catTitle, items: [] };
                  }
                  const IconC = ICON_MAP[m.icon] || Boxes;
                  grouped[catTitle].items.push({
                    id: m.id,
                    label: m.label,
                    href: m.href,
                    icon: IconC,
                    badge: m.badge || undefined,
                  });
                }
                setDynamicCategories(Object.values(grouped));
              }
            }
          } catch (menuErr) {
            console.warn("Could not load dynamic school sidebar menu:", menuErr);
          }
        }
      } catch (err) {
        console.error("Error initializing admin layout:", err);
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

    const handleSchoolMenuUpdate = () => {
      loadAdminData();
    };

    window.addEventListener("institution_updated", handleInstitutionUpdate);
    window.addEventListener("school_menu_updated", handleSchoolMenuUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("institution_updated", handleInstitutionUpdate);
      window.removeEventListener("school_menu_updated", handleSchoolMenuUpdate);
    };
  }, []);

  // Enforce school_type route eligibility (hide /admin/departments for High School, /admin/programs for Vocational)
  useEffect(() => {
    if (!tenantLoaded || isSuperAdminTenant) return;
    const term = getSchoolTerminology(schoolType);
    if (pathname === "/admin/departments" && !term.departments.visible) {
      router.replace(term.departments.redirectWhenHidden);
      return;
    }
    if (
      (pathname === "/admin/programs" || pathname === "/admin/programmes") &&
      !term.programs.visible
    ) {
      router.replace(term.programs.redirectWhenHidden);
    }
  }, [tenantLoaded, isSuperAdminTenant, schoolType, pathname, router]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOutUser("/");
    } catch {
      setIsSigningOut(false);
      window.location.replace("/");
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
        { id: "departments", label: "Departments", href: "/admin/departments", icon: Layers },
        { id: "programs", label: "Programs", href: "/admin/programs", icon: Award },
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

  const resolvedCategories = useMemo(() => {
    const base = dynamicCategories.length > 0 ? dynamicCategories : navCategories;
    if (isSuperAdminTenant || !schoolType) return base;
    const term = getSchoolTerminology(schoolType);
    return base
      .map((group) => ({
        ...group,
        items: (group.items || [])
          .filter((item) => {
            if (item.id === "departments" || item.href === "/admin/departments") {
              return term.departments.visible;
            }
            if (item.id === "programs" || item.href === "/admin/programs") {
              return term.programs.visible;
            }
            return true;
          })
          .map((item) => {
            if (item.id === "departments" || item.href === "/admin/departments") {
              return { ...item, label: term.departments.navLabel };
            }
            if (item.id === "programs" || item.href === "/admin/programs") {
              return { ...item, label: term.programs.navLabel };
            }
            return item;
          }),
      }))
      .filter((group) => group.items.length > 0);
  }, [dynamicCategories, navCategories, isSuperAdminTenant, schoolType]);

  const normalizedDisplayType = schoolType ? normalizeSchoolType(schoolType) : "";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 bg-white">
        <Link href="/admin/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20 shrink-0 overflow-hidden">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName}
                className="h-full w-full object-cover"
                onError={() => setSchoolLogo("")}
              />
            ) : (
              (
                schoolAbbr ||
                schoolName
                  .split(/\s+/)
                  .map((w) => w[0] || "")
                  .join("") ||
                "—"
              )
                .toUpperCase()
                .slice(0, 4)
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate max-w-[165px]"
              title={schoolName}
            >
              {schoolName || "—"}
            </span>
            <span className="text-[10.5px] font-semibold text-blue-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>
                {normalizedDisplayType === "vocational_school"
                  ? "Vocational SaaS Tenant"
                  : normalizedDisplayType === "high_school"
                  ? "High School SaaS Tenant"
                  : normalizedDisplayType === "university"
                  ? "University SaaS Tenant"
                  : "Tenant Portal"}
              </span>
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

      {/* Navigation Links (Configurable Dynamic Nav, Scrollable) */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200">
        {resolvedCategories.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </div>

            {(group.items || []).map((item) => {
              const Icon = item.icon || Boxes;
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
              {(userName || "SA").slice(0, 2).toUpperCase()}
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

            <GlobalSearchBar
              portal="admin"
              placeholder="Search students, staff, modules, courses..."
            />
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
              <span>Academic Year: {academicYear || "Not Configured"}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>

            {/* Quick Actions Stack */}
            <div className="flex items-center gap-1.5">
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
                  if (typeof document !== "undefined") {
                    if (!document.fullscreenElement) {
                      if (document.documentElement && typeof document.documentElement.requestFullscreen === "function") {
                        document.documentElement.requestFullscreen().catch(() => {});
                      }
                    } else {
                      if (typeof document.exitFullscreen === "function") {
                        document.exitFullscreen().catch(() => {});
                      }
                    }
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
                    {(userName || "SA").slice(0, 2).toUpperCase()}
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
          {tenantError ? (
            <div className="max-w-lg mx-auto mt-12 rounded-2xl bg-white border border-rose-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-rose-700">
                <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Account Not Linked to a School
                  </h2>
                  <p className="text-xs text-slate-500">Multi-Tenant Access Verification</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{tenantError}</p>
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

