"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Plus, Printer, RefreshCw, X } from "lucide-react";

interface ReportItem {
  id: string;
  title: string;
  report_type: string;
  period_label: string | null;
  summary: string | null;
  status: string;
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [liveStats, setLiveStats] = useState<{
    totalStudents: number;
    activeStudents: number;
    totalStaff: number;
    totalBilled: number;
    totalCollected: number;
  } | null>(null);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("executive_summary");
  const [periodLabel, setPeriodLabel] = useState("Current Academic Session");

  const fetchReports = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/ops?resource=reports", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error || "Failed to load reports.");
      } else {
        setReports(data.reports || []);
        setLiveStats(data.liveStats || null);
        setMissingTables(data.missingTables || []);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "reports",
          title,
          report_type: reportType,
          period_label: periodLabel,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(json?.error || "Failed to generate report.");
      } else {
        setShowModal(false);
        setTitle("");
        await fetchReports();
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Institutional Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate live multi-tenant enrollment and revenue snapshots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={fetchReports}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate Snapshot</span>
          </button>
        </div>
      </div>

      {missingTables.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2 print:hidden">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Run migration `20261124000010_audit_remediation_tables_and_rls.sql` in Supabase SQL Editor to archive generated reports.</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs font-semibold text-rose-800 dark:text-rose-200">
          {errorMsg}
        </div>
      )}

      {liveStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-500">Enrolled Learners</p>
            <p className="text-2xl font-bold mt-1">{liveStats.activeStudents}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-500">Academic & Admin Staff</p>
            <p className="text-2xl font-bold mt-1">{liveStats.totalStaff}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-500">Total Fee Billed</p>
            <p className="text-2xl font-bold mt-1">{liveStats.totalBilled.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-500">Total Collected</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {liveStats.totalCollected.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading archived reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <BarChart3 className="h-7 w-7 mx-auto text-slate-400" />
            <p className="text-sm font-semibold">No Snapshots Archived Yet</p>
            <p className="text-xs text-slate-500">Click &ldquo;Generate Snapshot&rdquo; to archive current figures.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {reports.map((r) => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{r.title}</p>
                  <p className="text-[11px] text-slate-500">{r.summary}</p>
                </div>
                <div className="text-right text-[11px] text-slate-500 shrink-0">
                  <span className="uppercase font-semibold">{r.report_type.replace(/_/g, " ")}</span>
                  <div>{(r.created_at || "").slice(0, 10)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold">Generate Snapshot Report</h3>
              <button type="button" onClick={() => setShowModal(false)} className="cursor-pointer">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleGenerate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Report Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mid-Term Enrollment & Fee Summary"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="executive_summary">Executive Summary</option>
                  <option value="finance">Fee & Revenue Snapshot</option>
                  <option value="enrollment">Enrollment & Registry</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Period Label</label>
                <input
                  type="text"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  {generating ? "Generating..." : "Archive Snapshot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
