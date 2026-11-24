"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Filter,
  Loader2,
  Paperclip,
  Send,
  Upload,
  X,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

type UniversityFilterStatus = "all" | "pending" | "submitted" | "graded";

function getAssignmentStatusKey(a: any): "pending" | "submitted" | "graded" {
  const status = String(a?.submission?.status || "").toLowerCase();
  if (status === "graded") return "graded";
  if (a?.submission) return "submitted";
  return "pending";
}

function isDatePast(dateStr: string | null | undefined, todayIso: string): boolean {
  if (!dateStr || !todayIso) return false;
  return String(dateStr).slice(0, 10) < todayIso;
}

export default function StudentAssignmentsPage() {
  const { data, loading, error, reload, mutate } =
    useStudentPortalSection("assignments");

  const [todayIso, setTodayIso] = useState("");
  const [statusFilter, setStatusFilter] = useState<UniversityFilterStatus>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setTodayIso(new Date().toISOString().slice(0, 10));
  }, []);

  const isUniversity = data?.school?.schoolType === "university";
  const assignments: any[] = data?.assignments || [];
  const registeredCourses: any[] = data?.registeredCourses || [];

  const uniCounts = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let graded = 0;
    for (const a of assignments) {
      const k = getAssignmentStatusKey(a);
      if (k === "graded") graded++;
      else if (k === "submitted") submitted++;
      else pending++;
    }
    return { all: assignments.length, pending, submitted, graded };
  }, [assignments]);

  const filteredUniversityAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (courseFilter !== "all" && String(a.course_id) !== courseFilter) {
        return false;
      }
      if (statusFilter !== "all" && getAssignmentStatusKey(a) !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [assignments, courseFilter, statusFilter]);

  if (loading) {
    return <StudentPageLoading label="Loading coursework & assignments..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const openSubmitModal = (a: any) => {
    setActiveAssignment(a);
    setResponseText(a.submission?.response_text || "");
    setSubmissionUrl(a.submission?.submission_url || "");
    setUploadedFileName("");
    setToast(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setToast(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const endpoint = isUniversity
        ? "/api/student/submissions/upload"
        : "/api/upload";
      if (!isUniversity) {
        fd.append("folder", "homework");
      }
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Upload failed");
      }
      setSubmissionUrl(String(json.url));
      setUploadedFileName(file.name);
    } catch (err: any) {
      setToast({
        type: "error",
        text: err?.message || "Failed to upload attachment.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment) return;
    setSubmitting(true);
    setToast(null);
    const res = await mutate("submit_assignment", {
      assignmentId: activeAssignment.id,
      responseText,
      submissionUrl,
    });
    setSubmitting(false);
    if (res.ok) {
      setActiveAssignment(null);
      setToast({
        type: "success",
        text:
          res.message ||
          (isUniversity
            ? "Coursework submitted successfully."
            : "Homework submitted successfully."),
      });
    } else {
      setToast({
        type: "error",
        text:
          res.error ||
          (isUniversity
            ? "Unable to submit coursework."
            : "Unable to submit homework."),
      });
    }
  };

  // =========================================================================
  // UNIVERSITY STUDENT COURSEWORK & ASSIGNMENTS VIEW
  // =========================================================================
  if (isUniversity) {
    const activeIsGraded = activeAssignment?.submission?.status === "graded";
    const activePastDue = isDatePast(activeAssignment?.due_date, todayIso);
    const activeClosed = activeAssignment?.status === "closed";
    const activeLockedForEdit =
      Boolean(activeAssignment?.submission) &&
      (activeIsGraded || activePastDue || activeClosed);
    const activeCannotSubmitNew =
      !activeAssignment?.submission && (activeIsGraded || activeClosed);
    const activeReadOnly = activeLockedForEdit || activeCannotSubmitNew;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Coursework &amp; Assignments
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              View lecturer-posted coursework for your registered semester courses, submit responses or files, and review graded feedback.
            </p>
          </div>

          <Link
            href="/student/registration"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            <span>Registered Courses ({registeredCourses.length})</span>
          </Link>
        </div>

        {toast && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Filter Tabs & Course Dropdown */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "All", count: uniCounts.all },
                { id: "pending", label: "Pending", count: uniCounts.pending },
                { id: "submitted", label: "Submitted", count: uniCounts.submitted },
                { id: "graded", label: "Graded", count: uniCounts.graded },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              aria-label="Filter by registered course"
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 min-w-[200px]"
            >
              <option value="all">All Registered Courses</option>
              {registeredCourses.map((c: any) => (
                <option key={c.id} value={String(c.id)}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {registeredCourses.length === 0 ? (
          <StudentEmptyState
            icon={BookOpen}
            title="No Registered Courses Found"
            description="Register your semester courses first so lecturer coursework and assignments appear here."
          />
        ) : filteredUniversityAssignments.length === 0 ? (
          <StudentEmptyState
            icon={FileCheck2}
            title={
              assignments.length === 0
                ? "No Assignments Posted Yet"
                : "No Matching Assignments"
            }
            description={
              assignments.length === 0
                ? "Coursework, quizzes, and lab assignments published by your lecturers will appear here."
                : "Try switching the status tab or selecting a different registered course."
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredUniversityAssignments.map((a: any) => {
              const sub = a.submission;
              const statusKey = getAssignmentStatusKey(a);
              const isOverdue =
                statusKey === "pending" && isDatePast(a.due_date, todayIso);
              const canEditSub =
                statusKey === "submitted" &&
                !isDatePast(a.due_date, todayIso) &&
                a.status !== "closed";

              return (
                <div
                  key={a.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3.5 shadow-2xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {a.course?.code && (
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                            {a.course.code} · {a.course.name}
                          </span>
                        )}
                        {a.assessment_type && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold capitalize">
                            {a.assessment_type}
                          </span>
                        )}
                        {Number(a.weight_percentage || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-semibold">
                            Weight {a.weight_percentage}%
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                            <Clock className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                      </div>

                      <h2 className="text-sm font-bold text-slate-900 dark:text-white pt-0.5">
                        {a.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {a.lecturer_name && (
                          <span>Lecturer: {a.lecturer_name}</span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {a.due_date || "Flexible"}
                        </span>
                        <span>Max Score: {a.max_score ?? 100} pts</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize border ${
                          statusKey === "graded"
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                            : statusKey === "submitted"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {statusKey === "graded"
                          ? "Graded"
                          : statusKey === "submitted"
                          ? "Submitted"
                          : "Pending"}
                      </span>

                      <button
                        type="button"
                        onClick={() => openSubmitModal(a)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                          statusKey === "pending"
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20"
                            : "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {statusKey === "pending"
                          ? "View & Submit"
                          : canEditSub
                          ? "View / Edit Submission"
                          : "View Details"}
                      </button>
                    </div>
                  </div>

                  {a.instructions && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {a.instructions}
                    </p>
                  )}

                  {sub && (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 p-3.5 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Submitted:{" "}
                          {sub.submitted_at
                            ? new Date(sub.submitted_at).toLocaleString()
                            : "Recorded"}
                        </span>
                        {sub.score != null && (
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            Score: {sub.score} / {a.max_score ?? 100}
                          </span>
                        )}
                      </div>
                      {sub.feedback && (
                        <p className="text-indigo-700 dark:text-indigo-300 font-medium">
                          Lecturer Feedback: {sub.feedback}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Interactive Details & Submission Modal */}
        {activeAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <form
              onSubmit={handleSubmitWork}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeAssignment.course?.code && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                        {activeAssignment.course.code} — {activeAssignment.course.name}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-500">
                      Max {activeAssignment.max_score ?? 100} pts · Due{" "}
                      {activeAssignment.due_date || "Flexible"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeAssignment.title}
                  </h3>
                  {activeAssignment.lecturer_name && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Lecturer: {activeAssignment.lecturer_name}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveAssignment(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Instructions & Lecturer Attachments */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 p-4 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Assignment Instructions
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {activeAssignment.instructions ||
                    "Follow your lecturer's coursework prompt and attach your completed work below."}
                </p>
                {activeAssignment.attachment_url && (
                  <a
                    href={activeAssignment.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>Open Lecturer Attachment / Brief</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Graded Result & Feedback Summary */}
              {activeIsGraded && activeAssignment.submission && (
                <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-indigo-800 dark:text-indigo-200">
                    <span>Graded Result</span>
                    <span>
                      Score: {activeAssignment.submission.score ?? 0} /{" "}
                      {activeAssignment.max_score ?? 100}
                    </span>
                  </div>
                  {activeAssignment.submission.feedback && (
                    <p className="text-indigo-700 dark:text-indigo-300">
                      Lecturer Feedback: {activeAssignment.submission.feedback}
                    </p>
                  )}
                </div>
              )}

              {activeLockedForEdit && !activeIsGraded && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200 font-medium">
                  Editing is locked because the assignment due date has passed or submissions are closed.
                </div>
              )}

              {/* Student Submission Inputs / Read-only Display */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Written Response / Notes
                  </label>
                  <textarea
                    rows={5}
                    value={responseText}
                    disabled={activeReadOnly}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Enter your coursework answer, summary, or submission notes..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-75 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    External Link (Google Doc / Drive / GitHub) or File Upload
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={submissionUrl}
                      disabled={activeReadOnly}
                      onChange={(e) => setSubmissionUrl(e.target.value)}
                      placeholder="https://... or upload PDF, DOCX, ZIP, Image (max 10 MB)"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-75 text-xs text-slate-900 dark:text-white"
                    />
                    {!activeReadOnly && (
                      <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer shrink-0">
                        {uploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        <span>{uploading ? "Uploading..." : "Upload File"}</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.png,.jpg,.jpeg,.webp"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  {(uploadedFileName || submissionUrl) && (
                    <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                      {uploadedFileName && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Uploaded: {uploadedFileName}
                        </span>
                      )}
                      {submissionUrl && (
                        <a
                          href={submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          <span>Preview Attachment</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveAssignment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  {activeReadOnly ? "Close" : "Cancel"}
                </button>
                {!activeReadOnly && (
                  <button
                    type="submit"
                    disabled={submitting || uploading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer shadow-xs"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {submitting
                        ? "Submitting..."
                        : activeAssignment.submission
                        ? "Update Submission"
                        : "Submit Coursework"}
                    </span>
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // HIGH SCHOOL STUDENT HOMEWORK & ASSIGNMENTS VIEW (PRESERVED)
  // =========================================================================
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Assignments &amp; Homework
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          View teacher-posted class homework, submit written answers or file links, and check graded feedback.
        </p>
      </div>

      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {assignments.length === 0 ? (
        <StudentEmptyState
          icon={FileCheck2}
          title="No Homework Posted Yet"
          description="Class assignments and homework posted by your subject teachers will appear here automatically."
        />
      ) : (
        <div className="space-y-4">
          {assignments.map((a: any) => {
            const sub = a.submission;
            return (
              <div
                key={a.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {a.subject?.code && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {a.subject.code} · {a.subject.name}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-slate-500">
                        Due: {a.due_date || "Flexible"} · Max {a.max_score ?? 100} pts
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {a.title}
                    </h2>
                    {a.teacher_name && (
                      <div className="text-[11px] text-slate-500">
                        Posted by {a.teacher_name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize border ${
                        sub?.status === "graded"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : sub
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {sub?.status || "pending submission"}
                    </span>
                    <button
                      type="button"
                      onClick={() => openSubmitModal(a)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      {sub ? "Update Submission" : "Submit Homework"}
                    </button>
                  </div>
                </div>

                {a.instructions && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {a.instructions}
                  </p>
                )}

                {a.attachment_url && (
                  <a
                    href={a.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <span>Download Worksheet / Reference</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {sub && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        Your Submission ({new Date(sub.submitted_at).toLocaleString()})
                      </span>
                      {sub.score != null && (
                        <span className="font-extrabold text-indigo-600">
                          Score: {sub.score} / {a.max_score ?? 100}
                        </span>
                      )}
                    </div>
                    {sub.response_text && (
                      <p className="text-slate-600 dark:text-slate-300">
                        {sub.response_text}
                      </p>
                    )}
                    {sub.feedback && (
                      <p className="text-indigo-700 dark:text-indigo-300 font-medium">
                        Teacher Feedback: {sub.feedback}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* High School Submit Homework Modal */}
      {activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitWork}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Submit: {activeAssignment.title}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Saved directly to your school&apos;s Supabase assignment ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAssignment(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Written Answers / Notes
              </label>
              <textarea
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your homework answers or notes..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Attachment URL or Upload Image/Scan (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://... or upload below"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer">
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span>{uploading ? "..." : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveAssignment(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{submitting ? "Submitting..." : "Submit Homework"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
