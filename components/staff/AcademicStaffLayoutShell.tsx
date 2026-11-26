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
import { UserAvatar, useCurrentUserAvatar } from "@/components/profile/UserAvatar";
import { CountryFlagBadge } from "@/components/ui/CountryFlagBadge";
import {
  getAcademicStaffPortalConfig,
  isAcademicStaffRouteAllowedForSchoolType,
} from "@/config/academicStaffPortalConfig";
import type { PortalSchoolType } from "@/config/schoolPortalConfig";
import {
  LayoutGrid,
  BookOpen,
  Users,
  FileCheck2,
  Award,
  CalendarDays,
  GraduationCap,
  User,
  CheckSquare,
  ClipboardCheck,
  MessageSquare,
  Wrench,
  ShieldCheck,
  NotebookPen,
  Briefcase,
  Boxes,
  Clock,
  Calendar,
  ChevronDown,
  Menu,
  X,
  Loader2,
  LogOut,
  Search,
  Bell,
} from "lucide-react";

const STAFF_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutGrid,
  BookOpen,
  Users,
  FileCheck2,
  Award,
  CalendarDays,
  GraduationCap,
  User,
  CheckSquare,
  ClipboardCheck,
  MessageSquare,
  Wrench,
  ShieldCheck,
  NotebookPen,
  Briefcase,
  Boxes,
};

interface AcademicStaffLayoutShellProps {
  portalMount: "lecturer" | "teacher";
  children: React.ReactNode;
}

