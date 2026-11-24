"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Loader2,
  RotateCcw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  MigrationNoticeBanner,
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

interface LogbookEntry {
  id: string;
  student_id: string;
  student_name: string;
  student_number: string | null;
  module_id: string | null;
  module_code: string | null;
  module_name: string | null;
  log_date: string;
  task_title: string;
  task_description: string;
  tools_used: string | null;
  hours_spent: number;
  evidence_url: string | null;
  status: "submitted" | "signed_off" | "needs_revision";
  instructor_feedback: string | null;
  signed_off_at: string | null;
}

interface VocLogbooksPayload {
  school: { id: string; name: string };
  logs: LogbookEntry[];
  modules: Array<{ id: string; code: string; name: string }>;
  missingTables: string[];
}

export default function InstructorLogbooksPage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<VocLogbooksPayload>("voc_logbooks");

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [activeEntry, setActiveEntry] = useState<LogbookEntry | null>(null);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const stats = useMemo(() => {
    const logs = data?.logs || [];
    return {
      total: logs.length,
      submitted: logs.filter((l) => l.status === "submitted").length,
      signedOff: logs.filter((l) => l.status === "signed_off").length,
      revision: logs.filter((l) => l.status === "needs_revision").length,
    };
  }, [data?.logs]);

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.logs || []).filter((log) => {
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (moduleFilter !== "all" && log.module_id !== moduleFilter) return false;
      if (!q) return true;
      return (
        log.student_name.toLowerCase().includes(q) ||
        (log.student_number || "").toLowerCase().includes(q) ||
        log.task_title.toLowerCase().includes(q) ||
        (log.tools_used || "").toLowerCase().includes(q)
      );
    });
  }, [data?.logs, statusFilter, moduleFilter, query]);

  function openReviewModal(entry: LogbookEntry) {
    setActiveEntry(entry);
    setFeedback(entry.instructor_feedback || "");
  }

  async function submitReview(status: "signed_off" | "needs_revision") {
    if (!activeEntry) return;
    setSaving(true);
    setBanner(null);
    const result = await mutate("review_logbook", {
      entryId: activeEntry.id,
      status,
      instructorFeedback: feedback.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setBanner({ type: "error", text: result.error || "Failed to update logbook review." });
      return;
    }
    setBanner({
      type: "success",
      text:
        status === "signed_off"
          ? `Signed off "${activeEntry.task_title}" for ${activeEntry.student_name}.`
          : `Returned "${activeEntry.task_title}" for trainee revision.`,
    });
    setActiveEntry(null);
  }

  if (loading) return <StaffPageLoading label="Loading workshop practical logbooks..." />;
  if (error || !data) {
    return <StaffPageError error={error || "Failed to load logbooks"} onRetry={reload} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Practical Logbook Sign-offs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.school.name} • Review trainee workshop hours, tool usage, and practical evidence
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            {stats.submitted} Pending Sign-off
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            {stats.signedOff} Signed Off
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
            {stats.revision} Needs Revision
          </span>
        </div>
      </div>

      <MigrationNoticeBanner tables={data.missingTables} />

      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { value: "all", label: `All (${stats.total})` },
            { value: "submitted", label: `Submitted (${stats.submitted})` },
            { value: "signed_off", label: `Signed Off (${stats.signedOff})` },
            { value: "needs_revision", label: `Needs Revision (${stats.revision})` },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === tab.value
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trainee, task, tools..."
              className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 w-full sm:w-56"
            />
          </div>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Trade Modules</option>
            {data.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <StaffEmptyState
          icon={ClipboardCheck}
          title="No Practical Logbook Entries Found"
          description="Trainee practical submissions matching your filters will appear here ready for instructor verification and digital sign-off."
        />
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((entry) => {
            const statusClasses =
              entry.status === "signed_off"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : entry.status === "needs_revision"
                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";

            return (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {entry.student_name}
                      </span>
                      {entry.student_number && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {entry.student_number}
                        </span>
                      )}
                      {entry.module_code && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {entry.module_code} — {entry.module_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                      {entry.task_title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase ${statusClasses}`}
                    >
                      {entry.status.replace(/_/g, " ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => openReviewModal(entry)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      {entry.status === "submitted" ? "Verify & Sign Off" : "Update Review"}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {entry.task_description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Logged {(entry.log_date || "").slice(0, 10)} • {entry.hours_spent} hrs
                  </span>
                  {entry.tools_used && (
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5" />
                      Tools: {entry.tools_used}
                    </span>
                  )}
                  {entry.evidence_url && (
                    <a
                      href={entry.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View Practical Evidence</span>
                    </a>
                  )}
                </div>

                {entry.instructor_feedback && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 px-3.5 py-2.5 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Instructor Remarks:
                    </span>{" "}
                    <span className="text-slate-600 dark:text-slate-300">
                      {entry.instructor_feedback}
                    </span>
                    {entry.signed_off_at && (
                      <span className="block text-[10px] text-slate-400 mt-1">
                        Updated {entry.signed_off_at.slice(0, 10)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {activeEntry && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Review Logbook Entry
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeEntry.student_name} • {activeEntry.task_title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveEntry(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Instructor Remarks & Safety Notes
                </label>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Note workmanship quality, PPE compliance, or corrections required..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitReview("needs_revision")}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Request Revision</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitReview("signed_off")}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Verify & Sign Off</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
