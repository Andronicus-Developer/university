"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Edit2,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "email"
  | "tel"
  | "password"
  | "select"
  | "checkbox";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  defaultValue?: string | number | boolean;
  options?: SelectOption[];
  lookupKey?: string;
  lookupLabelKey?: string;
  lookupValueKey?: string;
  step?: string;
  min?: number;
  max?: number;
  colSpan?: 1 | 2;
  createOnly?: boolean;
  visibleWhen?: (formData: Record<string, any>, isEdit: boolean) => boolean;
}

export interface ColumnRenderHelpers {
  formatLookup: (lookupKey: string, id: string | null | undefined) => string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (
    row: any,
    lookups: Record<string, any[]>,
    helpers: ColumnRenderHelpers
  ) => React.ReactNode;
}

export interface KpiCardConfig {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: "indigo" | "emerald" | "amber" | "rose" | "slate" | "blue" | "purple";
}

export interface LiveCrudTabConfig {
  key: string;
  label: string;
  resource: string;
  singularLabel: string;
  pluralLabel: string;
  description?: string;
  fields: FieldConfig[];
  columns: ColumnConfig[];
  searchFields?: string[];
  filterField?: {
    name: string;
    label: string;
    options?: SelectOption[];
    lookupKey?: string;
  };
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  transformBeforeSubmit?: (
    payload: Record<string, any>,
    isEdit: boolean
  ) => Record<string, any>;
}

export interface LiveCrudModuleProps {
  title: string;
  subtitle: string;
  badge?: string;
  tabs: LiveCrudTabConfig[];
  defaultTabKey?: string;
  computeKpis?: (
    recordsByTab: Record<string, any[]>,
    lookups: Record<string, any[]>
  ) => KpiCardConfig[];
  renderExtraPanel?: (ctx: {
    activeTab: LiveCrudTabConfig;
    recordsByTab: Record<string, any[]>;
    lookups: Record<string, any[]>;
    helpers: ColumnRenderHelpers;
    refresh: () => Promise<void>;
  }) => React.ReactNode;
  infoBanner?: string;
}

const KPI_TONE_CLASSES: Record<NonNullable<KpiCardConfig["tone"]>, string> = {
  indigo: "border-indigo-100 bg-indigo-50/50 text-indigo-700",
  emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50/50 text-amber-700",
  rose: "border-rose-100 bg-rose-50/50 text-rose-700",
  slate: "border-slate-200 bg-slate-50/60 text-slate-700",
  blue: "border-blue-100 bg-blue-50/50 text-blue-700",
  purple: "border-purple-100 bg-purple-50/50 text-purple-700",
};

function formatLookupItemLabel(item: any, preferredKey?: string): string {
  if (!item) return "";
  if (preferredKey && item[preferredKey] != null && String(item[preferredKey]).trim() !== "") {
    return String(item[preferredKey]);
  }
  if (item.display_label) return String(item.display_label);
  if (item.code && item.name) return `${item.code} — ${item.name}`;
  if (item.item_code && item.item_name) return `${item.item_code} — ${item.item_name}`;
  if (item.full_name) return String(item.full_name);
  if (item.first_name || item.last_name) {
    return `${item.first_name || ""} ${item.last_name || ""}`.trim();
  }
  if (item.name) return String(item.name);
  if (item.invoice_number) return String(item.invoice_number);
  if (item.session_date) return `${item.session_date} (${item.session_type || "session"})`;
  return String(item.id || "");
}

