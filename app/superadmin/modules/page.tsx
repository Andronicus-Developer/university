"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  Building2,
  BusFront,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileText,
  Globe,
  GraduationCap,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import type { ResolvedFeatureFlag } from "@/lib/superadmin/feature-flags-catalog";
import {
  getFeatureFlagsAdminAction,
  resetSchoolFeatureFlagAction,
  toggleFeatureFlagAction,
  type FeatureFlagSchoolOption,
} from "@/app/superadmin/modules/actions";

function getPortalIcon(portalKey: string) {
  switch (portalKey) {
    case "admin_portal":
      return ShieldCheck;
    case "finance_portal":
      return CreditCard;
    case "lecturer_portal":
      return BookOpen;
    case "teacher_portal":
      return UserCheck;
    case "student_portal":
      return GraduationCap;
    case "parent_portal":
      return Users;
    case "applicant_portal":
      return FileText;
    case "advisor_portal":
      return Sparkles;
    case "exams_module":
      return FileCheck2;
    case "library_module":
      return BookMarked;
    case "hostels_module":
      return Building2;
    case "transport_module":
      return BusFront;
    case "lms_module":
      return Layers;
    default:
      return Sliders;
  }
}

interface ToastState {
  id: number;
  type: "success" | "error";
  message: string;
}

