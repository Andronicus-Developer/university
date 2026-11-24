"use client";

import React from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import {
  ClassicPortalShell,
  type ClassicNavItem,
} from "@/components/portals/ClassicPortalShell";

const REGISTRAR_NAV_ITEMS: ClassicNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/registrar/dashboard", icon: LayoutDashboard },
  {
    id: "admissions",
    label: "Admissions & Enrollment",
    href: "/registrar/admissions",
    icon: UserCheck,
  },
  { id: "students", label: "Records & Directory", href: "/registrar/students", icon: Users },
  {
    id: "registrations",
    label: "Course & Module Reg.",
    href: "/registrar/registrations",
    icon: BookOpen,
  },
  {
    id: "calendar",
    label: "Academic Calendar",
    href: "/registrar/calendar",
    icon: CalendarDays,
  },
  {
    id: "transcripts",
    label: "Transcripts & Certificates",
    href: "/registrar/transcripts",
    icon: Award,
  },
  {
    id: "clearance",
    label: "Clearance & Graduation",
    href: "/registrar/clearance",
    icon: CheckSquare,
  },
  { id: "profile", label: "Profile & Settings", href: "/registrar/profile", icon: UserCog },
];

export default function RegistrarLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClassicPortalShell
      portalBadge="Registrar Portal"
      defaultUserTitle="Academic Registrar"
      homeHref="/registrar/dashboard"
      navItems={REGISTRAR_NAV_ITEMS}
    >
      {children}
    </ClassicPortalShell>
  );
}
