"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Phone,
  Plus,
  User,
  X,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

interface IndustrialAttachment {
  id: string;
  company_name: string;
  supervisor_name: string | null;
  supervisor_phone: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "pending" | "placed" | "completed" | "terminated";
  evaluation_notes: string | null;
}

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

interface AttachmentsPayload {
  school: { id: string; name: string };
  student: any | null;
  attachments: IndustrialAttachment[];
  reports: AttachmentReport[];
  reportsTableMissing?: boolean;
}

const PLACEMENT_STYLES: Record<string, string> = {
  placed:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  terminated:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
};

const REPORT_STYLES: Record<string, string> = {
  approved:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  reviewed:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  submitted:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
};

export default function VocationalAttachmentsPage() {
  const { data, loading, error, reload, mutate } =
    useStudentPortalSection<AttachmentsPayload>("attachments");

  const [showReportForm, setShowReportForm] = useState(false);
  const [attachmentId, setAttachmentId] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [reportDate, setReportDate] = useState("");

  useEffect(() => {
    setReportDate((prev) => prev || new Date().toISOString().slice(0, 10));
  }, []);
  const [hoursWorked, setHoursWorked] = useState("40");
  const [activitiesSummary, setActivitiesSummary] = useState("");
  const [skillsLearned, setSkillsLearned] = useState("");
  const [challenges, setChallenges] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const placementMap = useMemo(() => {
    const map = new Map<string, IndustrialAttachment>();
    for (const a of data?.attachments || []) {
      map.set(a.id, a);
    }
    return map;
  }, [data?.attachments]);

  const totalAttachmentHours = useMemo(() => {
    return (data?.reports || []).reduce((sum, r) => sum + Number(r.hours_worked || 0), 0);
  }, [data?.reports]);

  function openFormForAttachment(id?: string) {
    const fallbackId = id || data?.attachments?.[0]?.id || "";
    setAttachmentId(fallbackId);
    const existingWeeks = (data?.reports || []).filter((r) => r.attachment_id === fallbackId);
    setWeekNumber(String(existingWeeks.length + 1));
    setShowReportForm(true);
    setBanner(null);
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!attachmentId || !activitiesSummary.trim()) {
      setBanner({
        type: "error",
        text: "Select a placement and summarize your activities for the week.",
      });
      return;
    }
    setSubmitting(true);
    setBanner(null);
    const res = await mutate("submit_attachment_report", {
      attachmentId,
      weekNumber: Number(weekNumber || 1),
      reportDate,
      hoursWorked: Number(hoursWorked || 40),
      activitiesSummary: activitiesSummary.trim(),
      skillsLearned: skillsLearned.trim(),
      challenges: challenges.trim(),
    });
    setSubmitting(false);

    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to submit weekly report." });
      return;
    }
    setActivitiesSummary("");
    setSkillsLearned("");
    setChallenges("");
    setShowReportForm(false);
    setBanner({
      type: "success",
      text: res.message || "Weekly industrial attachment report submitted.",
    });
  }

  if (loading) return <StudentPageLoading label="Loading industrial attachment records..." />;
  if (error) return <StudentPageError error={error} onRetry={reload} />;
  if (!data?.student) return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Field Training &amp; Workplace Supervision</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Industrial Attachments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View your workplace placement details and submit weekly attachment progress reports.
          </p>
        </div>

        {(data.attachments || []).length > 0 && (
          <button
            type="button"
            onClick={() => (showReportForm ? setShowReportForm(false) : openFormForAttachment())}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer self-start"
          >
            {showReportForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{showReportForm ? "Close Form" : "Submit Weekly Report"}</span>
          </button>
        )}
      </div>

      {data.reportsTableMissing && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <p className="font-bold">Weekly Attachment Reports table pending migration</p>
            <p className="mt-0.5">
              Apply <code className="font-mono">20261124000006_student_portal_tables_and_rls.sql</code>{" "}
              in Supabase so submitted field reports persist.
            </p>
          </div>
        </div>
      )}

      {banner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-medium flex items-center justify-between gap-2 ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Placement Cards */}
      {(data.attachments || []).length === 0 ? (
        <StudentEmptyState
          icon={Briefcase}
          title="No Industrial Attachment Assigned Yet"
          description="Your school's placement coordinator has not recorded an industrial attachment placement for you yet."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.attachments.map((att) => (
            <div
              key={att.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {att.company_name}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>
                        {att.start_date || "TBA"} – {att.end_date || "Ongoing"}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${
                    PLACEMENT_STYLES[att.status] || PLACEMENT_STYLES.pending
                  }`}
                >
                  {att.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <User className="h-3.5 w-3.5 text-teal-500" />
                  <span>Supervisor: {att.supervisor_name || "Assigned on arrival"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="h-3.5 w-3.5 text-teal-500" />
                  <span>{att.supervisor_phone || "No contact listed"}</span>
                </div>
              </div>

              {att.evaluation_notes && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Coordinator Evaluation Notes:{" "}
                  </span>
                  {att.evaluation_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Weekly Report Submission Modal / Panel */}
      {showReportForm && (
        <form
          onSubmit={handleSubmitReport}
          className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Submit Weekly Industrial Attachment Report
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Placement Organization *
              </label>
              <select
                value={attachmentId}
                onChange={(e) => setAttachmentId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {(data.attachments || []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.company_name} ({a.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Week # *
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Hours Worked
              </label>
              <input
                type="number"
                min="1"
                max="80"
                step="0.5"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Week Ending Date
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Skills Learned
              </label>
              <input
                type="text"
                value={skillsLearned}
                onChange={(e) => setSkillsLearned(e.target.value)}
                placeholder="e.g., CNC setup, PLC diagnostics, preventive maintenance"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Weekly Activities Summary *
            </label>
            <textarea
              rows={3}
              value={activitiesSummary}
              onChange={(e) => setActivitiesSummary(e.target.value)}
              placeholder="Detail daily duties, workshop inspections, and tasks assigned by your industry supervisor..."
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Challenges &amp; Support Needed
            </label>
            <textarea
              rows={2}
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="Optional note on technical bottlenecks or equipment constraints..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReportForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Submit Weekly Report</span>
            </button>
          </div>
        </form>
      )}

      {/* Weekly Reports List */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Weekly Field Reports ({data.reports.length})
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{totalAttachmentHours.toFixed(1)} field hours documented</span>
          </span>
        </div>

        {(data.reports || []).length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
            No weekly attachment reports submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {data.reports.map((rep) => {
              const company = placementMap.get(rep.attachment_id)?.company_name;
              return (
                <div
                  key={rep.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-teal-600 text-white text-[11px] font-bold">
                        Week {rep.week_number}
                      </span>
                      {company && (
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {company}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {rep.report_date} · {Number(rep.hours_worked || 0)} hrs
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${
                        REPORT_STYLES[rep.status] || REPORT_STYLES.submitted
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {rep.activities_summary}
                  </p>

                  {rep.skills_learned && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">Skills Learned:</strong>{" "}
                      {rep.skills_learned}
                    </p>
                  )}

                  {rep.challenges && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">Challenges:</strong>{" "}
                      {rep.challenges}
                    </p>
                  )}

                  {rep.supervisor_remarks && (
                    <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 text-[11px] text-slate-700 dark:text-slate-300">
                      <strong className="text-teal-700 dark:text-teal-400">
                        Supervisor Remarks:
                      </strong>{" "}
                      {rep.supervisor_remarks}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
