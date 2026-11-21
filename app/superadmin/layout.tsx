"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signOutUser } from "@/lib/auth/signout";
import GlobalSearchBar from "@/app/components/GlobalSearchBar";
import {
  LayoutGrid,
  Building2,
  ShieldCheck,
  Users,
  UserCheck,
  Layers,
  GraduationCap,
  CreditCard,
  Megaphone,
  FileText,
  HardDrive,
  Boxes,
  FileCheck2,
  ShieldAlert,
  Clock,
  Activity,
  Database,
  Sliders,
  LogOut,
  Search,
  Bell,
  MessageSquare,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface SuperAdminLayoutProps {
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

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const [userName, setUserName] = useState<string>("Super Administrator");
  const [userEmail, setUserEmail] = useState<string>("superadmin@university.edu.gh");
  const [userRole, setUserRole] = useState<string>("Root Super Administrator");
  const [schoolName, setSchoolName] = useState<string>("School Management System");
  const [unreadNotifications, setUnreadNotifications] = useState<number>(3);
  const [unreadEmailsCount, setUnreadEmailsCount] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Live date & time ticking counter matching Admin Portal
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

  // Fetch Super Admin Auth details
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.replace("/?redirectedFrom=" + encodeURIComponent(window.location.pathname));
          return;
        }

        setUserEmail(user.email || "superadmin@university.edu.gh");
        const metaName = user.user_metadata?.full_name || "Super Administrator";
        setUserName(metaName);
        setUserRole("Super Administrator");

        try {
          const { count } = await (supabase as any)
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
          if (count !== null && count !== undefined) {
            setUnreadNotifications(count);
          }
        } catch {
          // ignore
        }

        try {
          const commRes = await fetch("/api/superadmin/communications?config=true");
          if (commRes.ok) {
            const commData = await commRes.json();
            if (typeof commData.unreadCount === "number") {
              setUnreadEmailsCount(commData.unreadCount);
            }
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn("Could not load auth user in superadmin:", err);
      }
    }

    loadData();

    const handleCommUpdate = async () => {
      try {
        const commRes = await fetch("/api/superadmin/communications?config=true");
        if (commRes.ok) {
          const commData = await commRes.json();
          if (typeof commData.unreadCount === "number") {
            setUnreadEmailsCount(commData.unreadCount);
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("communications_updated", handleCommUpdate);
    return () => window.removeEventListener("communications_updated", handleCommUpdate);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOutUser("/");
    } catch {
      setIsSigningOut(false);
      window.location.replace("/");
    }
  };

  // Official Section 7.6 System Administration Sidebar Structure
  const navCategories: NavCategory[] = [
    {
      title: "Core Administration",
      items: [
        { id: "dashboard", label: "System Overview", href: "/superadmin/dashboard", icon: LayoutGrid, badge: "Live" },
        { id: "universities", label: "Schools & Campuses", href: "/superadmin/universities", icon: Building2, badge: "Tenants" },
        { id: "system-admins", label: "System Administrators", href: "/superadmin/system-admins", icon: ShieldCheck, badge: "Admins" },
        {
          id: "communications",
          label: "Communications",
          href: "/superadmin/communications",
          icon: Megaphone,
          badge: unreadEmailsCount > 0 ? `${unreadEmailsCount} New` : "Mail",
        },
        { id: "users", label: "Users & Directory", href: "/superadmin/users", icon: Users },
        { id: "roles", label: "Roles & Permissions", href: "/superadmin/roles", icon: UserCheck },
        { id: "scopes", label: "Department & Campus Scopes", href: "/superadmin/scopes", icon: Layers },
      ],
    },
    {
      title: "Platform Configuration",
      items: [
        { id: "academics", label: "Academic Configuration", href: "/superadmin/academics", icon: GraduationCap },
        { id: "payments", label: "Payment Provider Settings", href: "/superadmin/payments", icon: CreditCard },
        { id: "templates", label: "Document Templates", href: "/superadmin/templates", icon: FileText },
        { id: "storage", label: "Storage & File Policies", href: "/superadmin/storage", icon: HardDrive },
        { id: "integrations", label: "Integrations & APIs", href: "/superadmin/integrations", icon: Boxes },
      ],
    },
    {
      title: "Security & Operations",
      items: [
        { id: "audit", label: "Audit Logs", href: "/superadmin/audit", icon: FileCheck2 },
        { id: "security-events", label: "Security Events", href: "/superadmin/security-events", icon: ShieldAlert },
        { id: "jobs", label: "Background Jobs", href: "/superadmin/jobs", icon: Clock, badge: "Queue" },
        { id: "health", label: "Monitoring & Health", href: "/superadmin/health", icon: Activity, badge: "99.9%" },
        { id: "backups", label: "Backup & Recovery Status", href: "/superadmin/backups", icon: Database },
        { id: "modules", label: "Feature Flags", href: "/superadmin/modules", icon: Sliders },
        { id: "settings", label: "Settings & School Menus", href: "/superadmin/settings", icon: Sliders },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 bg-white">
        <Link href="/superadmin/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate max-w-[165px]"
              title={schoolName}
            >
              UMS Global
            </span>
            <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Super Admin Portal
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

      {/* Navigation Links - Static Fixed Categories, Instant Rendering */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200">
        {navCategories.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </div>

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.id === "dashboard" && pathname === "/superadmin");

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
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
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

        {/* Quick Cross-Portal Jump Links */}
        <div className="pt-2 border-t border-slate-100 space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tenant Workspaces
          </div>
          <Link
            href="/admin/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all"
          >
            <div className="flex items-center gap-2.5 truncate">
              <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="truncate">Campus Admin Portal</span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </Link>
          <Link
            href="/finance/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all"
          >
            <div className="flex items-center gap-2.5 truncate">
              <ExternalLink className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="truncate">Bursary & Finance</span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </Link>
        </div>
      </nav>

      {/* Sidebar Footer with Super Admin Details and Logout Button */}
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
            <div className="text-[10px] text-blue-600 font-medium truncate">
              {userRole}
            </div>
          </div>
        </div>

        {/* Prominent Modern Logout Button matching Admin layout */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100/90 text-red-600 hover:text-red-700 text-xs font-semibold transition-all border border-red-200/80 shadow-2xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
          title="Sign out of Super Admin Console"
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
      {/* Mobile Drawer Backdrop */}
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

      {/* Desktop Sidebar: Permanent fixed width w-64 */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:z-40 border-r border-slate-200/80 shadow-xs">
        {sidebarContent}
      </aside>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-64">
        {/* Top App Bar matching Admin Portal */}
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
              portal="superadmin"
              placeholder="Search schools, modules, admins, background jobs, logs..."
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

          {/* Right: Scope Badge & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Actions Stack */}
            <div className="flex items-center gap-1.5">
              {/* Region Flag */}
              <div
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-sm cursor-default"
                title="Ghana Region"
              >
                🇬🇭
              </div>

              {/* Notifications */}
              <Link
                href="/superadmin/audit"
                className="relative h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                title="Security Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </Link>

              {/* Chat / Messages */}
              <Link
                href="/superadmin/communications?folder=inbox"
                className="relative h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                title={
                  unreadEmailsCount > 0
                    ? `${unreadEmailsCount} Unread Email Replies`
                    : "Communications & Inbox"
                }
              >
                <MessageSquare className="h-4 w-4" />
                {unreadEmailsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    {unreadEmailsCount}
                  </span>
                )}
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
                      href="/superadmin/roles"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                      <span>Roles & Access Control</span>
                    </Link>

                    <Link
                      href="/superadmin/health"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-600"
                    >
                      <Activity className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Platform Health</span>
                    </Link>

                    <Link
                      href="/superadmin/audit"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-purple-600"
                    >
                      <FileCheck2 className="h-3.5 w-3.5 text-purple-600" />
                      <span>Global Audit Trail</span>
                    </Link>

                    <Link
                      href="/superadmin/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                    >
                      <Sliders className="h-3.5 w-3.5 text-blue-600" />
                      <span>Platform Settings</span>
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
