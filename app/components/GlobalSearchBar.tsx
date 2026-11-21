"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  category: string;
  badge?: string;
  keywords?: string;
}

interface GlobalSearchBarProps {
  portal: "superadmin" | "admin" | "finance" | "lecturer" | "student";
  placeholder?: string;
}

const PORTAL_CATALOGS: Record<string, SearchResultItem[]> = {
  superadmin: [
    {
      id: "sa-dashboard",
      title: "System Overview & Dashboard",
      subtitle: "Global KPIs, active schools, tenant metrics, and platform status",
      href: "/superadmin/dashboard",
      category: "Core Administration",
      badge: "Live",
      keywords: "home overview dashboard metrics stats kpi",
    },
    {
      id: "sa-schools",
      title: "Schools & Campuses",
      subtitle: "Register, edit, restrict, or delete universities, high schools, and vocational schools",
      href: "/superadmin/universities",
      category: "Core Administration",
      badge: "Tenants",
      keywords: "universities schools high school vocational school campus register tenant institution",
    },
    {
      id: "sa-settings-menu",
      title: "Schools Sidebar Menu & Modules",
      subtitle: "Add, edit, delete, and toggle school sidebar menu items per school type with auto-page creation",
      href: "/superadmin/settings",
      category: "System Settings",
      badge: "Dynamic Menu",
      keywords: "settings sidebar menu modules navigation toggle high school vocational university auto page",
    },
    {
      id: "sa-admins",
      title: "System Administrators",
      subtitle: "Manage institutional system admin accounts and access rights",
      href: "/superadmin/system-admins",
      category: "Core Administration",
      badge: "Admins",
      keywords: "system admins administrators accounts credentials",
    },
    {
      id: "sa-users",
      title: "Users & Global Directory",
      subtitle: "Cross-tenant user profiles, roles, and MFA status",
      href: "/superadmin/users",
      category: "Core Administration",
      keywords: "users directory profiles accounts students staff",
    },
    {
      id: "sa-roles",
      title: "Roles & Permissions Matrix",
      subtitle: "RBAC configuration, role hierarchies, and access policies",
      href: "/superadmin/roles",
      category: "Core Administration",
      keywords: "roles permissions rbac access control security",
    },
    {
      id: "sa-scopes",
      title: "Department & Campus Scopes",
      subtitle: "Multi-campus boundaries, faculties, and departmental isolation",
      href: "/superadmin/scopes",
      category: "Core Administration",
      keywords: "scopes departments faculties campus boundaries",
    },
    {
      id: "sa-academics",
      title: "Academic Configuration",
      subtitle: "Grading scales, academic years, and credit frameworks",
      href: "/superadmin/academics",
      category: "Platform Configuration",
      keywords: "academics grading gpa semester term configuration",
    },
    {
      id: "sa-payments",
      title: "Payment Provider Settings",
      subtitle: "Paystack, Flutterwave, bank integrations, and settlement accounts",
      href: "/superadmin/payments",
      category: "Platform Configuration",
      keywords: "payments billing paystack bank finance gateway",
    },
    {
      id: "sa-communications",
      title: "Communications & Email Dispatch",
      subtitle: "Compose emails to schools/admins and search previous communications log",
      href: "/superadmin/communications",
      category: "Core Administration",
      badge: "Mail",
      keywords: "communications email compose gmail messages inbox sent broadcasts",
    },
    {
      id: "sa-templates",
      title: "Document Templates",
      subtitle: "Admission letters, transcripts, receipts, and certificate templates",
      href: "/superadmin/templates",
      category: "Platform Configuration",
      keywords: "templates documents letters transcripts certificates pdf",
    },
    {
      id: "sa-storage",
      title: "Storage & File Policies",
      subtitle: "Cloud buckets, upload quotas, and MIME restrictions",
      href: "/superadmin/storage",
      category: "Platform Configuration",
      keywords: "storage files buckets cloud uploads quotas",
    },
    {
      id: "sa-integrations",
      title: "Integrations & APIs",
      subtitle: "Webhooks, external ERP connectors, and API keys",
      href: "/superadmin/integrations",
      category: "Platform Configuration",
      keywords: "integrations api webhooks keys connectors",
    },
    {
      id: "sa-audit",
      title: "Audit Logs",
      subtitle: "Immutable trail of administrative actions and data mutations",
      href: "/superadmin/audit",
      category: "Security & Operations",
      keywords: "audit logs history events tracking compliance",
    },
    {
      id: "sa-security",
      title: "Security Events",
      subtitle: "Failed logins, brute-force blocks, and anomaly alerts",
      href: "/superadmin/security-events",
      category: "Security & Operations",
      keywords: "security events alerts logins firewall threats",
    },
    {
      id: "sa-jobs",
      title: "Background Jobs",
      subtitle: "Async task queues, batch grading, and scheduled workers",
      href: "/superadmin/jobs",
      category: "Security & Operations",
      badge: "Queue",
      keywords: "background jobs queues workers cron tasks",
    },
    {
      id: "sa-health",
      title: "Monitoring & Health",
      subtitle: "Database latency, uptime metrics, and service health checks",
      href: "/superadmin/health",
      category: "Security & Operations",
      badge: "99.9%",
      keywords: "monitoring health uptime latency status server",
    },
    {
      id: "sa-backups",
      title: "Backup & Recovery Status",
      subtitle: "Automated snapshots, point-in-time recovery, and archives",
      href: "/superadmin/backups",
      category: "Security & Operations",
      keywords: "backups recovery snapshots database restore",
    },
    {
      id: "sa-modules",
      title: "Feature Flags & Modules",
      subtitle: "Global feature toggles and tier entitlements",
      href: "/superadmin/modules",
      category: "Security & Operations",
      keywords: "feature flags modules toggles tiers",
    },
  ],
  admin: [
    {
      id: "adm-dashboard",
      title: "Dashboard",
      subtitle: "Institutional overview, enrollment KPIs, and control center",
      href: "/admin/dashboard",
      category: "Core Administration",
      keywords: "home dashboard overview analytics stats",
    },
    {
      id: "adm-students",
      title: "Students Directory",
      subtitle: "Student records, cohort directory, enrollment numbers, and academic statuses",
      href: "/admin/students",
      category: "Core Administration",
      keywords: "students learners enrollment cohort directory register",
    },
    {
      id: "adm-teachers",
      title: "Teachers & Faculty",
      subtitle: "Faculty roster, teacher assignments, qualifications, and teaching loads",
      href: "/admin/teachers",
      category: "Core Administration",
      keywords: "teachers faculty lecturers instructors professors",
    },
    {
      id: "adm-staff",
      title: "Staff Members",
      subtitle: "Administrative personnel, support staff, and employment records",
      href: "/admin/staff",
      category: "Core Administration",
      keywords: "staff employees hr personnel workers",
    },
    {
      id: "adm-admissions",
      title: "Admissions",
      subtitle: "Applications intake, document verification, and offer decisions",
      href: "/admin/admissions",
      category: "Core Administration",
      badge: "New",
      keywords: "admissions applicants applications intake offers",
    },
    {
      id: "adm-courses",
      title: "Courses & Subjects",
      subtitle: "Curriculum requirements, course offerings, and syllabus modules",
      href: "/admin/courses",
      category: "Academics & Schedule",
      keywords: "courses subjects curriculum units syllabus",
    },
    {
      id: "adm-classes",
      title: "Classes & Sections",
      subtitle: "Class groupings, streams, lecture halls, and capacity allocations",
      href: "/admin/classes",
      category: "Academics & Schedule",
      keywords: "classes sections streams groups rooms",
    },
    {
      id: "adm-timetable",
      title: "Timetable & Schedule",
      subtitle: "Master class schedules, room bookings, and period slots",
      href: "/admin/timetable",
      category: "Academics & Schedule",
      keywords: "timetable schedule calendar periods slots",
    },
    {
      id: "adm-attendance",
      title: "Attendance Register",
      subtitle: "Daily student and staff attendance tracking and absence alerts",
      href: "/admin/attendance",
      category: "Academics & Schedule",
      keywords: "attendance register presence absence rollcall",
    },
    {
      id: "adm-examinations",
      title: "Examinations & Grades",
      subtitle: "Exam scheduling, marks entry, gradebooks, and transcripts",
      href: "/admin/examinations",
      category: "Academics & Schedule",
      keywords: "examinations exams grades results transcripts marks",
    },
    {
      id: "adm-departments",
      title: "Departments & Faculties",
      subtitle: "Academic departments, faculties, heads of department, and units",
      href: "/admin/departments",
      category: "Academics & Schedule",
      keywords: "departments faculties schools divisions hod",
    },
    {
      id: "adm-fees",
      title: "Fees & Financial Collections",
      subtitle: "Tuition fee structures, invoices, receipts, and balances",
      href: "/admin/fees",
      category: "Operations & Student Life",
      keywords: "fees finance tuition invoices payments receipts bursary",
    },
    {
      id: "adm-library",
      title: "Library & Digital Catalog",
      subtitle: "Book inventory, lending circulation, e-resources, and overdue tracking",
      href: "/admin/library",
      category: "Operations & Student Life",
      keywords: "library books catalog borrowing lending",
    },
    {
      id: "adm-hostels",
      title: "Hostels & Accommodation",
      subtitle: "Student halls of residence, room allocations, and bed occupancy",
      href: "/admin/hostels",
      category: "Operations & Student Life",
      keywords: "hostels accommodation rooms halls housing boarding",
    },
    {
      id: "adm-transport",
      title: "Transport & Fleet",
      subtitle: "School buses, route mapping, driver rosters, and student passes",
      href: "/admin/transport",
      category: "Operations & Student Life",
      keywords: "transport buses fleet routes drivers",
    },
    {
      id: "adm-events",
      title: "Events & Academic Calendar",
      subtitle: "Institutional events, holidays, convocations, and term dates",
      href: "/admin/events",
      category: "Operations & Student Life",
      keywords: "events calendar holidays activities sports",
    },
    {
      id: "adm-notices",
      title: "Notices & Announcements",
      subtitle: "Campus-wide broadcasts, circulars, SMS alerts, and bulletins",
      href: "/admin/notices",
      category: "Operations & Student Life",
      keywords: "notices announcements news circulars broadcasts",
    },
    {
      id: "adm-reports",
      title: "Reports & Analytics",
      subtitle: "Custom institutional reports, enrollment trends, and exports",
      href: "/admin/reports",
      category: "Institutional Settings",
      keywords: "reports analytics charts exports statistics",
    },
    {
      id: "adm-settings",
      title: "Institution Settings",
      subtitle: "School branding, academic year setup, security policies, and preferences",
      href: "/admin/settings",
      category: "Institutional Settings",
      keywords: "settings configuration branding logo profile",
    },
  ],
  finance: [
    {
      id: "fin-dashboard",
      title: "Finance Overview",
      subtitle: "Revenue collections, outstanding receivables, and daily cashflow",
      href: "/finance/dashboard",
      category: "Finance & Bursary",
      keywords: "finance dashboard overview revenue collections",
    },
    {
      id: "fin-invoices",
      title: "Student Invoices & Billing",
      subtitle: "Batch fee invoicing, tariff schedules, and ledger adjustments",
      href: "/finance/invoices",
      category: "Finance & Bursary",
      keywords: "invoices billing fees statements",
    },
    {
      id: "fin-payments",
      title: "Payments & Receipts",
      subtitle: "Payment verification, receipts issuance, and bank reconciliation",
      href: "/finance/payments",
      category: "Finance & Bursary",
      keywords: "payments receipts transactions reconciliation",
    },
    {
      id: "fin-approvals",
      title: "Dual-Control Approvals",
      subtitle: "Fee waivers, refunds, and high-value voucher authorizations",
      href: "/finance/approvals",
      category: "Finance & Bursary",
      keywords: "approvals waivers refunds vouchers authorization",
    },
    {
      id: "fin-reports",
      title: "Financial Reports & Ledger",
      subtitle: "Trial balance, aging debtors, and audit exports",
      href: "/finance/reports",
      category: "Finance & Bursary",
      keywords: "financial reports ledger audit debtors",
    },
  ],
  lecturer: [
    {
      id: "lec-dashboard",
      title: "Lecturer Portal Dashboard",
      subtitle: "Assigned courses, teaching schedule, and grading tasks",
      href: "/lecturer/dashboard",
      category: "Academic Portal",
      keywords: "lecturer dashboard courses schedule grading",
    },
  ],
  student: [
    {
      id: "stu-dashboard",
      title: "Student Portal Dashboard",
      subtitle: "Course registration, timetable, results, and fee statements",
      href: "/student/dashboard",
      category: "Student Portal",
      keywords: "student dashboard courses results fees timetable",
    },
  ],
};

