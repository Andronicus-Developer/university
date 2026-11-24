"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sliders,
  Check,
  ShieldAlert,
  Lock,
  Globe,
  Bell,
  Database,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  ExternalLink,
  RefreshCw,
  Sparkles,
  BookOpen,
  GraduationCap,
  Users,
  UserCheck,
  CalendarDays,
  FileCheck2,
  CheckSquare,
  CreditCard,
  CalendarRange,
  Megaphone,
  BookMarked,
  BusFront,
  Building2,
  ShieldCheck,
  FileText,
  BarChart3,
  UserPlus,
  Wrench,
  Layers,
  Briefcase,
  Boxes,
  Clock,
  Activity,
  Folder,
  X,
  Eye,
  EyeOff,
  LayoutGrid,
  Info,
  ChevronRight,
  ArrowUpDown,
  School,
  Hammer,
} from "lucide-react";
import type { SchoolSidebarMenuItem, SchoolType } from "@/lib/superadmin/school-menu-service";
import { LandingPageEditor } from "@/components/superadmin/LandingPageEditor";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutGrid,
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  CalendarDays,
  FileCheck2,
  CheckSquare,
  CreditCard,
  CalendarRange,
  Megaphone,
  BookMarked,
  BusFront,
  Building2,
  Sliders,
  ShieldCheck,
  FileText,
  BarChart3,
  UserPlus,
  Wrench,
  Layers,
  Briefcase,
  Boxes,
  Clock,
  Activity,
  Database,
  Sparkles,
  Folder,
  School,
  Hammer,
};

const CATEGORY_OPTIONS = [
  "Core Administration",
  "Academics & Schedule",
  "Operations & Student Life",
  "Institutional Settings",
  "Vocational & Practical Training",
  "Specialized Modules",
];