export default function AcademicStaffLayoutShell({
  portalMount,
  children,
}: AcademicStaffLayoutShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [staffName, setStaffName] = useState("Academic Staff");
  const [staffTitle, setStaffTitle] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [academicTermLabel, setAcademicTermLabel] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolAbbr, setSchoolAbbr] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [schoolCountry, setSchoolCountry] = useState("");
  const [schoolCountryCode, setSchoolCountryCode] = useState("");
  const [schoolType, setSchoolType] = useState<PortalSchoolType>(
    portalMount === "lecturer" ? "university" : "high_school"
  );
  const [tenantLoaded, setTenantLoaded] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [staffSchoolId, setStaffSchoolId] = useState<string | null>(null);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const avatarUrl = useCurrentUserAvatar();

  const { loaded: flagsLoaded, isHrefEnabled, findDisabledForPath } =
    useFeatureFlags(staffSchoolId);

  const portalConfig = useMemo(
    () => getAcademicStaffPortalConfig(schoolType),
    [schoolType]
  );

  // Live clock
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      let hours = now.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setCurrentTime(
        `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} - ${String(
          hours
        ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} ${ampm}`
      );
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  // Load tenant, institution school_type, and live staff profile
  useEffect(() => {
    let isMounted = true;

    async function loadStaffContext() {
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
      setStaffName(activeUser.user_metadata?.full_name || activeUser.email || "Academic Staff");

      if (tenantRes.status === "unlinked") {
        setTenantError(tenantRes.error);
        setTenantLoaded(true);
        return;
      }

      setStaffSchoolId(tenantRes.schoolId || null);
      setTenantError(null);
      setSchoolName(tenantRes.schoolName);
      setSchoolAbbr(tenantRes.schoolAbbr);
      setSchoolLogo(tenantRes.schoolLogo);
      setSchoolCountry(tenantRes.country || "");
      setSchoolCountryCode(tenantRes.countryCode || "");
      setSchoolType(getAcademicStaffPortalConfig(tenantRes.schoolType).schoolType);

      try {
        const res = await fetch("/api/staff/portal?section=header", {
          cache: "no-store",
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          const nextType = getAcademicStaffPortalConfig(
            json?.school?.schoolType || tenantRes.schoolType
          );
          setSchoolType(nextType.schoolType);
          if (json?.school?.name) setSchoolName(json.school.name);
          if (json?.school?.abbr) setSchoolAbbr(json.school.abbr);
          if (json?.school?.logoUrl !== undefined) setSchoolLogo(json.school.logoUrl);

          if (json?.activeTerm?.name || json?.activeYear?.code) {
            setAcademicTermLabel(
              [json?.activeYear?.code, json?.activeTerm?.name].filter(Boolean).join(" · ")
            );
          }

          if (json?.staffProfile) {
            const sp = json.staffProfile;
            setStaffName(sp.full_name || activeUser.user_metadata?.full_name || "Academic Staff");
            setStaffNumber(sp.staff_number || "");
            if (nextType.schoolType === "high_school") {
              const cls = json.assignedClassName
                ? `${json.assignedClassName}${json.isClassTeacher ? " · Class Teacher" : ""}`
                : sp.designation || "Subject Teacher";
              setStaffTitle(cls);
            } else if (nextType.schoolType === "vocational") {
              setStaffTitle(
                json.department?.name || sp.designation || "Trade Instructor"
              );
            } else {
              setStaffTitle(
                sp.designation || json.department?.name || "University Lecturer"
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

    loadStaffContext();

    const handleInstitutionUpdate = (e: any) => {
      if (e.detail?.name) setSchoolName(e.detail.name);
      if (e.detail?.abbreviation) setSchoolAbbr(e.detail.abbreviation);
      if (e.detail?.logoUrl !== undefined) setSchoolLogo(e.detail.logoUrl);
      if (e.detail?.logo_url !== undefined) setSchoolLogo(e.detail.logo_url);
      if (e.detail?.country !== undefined) setSchoolCountry(e.detail.country || "");
      if (e.detail?.country_code !== undefined) setSchoolCountryCode(e.detail.country_code || "");
      if (e.detail?.school_type) {
        setSchoolType(getAcademicStaffPortalConfig(e.detail.school_type).schoolType);
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
    const defaultDash = portalConfig.defaultDashboardHref;
    const blocked = findDisabledForPath(pathname || defaultDash);
    if (blocked) {
      router.replace(
        `/portal-unavailable?portal=${encodeURIComponent(
          blocked.label
        )}&key=${encodeURIComponent(
          blocked.portal_key
        )}&from=${encodeURIComponent(pathname || defaultDash)}`
      );
    }
  }, [flagsLoaded, isSuperAdminUser, findDisabledForPath, pathname, router, portalConfig]);

  // 2. School-type route guard: block URLs belonging to another school_type
  const routeAllowed = useMemo(() => {
    if (!tenantLoaded || tenantError || isSuperAdminUser) return true;
    return isAcademicStaffRouteAllowedForSchoolType(
      pathname || portalConfig.defaultDashboardHref,
      schoolType
    );
  }, [tenantLoaded, tenantError, isSuperAdminUser, pathname, schoolType, portalConfig]);

  useEffect(() => {
    if (!tenantLoaded || tenantError || isSuperAdminUser) return;
    const currentPath = pathname || portalConfig.defaultDashboardHref;
    if (!isAcademicStaffRouteAllowedForSchoolType(currentPath, schoolType)) {
      router.replace(portalConfig.defaultDashboardHref);
    }
  }, [tenantLoaded, tenantError, isSuperAdminUser, pathname, schoolType, portalConfig, router]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOutUser("/login");
    } catch {
      setIsSigningOut(false);
      window.location.replace("/login");
    }
  };

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
        <Link href={portalConfig.defaultDashboardHref} className="flex items-center gap-3 min-w-0">
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
          aria-label="Close navigation drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick sidebar search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Filter menu..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/70 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Config-Driven Navigation Groups */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto overflow-x-hidden">
        {navCategories.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.title}
            </div>

            {group.items.map((item) => {
              const Icon = STAFF_ICON_MAP[item.iconKey] || LayoutGrid;
              const isActive =
                pathname === item.href ||
                (item.id === "dashboard" &&
                  (pathname === "/lecturer" ||
                    pathname === "/teacher" ||
                    pathname === item.href));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? portalConfig.activeNavClasses
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-current" : "text-slate-400 dark:text-slate-500"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Staff Summary & Sign Out */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 mb-2.5 shadow-2xs">
          <div className="relative shrink-0">
            <UserAvatar src={avatarUrl} name={staffName} size="md" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
              {staffName}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {staffNumber ? `${staffNumber} · ` : ""}
              {staffTitle || portalConfig.staffSingular}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold transition-all border border-red-200/80 dark:border-red-900/70 cursor-pointer disabled:opacity-50"
        >
          {isSigningOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing out...</span>
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-800 dark:text-slate-100 font-sans antialiased">
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>

      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 z-30">
        {sidebarContent}
      </aside>

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        {/* Top Utility Header */}
        <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{currentTime || "—"}</span>
            </div>

            {academicTermLabel && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                <Calendar className="h-3 w-3 text-slate-500" />
                <span>{academicTermLabel}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <ThemeToggle variant="compact" align="right" />

            <CountryFlagBadge
              country={schoolCountry}
              countryCode={schoolCountryCode}
              schoolName={schoolName}
            />

            <Link
              href={
                schoolType === "high_school"
                  ? "/teacher/messages"
                  : schoolType === "university"
                  ? "/lecturer/dashboard"
                  : "/teacher/dashboard"
              }
              title="Notifications"
              aria-label="Notifications"
              className="relative h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Bell className="h-4 w-4" />
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="flex items-center gap-2.5 p-1 pr-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <UserAvatar src={avatarUrl} name={staffName} size="sm" />
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-none">
                    {staffName}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                    {portalConfig.staffSingular}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
              </button>

              {showProfileMenu && (
                <div
                  onMouseLeave={() => setShowProfileMenu(false)}
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 text-xs"
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {staffName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {userEmail}
                    </p>
                  </div>
                  <Link
                    href={
                      schoolType === "university"
                        ? "/lecturer/profile"
                        : "/teacher/profile"
                    }
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>Profile &amp; Settings</span>
                  </Link>
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {tenantError ? (
            <div className="max-w-3xl mx-auto py-8">
              <UnlinkedSchoolNotice error={tenantError} onSignOut={handleSignOut} />
            </div>
          ) : !routeAllowed ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">
                Redirecting to your {portalConfig.portalBadge}...
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
