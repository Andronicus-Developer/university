"use client";

import React, { useMemo, useState } from "react";
import { Award, CheckCircle2, Loader2, Save, Send } from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

function previewGrade(total: number): { letter: string; point: string } {
  if (total >= 80) return { letter: "A", point: "4.00" };
  if (total >= 75) return { letter: "B+", point: "3.50" };
  if (total >= 70) return { letter: "B", point: "3.00" };
  if (total >= 65) return { letter: "C+", point: "2.50" };
  if (total >= 60) return { letter: "C", point: "2.00" };
  if (total >= 50) return { letter: "D", point: "1.00" };
  return { letter: "F", point: "0.00" };
}

interface UniGradesPayload {
  activeTerm: { id: string; name: string } | null;
  courses: Array<{ id: string; code: string; name: string; credits: number }>;
  enrolmentsByCourse: Record<
    string,
    Array<{ enrolment_id: string; student_id: string; full_name: string; student_number: string }>
  >;
  grades: Array<{
    id: string;
    student_id: string;
    course_id: string;
    ca_score: number;
    exam_score: number;
    total_score: number;
    grade_letter: string;
    grade_point: number;
    remarks: string | null;
    status: string;
  }>;
}

export default function LecturerGradesPage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<UniGradesPayload>("uni_grades");

  const [courseId, setCourseId] = useState("");
  const [drafts, setDrafts] = useState<
    Record<string, { ca: string; exam: string; remarks: string }>
  >({});
  const [savingMode, setSavingMode] = useState<"draft" | "published" | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeCourseId = useMemo(() => {
    if (courseId && (data?.courses || []).some((c) => c.id === courseId)) return courseId;
    return data?.courses?.[0]?.id || "";
  }, [courseId, data?.courses]);

  const roster = useMemo(
    () => (activeCourseId ? data?.enrolmentsByCourse?.[activeCourseId] || [] : []),
    [data?.enrolmentsByCourse, activeCourseId]
  );

  const existingByStudent = useMemo(() => {
    const map = new Map<string, UniGradesPayload["grades"][number]>();
    for (const g of data?.grades || []) {
      if (String(g.course_id) === String(activeCourseId)) {
        map.set(String(g.student_id), g);
      }
    }
    return map;
  }, [data?.grades, activeCourseId]);

  function getRowValues(studentId: string) {
    const key = `${activeCourseId}:${studentId}`;
    const d = drafts[key];
    if (d) return d;
    const ex = existingByStudent.get(String(studentId));
    return {
      ca: ex ? String(ex.ca_score ?? 0) : "0",
      exam: ex ? String(ex.exam_score ?? 0) : "0",
      remarks: ex?.remarks || "",
    };
  }

  function updateRow(studentId: string, patch: Partial<{ ca: string; exam: string; remarks: string }>) {
    const key = `${activeCourseId}:${studentId}`;
    const cur = getRowValues(studentId);
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...cur, ...patch },
    }));
  }

  async function submitGrades(status: "draft" | "published") {
    if (!activeCourseId || roster.length === 0) return;
    setSavingMode(status);
    setBanner(null);

    const entries = roster.map((r) => {
      const vals = getRowValues(r.student_id);
      return {
        studentId: r.student_id,
        caScore: Number(vals.ca || 0),
        examScore: Number(vals.exam || 0),
        remarks: vals.remarks,
      };
    });

    const res = await mutate("save_exam_grades", {
      courseId: activeCourseId,
      status,
      entries,
    });
    setSavingMode(null);

    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save exam grades." });
    } else {
      setBanner({ type: "success", text: res.message || "Exam grades saved." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading GPA grading roster..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Award className="h-3.5 w-3.5" />
            <span>Examinations &amp; Transcript Grading</span>
            {data?.activeTerm?.name && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[10px]">
                {data.activeTerm.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Exams &amp; Grade Entry (GPA)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enter CA and Exam marks per registered student. Total scores, letter grades, and GPA points calculate automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={savingMode !== null || roster.length === 0}
            onClick={() => submitGrades("draft")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {savingMode === "draft" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            disabled={savingMode !== null || roster.length === 0}
            onClick={() => submitGrades("published")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {savingMode === "published" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Publish Results to Transcripts</span>
          </button>
        </div>
      </div>

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

      {(data?.courses || []).length === 0 ? (
        <StaffEmptyState
          icon={Award}
          title="No Assigned Courses"
          description="No courses are currently assigned to your lecturer account for GPA grade entry."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <select
              value={activeCourseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white max-w-md"
            >
              {data!.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.credits} Credits)
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {roster.length} registered student(s)
            </span>
          </div>

          {roster.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
              No registered students found for this course.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-4 font-semibold">Matric #</th>
                    <th className="py-2.5 pr-4 font-semibold">Student Name</th>
                    <th className="py-2.5 pr-3 font-semibold">CA Score</th>
                    <th className="py-2.5 pr-3 font-semibold">Exam Score</th>
                    <th className="py-2.5 pr-3 font-semibold text-center">Total</th>
                    <th className="py-2.5 pr-3 font-semibold text-center">Grade</th>
                    <th className="py-2.5 pr-3 font-semibold text-center">GPA</th>
                    <th className="py-2.5 pr-3 font-semibold">Remarks</th>
                    <th className="py-2.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roster.map((st) => {
                    const vals = getRowValues(st.student_id);
                    const total = Math.min(100, (Number(vals.ca) || 0) + (Number(vals.exam) || 0));
                    const { letter, point } = previewGrade(total);
                    const existing = existingByStudent.get(String(st.student_id));

                    return (
                      <tr key={st.student_id}>
                        <td className="py-2.5 pr-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {st.student_number}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                          {st.full_name}
                        </td>
                        <td className="py-2.5 pr-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={vals.ca}
                            onChange={(e) => updateRow(st.student_id, { ca: e.target.value })}
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={vals.exam}
                            onChange={(e) => updateRow(st.student_id, { exam: e.target.value })}
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                          />
                        </td>
                        <td className="py-2.5 pr-3 text-center font-bold">{total.toFixed(1)}</td>
                        <td className="py-2.5 pr-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              letter === "F"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {letter}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-center font-mono">{point}</td>
                        <td className="py-2.5 pr-3">
                          <input
                            type="text"
                            value={vals.remarks}
                            onChange={(e) => updateRow(st.student_id, { remarks: e.target.value })}
                            placeholder="Optional remark..."
                            className="w-36 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                          />
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="text-[11px] font-semibold capitalize text-slate-500">
                            {existing?.status || "pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