export default function PlatformFeatureFlagsPage() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [schools, setSchools] = useState<FeatureFlagSchoolOption[]>([]);
  const [flags, setFlags] = useState<ResolvedFeatureFlag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3500);
  }, []);

  const loadFlags = useCallback(
    async (schoolScopeId: string, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);

      try {
        const res = await getFeatureFlagsAdminAction(schoolScopeId || null);
        if (!res.ok) {
          setErrorMsg(res.error || "Unable to load feature flags.");
          return;
        }
        setFlags(res.data.flags);
        setSchools(res.data.schools);
      } catch (err: any) {
        setErrorMsg(err?.message || "Failed to load feature flags.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadFlags(selectedSchoolId, false);
  }, [selectedSchoolId, loadFlags]);

  const handleToggle = async (flag: ResolvedFeatureFlag) => {
    if (pendingKey) return;
    const nextState = !flag.is_enabled;
    const scopeLabel = selectedSchoolId
      ? schools.find((s) => s.id === selectedSchoolId)?.name || "selected school"
      : "Global (All Schools)";

    const prevFlags = flags;
    setPendingKey(flag.portal_key);

    // Optimistic UI update
    setFlags((curr) =>
      curr.map((item) =>
        item.portal_key === flag.portal_key
          ? {
              ...item,
              is_enabled: nextState,
              global_enabled: selectedSchoolId ? item.global_enabled : nextState,
              has_school_override: selectedSchoolId ? true : item.has_school_override,
              updated_at: new Date().toISOString(),
            }
          : item
      )
    );

    try {
      const res = await toggleFeatureFlagAction({
        portalKey: flag.portal_key,
        isEnabled: nextState,
        schoolId: selectedSchoolId || null,
      });

      if (!res.ok) {
        setFlags(prevFlags);
        showToast("error", res.error || "Could not update feature flag.");
        return;
      }

      setFlags((curr) =>
        curr.map((item) =>
          item.portal_key === flag.portal_key ? res.data : item
        )
      );

      window.dispatchEvent(new CustomEvent("feature_flags_updated"));
      showToast(
        "success",
        `${flag.label} ${nextState ? "enabled" : "disabled"} for ${scopeLabel}.`
      );
    } catch (err: any) {
      setFlags(prevFlags);
      showToast("error", err?.message || "Failed to save toggle.");
    } finally {
      setPendingKey(null);
    }
  };

  const handleResetSchoolOverride = async (flag: ResolvedFeatureFlag) => {
    if (!selectedSchoolId || pendingKey) return;
    const prevFlags = flags;
    setPendingKey(flag.portal_key);

    try {
      const res = await resetSchoolFeatureFlagAction({
        portalKey: flag.portal_key,
        schoolId: selectedSchoolId,
      });

      if (!res.ok) {
        setFlags(prevFlags);
        showToast("error", res.error || "Failed to reset school override.");
        return;
      }

      setFlags((curr) =>
        curr.map((item) =>
          item.portal_key === flag.portal_key ? res.data : item
        )
      );
      window.dispatchEvent(new CustomEvent("feature_flags_updated"));
      showToast("success", `${flag.label} reset to inherit the global setting.`);
    } catch (err: any) {
      setFlags(prevFlags);
      showToast("error", err?.message || "Failed to reset override.");
    } finally {
      setPendingKey(null);
    }
  };

  const filteredFlags = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return flags;
    return flags.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.portal_key.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.target_roles.some((r) => r.toLowerCase().includes(q)) ||
        f.route_prefixes.some((p) => p.toLowerCase().includes(q))
    );
  }, [flags, searchQuery]);

  const portalFlags = useMemo(
    () => filteredFlags.filter((f) => f.category === "portal"),
    [filteredFlags]
  );
  const moduleFlags = useMemo(
    () => filteredFlags.filter((f) => f.category === "module"),
    [filteredFlags]
  );

  const summary = useMemo(() => {
    const enabled = flags.filter((f) => f.is_enabled).length;
    const disabled = flags.filter((f) => !f.is_enabled).length;
    const overrides = flags.filter((f) => f.has_school_override).length;
    return { enabled, disabled, overrides };
  }, [flags]);

  const activeSchoolName = useMemo(() => {
    if (!selectedSchoolId) return "Global (All Schools)";
    return schools.find((s) => s.id === selectedSchoolId)?.name || "Selected School";
  }, [selectedSchoolId, schools]);

  const renderCard = (item: ResolvedFeatureFlag) => {
    const Icon = getPortalIcon(item.portal_key);
    const isBusy = pendingKey === item.portal_key;

    return (
      <div
        key={item.portal_key}
        className={`p-5 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between gap-4 ${
          item.is_enabled
            ? "border-slate-200/80 hover:border-blue-300 hover:shadow-md"
            : "border-rose-200/80 bg-rose-50/20"
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                item.is_enabled
                  ? "bg-blue-50 text-blue-600 border-blue-100"
                  : "bg-rose-50 text-rose-500 border-rose-100"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {selectedSchoolId && item.has_school_override && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  School Override
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  item.is_enabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    item.is_enabled ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {item.is_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {item.label}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50/70 px-1.5 py-0.5 rounded">
                {item.portal_key}
              </span>
              {item.route_prefixes.map((route) => (
                <span
                  key={route}
                  className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                >
                  {route}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {item.description}
          </p>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Target User Roles
            </div>
            <div className="flex flex-wrap gap-1">
              {item.target_roles.slice(0, 4).map((role) => (
                <span
                  key={role}
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium capitalize"
                >
                  {role.replace(/_/g, " ")}
                </span>
              ))}
              {item.target_roles.length > 4 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
                  +{item.target_roles.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {selectedSchoolId && item.has_school_override ? (
              <button
                type="button"
                onClick={() => handleResetSchoolOverride(item)}
                disabled={Boolean(pendingKey)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-800 hover:underline cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset to Global</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">
                {selectedSchoolId
                  ? `Inherits Global (${item.global_enabled ? "On" : "Off"})`
                  : "Applies to all schools"}
              </span>
            )}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={item.is_enabled}
            aria-label={`Toggle ${item.label}`}
            disabled={Boolean(pendingKey)}
            onClick={() => handleToggle(item)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-60 shrink-0 ${
              item.is_enabled ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white mx-auto" />
            ) : (
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-2xs ${
                  item.is_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            toast.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : "bg-rose-900 text-white border-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-300 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/70 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Header: Breadcrumbs + Scope Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link
              href="/superadmin/dashboard"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Super Admin
            </Link>
            <span className="text-slate-300">/</span>
            <span>Security &amp; Operations</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">Feature Flags</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">
            Portal &amp; Module Feature Flags
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Toggle portals and campus modules globally or per school. Disabled routes are hidden from sidebars and redirected cleanly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <label
              htmlFor="feature-flag-scope"
              className="text-[11px] font-semibold text-slate-500"
            >
              Scope:
            </label>
            <select
              id="feature-flag-scope"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Global (All Schools)</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.slug || school.school_type})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadFlags(selectedSchoolId, true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Super Admin Lockout Protection Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-extrabold">Super Admin Portal</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[10px] font-bold">
                Always Active · Protected
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Permanent lockout protection is enforced for <span className="font-mono text-white">/superadmin/*</span> and <span className="font-mono text-white">/super-admin/*</span> routes.
            </p>
          </div>
        </div>
        <div className="text-[11px] font-semibold text-blue-200 shrink-0">
          Viewing Scope: <span className="text-white">{activeSchoolName}</span>
        </div>
      </div>

      {/* Summary KPI Bar + Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Enabled Flags</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
              {loading ? "—" : summary.enabled}
            </div>
          </div>
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>

        <div className="md:col-span-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Disabled Flags</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-0.5">
              {loading ? "—" : summary.disabled}
            </div>
          </div>
          <AlertCircle className="h-6 w-6 text-rose-500" />
        </div>

        <div className="md:col-span-6 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search portal name, key, role, or route..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
          {selectedSchoolId && (
            <span className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold shrink-0">
              {summary.overrides} School Override{summary.overrides === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => loadFlags(selectedSchoolId, true)}
            className="px-3 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="h-10 w-10 rounded-xl bg-slate-100" />
                <div className="h-5 w-20 rounded-full bg-slate-100" />
              </div>
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="h-12 w-full rounded bg-slate-100" />
              <div className="h-6 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Group 1: User Portals */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  User Portals ({portalFlags.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Control complete login access, sidebar visibility, and route entry for each role portal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {portalFlags.map(renderCard)}
            </div>
          </section>

          {/* Group 2: Major Campus Modules */}
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Major Campus Modules ({moduleFlags.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Toggle shared functional modules across School Admin, Teacher, Lecturer, and Student portals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {moduleFlags.map(renderCard)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
