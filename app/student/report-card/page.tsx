"use client";

import React, { useMemo, useState } from "react";
import { Award, Printer, TrendingUp } from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function HighSchoolReportCardPage() {
  const { data, loading, error, reload } = useStudentPortalSection("report-card");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");

  const scores = useMemo(() => data?.scores || [], [data?.scores]);
  const terms = useMemo(() => data?.terms || [], [data?.terms]);

  const filteredScores = useMemo(() => {
    if (selectedTerm === "all") return scores;
    return scores.filter((s: any) => String(s.term_id) === selectedTerm);
  }, [scores, selectedTerm]);

  const termAverage = useMemo(() => {
    if (filteredScores.length === 0) return 0;
    const sum = filteredScores.reduce(
      (acc: number, s: any) => acc + Number(s.total_score ?? 0),
      0
    );
    return Number((sum / filteredScores.length).toFixed(1));
  }, [filteredScores]);

  if (loading) {
    return <StudentPageLoading label="Loading term report card..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const latestConduct = (data.conduct || [])[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Term Report Card
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Continuous Assessment (CA) + Terminal Examination scores, total marks, grades, and teacher remarks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {terms.length > 0 && (
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Terms</option>
              {terms.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.code}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report Card</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Overall Average</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {termAverage.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {filteredScores.length} subject(s)
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Class Position</span>
            <Award className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {data.classPosition
              ? `#${data.classPosition} of ${data.classTotalStudents}`
              : "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data.student?.programme_name || "Assigned Class"}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="text-xs font-semibold text-slate-500">Conduct Grade</div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {latestConduct?.conduct_grade || "Good"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {latestConduct?.notes || "No disciplinary issues"}
          </div>
        </div>
      </div>

      {filteredScores.length === 0 ? (
        <StudentEmptyState
          icon={Award}
          title="No Report Card Scores Recorded Yet"
          description="Continuous Assessment and Terminal Exam marks entered by your subject teachers will display here."
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {data.school?.name} — Official Student Terminal Report
            </h2>
            <p className="text-[11px] text-slate-500">
              {data.student?.full_name} ({data.student?.student_number}) · {data.student?.programme_name}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Term</th>
                  <th className="px-4 py-3 text-right">CA Score</th>
                  <th className="px-4 py-3 text-right">Exam Score</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Grade</th>
                  <th className="px-5 py-3 text-left">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredScores.map((sc: any) => (
                  <tr key={sc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {sc.subject?.name || "Subject"}
                      </div>
                      <div className="text-[10px] text-slate-500">{sc.subject?.code}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {sc.term?.name || sc.term?.code || "Current Term"}
                    </td>
                    <td className="px-4 py-3.5 text-right">{Number(sc.ca_score ?? 0)}</td>
                    <td className="px-4 py-3.5 text-right">{Number(sc.exam_score ?? 0)}</td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 dark:text-white">
                      {Number(sc.total_score ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        {sc.grade}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {sc.teacher_remarks || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
