"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOutUser } from "@/lib/auth/signout";
import {
  formatSchoolMonogram,
  resolveClientTenantContext,
} from "@/lib/saas/useTenantInstitution";
import { UnlinkedSchoolNotice } from "@/components/saas/UnlinkedSchoolNotice";
import { useFeatureFlags } from "@/lib/superadmin/useFeatureFlags";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  getStudentPortalConfig,
  isStudentRouteAllowedForSchoolType,
} from "@/config/studentPortalConfig";
import type { PortalSchoolType } from "@/config/schoolPortalConfig";
import {
  LayoutGrid,
  User,
  ClipboardList,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileCheck2,
  Award,
  Receipt,
  CreditCard,
  Building2,
  Wrench,
  NotebookPen,
  ShieldCheck,
  Briefcase,
  BadgeCheck,
  Settings,
  Search,
  Clock,
  Calendar,
  ChevronDown,
  Menu,
  X,
  Loader2,
  LogOut,
  Boxes,
} from "lucide-react";

interface StudentLayoutProps {
  children: React.ReactNode;
}

const STUDENT_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  LayoutGrid,
  ClipboardList,
  BookOpen,
  CalendarDays,
  Award,
  Building2,
  Receipt,
  User,
  FileCheck2,
  CheckSquare,
  Wrench,
  NotebookPen,
  ShieldCheck,
  Briefcase,
  BadgeCheck,
  CreditCard,
  Settings,
  Boxes,
};

