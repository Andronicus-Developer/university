"use client";

import React, { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Phone,
  Search,
  Star,
  UserCheck,
  X,
} from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  MigrationNoticeBanner,
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

interface AttachmentReport {
  id: string;
  attachment_id: string;
  week_number: number;
  report_date: string;
  activities_summary: string;
  skills_learned: string | null;
  challenges: string | null;
  hours_worked: number;
  supervisor_remarks: string | null;
  status: "submitted" | "reviewed" | "approved";
}

interface IndustrialAttachment {
  id: string;
  student_id: string;
  student_name: string;
  student_number: string | null;
  company_name: string;
  supervisor_name: string | null;
  supervisor_phone: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "pending" | "placed" | "completed" | "terminated";
  evaluation_notes: string | null;
  supervisor_score: number | null;
  evaluated_at: string | null;
  reports: AttachmentReport[];
}

interface VocAttachmentsPayload {
  school: { id: string; name: string };
  attachments: IndustrialAttachment[];
  missingTables: string[];
}

export default function InstructorAttachmentsPage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<VocAttachmentsPayload>("voc_attachments");

  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [evalTarget, setEvalTarget] = useState<IndustrialAttachment | null>(null);
  const [evalScore, setEvalScore] = useState("85");
  const [evalStatus, setEvalStatus] = useState<
    "pending" | "placed" | "completed" | "terminated"
  >("completed");
  const [evalNotes, setEvalNotes] = useState("");

  const [reportTarget, setReportTarget] = useState<AttachmentReport | null>(null);
  const [reportRemarks, setReportRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const stats = useMemo(() => {
    const list = data?.attachments || [];
    const pendingReports = list.reduce(
      (sum, a) => sum + (a.reports || []).filter((r) => r.status === "submitted").length,
      0
    );
    return {
      total: list.length,
      placed: list.filter((a) => a.status === "placed").length,
      completed: list.filter((a) => a.status === "completed").length,
      pendingReports,
    };
  }, [data?.attachments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.attachments || []).filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.student_name.toLowerCase().includes(q) ||
        (a.student_number || "").toLowerCase().includes(q) ||
        a.company_name.toLowerCase().includes(q) ||
        (a.supervisor_name || "").toLowerCase().includes(q)
      );
    });
  }, [data?.attachments, statusFilter, query]);

  function openEvaluateModal(attachment: IndustrialAttachment) {
    setEvalTarget(attachment);
    setEvalScore(
      attachment.supervisor_score != null ? String(attachment.supervisor_score) : "85"
    );
    setEvalStatus(attachment.status === "pending" ? "placed" : attachment.status);
    setEvalNotes(attachment.evaluation_notes || "");
  }

  function openReportModal(report: AttachmentReport) {
    setReportTarget(report);
    setReportRemarks(report.supervisor_remarks || "");
  }

  async function submitEvaluation(e: React.FormEvent) {
    e.preventDefault();
    if (!evalTarget) return;
    setSaving(true);
    setBanner(null);
    const result = await mutate("evaluate_attachment", {
      attachmentId: evalTarget.id,
      supervisorScore: evalScore.trim() === "" ? null : Number(evalScore),
      evaluationNotes: evalNotes.trim() || null,
      status: evalStatus,
    });
    setSaving(false);
    if (!result.ok) {
      setBanner({ type: "error", text: result.error || "Failed to save placement evaluation." });
      return;
    }
    setBanner({
      type: "success",
      text: `Updated evaluation for ${evalTarget.student_name} at ${evalTarget.company_name}.`,
    });
    setEvalTarget(null);
  }

  async function submitReportReview(status: "reviewed" | "approved") {
    if (!reportTarget) return;
    setSaving(true);
    setBanner(null);
    const result = await mutate("review_attachment_report", {
      reportId: reportTarget.id,
      status,
      supervisorRemarks: reportRemarks.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setBanner({ type: "error", text: result.error || "Failed to review weekly report." });
      return;
    }
    setBanner({
      type: "success",
      text: `Week ${reportTarget.week_number} attachment report marked as ${status}.`,
    });
    setReportTarget(null);
  }

  if (loading) return <StaffPageLoading label="Loading industrial placements & weekly reports..." />;
  if (error || !data) {
    return <StaffPageError error={error || "Failed to load attachments"} onRetry={reload} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Industrial Attachments & Placements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.school.name} • Monitor trainee workplace hosts, weekly field logs, and scores
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            {stats.pendingReports} Unreviewed Log{stats.pendingReports === 1 ? "" : "s"}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
            {stats.placed} Active
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            {stats.completed} Completed
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
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "pending", "placed", "completed", "terminated"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize cursor-pointer ${
                statusFilter === st
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trainee or host company..."
            className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 w-full md:w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <StaffEmptyState
          icon={Briefcase}
          title="No Industrial Attachments Found"
          description="Trainee industrial placements and weekly employer field reports will appear here as trainees are placed by Vocational Administration."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((att) => (
            <div
              key={att.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {att.student_name}
                    </span>
                    {att.student_number && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {att.student_number}
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        att.status === "completed"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : att.status === "placed"
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                          : att.status === "terminated"
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      {att.company_name}
                    </span>
                    {att.supervisor_name && (
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                        Host: {att.supervisor_name}
                      </span>
                    )}
                    {att.supervisor_phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {att.supervisor_phone}
                      </span>
                    )}
                  </div>
                  {(att.start_date || att.end_date) && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Duration: {att.start_date || "TBD"} to {att.end_date || "Ongoing"}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {att.supervisor_score != null && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-200">
                      <Star className="h-3.5 w-3.5" />
                      {att.supervisor_score}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openEvaluateModal(att)}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Evaluate Placement
                  </button>
                </div>
              </div>

              {att.evaluation_notes && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold">Placement Assessment:</span> {att.evaluation_notes}
                </div>
              )}

              {/* Weekly Field Reports */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Weekly Field Reports ({att.reports.length})
                </p>
                {att.reports.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    No weekly logbook reports submitted by this trainee yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {att.reports.map((rep) => (
                      <div
                        key={rep.id}
                        className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              Week {rep.week_number}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {(rep.report_date || "").slice(0, 10)} • {rep.hours_worked} hrs
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                rep.status === "approved"
                                  ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                                  : rep.status === "reviewed"
                                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                  : "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
                              }`}
                            >
                              {rep.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {rep.activities_summary}
                          </p>
                          {rep.skills_learned && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Skills: {rep.skills_learned}
                            </p>
                          )}
                          {rep.supervisor_remarks && (
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                              Remarks: {rep.supervisor_remarks}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openReportModal(rep)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          <span>Review Report</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Placement Evaluation Modal */}
      {evalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Evaluate Placement — {evalTarget.student_name}
              </h3>
              <button
                type="button"
                onClick={() => setEvalTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitEvaluation} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supervisor Score (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={evalScore}
                    onChange={(e) => setEvalScore(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Placement Status
                  </label>
                  <select
                    value={evalStatus}
                    onChange={(e) =>
                      setEvalStatus(
                        e.target.value as "pending" | "placed" | "completed" | "terminated"
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="pending">Pending</option>
                    <option value="placed">Active / Placed</option>
                    <option value="completed">Completed</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Evaluation Summary
                </label>
                <textarea
                  rows={3}
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder="Workplace punctuality, safety discipline, employer feedback..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEvalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Evaluation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weekly Report Review Modal */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Review Week {reportTarget.week_number} Field Report
              </h3>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                {reportTarget.activities_summary}
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Instructor Remarks
                </label>
                <textarea
                  rows={3}
                  value={reportRemarks}
                  onChange={(e) => setReportRemarks(e.target.value)}
                  placeholder="Confirm field log alignment with syllabus..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitReportReview("reviewed")}
                  className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Mark Reviewed
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitReportReview("approved")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Approve Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
