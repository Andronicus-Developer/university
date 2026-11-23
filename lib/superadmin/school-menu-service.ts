import fs from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";

export type SchoolType = "university" | "high_school" | "vocational_school";

export interface SchoolSidebarMenuItem {
  id: string;
  label: string;
  href: string;
  category: string;
  icon: string;
  badge?: string | null;
  description?: string;
  school_types: SchoolType[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string;
  page_created?: boolean;
}

const DEFAULT_SCHOOL_MENU_ITEMS: SchoolSidebarMenuItem[] = [
  // Core Administration
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin/dashboard",
    category: "Core Administration",
    icon: "LayoutGrid",
    badge: null,
    description: "Institutional overview, enrollment KPIs, and operational control center.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 1,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "students",
    label: "Students",
    href: "/admin/students",
    category: "Core Administration",
    icon: "GraduationCap",
    badge: null,
    description: "Student records, cohort directory, enrollment numbers, and academic statuses.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 2,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "teachers",
    label: "Teachers & Faculty",
    href: "/admin/teachers",
    category: "Core Administration",
    icon: "UserCheck",
    badge: null,
    description: "Faculty roster, teacher assignments, qualifications, and teaching loads.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 3,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "staff",
    label: "Staff Members",
    href: "/admin/staff",
    category: "Core Administration",
    icon: "Users",
    badge: null,
    description: "Administrative personnel, support staff, and non-teaching employment records.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 4,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "admissions",
    label: "Admissions",
    href: "/admin/admissions",
    category: "Core Administration",
    icon: "UserPlus",
    badge: "New",
    description: "Applications intake, document verification, review queues, and offer decisions.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 5,
    created_at: "2026-10-29T00:00:00.000Z",
  },

  // Academics & Schedule
  {
    id: "programs",
    label: "Programs",
    href: "/admin/programs",
    category: "Academics & Schedule",
    icon: "Award",
    badge: null,
    description: "Academic degree programs, curricula, faculties, duration, and credit requirements.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 6,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "courses",
    label: "Courses & Subjects",
    href: "/admin/courses",
    category: "Academics & Schedule",
    icon: "BookOpen",
    badge: null,
    description: "Curriculum requirements, course offerings, syllabus modules, and prerequisites.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 7,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "routine",
    label: "Class Routine",
    href: "/admin/routine",
    category: "Academics & Schedule",
    icon: "CalendarDays",
    badge: null,
    description: "Weekly timetables, period allocations, room schedules, and recurring routines.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 7,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "exams",
    label: "Examinations",
    href: "/admin/exams",
    category: "Academics & Schedule",
    icon: "FileCheck2",
    badge: null,
    description: "Assessment schedules, grading scales, mark submissions, and result publishing.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 8,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "attendance",
    label: "Attendance",
    href: "/admin/attendance",
    category: "Academics & Schedule",
    icon: "CheckSquare",
    badge: null,
    description: "Daily session registers, student presence tracking, and absence alerts.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 9,
    created_at: "2026-10-29T00:00:00.000Z",
  },

  // Finance & Accounts
  {
    id: "fees",
    label: "Fees & Invoices",
    href: "/admin/fees",
    category: "Finance & Accounts",
    icon: "CreditCard",
    badge: null,
    description: "Fee schedules, student invoice generation, payment receipts, and fee balances.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 10,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "reports",
    label: "Financial Reports",
    href: "/admin/reports",
    category: "Finance & Accounts",
    icon: "BarChart3",
    badge: null,
    description: "Revenue statements, outstanding collections, and departmental cost audit.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 11,
    created_at: "2026-10-29T00:00:00.000Z",
  },

