"use client";

import React, { useMemo, useState } from "react";
import { Award, CheckCircle2, Printer, TrendingUp } from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function UniversityResultsTranscriptPage() {
  const { data, loading, error, reload } = useStudentPortalSection("results");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");

  const grades = useMemo(() => data?.grades || [], [data?.grades]);
  const terms = useMemo(() => data?.terms || [], [data?.terms]);

  const filteredGrades = useMemo(() => {
    if (selectedTerm === "all") return grades;
    return grades.filter((g: any) => String(g.term_id) === selectedTerm);
  }, [grades, selectedTerm]);

  const termGpa = useMemo(() => {
    let pts = 0;
    let cr = 0;
    for (const g of filteredGrades) {
      const c = Number(g.course?.credits ?? 3);
      pts += Number(g.grade_point ?? 0) * c;
      cr += c;
    }
    return cr > 0 ? Number((pts / cr).toFixed(2)) : 0;
  }, [filteredGrades]);

  if (loading) {
    return <StudentPageLoading label="Loading semester results & transcript..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const cumulativeGpa = Number(data.summary?.cumulativeGpa ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Semester Results &amp; Transcript
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official examination grades, semester GPA, cumulative CGPA, and printable statement of results.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {terms.length > 0 && (
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Semesters</option>
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Transcript</span>
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Cumulative CGPA</span>
            <Award className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1.5">
            {cumulativeGpa.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Out of 4.00 scale</div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Filtered Semester GPA</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5">
            {termGpa.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {filteredGrades.length} graded courses shown
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Credits Evaluated</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {data.summary?.totalCreditsEvaluated ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data.student?.student_number} · {data.student?.programme_name}
          </div>
        </div>
      </div>

      {filteredGrades.length === 0 ? (
        <StudentEmptyState
          icon={Award}
          title="No Exam Grades Published Yet"
          description="Once your lecturers and academic office record exam scores for your enrolled courses, your transcript statement will populate here."
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {data.school?.name} — Statement of Results
              </h2>
              <p className="text-[11px] text-slate-500">
                {data.student?.full_name} ({data.student?.student_number}) · {data.student?.programme_name}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Course</th>
                  <th className="px-4 py-3 text-left">Semester</th>
                  <th className="px-4 py-3 text-right">Credits</th>
                  <th className="px-4 py-3 text-right">CA</th>
                  <th className="px-4 py-3 text-right">Exam</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Grade</th>
                  <th className="px-4 py-3 text-right">GP</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredGrades.map((g: any) => (
                  <tr key={g.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {g.course?.code || "COURSE"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {g.course?.name || "Course Unit"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {g.term?.name || g.term?.code || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold">
                      {g.course?.credits ?? 3}
                    </td>
                    <td className="px-4 py-3.5 text-right">{Number(g.ca_score ?? 0)}</td>
                    <td className="px-4 py-3.5 text-right">{Number(g.exam_score ?? 0)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                      {Number(g.total_score ?? 0)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                        {g.grade_letter}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold">
                      {Number(g.grade_point ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {g.status || "published"}
                      </span>
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
