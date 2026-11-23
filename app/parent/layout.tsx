"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signOutUser } from "@/lib/auth/signout";
import {
  LayoutGrid,
  FileCheck2,
  CalendarDays,
  CreditCard,
  MessageSquare,
  Users,
  School,
  Hammer,
  Clock,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserCheck,
  Award,
  Sparkles,
} from "lucide-react";

interface ParentLayoutProps {
  children: React.ReactNode;
}

export default function ParentLayout({ children }: ParentLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Parent & Ward State
  const [parentName, setParentName] = useState<string>("Mr. Kwame Mensah");
  const [parentEmail, setUserEmail] = useState<string>("parent@schoolcloud.edu.gh");
  const [activeWardType, setActiveWardType] = useState<"high_school" | "vocational_school">("high_school");
  const [schoolName, setSchoolName] = useState<string>("Institution Portal");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Live ticking date/time
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
      setCurrentTime(`${day} ${month} ${year} • ${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync ward view changes across child components
  useEffect(() => {
    const handleWardSwitch = (e: any) => {
      if (e.detail?.wardType) {
        setActiveWardType(e.detail.wardType);
        if (e.detail.wardType === "vocational_school") {
          setSchoolName("Vocational Institute");
        } else {
          setSchoolName("Senior High School");
        }
      }
    };
    window.addEventListener("switch_parent_ward_view", handleWardSwitch);
    return () => window.removeEventListener("switch_parent_ward_view", handleWardSwitch);
  }, []);

  const handleToggleWard = (type: "high_school" | "vocational_school") => {
    setActiveWardType(type);
    setSchoolName(type === "vocational_school" ? "Vocational Institute" : "Senior High School");
    window.dispatchEvent(new CustomEvent("switch_parent_ward_view", { detail: { wardType: type } }));
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
    } finally {
      window.location.assign("/");
    }
  };

  const navItems = [
    {
      id: "dashboard",
      label: "Ward Overview",
      href: "/parent/dashboard",
      icon: LayoutGrid,
      badge: null,
    },
    {
      id: "reports",
      label: activeWardType === "vocational_school" ? "Trade Competency Certs" : "Academic Report Cards",
      href: "/parent/reports",
      icon: FileCheck2,
      badge: activeWardType === "vocational_school" ? "NVTI" : "WASSCE",
    },
    {
      id: "attendance",
      label: "Attendance & Conduct",
      href: "/parent/attendance",
      icon: UserCheck,
      badge: "98.2%",
    },
    {
      id: "billing",
      label: "Fees & Payment Receipts",
      href: "/parent/billing",
      icon: CreditCard,
      badge: "Cleared",
    },
    {
      id: "messages",
      label: "Teacher Inquiries & PTA",
      href: "/parent/messages",
      icon: MessageSquare,
      badge: "2",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50/60 overflow-hidden text-slate-800 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200/90 shrink-0 z-30 select-none">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 bg-white">
          <Link href="/parent/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 ${
              activeWardType === "vocational_school"
                ? "bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-700 shadow-amber-500/20"
                : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-700 shadow-blue-500/20"
            }`}>
              <Users className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 tracking-tight truncate leading-tight">
                Parent & Guardian Portal
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                {schoolName}
              </span>
            </div>
          </Link>
        </div>

        {/* Multi-Ward Switcher Pill in Sidebar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Enrolled Ward</span>
            <Sparkles className="h-3 w-3 text-indigo-500" />
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleToggleWard("high_school")}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                activeWardType === "high_school"
                  ? "bg-white border-blue-300 text-blue-900 shadow-xs font-bold"
                  : "bg-transparent border-transparent text-slate-600 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">Kofi Mensah</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                  High School
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Form 2 Science • Achimota SHS</div>
            </button>

            <button
              type="button"
              onClick={() => handleToggleWard("vocational_school")}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                activeWardType === "vocational_school"
                  ? "bg-white border-amber-300 text-amber-900 shadow-xs font-bold"
                  : "bg-transparent border-transparent text-slate-600 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">Ama Serwaa</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                  Vocational
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">NVTI Electrical • Vocational Department</div>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-2 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
            Family Services
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
                    ? activeWardType === "vocational_school"
                      ? "bg-amber-50 text-amber-900 font-bold border border-amber-200/80 shadow-2xs"
                      : "bg-blue-50 text-blue-900 font-bold border border-blue-200/80 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${
                    isActive
                      ? activeWardType === "vocational_school" ? "text-amber-600" : "text-blue-600"
                      : "text-slate-400"
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

        {/* User Card */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-indigo-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {parentName.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">{parentName}</span>
                <span className="text-[10px] text-slate-500 truncate">Parent / Sponsor</span>
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

            {/* Ward Indicator Badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                activeWardType === "vocational_school"
                  ? "bg-amber-100/90 text-amber-900 border border-amber-300"
                  : "bg-blue-100/90 text-blue-900 border border-blue-300"
              }`}>
                {activeWardType === "vocational_school" ? (
                  <>
                    <Hammer className="h-3.5 w-3.5 text-amber-700" />
                    <span>Ward: Ama Serwaa (Vocational Apprentice)</span>
                  </>
                ) : (
                  <>
                    <School className="h-3.5 w-3.5 text-blue-700" />
                    <span>Ward: Kofi Mensah (Senior High Student)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200/70 px-3 py-1.5 rounded-xl font-medium">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{currentTime}</span>
            </div>

            <Link
              href="/parent/messages"
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              title="Teacher Inquiries"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-950 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {parentName.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-none">{parentName}</span>
                <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                  Guardian
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85%] bg-white h-full shadow-2xl z-10 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 truncate">Parent Portal</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Select Ward</div>
              <button
                type="button"
                onClick={() => {
                  handleToggleWard("high_school");
                  setMobileOpen(false);
                }}
                className={`w-full p-2 rounded-xl text-left text-xs font-bold ${
                  activeWardType === "high_school" ? "bg-blue-50 text-blue-900 border border-blue-200" : "text-slate-600"
                }`}
              >
                Kofi Mensah (High School)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleWard("vocational_school");
                  setMobileOpen(false);
                }}
                className={`w-full p-2 rounded-xl text-left text-xs font-bold ${
                  activeWardType === "vocational_school" ? "bg-amber-50 text-amber-900 border border-amber-200" : "text-slate-600"
                }`}
              >
                Ama Serwaa (Vocational)
              </button>
            </div>

            <nav className="flex-1 space-y-1 mt-2">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-900 font-bold"
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
