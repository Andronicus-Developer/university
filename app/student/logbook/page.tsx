"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImagePlus,
  Loader2,
  NotebookPen,
  Plus,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

interface LogbookModule {
  id: string;
  code: string;
  name: string;
  practical_hours?: number;
  theory_hours?: number;
}

interface PracticalLogEntry {
  id: string;
  module_id: string | null;
  log_date: string;
  task_title: string;
  task_description: string;
  tools_used: string | null;
  hours_spent: number;
  evidence_url: string | null;
  status: "submitted" | "signed_off" | "needs_revision";
  instructor_feedback: string | null;
  signed_off_by_name: string | null;
  signed_off_at: string | null;
  module: { id: string; code: string; name: string } | null;
}

interface LogbookPayload {
  school: { id: string; name: string };
  student: any | null;
  logs: PracticalLogEntry[];
  modules: LogbookModule[];
  tableMissing?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  signed_off:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  submitted:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  needs_revision:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
};

const STATUS_LABELS: Record<string, string> = {
  signed_off: "Signed Off",
  submitted: "Awaiting Sign-Off",
  needs_revision: "Needs Revision",
};

export default function VocationalLogbookPage() {
  const { data, loading, error, reload, mutate } = useStudentPortalSection<LogbookPayload>("logbook");

  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  // Form state
  const [moduleId, setModuleId] = useState("");
  const [logDate, setLogDate] = useState("");

  useEffect(() => {
    setLogDate((prev) => prev || new Date().toISOString().slice(0, 10));
  }, []);
  const [hoursSpent, setHoursSpent] = useState("2.0");
  const [taskTitle, setTaskTitle] = useState("");
  const [toolsUsed, setToolsUsed] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const stats = useMemo(() => {
    const entries = data?.logs || [];
    const totalHours = entries.reduce((sum, l) => sum + Number(l.hours_spent || 0), 0);
    const signedOff = entries.filter((l) => l.status === "signed_off").length;
    const pending = entries.filter((l) => l.status === "submitted").length;
    const revision = entries.filter((l) => l.status === "needs_revision").length;
    return { totalHours, signedOff, pending, revision };
  }, [data?.logs]);

  const filteredLogs = useMemo(() => {
    return (data?.logs || []).filter((entry) => {
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      if (moduleFilter !== "all" && entry.module_id !== moduleFilter) return false;
      return true;
    });
  }, [data?.logs, statusFilter, moduleFilter]);

  async function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedbackBanner(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "logbook");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        setFeedbackBanner({
          type: "error",
          text: json?.error || "Failed to upload evidence image.",
        });
      } else {
        setEvidenceUrl(json.url);
        setFeedbackBanner({
          type: "success",
          text: "Practical evidence photo uploaded.",
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: "error",
        text: err?.message || "Upload failed.",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmitEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDescription.trim()) {
      setFeedbackBanner({
        type: "error",
        text: "Please provide both a task title and description of practical work.",
      });
      return;
    }
    setSubmitting(true);
    setFeedbackBanner(null);
    const res = await mutate("create_logbook_entry", {
      moduleId: moduleId || null,
      taskTitle: taskTitle.trim(),
      taskDescription: taskDescription.trim(),
      toolsUsed: toolsUsed.trim(),
      logDate,
      hoursSpent: Number(hoursSpent || 1),
      evidenceUrl: evidenceUrl.trim() || null,
    });
    setSubmitting(false);

    if (!res.ok) {
      setFeedbackBanner({ type: "error", text: res.error || "Could not save logbook entry." });
      return;
    }
    setTaskTitle("");
    setToolsUsed("");
    setTaskDescription("");
    setEvidenceUrl("");
    setHoursSpent("2.0");
    setShowForm(false);
    setFeedbackBanner({
      type: "success",
      text: res.message || "Practical logbook entry recorded.",
    });
  }

  async function handleDeleteEntry(entryId: string) {
    setDeletingId(entryId);
    setFeedbackBanner(null);
    const res = await mutate("delete_logbook_entry", { entryId });
    setDeletingId(null);
    if (!res.ok) {
      setFeedbackBanner({ type: "error", text: res.error || "Failed to delete entry." });
    } else {
      setFeedbackBanner({ type: "success", text: "Unsigned logbook entry removed." });
    }
  }

  if (loading) return <StudentPageLoading label="Loading workshop practical logbook..." />;
  if (error) return <StudentPageError error={error} onRetry={reload} />;
  if (!data?.student) return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
            <NotebookPen className="h-3.5 w-3.5" />
            <span>Workshop Practical Record</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Practical Logbook
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record workshop tasks, tools used, and practical hours for instructor verification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer self-start"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          <span>{showForm ? "Close Form" : "Log Practical Session"}</span>
        </button>
      </div>

      {data.tableMissing && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <p className="font-bold">Practical Logbooks table pending database migration</p>
            <p className="mt-0.5">
              Apply <code className="font-mono">20261124000006_student_portal_tables_and_rls.sql</code>{" "}
              in Supabase to enable persistent saving for practical logbook entries.
            </p>
          </div>
        </div>
      )}

      {feedbackBanner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-medium flex items-center justify-between gap-2 ${
            feedbackBanner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Total Hours Logged</span>
            <Clock className="h-4 w-4 text-teal-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.totalHours.toFixed(1)} hrs
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Signed Off</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.signedOff}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Pending Sign-Off</span>
            <NotebookPen className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Needs Revision</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.revision}</p>
        </div>
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <form
          onSubmit={handleSubmitEntry}
          className="rounded-2xl border border-teal-200 dark:border-teal-800/80 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              New Workshop Practical Entry
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Trade Module
              </label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">General Workshop Practice</option>
                {(data.modules || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Date of Practice
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Hours Spent
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Task / Job Title *
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g., Three-phase star-delta starter wiring"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Tools &amp; Equipment Used
              </label>
              <input
                type="text"
                value={toolsUsed}
                onChange={(e) => setToolsUsed(e.target.value)}
                placeholder="e.g., Digital multimeter, wire stripper, torque wrench"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Procedure &amp; Safety Observations *
            </label>
            <textarea
              rows={3}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Summarize steps performed, measurements verified, and PPE/safety checks..."
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Workpiece Photo / Evidence URL (Optional)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://... or upload an image"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5 text-teal-500" />
                )}
                <span>{uploading ? "Uploading..." : "Upload Photo (JPG/PNG)"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleEvidenceUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Logbook Entry</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "all", label: "All Entries" },
            { key: "submitted", label: "Awaiting Sign-Off" },
            { key: "signed_off", label: "Signed Off" },
            { key: "needs_revision", label: "Needs Revision" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Trade Modules</option>
          {(data.modules || []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} — {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Logbook Entries List */}
      {filteredLogs.length === 0 ? (
        <StudentEmptyState
          icon={NotebookPen}
          title="No Practical Logbook Entries"
          description="Use the 'Log Practical Session' button above to record hands-on workshop tasks for instructor sign-off."
        />
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        STATUS_STYLES[entry.status] || STATUS_STYLES.submitted
                      }`}
                    >
                      {STATUS_LABELS[entry.status] || entry.status}
                    </span>
                    {entry.module && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {entry.module.code} · {entry.module.name}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {entry.log_date} · {Number(entry.hours_spent || 0)} hrs
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                    {entry.task_title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {entry.evidence_url && (
                    <a
                      href={entry.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Evidence</span>
                    </a>
                  )}
                  {entry.status !== "signed_off" && (
                    <button
                      type="button"
                      disabled={deletingId === entry.id}
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/80 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>{deletingId === entry.id ? "Removing..." : "Delete"}</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {entry.task_description}
              </p>

              {entry.tools_used && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Wrench className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                  <span>
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">Tools:</strong>{" "}
                    {entry.tools_used}
                  </span>
                </div>
              )}

              {(entry.instructor_feedback || entry.signed_off_by_name) && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 p-3 text-xs space-y-1">
                  {entry.signed_off_by_name && (
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Signed off by {entry.signed_off_by_name}
                      {entry.signed_off_at
                        ? ` on ${new Date(entry.signed_off_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  )}
                  {entry.instructor_feedback && (
                    <p className="text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">Instructor Feedback:</span>{" "}
                      {entry.instructor_feedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
