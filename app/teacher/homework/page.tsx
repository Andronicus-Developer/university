"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  MigrationNoticeBanner,
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

export default function TeacherHomeworkPage() {
  const { data, loading, error, reload, mutate } = useStaffPortalSection<any>("hs_homework");

  const [showCreate, setShowCreate] = useState(false);
  const [programmeId, setProgrammeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [scoreEdits, setScoreEdits] = useState<Record<string, { score: string; feedback: string }>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeProgId = useMemo(
    () => programmeId || data?.classes?.[0]?.id || "",
    [programmeId, data?.classes]
  );
  const activeSubjId = useMemo(
    () => subjectId || data?.subjects?.[0]?.id || "",
    [subjectId, data?.subjects]
  );

  async function handlePublishHomework(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setBanner({ type: "error", text: "Homework title is required." });
      return;
    }
    setSaving(true);
    setBanner(null);
    const res = await mutate("create_assignment", {
      programmeId: activeProgId || null,
      subjectId: activeSubjId || null,
      title: title.trim(),
      assessmentType: "homework",
      dueDate: dueDate || null,
      maxScore: Number(maxScore || 100),
      instructions: instructions.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to publish homework." });
    } else {
      setTitle("");
      setInstructions("");
      setDueDate("");
      setShowCreate(false);
      setBanner({ type: "success", text: res.message || "Homework published." });
    }
  }

  async function handleGradeSubmission(sub: any) {
    const edit = scoreEdits[sub.id] || {
      score: sub.score != null ? String(sub.score) : "0",
      feedback: sub.feedback || "",
    };
    setGradingId(sub.id);
    const res = await mutate("grade_submission", {
      submissionId: sub.id,
      score: Number(edit.score || 0),
      feedback: edit.feedback,
    });
    setGradingId(null);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to grade homework." });
    } else {
      setBanner({ type: "success", text: `Marked ${sub.student_name}.` });
    }
  }

  if (loading) return <StaffPageLoading label="Loading homework & class exercises..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Class Exercises &amp; Student Submissions</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Homework &amp; Class Exercises
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Assign homework to a Class &amp; Subject, review student uploads, and enter marks live.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer self-start"
        >
          {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          <span>{showCreate ? "Close Form" : "Post Homework"}</span>
        </button>
      </div>

      <MigrationNoticeBanner tables={data?.missingTables || []} />

      {banner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handlePublishHomework}
          className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Post New Homework Assignment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1">Class / Form</label>
              <select
                value={activeProgId}
                onChange={(e) => setProgrammeId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="">All My Classes</option>
                {(data?.classes || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Subject</label>
              <select
                value={activeSubjId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="">General Subject</option>
                {(data?.subjects || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold mb-1">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Algebra Problem Set #3"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Max Score</label>
              <input
                type="number"
                min="1"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1">Instructions</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Write instructions, textbook exercises, or questions..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Publish Homework</span>
            </button>
          </div>
        </form>
      )}

      {(data?.assignments || []).length === 0 ? (
        <StaffEmptyState
          icon={FileCheck2}
          title="No Homework Posted Yet"
          description="Click 'Post Homework' above to assign homework to your classes and review submissions."
        />
      ) : (
        <div className="space-y-4">
          {data.assignments.map((hw: any) => (
            <div
              key={hw.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {hw.subject_name && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                        {hw.subject_name}
                      </span>
                    )}
                    {hw.class_name && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        {hw.class_name}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      Due: {hw.due_date || "Flexible"} · Max {hw.max_score} pts
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                    {hw.title}
                  </h3>
                  {hw.instructions && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {hw.instructions}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => mutate("delete_assignment", { assignmentId: hw.id })}
                  className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Submissions ({(hw.submissions || []).length})
                </h4>
                {(hw.submissions || []).map((sub: any) => {
                  const edit = scoreEdits[sub.id] || {
                    score: sub.score != null ? String(sub.score) : "",
                    feedback: sub.feedback || "",
                  };
                  return (
                    <div
                      key={sub.id}
                      className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {sub.student_name}{" "}
                          <span className="font-mono font-normal text-slate-500">
                            ({sub.student_number})
                          </span>
                        </div>
                        {sub.response_text && <p>{sub.response_text}</p>}
                        {sub.submission_url && (
                          <a
                            href={sub.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> Attachment
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max={hw.max_score}
                          value={edit.score}
                          onChange={(e) =>
                            setScoreEdits((p) => ({
                              ...p,
                              [sub.id]: { ...edit, score: e.target.value },
                            }))
                          }
                          placeholder="Score"
                          className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <input
                          type="text"
                          value={edit.feedback}
                          onChange={(e) =>
                            setScoreEdits((p) => ({
                              ...p,
                              [sub.id]: { ...edit, feedback: e.target.value },
                            }))
                          }
                          placeholder="Teacher remark..."
                          className="w-40 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          disabled={gradingId === sub.id}
                          onClick={() => handleGradeSubmission(sub)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                        >
                          {gradingId === sub.id ? "Saving..." : "Grade"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
