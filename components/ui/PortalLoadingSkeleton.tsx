import React from "react";

interface PortalLoadingSkeletonProps {
  cards?: number;
  rows?: number;
}

export function PortalLoadingSkeleton({
  cards = 4,
  rows = 6,
}: PortalLoadingSkeletonProps) {
  return (
    <div
      className="max-w-7xl mx-auto space-y-6 animate-pulse"
      aria-busy="true"
      aria-label="Loading portal content"
    >
      {/* Header Banner Placeholder */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-3.5 w-36 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="h-7 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-3.5 w-80 max-w-full rounded-md bg-slate-100 dark:bg-slate-800/70" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-8 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-800/70" />
          </div>
        ))}
      </div>

      {/* Filter Bar & Data Table Placeholder */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="h-9 w-64 max-w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-9 w-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              className="px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-48 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-32 max-w-full rounded bg-slate-100 dark:bg-slate-800/70" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