export default function LiveCrudModule({
  title,
  subtitle,
  badge,
  tabs,
  defaultTabKey,
  computeKpis,
  renderExtraPanel,
  infoBanner,
}: LiveCrudModuleProps) {
  const [activeTabKey, setActiveTabKey] = useState<string>(
    defaultTabKey || tabs[0]?.key || ""
  );
  const [recordsByTab, setRecordsByTab] = useState<Record<string, any[]>>({});
  const [lookups, setLookups] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [migrationWarning, setMigrationWarning] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete confirm modal
  const [deletingRow, setDeletingRow] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const activeTab = useMemo(
    () => tabs.find((t) => t.key === activeTabKey) || tabs[0],
    [tabs, activeTabKey]
  );

  useEffect(() => {
    if (!tabs.some((t) => t.key === activeTabKey) && tabs[0]) {
      setActiveTabKey(tabs[0].key);
    }
  }, [tabs, activeTabKey]);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const fetchAllData = useCallback(
    async (isManualRefresh = false) => {
      if (tabs.length === 0) return;
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);
      setMigrationWarning(null);

      try {
        const responses = await Promise.all(
          tabs.map(async (tab, index) => {
            const url =
              index === 0
                ? `/api/admin/portal-data/${encodeURIComponent(tab.resource)}?include=lookups`
                : `/api/admin/portal-data/${encodeURIComponent(tab.resource)}`;
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json().catch(() => ({}));
            return { tab, ok: res.ok, status: res.status, json };
          })
        );

        const nextRecords: Record<string, any[]> = {};
        let nextLookups: Record<string, any[]> = {};
        const errors: string[] = [];
        let foundMigrationWarning: string | null = null;

        for (const r of responses) {
          if (r.json?.lookups) {
            nextLookups = { ...nextLookups, ...r.json.lookups };
          }
          if (!r.ok) {
            if (r.json?.code === "MIGRATION_REQUIRED") {
              foundMigrationWarning =
                r.json.error ||
                `Database table for "${r.tab.pluralLabel}" has not been created yet. Apply the latest Supabase SQL migration.`;
              nextRecords[r.tab.key] = [];
            } else {
              errors.push(r.json?.error || `Failed to load ${r.tab.pluralLabel} (HTTP ${r.status})`);
              nextRecords[r.tab.key] = [];
            }
          } else {
            nextRecords[r.tab.key] = Array.isArray(r.json?.records) ? r.json.records : [];
          }
        }

        setRecordsByTab(nextRecords);
        setLookups((prev) => ({ ...prev, ...nextLookups }));
        if (foundMigrationWarning) setMigrationWarning(foundMigrationWarning);
        if (errors.length > 0) setErrorMsg(errors.join(" | "));
      } catch (err: any) {
        setErrorMsg(err?.message || "Network error while loading live records.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tabs]
  );

  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  const formatLookup = useCallback(
    (lookupKey: string, id: string | null | undefined): string => {
      if (!id) return "—";
      const list = lookups[lookupKey] || [];
      const match = list.find((item: any) => String(item.id) === String(id));
      return match ? formatLookupItemLabel(match) : String(id).slice(0, 8);
    },
    [lookups]
  );

  const helpers = useMemo<ColumnRenderHelpers>(
    () => ({ formatLookup }),
    [formatLookup]
  );

  const activeRecords = useMemo(
    () => (activeTab ? recordsByTab[activeTab.key] || [] : []),
    [activeTab, recordsByTab]
  );

  const filterOptions = useMemo<SelectOption[]>(() => {
    if (!activeTab?.filterField) return [];
    const ff = activeTab.filterField;
    if (ff.options) return ff.options;
    if (ff.lookupKey) {
      return (lookups[ff.lookupKey] || []).map((item: any) => ({
        value: String(item.id),
        label: formatLookupItemLabel(item),
      }));
    }
    return [];
  }, [activeTab, lookups]);

  const filteredRecords = useMemo(() => {
    if (!activeTab) return [];
    const q = searchQuery.trim().toLowerCase();
    return activeRecords.filter((row) => {
      if (
        activeTab.filterField &&
        filterValue !== "all" &&
        String(row[activeTab.filterField.name] ?? "") !== filterValue
      ) {
        return false;
      }
      if (!q) return true;
      const fieldsToSearch =
        activeTab.searchFields && activeTab.searchFields.length > 0
          ? activeTab.searchFields
          : Object.keys(row);
      return fieldsToSearch.some((key) => {
        const raw = row[key];
        if (raw == null) return false;
        if (String(raw).toLowerCase().includes(q)) return true;
        // Also match formatted lookup values if field looks like a foreign key
        if (key.endsWith("_id")) {
          const guessKeys = Object.keys(lookups);
          for (const lk of guessKeys) {
            const match = (lookups[lk] || []).find((i: any) => String(i.id) === String(raw));
            if (match && formatLookupItemLabel(match).toLowerCase().includes(q)) {
              return true;
            }
          }
        }
        return false;
      });
    });
  }, [activeTab, activeRecords, searchQuery, filterValue, lookups]);

  const kpiCards = useMemo<KpiCardConfig[]>(() => {
    if (computeKpis) {
      return computeKpis(recordsByTab, lookups);
    }
    if (!activeTab) return [];
    return [
      {
        label: `Total ${activeTab.pluralLabel}`,
        value: activeRecords.length,
        subtext: "Live Supabase records",
        tone: "indigo",
      },
      {
        label: "Filtered View",
        value: filteredRecords.length,
        subtext: searchQuery || filterValue !== "all" ? "Matching current filter" : "All rows visible",
        tone: "slate",
      },
    ];
  }, [computeKpis, recordsByTab, lookups, activeTab, activeRecords.length, filteredRecords.length, searchQuery, filterValue]);

  const openCreateModal = () => {
    if (!activeTab) return;
    const initial: Record<string, any> = {};
    for (const f of activeTab.fields) {
      if (f.defaultValue !== undefined) {
        initial[f.name] = f.defaultValue;
      } else if (f.type === "checkbox") {
        initial[f.name] = false;
      } else {
        initial[f.name] = "";
      }
    }
    setEditingRow(null);
    setFormData(initial);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (row: any) => {
    if (!activeTab) return;
    const initial: Record<string, any> = {};
    for (const f of activeTab.fields) {
      if (f.createOnly) continue;
      const val = row[f.name];
      if (f.type === "checkbox") {
        initial[f.name] = Boolean(val);
      } else if (f.type === "date" && typeof val === "string" && val.includes("T")) {
        initial[f.name] = val.slice(0, 10);
      } else {
        initial[f.name] = val ?? "";
      }
    }
    setEditingRow(row);
    setFormData(initial);
    setFormError(null);
    setModalOpen(true);
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab) return;
    setFormError(null);

    // Basic required field validation for visible fields
    const isEdit = Boolean(editingRow?.id);
    for (const f of activeTab.fields) {
      if (f.createOnly && isEdit) continue;
      if (f.visibleWhen && !f.visibleWhen(formData, isEdit)) continue;
      if (f.required) {
        const val = formData[f.name];
        if (val === undefined || val === null || String(val).trim() === "") {
          setFormError(`Please enter or select ${f.label}.`);
          return;
        }
      }
    }

    let payload: Record<string, any> = {};
    for (const f of activeTab.fields) {
      if (f.createOnly && isEdit) continue;
      if (f.visibleWhen && !f.visibleWhen(formData, isEdit)) continue;
      const raw = formData[f.name];
      if (f.type === "number") {
        payload[f.name] = raw === "" || raw === null || raw === undefined ? null : Number(raw);
      } else if (f.type === "checkbox") {
        payload[f.name] = Boolean(raw);
      } else {
        payload[f.name] = raw;
      }
    }

    if (activeTab.transformBeforeSubmit) {
      payload = activeTab.transformBeforeSubmit(payload, isEdit);
    }

    if (isEdit) {
      payload.id = editingRow.id;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/portal-data/${encodeURIComponent(activeTab.resource)}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json?.error || `Unable to save ${activeTab.singularLabel}.`);
        return;
      }

      setModalOpen(false);
      setEditingRow(null);
      showToast(
        "success",
        `${activeTab.singularLabel} ${isEdit ? "updated" : "created"} successfully.`
      );
      await fetchAllData(true);
    } catch (err: any) {
      setFormError(err?.message || "Network error while saving record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeTab || !deletingRow?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/portal-data/${encodeURIComponent(activeTab.resource)}?id=${encodeURIComponent(
          deletingRow.id
        )}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", json?.error || `Failed to delete ${activeTab.singularLabel}.`);
      } else {
        showToast("success", `${activeTab.singularLabel} deleted.`);
        setDeletingRow(null);
        await fetchAllData(true);
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete record.");
    } finally {
      setDeleting(false);
    }
  };

  const handleTabSwitch = (key: string) => {
    setActiveTabKey(key);
    setSearchQuery("");
    setFilterValue("all");
  };

  const canCreate = activeTab?.allowCreate !== false;
  const canEdit = activeTab?.allowEdit !== false;
  const canDelete = activeTab?.allowDelete !== false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {badge && (
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchAllData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {activeTab && canCreate && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add {activeTab.singularLabel}
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      {infoBanner && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-800">
          {infoBanner}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded p-1 hover:bg-black/5"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Migration Required Warning */}
      {migrationWarning && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Database Migration Required</p>
            <p className="mt-0.5 text-amber-800">{migrationWarning}</p>
          </div>
        </div>
      )}

      {/* API Error */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Unable to Load Data</p>
            <p className="mt-0.5 text-rose-800">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      {kpiCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card, idx) => {
            const toneClass = KPI_TONE_CLASSES[card.tone || "slate"];
            return (
              <div
                key={`${card.label}-${idx}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                  {card.subtext && (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass}`}
                    >
                      {card.subtext}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-Tab Navigation */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {tabs.map((t) => {
            const isActive = t.key === activeTab?.key;
            const count = (recordsByTab[t.key] || []).length;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTabSwitch(t.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Table Card */}
      {activeTab && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {activeTab.pluralLabel}
              </h2>
              {activeTab.description && (
                <p className="text-xs text-slate-500">{activeTab.description}</p>
              )}
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {activeTab.filterField && (
                <div className="relative flex items-center">
                  <Filter className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
                    aria-label={activeTab.filterField.label}
                  >
                    <option value="all">All {activeTab.filterField.label}</option>
                    {filterOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab.pluralLabel.toLowerCase()}...`}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span>Loading live records from Supabase...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Database className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                No {activeTab.pluralLabel.toLowerCase()} found
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                {searchQuery || filterValue !== "all"
                  ? "Try clearing your search or filter criteria."
                  : `Get started by adding your first ${activeTab.singularLabel.toLowerCase()} for this institution.`}
              </p>
              {canCreate && !searchQuery && filterValue === "all" && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Add {activeTab.singularLabel}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    {activeTab.columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-5 py-3.5 ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                    {(canEdit || canDelete) && (
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.map((row, idx) => (
                    <tr
                      key={row.id || `row-${idx}`}
                      className="transition hover:bg-slate-50/70"
                    >
                      {activeTab.columns.map((col) => (
                        <td
                          key={`${row.id || idx}-${col.key}`}
                          className={`whitespace-nowrap px-5 py-3.5 text-slate-700 ${
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                              ? "text-center"
                              : "text-left"
                          }`}
                        >
                          {col.render
                            ? col.render(row, lookups, helpers)
                            : row[col.key] != null && row[col.key] !== ""
                            ? String(row[col.key])
                            : "—"}
                        </td>
                      ))}
                      {(canEdit || canDelete) && (
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openEditModal(row)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeletingRow(row)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/60 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Optional Custom Summary / Matrix Panel */}
      {activeTab &&
        renderExtraPanel &&
        renderExtraPanel({
          activeTab,
          recordsByTab,
          lookups,
          helpers,
          refresh: () => fetchAllData(true),
        })}

      {/* Create / Edit Modal */}
      {modalOpen && activeTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingRow
                    ? `Edit ${activeTab.singularLabel}`
                    : `New ${activeTab.singularLabel}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Scoped to your school workspace in Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {activeTab.fields.map((field) => {
                  const isEdit = Boolean(editingRow?.id);
                  if (field.createOnly && isEdit) return null;
                  if (field.visibleWhen && !field.visibleWhen(formData, isEdit)) {
                    return null;
                  }

                  const spanClass = field.colSpan === 2 || field.type === "textarea" ? "sm:col-span-2" : "";
                  const val = formData[field.name];

                  if (field.type === "checkbox") {
                    return (
                      <div key={field.name} className={`flex items-center gap-3 pt-2 ${spanClass}`}>
                        <input
                          id={`field-${field.name}`}
                          type="checkbox"
                          checked={Boolean(val)}
                          onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <label
                            htmlFor={`field-${field.name}`}
                            className="text-sm font-medium text-slate-800"
                          >
                            {field.label}
                          </label>
                          {field.helperText && (
                            <p className="text-xs text-slate-500">{field.helperText}</p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (field.type === "select") {
                    const dynamicOptions: SelectOption[] = field.lookupKey
                      ? (lookups[field.lookupKey] || []).map((item: any) => ({
                          value: String(item[field.lookupValueKey || "id"]),
                          label: formatLookupItemLabel(item, field.lookupLabelKey),
                        }))
                      : field.options || [];

                    return (
                      <div key={field.name} className={spanClass}>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {field.label}
                          {field.required && <span className="ml-1 text-rose-500">*</span>}
                        </label>
                        <select
                          value={val ?? ""}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          required={field.required}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                        >
                          <option value="">
                            {field.placeholder || `Select ${field.label}`}
                          </option>
                          {dynamicOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {field.helperText && (
                          <p className="mt-1 text-xs text-slate-500">{field.helperText}</p>
                        )}
                      </div>
                    );
                  }

                  if (field.type === "textarea") {
                    return (
                      <div key={field.name} className={spanClass}>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {field.label}
                          {field.required && <span className="ml-1 text-rose-500">*</span>}
                        </label>
                        <textarea
                          rows={3}
                          value={val ?? ""}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.required}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                        />
                        {field.helperText && (
                          <p className="mt-1 text-xs text-slate-500">{field.helperText}</p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={field.name} className={spanClass}>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {field.label}
                        {field.required && <span className="ml-1 text-rose-500">*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={val ?? ""}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        step={field.step}
                        min={field.min}
                        max={field.max}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                      />
                      {field.helperText && (
                        <p className="mt-1 text-xs text-slate-500">{field.helperText}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingRow ? "Save Changes" : `Create ${activeTab.singularLabel}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRow && activeTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {activeTab.singularLabel}?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  This action permanently removes this record from Supabase for your school.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingRow(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
