"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { resolveClientTenantContext } from "@/lib/saas/useTenantInstitution";
import { signOutUser } from "@/lib/auth/signout";
import { UnlinkedSchoolNotice } from "@/components/saas/UnlinkedSchoolNotice";
import { useFeatureFlags } from "@/lib/superadmin/useFeatureFlags";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export interface ClassicNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ClassicPortalShellProps {
  portalBadge: string;
  defaultUserTitle: string;
  homeHref: string;
  navItems: ClassicNavItem[];
  sidebarTopSlot?: React.ReactNode;
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function ClassicPortalShell({
  portalBadge,
  defaultUserTitle,
  homeHref,
  navItems,
  sidebarTopSlot,
  headerSlot,
  children,
}: ClassicPortalShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");
  const [schoolAbbr, setSchoolAbbr] = useState<string>("");
  const [schoolLogo, setSchoolLogo] = useState<string>("");
  const [userName, setUserName] = useState<string>(defaultUserTitle);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { loaded: flagsLoaded, findDisabledForPath } = useFeatureFlags(schoolId);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const tenantRes = await resolveClientTenantContext();
      if (!mounted) return;
      if (tenantRes.status === "unauthenticated") {
        window.location.replace(
          `/login?redirectedFrom=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }

      const activeUser = tenantRes.user;
      const normEmail = String(activeUser?.email || "").trim().toLowerCase();
      setIsSuperAdminUser(
        normEmail === "superadmin@university.edu.gh" ||
          activeUser?.app_metadata?.role === "superadmin"
      );
      setUserEmail(activeUser?.email || "");
      setUserName(activeUser?.user_metadata?.full_name || defaultUserTitle);

      if (tenantRes.status === "unlinked") {
        setTenantError(tenantRes.error);
        return;
      }

      setTenantError(null);
      setSchoolId(tenantRes.schoolId || null);
      setSchoolName(tenantRes.schoolName || "");
      setSchoolAbbr(tenantRes.schoolAbbr || "");
      setSchoolLogo(tenantRes.schoolLogo || "");
    }
    load();
    return () => {
      mounted = false;
    };
  }, [defaultUserTitle]);

  useEffect(() => {
    if (!flagsLoaded || isSuperAdminUser) return;
    const blocked = findDisabledForPath(pathname || homeHref);
    if (blocked) {
      router.replace(
        `/portal-unavailable?portal=${encodeURIComponent(
          blocked.label
        )}&key=${encodeURIComponent(
          blocked.portal_key
        )}&from=${encodeURIComponent(pathname || homeHref)}`
      );
    }
  }, [flagsLoaded, isSuperAdminUser, findDisabledForPath, pathname, homeHref, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOutUser("/login");
    } finally {
      window.location.assign("/login");
    }
  }

  const monogram =
    schoolAbbr?.slice(0, 3).toUpperCase() ||
    (schoolName || "SC")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") ||
    "SC";

  const sidebarBody = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
      {/* Brand Header matching App-wide Portal Header */}
      <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
        <Link href={homeHref} className="flex items-center gap-3 min-w-0">
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt={schoolName || "School logo"}
              className="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center text-xs font-extrabold shadow-md shadow-blue-500/20 shrink-0">
              {monogram}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span
              className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate max-w-[160px]"
              title={schoolName}
            >
              {schoolName || "Loading..."}
            </span>
            <span className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold w-fit bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80">
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              <span className="truncate">{portalBadge}</span>
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation drawer"
          className="lg:hidden h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Optional top slot (e.g. Multi-child switcher in Parent Portal) */}
      {sidebarTopSlot && (
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          {sidebarTopSlot}
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  active ? "text-white" : "text-slate-400 dark:text-slate-500"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer User Card & Sign Out matching App Portals */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 mb-2.5 shadow-2xs">
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {(userName || "US").slice(0, 2).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
              {userName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {userEmail || defaultUserTitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isSigningOut}
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold transition-all border border-red-200/80 dark:border-red-900/70 cursor-pointer disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span>{isSigningOut ? "Signing out..." : "Log Out"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 z-30 print:hidden">
        {sidebarBody}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[85vw] h-full z-10 border-r border-slate-200/80 dark:border-slate-800">
            {sidebarBody}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen print:pl-0">
        <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="lg:hidden min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {schoolName || portalBadge}
              </p>
            </div>
            {headerSlot}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
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
    </div>
  );
}
