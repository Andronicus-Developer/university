"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, ClipboardCheck, Loader2, Save } from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  MigrationNoticeBanner,
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

type AssessmentCategoryFilter = "all" | "classwork" | "assignment" | "quiz" | "exam";

function computeLetterGrade(total: number): string {
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  if (total >= 45) return "E";
  return "F";
}

interface RowDraft {
  classwork: string;
  assignment: string;
  quiz: string;
  exam: string;
  remarks: string;
}

export default function TeacherGradesPage() {
  const { data, loading, error, reload, mutate } = useStaffPortalSection<any>("hs_grades");

  const [academicYearId, setAcademicYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AssessmentCategoryFilter>("all");

  // Editable max scores per assessment category (default /20 + /20 + /10 + /50 = /100)
  const [maxScores, setMaxScores] = useState({
    classwork: 20,
    assignment: 20,
    quiz: 10,
    exam: 50,
  });

  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeYearId = useMemo(
    () =>
      academicYearId && (data?.academicYears || []).some((y: any) => y.id === academicYearId)
        ? academicYearId
        : data?.activeYear?.id || data?.academicYears?.[0]?.id || "",
    [academicYearId, data?.academicYears, data?.activeYear?.id]
  );

  const activeTermId = useMemo(
    () =>
      termId && (data?.terms || []).some((t: any) => t.id === termId)
        ? termId
        : data?.activeTerm?.id || data?.terms?.[0]?.id || "",
    [termId, data?.terms, data?.activeTerm?.id]
  );

  const activeClassId = useMemo(
    () =>
      classId && (data?.classes || []).some((c: any) => c.id === classId)
        ? classId
        : data?.classes?.[0]?.id || "",
    [classId, data?.classes]
  );

  const activeSubjectId = useMemo(
    () =>
      subjectId && (data?.subjects || []).some((s: any) => s.id === subjectId)
        ? subjectId
        : data?.subjects?.[0]?.id || "",
    [subjectId, data?.subjects]
  );

  const roster: any[] = useMemo(
    () => (activeClassId ? data?.studentsByClass?.[activeClassId] || [] : []),
    [data?.studentsByClass, activeClassId]
  );

  const assessmentsByStudent = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    for (const row of data?.assessments || []) {
      if (String(row.subject_id) !== String(activeSubjectId)) continue;
      if (activeTermId && row.term_id && String(row.term_id) !== String(activeTermId)) continue;
      const sid = String(row.student_id);
      if (!map.has(sid)) map.set(sid, {});
      map.get(sid)![row.assessment_type] = row;
    }
    return map;
  }, [data?.assessments, activeSubjectId, activeTermId]);

  const scoresByStudent = useMemo(() => {
    const map = new Map<string, any>();
    for (const sc of data?.scores || []) {
      if (String(sc.subject_id) !== String(activeSubjectId)) continue;
      if (activeTermId && sc.term_id && String(sc.term_id) !== String(activeTermId)) continue;
      map.set(String(sc.student_id), sc);
    }
    return map;
  }, [data?.scores, activeSubjectId, activeTermId]);

  function draftKey(studentId: string) {
    return `${activeTermId || "default"}:${activeSubjectId}:${studentId}`;
  }

  function getRowValues(studentId: string): RowDraft {
    const k = draftKey(studentId);
    if (drafts[k]) return drafts[k];

    const assess = assessmentsByStudent.get(String(studentId)) || {};
    const rc = scoresByStudent.get(String(studentId));

    return {
      classwork:
        assess.classwork !== undefined
          ? String(assess.classwork.score ?? 0)
          : rc?.classwork_score !== undefined
          ? String(rc.classwork_score)
          : "0",
      assignment:
        assess.assignment !== undefined
          ? String(assess.assignment.score ?? 0)
          : rc?.assignment_score !== undefined
          ? String(rc.assignment_score)
          : "0",
      quiz:
        assess.quiz !== undefined
          ? String(assess.quiz.score ?? 0)
          : rc?.quiz_score !== undefined
          ? String(rc.quiz_score)
          : "0",
      exam:
        assess.exam !== undefined
          ? String(assess.exam.score ?? 0)
          : rc?.exam_score !== undefined
          ? String(rc.exam_score)
          : "0",
      remarks:
        assess.exam?.remarks ||
        assess.classwork?.remarks ||
        rc?.teacher_remarks ||
        "",
    };
  }

  function updateRow(studentId: string, patch: Partial<RowDraft>) {
    const k = draftKey(studentId);
    const current = getRowValues(studentId);
    setDrafts((prev) => ({
      ...prev,
      [k]: { ...current, ...patch },
    }));
  }

  function buildPayloadEntry(studentId: string) {
    const v = getRowValues(studentId);
    return {
      studentId,
      classwork: Number(v.classwork || 0),
      assignment: Number(v.assignment || 0),
      quiz: Number(v.quiz || 0),
      exam: Number(v.exam || 0),
      maxClasswork: maxScores.classwork,
      maxAssignment: maxScores.assignment,
      maxQuiz: maxScores.quiz,
      maxExam: maxScores.exam,
      remarks: v.remarks,
    };
  }

  async function handleSaveSingle(studentId: string) {
    if (!activeSubjectId) return;
    setSavingRowId(studentId);
    setBanner(null);
    const res = await mutate("save_hs_grades", {
      classId: activeClassId || null,
      subjectId: activeSubjectId,
      termId: activeTermId || null,
      academicYearId: activeYearId || null,
      entries: [buildPayloadEntry(studentId)],
    });
    setSavingRowId(null);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save student grade." });
    } else {
      setBanner({ type: "success", text: res.message || "Student scores saved & synced." });
    }
  }

  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSubjectId || roster.length === 0) return;
    setSavingAll(true);
    setBanner(null);
    const res = await mutate("save_hs_grades", {
      classId: activeClassId || null,
      subjectId: activeSubjectId,
      termId: activeTermId || null,
      academicYearId: activeYearId || null,
      entries: roster.map((st) => buildPayloadEntry(st.id)),
    });
    setSavingAll(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save class grades." });
    } else {
      setBanner({ type: "success", text: res.message || "All class grades saved & synced." });
    }
  }

  const maxTotal =
    Number(maxScores.classwork || 0) +
    Number(maxScores.assignment || 0) +
    Number(maxScores.quiz || 0) +
    Number(maxScores.exam || 0);

  if (loading) return <StaffPageLoading label="Loading Continuous Assessment & Grades ledger..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Award className="h-3.5 w-3.5" />
            <span>Continuous Assessment &amp; Exam Gradebook · Syncs to Report Cards</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Grades &amp; Continuous Assessment
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record Classwork, Assignments, Quizzes, and Exam scores per student. Totals (/100) and grades automatically sync to Term Report Cards, Student Portal, and Parent Portal.
          </p>
        </div>

        <Link
          href="/teacher/report-cards"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 self-start"
        >
          <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>View Term Report Card Sheet</span>
        </Link>
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

      {(data?.classes || []).length === 0 || (data?.subjects || []).length === 0 ? (
        <StaffEmptyState
          icon={Award}
          title="No Classes or Subjects Assigned"
          description="Ask your School Administrator to configure Classes/Forms and Teaching Subjects before entering grades."
        />
      ) : (
        <form
          onSubmit={handleSaveAll}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5"
        >
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Term / Academic Year
              </label>
              <div className="flex gap-2">
                {(data?.academicYears || []).length > 0 && (
                  <select
                    value={activeYearId}
                    onChange={(e) => setAcademicYearId(e.target.value)}
                    className="w-1/2 px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    {(data?.academicYears || []).map((y: any) => (
                      <option key={y.id} value={y.id}>
                        {y.code || y.name}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={activeTermId}
                  onChange={(e) => setTermId(e.target.value)}
                  className="flex-1 px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {(data?.terms || []).length === 0 ? (
                    <option value="">Current Term</option>
                  ) : (
                    (data?.terms || []).map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Class / Form
              </label>
              <select
                value={activeClassId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {(data?.classes || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Subject
              </label>
              <select
                value={activeSubjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {(data?.subjects || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Assessment Category View
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as AssessmentCategoryFilter)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="all">All / Summary (/100)</option>
                <option value="classwork">Classwork Only</option>
                <option value="assignment">Assignment Only</option>
                <option value="quiz">Quiz / Mid-Term Only</option>
                <option value="exam">Terminal Exam Only</option>
              </select>
            </div>
          </div>

          {/* Max Score Weights & Bulk Save */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-3.5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Max Weights (Total: {maxTotal}/100):
              </span>
              {(["classwork", "assignment", "quiz", "exam"] as const).map((cat) => (
                <label key={cat} className="inline-flex items-center gap-1.5 capitalize">
                  <span className="text-slate-500 dark:text-slate-400">{cat}:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={maxScores[cat]}
                    onChange={(e) =>
                      setMaxScores((p) => ({ ...p, [cat]: Number(e.target.value || 0) }))
                    }
                    className="w-14 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center"
                  />
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={savingAll || roster.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              {savingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Save All Grades ({roster.length})</span>
            </button>
          </div>

          {/* Spreadsheet Roster Table */}
          {roster.length === 0 ? (
            <StaffEmptyState
              icon={Award}
              title="No Students Found in Selected Class"
              description="Assign students to this Class/Form in System Admin -> Students to begin entering marks."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 pr-3 font-semibold">Admission #</th>
                    <th className="py-2.5 pr-4 font-semibold">Student Name</th>
                    {(categoryFilter === "all" || categoryFilter === "classwork") && (
                      <th className="py-2.5 pr-3 font-semibold">Classwork /{maxScores.classwork}</th>
                    )}
                    {(categoryFilter === "all" || categoryFilter === "assignment") && (
                      <th className="py-2.5 pr-3 font-semibold">Assignment /{maxScores.assignment}</th>
                    )}
                    {(categoryFilter === "all" || categoryFilter === "quiz") && (
                      <th className="py-2.5 pr-3 font-semibold">Quiz /{maxScores.quiz}</th>
                    )}
                    {(categoryFilter === "all" || categoryFilter === "exam") && (
                      <th className="py-2.5 pr-3 font-semibold">Exam /{maxScores.exam}</th>
                    )}
                    <th className="py-2.5 pr-3 font-semibold text-center">Total /100</th>
                    <th className="py-2.5 pr-3 font-semibold text-center">Grade</th>
                    <th className="py-2.5 pr-3 font-semibold">Remarks</th>
                    <th className="py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roster.map((st) => {
                    const vals = getRowValues(st.id);
                    const total = Math.min(
                      100,
                      (Number(vals.classwork) || 0) +
                        (Number(vals.assignment) || 0) +
                        (Number(vals.quiz) || 0) +
                        (Number(vals.exam) || 0)
                    );
                    const grade = computeLetterGrade(total);

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 pr-3 font-mono text-slate-600 dark:text-slate-300">
                          {st.student_number}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {st.full_name}
                        </td>

                        {(categoryFilter === "all" || categoryFilter === "classwork") && (
                          <td className="py-2.5 pr-3">
                            <input
                              type="number"
                              min="0"
                              max={maxScores.classwork}
                              step="0.5"
                              value={vals.classwork}
                              onChange={(e) => updateRow(st.id, { classwork: e.target.value })}
                              className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                            />
                          </td>
                        )}

                        {(categoryFilter === "all" || categoryFilter === "assignment") && (
                          <td className="py-2.5 pr-3">
                            <input
                              type="number"
                              min="0"
                              max={maxScores.assignment}
                              step="0.5"
                              value={vals.assignment}
                              onChange={(e) => updateRow(st.id, { assignment: e.target.value })}
                              className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                            />
                          </td>
                        )}

                        {(categoryFilter === "all" || categoryFilter === "quiz") && (
                          <td className="py-2.5 pr-3">
                            <input
                              type="number"
                              min="0"
                              max={maxScores.quiz}
                              step="0.5"
                              value={vals.quiz}
                              onChange={(e) => updateRow(st.id, { quiz: e.target.value })}
                              className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                            />
                          </td>
                        )}

                        {(categoryFilter === "all" || categoryFilter === "exam") && (
                          <td className="py-2.5 pr-3">
                            <input
                              type="number"
                              min="0"
                              max={maxScores.exam}
                              step="0.5"
                              value={vals.exam}
                              onChange={(e) => updateRow(st.id, { exam: e.target.value })}
                              className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                            />
                          </td>
                        )}

                        <td className="py-2.5 pr-3 text-center font-bold text-slate-900 dark:text-white">
                          {total.toFixed(1)}
                        </td>

                        <td className="py-2.5 pr-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              grade === "F"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : grade === "A" || grade === "B"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {grade}
                          </span>
                        </td>

                        <td className="py-2.5 pr-3">
                          <input
                            type="text"
                            value={vals.remarks}
                            onChange={(e) => updateRow(st.id, { remarks: e.target.value })}
                            placeholder="Optional remark..."
                            className="w-40 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                        </td>

                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            disabled={savingRowId === st.id}
                            onClick={() => handleSaveSingle(st.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {savingRowId === st.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            <span>Save</span>
                          </button>
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
