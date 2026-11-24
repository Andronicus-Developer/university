"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Loader2,
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

export default function HighSchoolAssignmentsPage() {
  const { data, loading, error, reload, mutate } =
    useStudentPortalSection("assignments");

  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (loading) {
    return <StudentPageLoading label="Loading homework & assignments..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const assignments = data.assignments || [];

  const openSubmitModal = (a: any) => {
    setActiveAssignment(a);
    setResponseText(a.submission?.response_text || "");
    setSubmissionUrl(a.submission?.submission_url || "");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "homework");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Upload failed");
      }
      setSubmissionUrl(String(json.url));
    } catch (err: any) {
      setToast({
        type: "error",
        text: err?.message || "Failed to upload homework file.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
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
        text: res.message || "Homework submitted successfully.",
      });
    } else {
      setToast({
        type: "error",
        text: res.error || "Unable to submit homework.",
      });
    }
  };

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

      {/* Submit Homework Modal */}
      {activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitHomework}
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
