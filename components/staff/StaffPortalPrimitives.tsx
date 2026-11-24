"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, Database, Loader2, RefreshCw } from "lucide-react";

export function StaffPageLoading({ label = "Loading live academic workspace..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[45vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export function StaffPageError({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
            Unable to Load Portal Data
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 cursor-pointer shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

export function UnlinkedStaffProfileCard({ schoolName }: { schoolName?: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-6 space-y-2">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>No Academic Staff Profile Linked</span>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-200 leading-relaxed">
        Your login is authenticated{schoolName ? ` at ${schoolName}` : ""}, but no staff row in{" "}
        <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">
          public.staff_profiles
        </code>{" "}
        is linked to your user ID or email yet. Ask your School Administrator to add you under Academic Staff.
      </p>
    </div>
  );
}

export function MigrationNoticeBanner({ tables }: { tables: string[] }) {
  if (!tables || tables.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-4 flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-900 dark:text-amber-200">
        <p className="font-bold">Database Migration Pending ({tables.join(", ")})</p>
        <p className="mt-0.5">
          Execute <code className="font-mono">20261124000008_academic_staff_portal_tables_and_rls.sql</code>{" "}
          in your Supabase SQL Editor so writes to these tables persist live.
        </p>
      </div>
    </div>
  );
}

export function StaffEmptyState({
  icon: Icon = Database,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center flex flex-col items-center justify-center gap-2.5">
      <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
        {description}
      </p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
