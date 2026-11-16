"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  GraduationCap,
  ShieldAlert,
  Boxes,
  FileCheck,
  Sliders,
  LogOut,
  Bell,
  Clock,
  Menu,
  X,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Activity,
  Layers,
} from "lucide-react";

interface SidebarItem {
  id: string;
  module_key: string;
  label: string;
  category: string;
  route_path: string;
  icon: string;
  badge?: string | null;
  description?: string;
  is_active: boolean;
  display_order: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  GraduationCap,
  ShieldAlert,
  Boxes,
  FileCheck,
  Sliders,
  Layers,
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const [isLoadingNav, setIsLoadingNav] = useState(true);

  const [userName, setUserName] = useState("Master Super Administrator");
  const [userEmail, setUserEmail] = useState("superadmin@university.edu.gh");
  const [currentTime, setCurrentTime] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      const dateStr = now.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      setCurrentTime(`${dateStr} • ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Super Admin User & Dynamic Sidebar Modules from Database
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || "superadmin@university.edu.gh");
          setUserName(user.user_metadata?.full_name || "Master Super Administrator");
        }
      } catch (err) {
        console.warn("Could not load auth user:", err);
      }

      try {
        const res = await fetch("/api/superadmin/sidebar-modules");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSidebarItems(data);
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic sidebar modules:", err);
      } finally {
        setIsLoadingNav(false);
      }
    }
    loadData();
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
            document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          }
        });
      }
      window.location.assign("/");
    } catch {
      window.location.assign("/");
    }
  };

  // Group sidebar items by category
  const categories = Array.from(new Set(sidebarItems.map((i) => i.category || "General")));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-200 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 bg-[#0B1120]">
        <Link href="/superadmin/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-purple-900/40 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                UMS Multi-Tenant
              </span>
            </div>
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Super Admin Console
            </span>
          </div>
        </Link>

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden h-8 w-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {isLoadingNav ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            <span className="text-xs">Loading platform modules...</span>
          </div>
        ) : (
          categories.map((cat) => {
            const items = sidebarItems.filter((i) => (i.category || "General") === cat);
            return (
              <div key={cat} className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {cat}
                </div>
                {items.map((item) => {
                  const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                  const isActive =
                    pathname === item.route_path ||
                    (item.module_key === "dashboard" && pathname === "/superadmin");

                  return (
                    <Link
                      key={item.id}
                      href={item.route_path}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-md shadow-purple-900/30"
                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive ? "text-white" : "text-slate-400 group-hover:text-purple-400"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-purple-950/80 text-purple-300 border border-purple-800/40"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })
        )}

        {/* Cross-Portal Quick Jump */}
        <div className="pt-2 border-t border-slate-800/60">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tenant Portals
          </div>
          <Link
            href="/admin/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2.5 truncate">
              <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
              <span>Campus Admin Portal</span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </Link>
          <Link
            href="/finance/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2.5 truncate">
              <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
              <span>Bursary & Finance</span>
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </Link>
        </div>
      </nav>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-800 bg-[#0B1120]">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              SA
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">{userName}</span>
              <span className="text-[10px] text-purple-400 font-mono truncate">{userEmail}</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            title="Sign Out"
            className="h-7 w-7 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            {isSigningOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans text-slate-100">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-6 bg-[#0B1120]/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Root Privilege
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-400 font-mono">
                {currentTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <Activity className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-slate-300 font-medium">Platform Health:</span>
              <span className="text-emerald-400 font-semibold">100% Operational</span>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-purple-500/30">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold text-white leading-tight">Master Authority</span>
                <span className="text-[10.5px] text-purple-400 font-medium">Global Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-900 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