export default function PlatformSettingsPage() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"menu" | "platform" | "landing">("menu");

  // School Menu Items State
  const [menuItems, setMenuItems] = useState<SchoolSidebarMenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchoolTypeFilter, setSelectedSchoolTypeFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SchoolSidebarMenuItem | null>(null);
  const [formData, setFormData] = useState<{
    label: string;
    href: string;
    category: string;
    icon: string;
    badge: string;
    description: string;
    school_types: SchoolType[];
    is_active: boolean;
    display_order: number;
  }>({
    label: "",
    href: "",
    category: "Academics & Schedule",
    icon: "BookOpen",
    badge: "",
    description: "",
    school_types: ["university", "high_school", "vocational_school"],
    is_active: true,
    display_order: 10,
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageCreatedBanner, setPageCreatedBanner] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingItem, setDeletingItem] = useState<SchoolSidebarMenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Platform maintenance states
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState("8");
  const [enforceMfaForAdmins, setEnforceMfaForAdmins] = useState(true);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  const [platformNotice, setPlatformNotice] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fetch school sidebar menu items
  const fetchMenuItems = async () => {
    try {
      setLoadingMenu(true);
      const res = await fetch("/api/superadmin/school-sidebar-menu");
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data);
      }
    } catch (err) {
      console.error("Failed to load school sidebar menu items:", err);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();

    // Check URL search param
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSearch = params.get("search");
      if (urlSearch) {
        setSearchQuery(urlSearch);
      }
      const urlTab = params.get("tab");
      if (urlTab === "landing" || urlTab === "platform" || urlTab === "menu") {
        setActiveTab(urlTab);
      }
    }

    // Listen to global header search bar
    const handleGlobalSearch = (e: any) => {
      if (e.detail && typeof e.detail.query === "string") {
        setSearchQuery(e.detail.query);
      }
    };

    window.addEventListener("global_search_query", handleGlobalSearch);
    return () => window.removeEventListener("global_search_query", handleGlobalSearch);
  }, []);

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return menuItems.filter((item) => {
      // Search across label, route, category, badge, description, and school types
      const schoolTypesText = (item.school_types || [])
        .map((t) => t.replace("_", " "))
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        q === "" ||
        item.label.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        schoolTypesText.includes(q);

      // School Type
      const matchesSchoolType =
        selectedSchoolTypeFilter === "all" ||
        item.school_types.includes(selectedSchoolTypeFilter as SchoolType);

      // Category
      const matchesCategory =
        selectedCategoryFilter === "all" || item.category === selectedCategoryFilter;

      // Status
      const matchesStatus =
        selectedStatusFilter === "all" ||
        (selectedStatusFilter === "active" && item.is_active) ||
        (selectedStatusFilter === "inactive" && !item.is_active);

      return matchesSearch && matchesSchoolType && matchesCategory && matchesStatus;
    });
  }, [menuItems, searchQuery, selectedSchoolTypeFilter, selectedCategoryFilter, selectedStatusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = menuItems.length;
    const active = menuItems.filter((m) => m.is_active).length;
    const university = menuItems.filter((m) => m.school_types.includes("university")).length;
    const highSchool = menuItems.filter((m) => m.school_types.includes("high_school")).length;
    const vocational = menuItems.filter((m) => m.school_types.includes("vocational_school")).length;
    return { total, active, university, highSchool, vocational };
  }, [menuItems]);

  // Handle Toggle Active/Inactive
  const handleToggle = async (id: string, currentActive: boolean) => {
    const newActive = !currentActive;
    // Optimistic update
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_active: newActive } : item))
    );

    try {
      const res = await fetch("/api/superadmin/school-sidebar-menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: newActive }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle item");
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      setMenuItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_active: currentActive } : item))
      );
    }
  };

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      label: "",
      href: "/admin/",
      category: "Academics & Schedule",
      icon: "BookOpen",
      badge: "",
      description: "",
      school_types: ["university", "high_school", "vocational_school"],
      is_active: true,
      display_order: (menuItems.length || 0) + 1,
    });
    setFormError(null);
    setPageCreatedBanner(null);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: SchoolSidebarMenuItem) => {
    setEditingItem(item);
    setFormData({
      label: item.label,
      href: item.href,
      category: item.category,
      icon: item.icon,
      badge: item.badge || "",
      description: item.description || "",
      school_types: [...item.school_types],
      is_active: item.is_active,
      display_order: item.display_order,
    });
    setFormError(null);
    setPageCreatedBanner(null);
    setIsModalOpen(true);
  };

  // Toggle school type selection in form
  const handleToggleFormSchoolType = (type: SchoolType) => {
    setFormData((prev) => {
      const exists = prev.school_types.includes(type);
      return {
        ...prev,
        school_types: exists
          ? prev.school_types.filter((t) => t !== type)
          : [...prev.school_types, type],
      };
    });
  };

  const handleSelectAllSchoolTypes = () => {
    setFormData((prev) => ({
      ...prev,
      school_types: ["university", "high_school", "vocational_school"],
    }));
  };

  const handleClearAllSchoolTypes = () => {
    setFormData((prev) => ({
      ...prev,
      school_types: [],
    }));
  };

  // Quick toggle school type directly from table
  const handleQuickToggleSchoolType = async (item: SchoolSidebarMenuItem, type: SchoolType) => {
    const currentTypes = item.school_types || [];
    const exists = currentTypes.includes(type);
    const newTypes = exists
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];

    // Optimistic local update
    setMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, school_types: newTypes } : m))
    );

    try {
      const res = await fetch("/api/superadmin/school-sidebar-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          school_types: newTypes,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update school type");
      }
    } catch (err) {
      console.error("Failed to toggle school type:", err);
      // Revert on error
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, school_types: currentTypes } : m))
      );
    }
  };

  // Save Modal Form
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setPageCreatedBanner(null);

    if (!formData.label.trim()) {
      setFormError("Module label is required.");
      return;
    }

    if (!formData.href.trim() || formData.href.trim() === "/admin/") {
      setFormError("A valid route path starting with /admin/ is required.");
      return;
    }

    if (formData.school_types.length === 0) {
      setFormError("At least one school type must be selected.");
      return;
    }

    try {
      setFormSaving(true);
      const payload = {
        id: editingItem ? editingItem.id : undefined,
        label: formData.label.trim(),
        href: formData.href.trim(),
        category: formData.category,
        icon: formData.icon,
        badge: formData.badge.trim() || null,
        description: formData.description.trim(),
        school_types: formData.school_types,
        is_active: formData.is_active,
        display_order: Number(formData.display_order) || 1,
      };

      const method = editingItem ? "PUT" : "POST";
      const res = await fetch("/api/superadmin/school-sidebar-menu", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save menu item");
      }

      if (data.pageCreated) {
        setPageCreatedBanner(
          `Success! Automatically generated new portal page at: ${formData.href}`
        );
      }

      await fetchMenuItems();

      setTimeout(() => {
        setIsModalOpen(false);
      }, 800);
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setFormSaving(false);
    }
  };

  // Delete Item
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/superadmin/school-sidebar-menu?id=${deletingItem.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete item");
      }

      setMenuItems((prev) => prev.filter((item) => item.id !== deletingItem.id));
      setDeletingItem(null);
    } catch (err: any) {
      alert(`Error deleting module: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSavePlatformSettings = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* Sub-Header / Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link
            href="/superadmin/dashboard"
            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Super Admin
          </Link>
          <span className="text-slate-300">/</span>
          <span>System Settings</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">
            {activeTab === "menu"
              ? "Schools Sidebar Menu & Modules"
              : activeTab === "landing"
              ? "Landing Page Content"
              : "Maintenance & Platform Policies"}
          </span>
        </div>

        {activeTab === "menu" ? (
          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchMenuItems}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="Refresh Modules"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingMenu ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Sidebar Module</span>
            </button>
          </div>
        ) : activeTab === "landing" ? (
          <Link
            href="/super-admin/settings/landing-page"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
            <span>Open Dedicated CMS View</span>
          </Link>
        ) : (
          <button
            onClick={handleSavePlatformSettings}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Save Configurations</span>
          </button>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200">
        <button
          onClick={() => setActiveTab("menu")}
          className={`flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "menu"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Schools Sidebar Menu & Modules</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {menuItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("platform")}
          className={`flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "platform"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Maintenance & Security Policies</span>
        </button>

        <button
          onClick={() => setActiveTab("landing")}
          className={`flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "landing"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Landing Page Content</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            CMS
          </span>
        </button>
      </div>

      {/* TAB 1: SCHOOLS SIDEBAR MENU & MODULES MANAGER */}
      {activeTab === "menu" && (
        <div className="space-y-6">
          {/* Hero Banner explaining dynamic auto-generation */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-200 text-[10px] font-bold border border-blue-400/30 uppercase tracking-wide">
                  <Sparkles className="h-3 w-3 text-blue-300" />
                  Smart Engine & Auto-Page Creation
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  Dynamic School Portal Navigation
                </span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Institutional Sidebar Customization
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Assign modules specifically to <strong>Universities</strong>,{" "}
                <strong>High Schools</strong>, or <strong>Vocational Schools</strong>. Toggle modules on or off instantly across tenant portals. When creating a new module, its corresponding Next.js page will be <strong>automatically generated</strong> on disk.
              </p>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4 text-blue-600" />
              <span>Create New Module</span>
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500">Total Modules</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{stats.total}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Across all school types</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-emerald-700">Active Live</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">{stats.active}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Currently visible in menus</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                <School className="h-3 w-3" />
                <span>University</span>
              </div>
              <div className="text-xl font-bold text-indigo-600 mt-1">{stats.university}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Eligible modules</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                <span>High School</span>
              </div>
              <div className="text-xl font-bold text-emerald-600 mt-1">{stats.highSchool}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Eligible modules</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                <Hammer className="h-3 w-3" />
                <span>Vocational</span>
              </div>
              <div className="text-xl font-bold text-amber-600 mt-1">{stats.vocational}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Eligible modules</div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search modules by name, route, category, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* School Type Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs">
              <button
                onClick={() => setSelectedSchoolTypeFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedSchoolTypeFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setSelectedSchoolTypeFilter("university")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedSchoolTypeFilter === "university"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <School className="h-3 w-3" />
                <span>University</span>
              </button>
              <button
                onClick={() => setSelectedSchoolTypeFilter("high_school")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedSchoolTypeFilter === "high_school"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GraduationCap className="h-3 w-3" />
                <span>High School</span>
              </button>
              <button
                onClick={() => setSelectedSchoolTypeFilter("vocational_school")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedSchoolTypeFilter === "vocational_school"
                    ? "bg-white text-amber-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Hammer className="h-3 w-3" />
                <span>Vocational</span>
              </button>
            </div>

            {/* Status & Category Dropdowns */}
            <div className="flex items-center gap-2">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer font-medium max-w-[170px]"
              >
                <option value="all">All Categories</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modules Table List */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            {loadingMenu ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Loading school sidebar modules...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Filter className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No modules match your criteria</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try clearing your search query or selecting a different school type filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSchoolTypeFilter("all");
                    setSelectedCategoryFilter("all");
                    setSelectedStatusFilter("all");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 min-w-[200px]">Module & Route</th>
                      <th className="py-3 px-4 min-w-[140px]">Category</th>
                      <th className="py-3 px-4 min-w-[220px]">Permitted School Types</th>
                      <th className="py-3 px-4 text-center w-28">Status</th>
                      <th className="py-3 px-4 text-right w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const IconComponent = ICON_COMPONENTS[item.icon] || BookOpen;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            !item.is_active ? "opacity-60 bg-slate-50/30" : ""
                          }`}
                        >
                          {/* Order */}
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-400">
                            {item.display_order}
                          </td>

                          {/* Module & Route */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                                <IconComponent className="h-4.5 w-4.5" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {item.label}
                                  </span>
                                  {item.badge && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                                  <Link
                                    href={item.href}
                                    target="_blank"
                                    className="hover:text-blue-600 flex items-center gap-1 hover:underline"
                                    title="Open portal page"
                                  >
                                    <span>{item.href}</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </div>
                                {item.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 max-w-md">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category}
                            </span>
                          </td>

                          {/* Permitted School Types */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* University */}
                              <button
                                type="button"
                                onClick={() => handleQuickToggleSchoolType(item, "university")}
                                title={
                                  item.school_types.includes("university")
                                    ? "Assigned to University. Click to deselect."
                                    : "Click to assign to University."
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  item.school_types.includes("university")
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                    : "bg-slate-50 text-slate-400 border border-dashed border-slate-300 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
                                }`}
                              >
                                <School className="h-2.5 w-2.5" />
                                <span>University</span>
                                {item.school_types.includes("university") ? (
                                  <Check className="h-2.5 w-2.5 ml-0.5 text-indigo-600" />
                                ) : (
                                  <Plus className="h-2.5 w-2.5 ml-0.5 text-slate-400" />
                                )}
                              </button>

                              {/* High School */}
                              <button
                                type="button"
                                onClick={() => handleQuickToggleSchoolType(item, "high_school")}
                                title={
                                  item.school_types.includes("high_school")
                                    ? "Assigned to High School. Click to deselect."
                                    : "Click to assign to High School."
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  item.school_types.includes("high_school")
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                    : "bg-slate-50 text-slate-400 border border-dashed border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                                }`}
                              >
                                <GraduationCap className="h-2.5 w-2.5" />
                                <span>High School</span>
                                {item.school_types.includes("high_school") ? (
                                  <Check className="h-2.5 w-2.5 ml-0.5 text-emerald-600" />
                                ) : (
                                  <Plus className="h-2.5 w-2.5 ml-0.5 text-slate-400" />
                                )}
                              </button>

                              {/* Vocational School */}
                              <button
                                type="button"
                                onClick={() => handleQuickToggleSchoolType(item, "vocational_school")}
                                title={
                                  item.school_types.includes("vocational_school")
                                    ? "Assigned to Vocational School. Click to deselect."
                                    : "Click to assign to Vocational School."
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  item.school_types.includes("vocational_school")
                                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                    : "bg-slate-50 text-slate-400 border border-dashed border-slate-300 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                                }`}
                              >
                                <Hammer className="h-2.5 w-2.5" />
                                <span>Vocational</span>
                                {item.school_types.includes("vocational_school") ? (
                                  <Check className="h-2.5 w-2.5 ml-0.5 text-amber-600" />
                                ) : (
                                  <Plus className="h-2.5 w-2.5 ml-0.5 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Status Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggle(item.id, item.is_active)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                                  item.is_active ? "bg-emerald-600" : "bg-slate-300"
                                }`}
                                title={item.is_active ? "Active in sidebar - Click to disable" : "Disabled - Click to enable"}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    item.is_active ? "translate-x-4.5" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                              <span
                                className={`text-[10px] font-bold ${
                                  item.is_active ? "text-emerald-700" : "text-slate-400"
                                }`}
                              >
                                {item.is_active ? "ON" : "OFF"}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Edit Module Configuration"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingItem(item)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete Module"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PLATFORM SECURITY & MAINTENANCE (EXISTING) */}
      {activeTab === "platform" && (
        <div className="max-w-4xl space-y-5">
          <AvatarUpload
            name="Super Administrator"
            subtitle="Super Administrator profile photo (JPG, PNG, or WebP up to 2 MB)"
          />

          {savedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Platform configuration changes persisted and broadcast across all instances.</span>
            </div>
          )}

          {/* Maintenance Controls */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Global Maintenance Mode</span>
                </h3>
                <p className="text-xs text-slate-500 max-w-xl">
                  When enabled, tenant portals will display a scheduled maintenance screen. Only Super Administrators can log in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  maintenanceMode ? "bg-amber-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    maintenanceMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {maintenanceMode && (
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Public Maintenance Notice
                </label>
                <input
                  type="text"
                  value={platformNotice}
                  onChange={(e) => setPlatformNotice(e.target.value)}
                  placeholder="Scheduled database upgrades in progress. Expected restoration: 02:00 UTC."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* Security & Access Policies */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <span>Authentication & Session Policies</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enforce least-privilege session timeouts, lockout thresholds, and MFA requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Session Inactivity Timeout
                </label>
                <select
                  value={sessionTimeoutHours}
                  onChange={(e) => setSessionTimeoutHours(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="1">1 Hour</option>
                  <option value="4">4 Hours</option>
                  <option value="8">8 Hours (Standard)</option>
                  <option value="24">24 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Failed Login Attempts (Lockout)
                </label>
                <select
                  value={maxLoginAttempts}
                  onChange={(e) => setMaxLoginAttempts(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="3">3 Attempts</option>
                  <option value="5">5 Attempts (Recommended)</option>
                  <option value="10">10 Attempts</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Enforce Multi-Factor Authentication (MFA) for Elevated Roles
                </div>
                <div className="text-[11px] text-slate-500">
                  Requires TOTP or biometric verification on login for System Administrators and Bursars.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnforceMfaForAdmins(!enforceMfaForAdmins)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  enforceMfaForAdmins ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enforceMfaForAdmins ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Allow Open Applicant Self-Registration
                </div>
                <div className="text-[11px] text-slate-500">
                  Permits prospective students to create admissions applicant accounts without invitation.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllowSelfRegistration(!allowSelfRegistration)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  allowSelfRegistration ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    allowSelfRegistration ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Database & Cloud Persistence */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span>Cloud Storage Database Engine</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target bucket: <code className="font-mono text-blue-600">institutional-reports</code> (Key: <code className="font-mono text-blue-600">ums-virtual-db.json</code>)
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                SYNCHRONIZED
              </span>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed">
              All relational database tables, dynamic sidebar modules, registered schools, system admin accounts, and security audit logs are continuously mirrored to private cloud storage. Reads operate at in-memory sub-millisecond speeds with zero cold starts.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC LANDING PAGE CMS EDITOR */}
      {activeTab === "landing" && <LandingPageEditor />}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>{editingItem ? "Edit School Sidebar Module" : "Add School Sidebar Module"}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configure menu label, school types accessibility, and portal routing.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Notice Banner */}
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Automatic Portal Page Generation:</span>
                  <p className="text-blue-800 leading-relaxed text-[11px]">
                    If the route specified does not yet exist under <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">app/admin/&lt;route&gt;</code>, the system will automatically create a fully styled, functional dashboard page for you!
                  </p>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {pageCreatedBanner && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{pageCreatedBanner}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Module Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Practical Workshops"
                    value={formData.label}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      // Auto suggest route if creating new and href is default
                      if (!editingItem && (formData.href === "/admin/" || formData.href === "")) {
                        const slug = newLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                        setFormData((prev) => ({
                          ...prev,
                          label: newLabel,
                          href: `/admin/${slug}`,
                        }));
                      } else {
                        setFormData((prev) => ({ ...prev, label: newLabel }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Route Path (URL) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. /admin/workshops"
                    value={formData.href}
                    onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* School Types Selection */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Choose School Type(s) <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Select which school types will have this sidebar menu item in their portal:
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllSchoolTypes}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleClearAllSchoolTypes}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* University Card */}
                  <button
                    type="button"
                    onClick={() => handleToggleFormSchoolType("university")}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.school_types.includes("university")
                        ? "bg-indigo-50/90 border-indigo-400 text-indigo-950 shadow-xs ring-1 ring-indigo-400/50"
                        : "bg-slate-50/70 border-slate-200 text-slate-500 hover:bg-slate-100/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                          formData.school_types.includes("university")
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200/80 text-slate-500"
                        }`}
                      >
                        <School className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">University</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Higher Education</div>
                      </div>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
                        formData.school_types.includes("university")
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {formData.school_types.includes("university") && (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      )}
                    </div>
                  </button>

                  {/* High School Card */}
                  <button
                    type="button"
                    onClick={() => handleToggleFormSchoolType("high_school")}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.school_types.includes("high_school")
                        ? "bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-xs ring-1 ring-emerald-400/50"
                        : "bg-slate-50/70 border-slate-200 text-slate-500 hover:bg-slate-100/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                          formData.school_types.includes("high_school")
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200/80 text-slate-500"
                        }`}
                      >
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">High School</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Secondary Education</div>
                      </div>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
                        formData.school_types.includes("high_school")
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {formData.school_types.includes("high_school") && (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      )}
                    </div>
                  </button>

                  {/* Vocational School Card */}
                  <button
                    type="button"
                    onClick={() => handleToggleFormSchoolType("vocational_school")}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.school_types.includes("vocational_school")
                        ? "bg-amber-50/90 border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400/50"
                        : "bg-slate-50/70 border-slate-200 text-slate-500 hover:bg-slate-100/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                          formData.school_types.includes("vocational_school")
                            ? "bg-amber-600 text-white"
                            : "bg-slate-200/80 text-slate-500"
                        }`}
                      >
                        <Hammer className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Vocational</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Technical & Trade</div>
                      </div>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
                        formData.school_types.includes("vocational_school")
                          ? "bg-amber-600 border-amber-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {formData.school_types.includes("vocational_school") && (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      )}
                    </div>
                  </button>
                </div>

                {formData.school_types.length === 0 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>No school type selected. Choose at least one school type above for this module to appear in portals.</span>
                  </p>
                )}
              </div>

              {/* Category & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sidebar Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer font-medium"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Badge Pill (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New, Beta, Lab"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Icon Picker */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">
                  Select Icon ({formData.icon})
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                  {Object.entries(ICON_COMPONENTS).map(([iconName, IconComp]) => {
                    const isSelected = formData.icon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: iconName })}
                        className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs scale-105"
                            : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/60"
                        }`}
                        title={iconName}
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order & Visibility Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Display Order Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-start sm:gap-4 pt-4 sm:pt-4">
                  <span className="text-xs font-bold text-slate-700">Active Visibility:</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                      formData.is_active ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-semibold text-slate-600">
                    {formData.is_active ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Module Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of institutional features enabled by this module..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSaving}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  {formSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving & Generating Page...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingItem ? "Update Module" : "Save & Generate Page"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-11 w-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Delete Sidebar Module "{deletingItem.label}"?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will remove the module from the schools sidebar menu for{" "}
                {deletingItem.school_types.map((t) => t.replace("_", " ")).join(", ")}. Any existing page files will be kept safe.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
