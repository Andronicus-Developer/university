"use client";

import React, { useMemo, useState } from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

function scoreGradeBadge(grade: string | null | undefined) {
  const g = (grade || "").toUpperCase();
  if (g === "A" || g === "A+") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (g === "B") return "border-blue-200 bg-blue-50 text-blue-700";
  if (g === "C") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (g === "D" || g === "E") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function letterFromAverage(avg: number): string {
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  if (avg >= 45) return "E";
  return "F";
}

export default function ReportCardsPage() {
  const [selectedTermId, setSelectedTermId] = useState<string>("all");

  const tabs: LiveCrudTabConfig[] = useMemo(
    () => [
      {
        key: "report_card_scores",
        label: "Subject Assessments",
        resource: "report_card_scores",
        singularLabel: "Subject Score",
        pluralLabel: "Report Card Scores",
        description:
          "Record Continuous Assessment (CA) and Exam scores per subject; total scores and letter grades calculate automatically.",
        searchFields: ["grade", "teacher_remarks", "student_id", "subject_id"],
        filterField: {
          name: "term_id",
          label: "Terms",
          lookupKey: "terms",
        },
        fields: [
          {
            name: "student_id",
            label: "Student",
            type: "select",
            lookupKey: "students",
            required: true,
          },
          {
            name: "subject_id",
            label: "Subject",
            type: "select",
            lookupKey: "subjects",
            required: true,
          },
          {
            name: "programme_id",
            label: "Class / Grade Level",
            type: "select",
            lookupKey: "programmes",
          },
          {
            name: "term_id",
            label: "Academic Term",
            type: "select",
            lookupKey: "terms",
            required: true,
          },
          {
            name: "ca_score",
            label: "Continuous Assessment (0–40)",
            type: "number",
            min: 0,
            max: 100,
            step: "0.5",
            defaultValue: 0,
            required: true,
          },
          {
            name: "exam_score",
            label: "Terminal Exam Score (0–60)",
            type: "number",
            min: 0,
            max: 100,
            step: "0.5",
            defaultValue: 0,
            required: true,
          },
          {
            name: "teacher_remarks",
            label: "Subject Teacher Remarks",
            type: "textarea",
            placeholder: "e.g. Strong analytical performance in class",
            colSpan: 2,
          },
        ],
        columns: [
          {
            key: "student_id",
            label: "Student",
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("students", row.student_id),
          },
          {
            key: "subject_id",
            label: "Subject",
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("subjects", row.subject_id),
          },
          {
            key: "term_id",
            label: "Term",
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("terms", row.term_id),
          },
          { key: "ca_score", label: "CA Score", align: "right" },
          { key: "exam_score", label: "Exam Score", align: "right" },
          {
            key: "total_score",
            label: "Total",
            align: "right",
            render: (row) => (
              <span className="font-bold text-slate-900">
                {Number(row.total_score ?? 0).toFixed(1)}%
              </span>
            ),
          },
          {
            key: "grade",
            label: "Grade",
            align: "center",
            render: (row) => (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${scoreGradeBadge(
                  row.grade
                )}`}
              >
                {row.grade || "—"}
              </span>
            ),
          },
          { key: "teacher_remarks", label: "Remarks" },
        ],
      },
    ],
    []
  );

  return (
    <LiveCrudModule
      title="Exams & Report Cards"
      subtitle="Compile high school terminal marks, calculate subject grades automatically, and review per-student report card standings."
      badge="High School Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.report_card_scores || [];
        const uniqueStudents = new Set(rows.map((r: any) => r.student_id).filter(Boolean)).size;
        const avgTotal =
          rows.length > 0
            ? (
                rows.reduce((sum: number, r: any) => sum + Number(r.total_score ?? 0), 0) /
                rows.length
              ).toFixed(1)
            : "0.0";
        const distinctionCount = rows.filter((r: any) =>
          ["A", "A+", "B"].includes(String(r.grade || "").toUpperCase())
        ).length;
        return [
          { label: "Total Score Entries", value: rows.length, subtext: "Live grades", tone: "indigo" },
          { label: "Students Graded", value: uniqueStudents, subtext: "With report scores", tone: "blue" },
          { label: "School Mean Score", value: `${avgTotal}%`, subtext: "Overall average", tone: "emerald" },
          { label: "A & B Distinctions", value: distinctionCount, subtext: "High achievement", tone: "purple" },
        ];
      }}
      renderExtraPanel={({ recordsByTab, lookups, helpers }) => {
        const allScores = recordsByTab.report_card_scores || [];
        const scopedScores =
          selectedTermId === "all"
            ? allScores
            : allScores.filter((s: any) => String(s.term_id) === selectedTermId);

        const byStudent = new Map<
          string,
          { studentId: string; scores: any[]; totalSum: number; passes: number }
        >();
        for (const row of scopedScores) {
          if (!row.student_id) continue;
          const entry: {
            studentId: string;
            scores: any[];
            totalSum: number;
            passes: number;
          } = byStudent.get(row.student_id) || {
            studentId: row.student_id,
            scores: [],
            totalSum: 0,
            passes: 0,
          };
          const scoreVal = Number(row.total_score ?? 0);
          entry.scores.push(row);
          entry.totalSum += scoreVal;
          if (scoreVal >= 50) entry.passes += 1;
          byStudent.set(row.student_id, entry);
        }

        const summaries = Array.from(byStudent.values())
          .map((item) => {
            const avg = item.scores.length > 0 ? item.totalSum / item.scores.length : 0;
            return {
              ...item,
              average: avg,
              overallGrade: letterFromAverage(avg),
            };
          })
          .sort((a, b) => b.average - a.average);

        const termOptions = lookups.terms || [];

        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Student Terminal Report Card Standings
                </h3>
                <p className="text-xs text-slate-500">
                  Aggregated directly from live Supabase subject scores for ranking and promotion review.
                </p>
              </div>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="all">All Academic Terms</option>
                {termOptions.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {summaries.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Add subject scores above to generate live student report card averages.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Position</th>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-right">Subjects Graded</th>
                      <th className="px-4 py-3 text-right">Subjects Passed</th>
                      <th className="px-4 py-3 text-right">Mean Score</th>
                      <th className="px-4 py-3 text-center">Overall Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaries.map((s, idx) => (
                      <tr key={s.studentId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-600">#{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {helpers.formatLookup("students", s.studentId)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {s.scores.length}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                          {s.passes} / {s.scores.length}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {s.average.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${scoreGradeBadge(
                              s.overallGrade
                            )}`}
                          >
                            {s.overallGrade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
