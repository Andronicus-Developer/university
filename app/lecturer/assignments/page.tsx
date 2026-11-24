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

interface SubmissionItem {
  id: string;
  student_id: string;
  student_name: string;
  student_number: string;
  response_text: string | null;
  submission_url: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  status: string;
}

interface AssignmentItem {
  id: string;
  course_id: string | null;
  course_code: string;
  course_name: string;
  title: string;
  assessment_type?: string;
  weight_percentage?: number;
  instructions: string | null;
  due_date: string | null;
  max_score: number;
  submissions: SubmissionItem[];
}

interface UniAssignmentsPayload {
  courses: Array<{ id: string; code: string; name: string }>;
  assignments: AssignmentItem[];
  missingTables: string[];
}

export default function LecturerAssignmentsPage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<UniAssignmentsPayload>("uni_assignments");

  const [showCreate, setShowCreate] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [assessmentType, setAssessmentType] = useState("assignment");
  const [weightPercentage, setWeightPercentage] = useState("15");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  const [scoreEdits, setScoreEdits] = useState<Record<string, { score: string; feedback: string }>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedCourseId = useMemo(() => {
    if (courseId) return courseId;
    return data?.courses?.[0]?.id || "";
  }, [courseId, data?.courses]);

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourseId || !title.trim()) {
      setBanner({ type: "error", text: "Course and coursework title are required." });
      return;
    }
    setSaving(true);
    setBanner(null);
    const res = await mutate("create_assignment", {
      courseId: selectedCourseId,
      title: title.trim(),
      assessmentType,
      weightPercentage: Number(weightPercentage || 0),
      dueDate: dueDate || null,
      maxScore: Number(maxScore || 100),
      instructions: instructions.trim(),
    });
    setSaving(false);

    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to publish coursework." });
    } else {
      setTitle("");
      setInstructions("");
      setDueDate("");
      setShowCreate(false);
      setBanner({ type: "success", text: res.message || "Coursework published." });
    }
  }

  async function handleGradeSubmission(sub: SubmissionItem) {
    const edit = scoreEdits[sub.id] || {
      score: sub.score != null ? String(sub.score) : "0",
      feedback: sub.feedback || "",
    };
    setGradingId(sub.id);
    setBanner(null);
    const res = await mutate("grade_submission", {
      submissionId: sub.id,
      score: Number(edit.score || 0),
      feedback: edit.feedback,
    });
    setGradingId(null);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to grade submission." });
    } else {
      setBanner({ type: "success", text: `Graded ${sub.student_name}.` });
    }
  }

  if (loading) return <StaffPageLoading label="Loading assignments & continuous assessments..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Coursework, Quizzes &amp; CA Scoring</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Assignments &amp; Continuous Assessment
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create course assignments or quizzes, review student submissions, and record CA marks live.
          </p>
        </div>

        {(data?.courses || []).length > 0 && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer self-start"
          >
            {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{showCreate ? "Close Form" : "Create Coursework / Quiz"}</span>
          </button>
        )}
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
          onSubmit={handleCreateAssignment}
          className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Publish New Assignment / Continuous Assessment
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Course *
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {(data?.courses || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Assessment Type
              </label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="assignment">Written Assignment</option>
                <option value="quiz">Quiz / Pop Test</option>
                <option value="midterm">Mid-Semester Test</option>
                <option value="project">Group / Capstone Project</option>
                <option value="lab">Lab Practical</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm Case Study Paper"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Max Score
              </label>
              <input
                type="number"
                min="1"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                CA Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={weightPercentage}
                onChange={(e) => setWeightPercentage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Instructions / Rubric
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Detail deliverables, submission format, and grading criteria..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Publish Assignment</span>
            </button>
          </div>
        </form>
      )}

      {(data?.assignments || []).length === 0 ? (
        <StaffEmptyState
          icon={FileCheck2}
          title="No Assignments Published Yet"
          description="Use the 'Create Coursework / Quiz' button above to post assignments and collect continuous assessment scores."
        />
      ) : (
        <div className="space-y-4">
          {data!.assignments.map((asg) => (
            <div
              key={asg.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                      {asg.course_code || "Course"}
                    </span>
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      {asg.assessment_type || "assignment"}
                      {asg.weight_percentage ? ` · ${asg.weight_percentage}% weight` : ""}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Due: {asg.due_date || "Flexible"} · Max {asg.max_score} pts
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                    {asg.title}
                  </h3>
                  {asg.instructions && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {asg.instructions}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => mutate("delete_assignment", { assignmentId: asg.id })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-semibold cursor-pointer self-start"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Student Submissions ({asg.submissions.length})
                </h4>
                {asg.submissions.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No student submissions received yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {asg.submissions.map((sub) => {
                      const edit = scoreEdits[sub.id] || {
                        score: sub.score != null ? String(sub.score) : "",
                        feedback: sub.feedback || "",
                      };
                      return (
                        <div
                          key={sub.id}
                          className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {sub.student_name}
                              </span>
                              <span className="font-mono text-slate-500">{sub.student_number}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 capitalize">
                                {sub.status}
                              </span>
                            </div>
                            {sub.response_text && (
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                {sub.response_text}
                              </p>
                            )}
                            {sub.submission_url && (
                              <a
                                href={sub.submission_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Open Attachment</span>
                              </a>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min="0"
                              max={asg.max_score}
                              placeholder="Score"
                              value={edit.score}
                              onChange={(e) =>
                                setScoreEdits((p) => ({
                                  ...p,
                                  [sub.id]: { ...edit, score: e.target.value },
                                }))
                              }
                              className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                            <input
                              type="text"
                              placeholder="Feedback"
                              value={edit.feedback}
                              onChange={(e) =>
                                setScoreEdits((p) => ({
                                  ...p,
                                  [sub.id]: { ...edit, feedback: e.target.value },
                                }))
                              }
                              className="w-44 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                            <button
                              type="button"
                              disabled={gradingId === sub.id}
                              onClick={() => handleGradeSubmission(sub)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              {gradingId === sub.id ? "Saving..." : "Save Mark"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
