"use client";

import React from "react";
import { AlertCircle, AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";

export function ClassicPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800 print:hidden">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function ClassicKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const valueTone = {
    neutral: "text-slate-900 dark:text-slate-100",
    success: "text-emerald-700 dark:text-emerald-400",
    warning: "text-amber-700 dark:text-amber-400",
    danger: "text-rose-700 dark:text-rose-400",
    info: "text-blue-700 dark:text-blue-400",
  }[tone];

  const iconTone = {
    neutral: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
    info: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
    success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {Icon && (
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold mt-2 tracking-tight ${valueTone}`}>{value}</div>
      {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export function ClassicStatusBadge({ status }: { status?: string | null }) {
  const s = String(status || "unknown").toLowerCase();
  let cls =
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

  if (
    [
      "paid",
      "active",
      "approved",
      "cleared",
      "completed",
      "competent",
      "enrolled",
      "graduated",
      "present",
      "successful",
      "verified",
      "published",
      "registered",
    ].includes(s)
  ) {
    cls =
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  } else if (
    ["partial", "partially_paid", "pending", "submitted", "under_review", "late", "in_progress"].includes(
      s
    )
  ) {
    cls =
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  } else if (
    [
      "unpaid",
      "overdue",
      "absent",
      "rejected",
      "suspended",
      "withdrawn",
      "hold",
      "not_yet_competent",
      "voided",
      "failed",
    ].includes(s)
  ) {
    cls =
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  } else if (["excused", "deferred"].includes(s)) {
    cls =
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold capitalize ${cls}`}
    >
      {s.replace(/_/g, " ")}
    </span>
  );
}

export function ClassicLoading({ label = "Loading records..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-2.5">
      <Loader2 className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export function ClassicError({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
            Unable to load portal data
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 cursor-pointer shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

export function ClassicEmpty({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center flex flex-col items-center justify-center gap-2">
      <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">{description}</p>
    </div>
  );
}

export function ClassicMigrationNotice({ tables }: { tables?: string[] }) {
  if (!tables || tables.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 print:hidden">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-bold">Database setup pending ({tables.join(", ")}): </span>
        <span>
          Run <code className="font-mono">20261124000009_parent_finance_registrar_portals_and_rls.sql</code>{" "}
          in Supabase SQL Editor to enable full live persistence for these tables.
        </span>
      </div>
    </div>
  );
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
) {
  const escape = (val: string | number | null | undefined) => {
    const str = String(val ?? "");
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
