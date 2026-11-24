"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, Save } from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

function previewWaecGrade(total: number): string {
  if (total >= 80) return "A1";
  if (total >= 75) return "B2";
  if (total >= 70) return "B3";
  if (total >= 65) return "C4";
  if (total >= 60) return "C5";
  if (total >= 55) return "C6";
  if (total >= 50) return "D7";
  if (total >= 45) return "E8";
  return "F9";
}

export default function TeacherReportCardsPage() {
  const { data, loading, error, reload, mutate } = useStaffPortalSection<any>("hs_report_cards");

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [drafts, setDrafts] = useState<
    Record<string, { ca: string; exam: string; remarks: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeClassId = useMemo(
    () => (classId && (data?.classes || []).some((c: any) => c.id === classId) ? classId : data?.classes?.[0]?.id || ""),
    [classId, data?.classes]
  );
  const activeSubjectId = useMemo(
    () => (subjectId && (data?.subjects || []).some((s: any) => s.id === subjectId) ? subjectId : data?.subjects?.[0]?.id || ""),
    [subjectId, data?.subjects]
  );

  const roster: any[] = useMemo(
    () => (activeClassId ? data?.studentsByClass?.[activeClassId] || [] : []),
    [data?.studentsByClass, activeClassId]
  );

  const existingByStudent = useMemo(() => {
    const map = new Map<string, any>();
    for (const sc of data?.scores || []) {
      if (String(sc.subject_id) === String(activeSubjectId)) {
        map.set(String(sc.student_id), sc);
      }
    }
    return map;
  }, [data?.scores, activeSubjectId]);

  function getVals(studentId: string) {
    const key = `${activeSubjectId}:${studentId}`;
    if (drafts[key]) return drafts[key];
    const ex = existingByStudent.get(String(studentId));
    return {
      ca: ex ? String(ex.ca_score ?? 0) : "0",
      exam: ex ? String(ex.exam_score ?? 0) : "0",
      remarks: ex?.teacher_remarks || "",
    };
  }

  function updateRow(studentId: string, patch: Partial<{ ca: string; exam: string; remarks: string }>) {
    const key = `${activeSubjectId}:${studentId}`;
    const cur = getVals(studentId);
    setDrafts((p) => ({ ...p, [key]: { ...cur, ...patch } }));
  }

  async function handleSaveScores(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSubjectId || roster.length === 0) return;
    setSaving(true);
    setBanner(null);
    const entries = roster.map((st) => {
      const vals = getVals(st.id);
      return {
        studentId: st.id,
        caScore: Number(vals.ca || 0),
        examScore: Number(vals.exam || 0),
        teacherRemarks: vals.remarks,
      };
    });
    const res = await mutate("save_report_card_scores", {
      programmeId: activeClassId || null,
      subjectId: activeSubjectId,
      entries,
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save report card scores." });
    } else {
      setBanner({ type: "success", text: res.message || "Term report card scores saved." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading term exam & report card sheet..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span>Continuous Assessment + Terminal Examination · {data?.activeTerm?.name || "Current Term"}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Term Exams &amp; Report Card Entry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enter CA and Exam scores per subject. Totals, WAEC grades (A1–F9), and remarks sync straight to Student Report Cards.
          </p>
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

      {(data?.subjects || []).length === 0 || (data?.classes || []).length === 0 ? (
        <StaffEmptyState
          icon={ClipboardCheck}
          title="No Classes or Subjects Assigned"
          description="Ask your School Administrator to assign Classes and Subjects to your teacher record."
        />
      ) : (
        <form
          onSubmit={handleSaveScores}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <select
                value={activeClassId}
                onChange={(e) => setClassId(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {(data?.classes || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <select
                value={activeSubjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {(data?.subjects || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving || roster.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save Report Card Scores</span>
            </button>
          </div>

          {roster.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No students found in this Class/Form.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Admission #</th>
                    <th className="py-2 pr-4 font-semibold">Student Name</th>
                    <th className="py-2 pr-3 font-semibold">CA Score</th>
                    <th className="py-2 pr-3 font-semibold">Exam Score</th>
                    <th className="py-2 pr-3 font-semibold text-center">Total</th>
                    <th className="py-2 pr-3 font-semibold text-center">Grade</th>
                    <th className="py-2 font-semibold">Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roster.map((st) => {
                    const vals = getVals(st.id);
                    const total = Math.min(100, (Number(vals.ca) || 0) + (Number(vals.exam) || 0));
                    const grade = previewWaecGrade(total);

                    return (
                      <tr key={st.id}>
                        <td className="py-2.5 pr-4 font-mono">{st.student_number}</td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                          {st.full_name}
                        </td>
                        <td className="py-2.5 pr-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={vals.ca}
                            onChange={(e) => updateRow(st.id, { ca: e.target.value })}
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={vals.exam}
                            onChange={(e) => updateRow(st.id, { exam: e.target.value })}
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </td>
                        <td className="py-2.5 pr-3 text-center font-bold">{total.toFixed(1)}</td>
                        <td className="py-2.5 pr-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              grade === "F9"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {grade}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <input
                            type="text"
                            value={vals.remarks}
                            onChange={(e) => updateRow(st.id, { remarks: e.target.value })}
                            placeholder="Conduct / subject remark..."
                            className="w-48 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
