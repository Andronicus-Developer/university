"use client";

import React from "react";
import {
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import {
  ClassicPortalShell,
  type ClassicNavItem,
} from "@/components/portals/ClassicPortalShell";
import {
  ParentPortalProvider,
  useParentContext,
} from "@/lib/parent/useParentPortal";

const PARENT_NAV_ITEMS: ClassicNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { id: "reports", label: "Academic Results & Reports", href: "/parent/reports", icon: FileText },
  { id: "attendance", label: "Attendance & Conduct", href: "/parent/attendance", icon: UserCheck },
  { id: "billing", label: "Fees & Payment Receipts", href: "/parent/billing", icon: CreditCard },
  { id: "timetable", label: "Timetable & Schedule", href: "/parent/timetable", icon: CalendarDays },
  { id: "messages", label: "Messages & Notices", href: "/parent/messages", icon: MessageSquare },
  { id: "profile", label: "Profile & Settings", href: "/parent/profile", icon: UserCog },
];

function ParentWardSwitcher({ compact = false }: { compact?: boolean }) {
  const { wards, activeWardId, activeWard, setActiveWardId, loadingWards } =
    useParentContext();

  if (loadingWards) {
    return (
      <div className="text-[11px] text-slate-500 dark:text-slate-400 py-1">
        Loading linked wards...
      </div>
    );
  }

  if (wards.length === 0) {
    return (
      <div className="text-[11px] text-slate-500 dark:text-slate-400 py-1 flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span>No linked student/trainee</span>
      </div>
    );
  }

  const wardPlacement =
    activeWard?.class_group_name ||
    activeWard?.programme_name ||
    activeWard?.intake_name ||
    activeWard?.department_name ||
    "Enrolled";

  if (compact) {
    return (
      <div className="hidden sm:flex items-center gap-2">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Child / Ward:
        </span>
        <select
          aria-label="Switch active ward"
          value={activeWardId}
          onChange={(e) => setActiveWardId(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.full_name} ({w.student_number})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {wards.length > 1 ? `Switch Ward (${wards.length})` : "Linked Ward"}
      </label>
      <select
        aria-label="Select linked child or ward"
        value={activeWardId}
        onChange={(e) => setActiveWardId(e.target.value)}
        className="w-full px-2.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      >
        {wards.map((w) => (
          <option key={w.id} value={w.id}>
            {w.full_name} ({w.student_number})
          </option>
        ))}
      </select>
      {activeWard && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {wardPlacement} • {activeWard.relationship}
        </p>
      )}
    </div>
  );
}

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ParentPortalProvider>
      <ClassicPortalShell
        portalBadge="Parent & Guardian Portal"
        defaultUserTitle="Parent / Guardian"
        homeHref="/parent/dashboard"
        navItems={PARENT_NAV_ITEMS}
        sidebarTopSlot={<ParentWardSwitcher />}
        headerSlot={<ParentWardSwitcher compact />}
      >
        {children}
      </ClassicPortalShell>
    </ParentPortalProvider>
  );
}