export default function StudentLayout({ children }: StudentLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const [studentName, setStudentName] = useState<string>("Student");
  const [studentNumber, setStudentNumber] = useState<string>("");
  const [academicUnitLabel, setAcademicUnitLabel] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [schoolAbbr, setSchoolAbbr] = useState<string>("");
  const [schoolLogo, setSchoolLogo] = useState<string>("");
  const [schoolType, setSchoolType] = useState<PortalSchoolType>("university");
  const [tenantLoaded, setTenantLoaded] = useState<boolean>(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [studentSchoolId, setStudentSchoolId] = useState<string | null>(null);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [quickSearch, setQuickSearch] = useState<string>("");

  const { loaded: flagsLoaded, isHrefEnabled, findDisabledForPath } =
    useFeatureFlags(studentSchoolId);

  const portalConfig = useMemo(
    () => getStudentPortalConfig(schoolType),
    [schoolType]
  );

  // Live date & time indicator
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
      setCurrentTime(
        `${day} ${month} ${year} - ${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load strict authenticated tenant context + student header from server
  useEffect(() => {
    let isMounted = true;

    async function loadStudentTenantAndProfile() {
      const tenantRes = await resolveClientTenantContext();
      if (!isMounted) return;

      if (tenantRes.status === "unauthenticated") {
        window.location.replace(
          "/login?redirectedFrom=" + encodeURIComponent(window.location.pathname)
        );
        return;
      }

      const activeUser = tenantRes.user;
      const normEmail = (activeUser.email || "").trim().toLowerCase();
      setIsSuperAdminUser(
        normEmail === "superadmin@university.edu.gh" ||
          activeUser.app_metadata?.role === "superadmin"
      );
      setUserEmail(activeUser.email || "");
      setStudentName(
        activeUser.user_metadata?.full_name || activeUser.email || "Student"
      );

      if (tenantRes.status === "unlinked") {
        setTenantError(tenantRes.error);
        setTenantLoaded(true);
        return;
      }

      setStudentSchoolId(tenantRes.schoolId || null);
      setTenantError(null);
      setSchoolName(tenantRes.schoolName);
      setSchoolAbbr(tenantRes.schoolAbbr);
      setSchoolLogo(tenantRes.schoolLogo);
      const initialCfg = getStudentPortalConfig(tenantRes.schoolType);
      setSchoolType(initialCfg.schoolType);

      try {
        const res = await fetch("/api/student/portal?section=header", {
          cache: "no-store",
        });
        if (res.ok && isMounted) {
          const headerJson = await res.json();
          if (headerJson?.school?.schoolType) {
            setSchoolType(
              getStudentPortalConfig(headerJson.school.schoolType).schoolType
            );
          }
          if (headerJson?.school?.name) {
            setSchoolName(headerJson.school.name);
          }
          if (headerJson?.school?.abbr) {
            setSchoolAbbr(headerJson.school.abbr);
          }
          if (headerJson?.school?.logoUrl !== undefined) {
            setSchoolLogo(headerJson.school.logoUrl);
          }
          if (headerJson?.activeTerm?.name || headerJson?.activeYear?.code) {
            setAcademicYear(
              headerJson.activeTerm?.name || headerJson.activeYear?.code || ""
            );
          }
          if (headerJson?.student) {
            const st = headerJson.student;
            setStudentName(st.full_name || activeUser.user_metadata?.full_name || "Student");
            setStudentNumber(st.student_number || "");
            const cfgType = getStudentPortalConfig(
              headerJson?.school?.schoolType || tenantRes.schoolType
            ).schoolType;
            if (cfgType === "vocational") {
              setAcademicUnitLabel(
                st.department_name || st.intake_name || "Vocational Trainee"
              );
            } else if (cfgType === "high_school") {
              setAcademicUnitLabel(
                st.programme_name || "Senior High Student"
              );
            } else {
              setAcademicUnitLabel(
                st.programme_name
                  ? `${st.programme_name}${
                      st.current_level ? ` · L${st.current_level}` : ""
                    }`
                  : st.department_name || "University Student"
              );
            }
          }
        }
      } catch {
        // non-blocking
      } finally {
        if (isMounted) setTenantLoaded(true);
      }
    }

    loadStudentTenantAndProfile();

    const handleInstitutionUpdate = (e: any) => {
      if (e.detail?.name) setSchoolName(e.detail.name);
      if (e.detail?.abbreviation) setSchoolAbbr(e.detail.abbreviation);
      if (e.detail?.logoUrl !== undefined) setSchoolLogo(e.detail.logoUrl);
      if (e.detail?.logo_url !== undefined) setSchoolLogo(e.detail.logo_url);
      if (e.detail?.school_type) {
        setSchoolType(getStudentPortalConfig(e.detail.school_type).schoolType);
      }
    };

    window.addEventListener("institution_updated", handleInstitutionUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("institution_updated", handleInstitutionUpdate);
    };
  }, []);

  // 1. Feature Flags route enforcement
  useEffect(() => {
    if (!flagsLoaded || isSuperAdminUser) return;
    const blocked = findDisabledForPath(pathname || "/student/dashboard");
    if (blocked) {
      router.replace(
        `/portal-unavailable?portal=${encodeURIComponent(
          blocked.label
        )}&key=${encodeURIComponent(
          blocked.portal_key
        )}&from=${encodeURIComponent(pathname || "/student/dashboard")}`
      );
    }
  }, [flagsLoaded, isSuperAdminUser, findDisabledForPath, pathname, router]);

  // 2. School-type route guard: block URLs that belong to another school_type
  const routeAllowed = useMemo(() => {
    if (!tenantLoaded || tenantError || isSuperAdminUser) return true;
    return isStudentRouteAllowedForSchoolType(
      pathname || "/student/dashboard",
      schoolType
    );
  }, [tenantLoaded, tenantError, isSuperAdminUser, pathname, schoolType]);

  useEffect(() => {
    if (!tenantLoaded || tenantError || isSuperAdminUser) return;
    if (!isStudentRouteAllowedForSchoolType(pathname || "/student/dashboard", schoolType)) {
      router.replace("/student/dashboard");
    }
  }, [tenantLoaded, tenantError, isSuperAdminUser, pathname, schoolType, router]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOutUser("/login");
    } catch {
      setIsSigningOut(false);
      window.location.replace("/login");
    }
  };

  // Config-driven sidebar categories filtered by search & feature flags
  const navCategories = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    return portalConfig.sidebarGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const flagOk = isSuperAdminUser || isHrefEnabled(item.href);
          const searchOk =
            !q ||
            item.label.toLowerCase().includes(q) ||
            group.title.toLowerCase().includes(q);
          return flagOk && searchOk;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [portalConfig, quickSearch, isSuperAdminUser, isHrefEnabled]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
      {/* Brand Header with School Name & Subtle School-Type Portal Badge */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Link href="/student/dashboard" className="flex items-center gap-3 min-w-0">
          <div
            className={`h-9 w-9 rounded-xl bg-gradient-to-tr ${portalConfig.accentGradient} flex items-center justify-center text-white font-extrabold text-sm shadow-md shrink-0 overflow-hidden`}
          >
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName}
                className="h-full w-full object-cover"
              />
            ) : (
              formatSchoolMonogram(schoolAbbr, schoolName)
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate max-w-[165px]"
              title={schoolName}
            >
              {schoolName || "—"}
            </span>
            <span
              className={`mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold w-fit ${portalConfig.badgeClasses}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              <span className="truncate">{portalConfig.portalBadge}</span>
            </span>
          </div>
        </Link>

        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Config-Driven Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        {navCategories.map((category) => (
          <div key={category.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              {category.title}
            </div>
            {category.items.map((item) => {
              const Icon = STUDENT_ICON_MAP[item.iconKey] || Boxes;
              const isActive =
                pathname === item.href ||
                (item.href !== "/student/dashboard" &&
                  pathname.startsWith(item.href)) ||
                (item.href === "/student/profile" &&
                  pathname.startsWith("/student/settings"));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? portalConfig.activeNavClasses
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive
                          ? "text-current"
                          : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800 uppercase tracking-wide shrink-0">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Learner Profile Card Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div
            className={`h-9 w-9 rounded-full bg-gradient-to-tr ${portalConfig.accentGradient} flex items-center justify-center text-white text-xs font-bold uppercase shrink-0`}
          >
            {(studentName || "S").slice(0, 2)}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {studentName}
              </span>
              <ShieldCheck className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
              {[studentNumber, academicUnitLabel].filter(Boolean).join(" · ") ||
                portalConfig.learnerSingular}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            disabled={isSigningOut}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors shrink-0 cursor-pointer"
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
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs z-30 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-slate-900 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 lg:px-8 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-4 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative hidden sm:block w-64 md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder={`Filter ${portalConfig.portalBadge.toLowerCase()} menu...`}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {currentTime && (
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{currentTime}</span>
              </div>
            )}

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/70 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                {portalConfig.termLabel}: {academicYear || "Active"}
              </span>
            </div>

            <ThemeToggle variant="compact" align="right" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                className="flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200/70 dark:hover:border-slate-700 cursor-pointer"
              >
                <div
                  className={`h-8 w-8 rounded-full bg-gradient-to-tr ${portalConfig.accentGradient} flex items-center justify-center text-white text-xs font-bold`}
                >
                  {(studentName || "S").slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight max-w-[130px] truncate">
                    {studentName}
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold leading-tight">
                    {studentNumber || portalConfig.learnerSingular}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {studentName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {userEmail}
                    </p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 truncate">
                      {academicUnitLabel || portalConfig.portalBadge}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/student/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      Profile &amp; Settings
                    </Link>
                  </div>
                  <div className="p-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
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
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0B0F19] p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {tenantError ? (
              <UnlinkedSchoolNotice
                error={tenantError}
                onSignOut={handleSignOut}
                isSigningOut={isSigningOut}
              />
            ) : !routeAllowed ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
                Redirecting to your {portalConfig.portalBadge}...
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