export default function GlobalSearchBar({ portal, placeholder }: GlobalSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dynamicItems, setDynamicItems] = useState<SearchResultItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load dynamic searchable entities (e.g. dynamic school sidebar modules & registered schools)
  useEffect(() => {
    async function loadDynamicSearchData() {
      const extra: SearchResultItem[] = [];
      try {
        if (portal === "superadmin" || portal === "admin") {
          const menuRes = await fetch("/api/superadmin/school-sidebar-menu");
          if (menuRes.ok) {
            const menuData = await menuRes.json();
            if (Array.isArray(menuData)) {
              for (const m of menuData) {
                const schoolTypesLabel = Array.isArray(m.school_types)
                  ? m.school_types.map((t: string) => t.replace("_", " ")).join(", ")
                  : "";
                if (portal === "admin") {
                  extra.push({
                    id: `dyn-mod-${m.id}`,
                    title: m.label,
                    subtitle: m.description || `School Module (${m.href})`,
                    href: m.href,
                    category: m.category || "School Modules",
                    badge: m.badge || undefined,
                    keywords: `${m.label} ${m.href} ${m.category} ${schoolTypesLabel}`,
                  });
                } else {
                  extra.push({
                    id: `sa-mod-${m.id}`,
                    title: `Module: ${m.label}`,
                    subtitle: `${m.href} • Assigned to: ${schoolTypesLabel || "None"}`,
                    href: `/superadmin/settings?search=${encodeURIComponent(m.label)}`,
                    category: "School Sidebar Modules",
                    badge: m.is_active ? "Active" : "Disabled",
                    keywords: `${m.label} ${m.href} ${m.category} ${schoolTypesLabel}`,
                  });
                }
              }
            }
          }
        }

        if (portal === "superadmin") {
          const schoolsRes = await fetch("/api/superadmin/universities");
          if (schoolsRes.ok) {
            const schoolsData = await schoolsRes.json();
            const list = Array.isArray(schoolsData) ? schoolsData : schoolsData?.universities || [];
            for (const s of list) {
              const typeBadge =
                s.school_type === "high_school"
                  ? "High School"
                  : s.school_type === "vocational_school"
                  ? "Vocational"
                  : "University";
              extra.push({
                id: `school-${s.id}`,
                title: s.name,
                subtitle: `${s.code || ""} • ${s.city || "Ghana"} (${typeBadge})`,
                href: `/superadmin/universities?search=${encodeURIComponent(s.name)}`,
                category: "Registered Schools",
                badge: typeBadge,
                keywords: `${s.name} ${s.code} ${s.short_name || ""} ${s.city || ""} ${typeBadge}`,
              });
            }
          }
        }
      } catch {
        // Ignore network errors in search prefetch
      }
      setDynamicItems(extra);
    }

    loadDynamicSearchData();
  }, [portal]);

  // Combine static catalog + dynamic items, deduplicating by href+title
  const allSearchItems = useMemo(() => {
    const base = PORTAL_CATALOGS[portal] || PORTAL_CATALOGS.admin;
    const seen = new Set<string>();
    const combined: SearchResultItem[] = [];

    for (const item of [...base, ...dynamicItems]) {
      const key = `${item.title.toLowerCase()}::${item.href.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }
    return combined;
  }, [portal, dynamicItems]);

  // Filter results based on query
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return allSearchItems.slice(0, 8);
    }

    return allSearchItems
      .filter((item) => {
        const haystack = `${item.title} ${item.subtitle} ${item.category} ${item.href} ${item.keywords || ""} ${item.badge || ""}`.toLowerCase();
        const terms = q.split(/\s+/);
        return terms.every((t) => haystack.includes(t));
      })
      .slice(0, 12);
  }, [query, allSearchItems]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length, query]);

  // Broadcast search query to current active page so local tables also filter live!
  const handleInputChange = (val: string) => {
    setQuery(val);
    setIsOpen(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("global_search_query", { detail: { query: val } })
      );
    }
  };

  // Global keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    // Extract search query param if present
    if (item.href.includes("?search=")) {
      const [basePath, paramStr] = item.href.split("?");
      const params = new URLSearchParams(paramStr);
      const sVal = params.get("search") || "";
      if (pathname === basePath) {
        setQuery(sVal);
        window.dispatchEvent(
          new CustomEvent("global_search_query", { detail: { query: sVal } })
        );
        return;
      }
    }
    router.push(item.href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex((prev) =>
        filteredResults.length > 0 ? (prev + 1) % filteredResults.length : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex((prev) =>
        filteredResults.length > 0
          ? (prev - 1 + filteredResults.length) % filteredResults.length
          : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && filteredResults[selectedIndex]) {
        handleSelectResult(filteredResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={
            placeholder || "Search schools, modules, students, settings..."
          }
          className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition-all shadow-2xs"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              handleInputChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded pointer-events-none">
            ⌘K
          </span>
        )}
      </div>

      {/* Floating Command Palette Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-full sm:w-[480px] md:w-[540px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header status bar */}
          <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              {query.trim()
                ? `Search results for "${query}" (${filteredResults.length})`
                : "Quick Navigation & Search"}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Use ↑↓ arrows, Enter to go
            </span>
          </div>

          {/* Results list */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {filteredResults.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Search className="h-6 w-6 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-700">
                  No modules or records match "{query}"
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Try searching by module name, route path, school name, or category.
                </p>
              </div>
            ) : (
              filteredResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelectResult(item)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50/80" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? "text-blue-700" : "text-slate-900"
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 shrink-0">
                            {item.badge}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-100 shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                        {item.href.split("?")[0]}
                      </span>
                      <ArrowRight
                        className={`h-3.5 w-3.5 ${
                          isSelected ? "text-blue-600" : "text-slate-300"
                        }`}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Tip: Typing also filters tables on the current page</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
            >
              Close (Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