  // Campus Services
  {
    id: "leave",
    label: "Leave Requests",
    href: "/admin/leave",
    category: "Campus Services",
    icon: "CalendarRange",
    badge: null,
    description: "Teacher and staff leave applications, approvals, and balance logs.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 12,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "notices",
    label: "Notice Board",
    href: "/admin/notices",
    category: "Campus Services",
    icon: "Megaphone",
    badge: null,
    description: "Institutional broadcasts, parent notices, circulars, and target audience delivery.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 13,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "library",
    label: "Library",
    href: "/admin/library",
    category: "Campus Services",
    icon: "BookMarked",
    badge: null,
    description: "Book catalog, lending circulation, active loans, and overdue fines.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 14,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "transport",
    label: "Transport & Fleet",
    href: "/admin/transport",
    category: "Campus Services",
    icon: "BusFront",
    badge: null,
    description: "Campus shuttle routes, vehicle fleet, driver schedules, and transport pass allocations.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 15,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "hostels",
    label: "Hostels & Housing",
    href: "/admin/hostels",
    category: "Campus Services",
    icon: "Building2",
    badge: null,
    description: "Residential halls, block rooms, bed space assignments, and maintenance logs.",
    school_types: ["university"],
    is_active: true,
    display_order: 16,
    created_at: "2026-10-29T00:00:00.000Z",
  },

  // Security & System
  {
    id: "users",
    label: "Users & RBAC",
    href: "/admin/users",
    category: "Security & System",
    icon: "ShieldCheck",
    badge: null,
    description: "Staff and teacher account provisioning, passwords, and security rights.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 17,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "audit",
    label: "Audit Logs",
    href: "/admin/audit",
    category: "Security & System",
    icon: "FileText",
    badge: null,
    description: "Immutable system activity trail, security events, and compliance history.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 18,
    created_at: "2026-10-29T00:00:00.000Z",
  },
  {
    id: "settings",
    label: "System Settings",
    href: "/admin/settings",
    category: "Security & System",
    icon: "Sliders",
    badge: null,
    description: "Institution identity, academic terms, grading scheme, and system preferences.",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 19,
    created_at: "2026-10-29T00:00:00.000Z",
  },
];

const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_MENU_FILE = path.join(LOCAL_DATA_DIR, "school-sidebar-menu.json");

/**
 * Read the current items from local file cache if present
 */
function readLocalMenuFile(): SchoolSidebarMenuItem[] | null {
  try {
    if (fs.existsSync(LOCAL_MENU_FILE)) {
      const raw = fs.readFileSync(LOCAL_MENU_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read local school sidebar menu file:", err);
  }
  return null;
}

/**
 * Persist items to local file cache
 */
function writeLocalMenuFile(items: SchoolSidebarMenuItem[]): void {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_MENU_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write local school sidebar menu file:", err);
  }
}

/**
 * Fetch all school sidebar menu items with optional filtering.
 */
export async function getSchoolSidebarMenuItems(
  filterSchoolType?: SchoolType,
  activeOnly?: boolean
): Promise<SchoolSidebarMenuItem[]> {
  let items: SchoolSidebarMenuItem[] = [];

  // 1. Try fetching from Supabase system_settings
  try {
    const supabase = createAdminClient();
    const { data } = await (supabase as any)
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "school_sidebar_menu")
      .maybeSingle();

    if (data?.setting_value && Array.isArray(data.setting_value)) {
      items = data.setting_value;
    }
  } catch {
    // Fall back to local file or defaults
  }

  // 2. If not in DB, try local cache file
  if (items.length === 0) {
    const local = readLocalMenuFile();
    if (local && local.length > 0) {
      items = local;
    }
  }

  // 3. Fallback to default catalog
  if (items.length === 0) {
    items = DEFAULT_SCHOOL_MENU_ITEMS;
    writeLocalMenuFile(items);
  }

  // Check which routes have existing pages on disk
  items = items.map((item) => {
    const routeKey = item.href.replace(/^\/admin\//, "").replace(/^\//, "").trim();
    const pagePath = path.join(process.cwd(), "app", "admin", routeKey, "page.tsx");
    return {
      ...item,
      page_created: fs.existsSync(pagePath),
    };
  });

  // Sort by display order
  items.sort((a, b) => a.display_order - b.display_order);

  // Apply filters if specified
  if (activeOnly) {
    items = items.filter((item) => item.is_active);
  }

  if (filterSchoolType) {
    items = items.filter(
      (item) =>
        Array.isArray(item.school_types) &&
        item.school_types.includes(filterSchoolType)
    );
  }

  return items;
}

function sanitizeTsxText(input?: string | null): string {
  if (!input) return "";
  return String(input)
    .replace(/[\r\n\\"'`${}<>]/g, "")
    .trim()
    .slice(0, 200);
}

/**
 * Automatically generate a page file for a new or updated sidebar menu item if not present.
 */
export async function generateSchoolAdminPage(
  item: SchoolSidebarMenuItem
): Promise<{ success: boolean; filePath: string; created: boolean; error?: string }> {
  try {
    // Sanitize route key: e.g. "/admin/workshops" -> "workshops", "/admin/ptc-meetings" -> "ptc-meetings"
    let routeKey = item.href.replace(/^\/admin\//, "").replace(/^\//, "").trim().toLowerCase();
    routeKey = routeKey.replace(/[^a-z0-9_-]/g, "").slice(0, 64);

    if (!routeKey || routeKey === "dashboard") {
      return { success: true, filePath: "", created: false };
    }

    const adminRootDir = path.resolve(process.cwd(), "app", "admin");
    const targetDir = path.resolve(adminRootDir, routeKey);
    if (!targetDir.startsWith(adminRootDir + path.sep)) {
      throw new Error("Invalid route path: directory traversal rejected.");
    }
    const targetFilePath = path.join(targetDir, "page.tsx");

    // If file already exists, do not overwrite custom code
    if (fs.existsSync(targetFilePath)) {
      return { success: true, filePath: targetFilePath, created: false };
    }

    // Create directory
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeItem: SchoolSidebarMenuItem = {
      ...item,
      label: sanitizeTsxText(item.label) || "Module",
      category: sanitizeTsxText(item.category) || "Core Administration",
      description: sanitizeTsxText(item.description),
      badge: item.badge ? sanitizeTsxText(item.badge) : null,
    };
    item = safeItem;

    const schoolTypesList = item.school_types
      .map((t) => {
        if (t === "high_school") return "High School";
        if (t === "vocational_school") return "Vocational School";
        return "University";
      })
      .join(", ");

    const rawCompName = `${routeKey
      .split(/[-_]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("")}Page`;
    const componentName = /^[A-Z]/.test(rawCompName) ? rawCompName : `Module${rawCompName}`;

    const generatedPageContent = `"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Sparkles,
  Calendar,
  Layers,
  GraduationCap,
  Building2,
  X,
  FileText,
  Activity,
} from "lucide-react";

interface RecordItem {
  id: string;
  title: string;
  code: string;
  category: string;
  status: "active" | "in_review" | "completed" | "scheduled";
  assigned_to: string;
  created_at: string;
  notes?: string;
}

export default function ${componentName}() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // New Record State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("${item.category}");
  const [newAssigned, setNewAssigned] = useState("Faculty Lead");
  const [newNotes, setNewNotes] = useState("");

  const [records, setRecords] = useState<RecordItem[]>([
    {
      id: "rec-1",
      title: "${item.label} General Intake",
      code: "${routeKey.toUpperCase().slice(0, 3)}-001",
      category: "${item.category}",
      status: "active",
      assigned_to: "Admin Supervisor",
      created_at: "2026-11-15",
      notes: "Primary operational register for ${item.label}.",
    },
    {
      id: "rec-2",
      title: "${item.label} Term Review",
      code: "${routeKey.toUpperCase().slice(0, 3)}-002",
      category: "${item.category}",
      status: "in_review",
      assigned_to: "Academic Coordinator",
      created_at: "2026-11-18",
      notes: "Pending term compliance sign-off.",
    },
    {
      id: "rec-3",
      title: "${item.label} Archive Batch",
      code: "${routeKey.toUpperCase().slice(0, 3)}-003",
      category: "${item.category}",
      status: "completed",
      assigned_to: "Registry Desk",
      created_at: "2026-11-10",
      notes: "Archived successfully.",
    },
  ]);

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newRec: RecordItem = {
      id: \`rec-\${Date.now()}\`,
      title: newTitle.trim(),
      code: \`${routeKey.toUpperCase().slice(0, 3)}-\${String(records.length + 1).padStart(3, "0")}\`,
      category: newCategory,
      status: "active",
      assigned_to: newAssigned,
      created_at: new Date().toISOString().split("T")[0],
      notes: newNotes,
    };

    setRecords([newRec, ...records]);
    setNewTitle("");
    setNewNotes("");
    setShowModal(false);
    setSuccessMsg(\`Successfully registered \${newRec.title}!\`);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const filteredRecords = records.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.assigned_to.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* 1. Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
              Admin Portal
            </Link>
            <span className="text-slate-300">/</span>
            <span>${item.category}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">${item.label}</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              ${item.label}
            </h1>
            ${item.badge ? `<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              ${item.badge}
            </span>` : ""}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Scope: ${schoolTypesList}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            ${item.description || `Manage and govern ${item.label.toLowerCase()} entries, workflow authorizations, and operational reports.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Entry</span>
          </button>
        </div>
      </div>

      {/* 2. Success Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 3. Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Records</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{records.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Configured in registry</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Units</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">
            {records.filter((r) => r.status === "active").length}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">Operational & live</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">In Review</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-2">
            {records.filter((r) => r.status === "in_review").length}
          </div>
          <div className="text-[11px] text-amber-600 mt-1">Awaiting approval</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-2">
            {records.filter((r) => r.status === "completed").length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Closed successfully</div>
        </div>
      </div>

      {/* 4. Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search entries, codes, coordinators..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="in_review">In Review</option>
            <option value="completed">Completed</option>
          </select>

          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filteredRecords.length}</strong> of {records.length}
          </span>
        </div>
      </div>

      {/* 5. Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Item & Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Coordinator</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No entries found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{rec.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.code}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{rec.category}</td>
                    <td className="py-3.5 px-4 text-slate-600">{rec.assigned_to}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{rec.created_at}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={\`px-2 py-0.5 rounded-full text-[10px] font-semibold border \${
                          rec.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : rec.status === "in_review"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }\`}
                      >
                        {rec.status.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => alert(\`Viewing details for \${rec.title}\`)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Modal: Add New Entry */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Entry to ${item.label}</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Record Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Workshop Session Alpha"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Assigned Lead</label>
                  <input
                    type="text"
                    value={newAssigned}
                    onChange={(e) => setNewAssigned(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Operational Notes</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Additional specifications or context..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`;

    fs.writeFileSync(targetFilePath, generatedPageContent, "utf-8");
    return { success: true, filePath: targetFilePath, created: true };
  } catch (err: any) {
    console.error("Error auto-generating school admin page:", err);
    return { success: false, filePath: "", created: false, error: err.message };
  }
}

/**
 * Save or update a school sidebar menu item. Automatically creates the page on disk.
 */
export async function saveSchoolSidebarMenuItem(
  payload: Partial<SchoolSidebarMenuItem>
): Promise<{ item: SchoolSidebarMenuItem; pageCreated: boolean }> {
  const currentItems = await getSchoolSidebarMenuItems();
  const now = new Date().toISOString();

  let targetId = payload.id;
  if (!targetId) {
    targetId = (payload.label || "menu-item")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
  }

  // Normalize href: e.g. "workshops" -> "/admin/workshops"
  let href = (payload.href || `/admin/${targetId}`).trim();
  if (!href.startsWith("/admin/")) {
    href = `/admin/${href.replace(/^\//, "")}`;
  }

  const existingIdx = currentItems.findIndex(
    (i) => i.id === targetId || i.href.toLowerCase() === href.toLowerCase()
  );

  let finalItem: SchoolSidebarMenuItem;

  if (existingIdx >= 0) {
    const existing = currentItems[existingIdx];
    finalItem = {
      ...existing,
      ...payload,
      id: existing.id,
      label: payload.label?.trim() || existing.label,
      href,
      category: payload.category?.trim() || existing.category,
      icon: payload.icon || existing.icon,
      badge: payload.badge !== undefined ? payload.badge : existing.badge,
      description: payload.description !== undefined ? payload.description : existing.description,
      school_types:
        Array.isArray(payload.school_types)
          ? payload.school_types
          : existing.school_types,
      is_active: payload.is_active !== undefined ? payload.is_active : existing.is_active,
      display_order:
        payload.display_order !== undefined ? Number(payload.display_order) : existing.display_order,
      updated_at: now,
    };
    currentItems[existingIdx] = finalItem;
  } else {
    finalItem = {
      id: targetId,
      label: payload.label?.trim() || "New Module",
      href,
      category: payload.category?.trim() || "Academics & Schedule",
      icon: payload.icon || "BookOpen",
      badge: payload.badge || null,
      description: payload.description || "",
      school_types:
        Array.isArray(payload.school_types)
          ? payload.school_types
          : ["university", "high_school", "vocational_school"],
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      display_order: payload.display_order ? Number(payload.display_order) : currentItems.length + 1,
      created_at: now,
      updated_at: now,
    };
    currentItems.push(finalItem);
  }

  // 1. Automatically generate the page on disk!
  const pageResult = await generateSchoolAdminPage(finalItem);
  finalItem.page_created = pageResult.created || fs.existsSync(pageResult.filePath);

  // 2. Persist in local file cache
  writeLocalMenuFile(currentItems);

  // 3. Persist in Supabase system_settings
  try {
    const supabase = createAdminClient();
    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "school_sidebar_menu",
        setting_value: currentItems,
        category: "navigation",
        description: "Configurable School Admin Portal sidebar menu items and school type allocations",
        is_sensitive: false,
        updated_at: now,
      },
      { onConflict: "setting_key" }
    );
  } catch (dbErr) {
    console.warn("Could not upsert school_sidebar_menu to system_settings:", dbErr);
  }

  return { item: finalItem, pageCreated: pageResult.created };
}

/**
 * Delete a school sidebar menu item.
 */
export async function deleteSchoolSidebarMenuItem(id: string): Promise<boolean> {
  const currentItems = await getSchoolSidebarMenuItems();
  const now = new Date().toISOString();

  const filtered = currentItems.filter((i) => i.id !== id);
  if (filtered.length === currentItems.length) {
    return false;
  }

  // 1. Write local file
  writeLocalMenuFile(filtered);

  // 2. Write Supabase system_settings
  try {
    const supabase = createAdminClient();
    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "school_sidebar_menu",
        setting_value: filtered,
        category: "navigation",
        description: "Configurable School Admin Portal sidebar menu items and school type allocations",
        is_sensitive: false,
        updated_at: now,
      },
      { onConflict: "setting_key" }
    );
  } catch (dbErr) {
    console.warn("Could not update school_sidebar_menu in system_settings:", dbErr);
  }

  return true;
}

/**
 * Toggle on/off a school sidebar menu item.
 */
export async function toggleSchoolSidebarMenuItem(
  id: string,
  is_active: boolean
): Promise<SchoolSidebarMenuItem> {
  const currentItems = await getSchoolSidebarMenuItems();
  const index = currentItems.findIndex((i) => i.id === id);
  if (index === -1) {
    throw new Error(`Menu item with ID '${id}' not found.`);
  }

  currentItems[index].is_active = is_active;
  currentItems[index].updated_at = new Date().toISOString();

  // Write local file
  writeLocalMenuFile(currentItems);

  // Write Supabase
  try {
    const supabase = createAdminClient();
    await (supabase as any).from("system_settings").upsert(
      {
        setting_key: "school_sidebar_menu",
        setting_value: currentItems,
        category: "navigation",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    );
  } catch {}

  return currentItems[index];
}
