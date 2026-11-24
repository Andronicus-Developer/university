"use client";

import React, { useMemo, useState } from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

const GRADE_STYLE: Record<string, string> = {
  A: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "B+": "border-blue-200 bg-blue-50 text-blue-700",
  B: "border-blue-200 bg-blue-50 text-blue-700",
  "C+": "border-indigo-200 bg-indigo-50 text-indigo-700",
  C: "border-indigo-200 bg-indigo-50 text-indigo-700",
  D: "border-amber-200 bg-amber-50 text-amber-700",
  F: "border-rose-200 bg-rose-50 text-rose-700",
};

const PUBLISH_STYLE: Record<string, string> = {
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  moderated: "border-blue-200 bg-blue-50 text-blue-700",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
};

export default function ExamsAndGradesPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");

  const tabs: LiveCrudTabConfig[] = useMemo(
    () => [
      {
        key: "exam_grades",
        label: "Exam Scores & Grades",
        resource: "exam_grades",
        singularLabel: "Exam Grade",
        pluralLabel: "Exam Grades",
        description:
          "Record Continuous Assessment (CA) and Examination scores; totals, letter grades, and grade points compute automatically.",
        searchFields: ["grade_letter", "status", "remarks"],
        filterField: {
          name: "status",
          label: "Moderation Statuses",
          options: [
            { value: "draft", label: "Draft" },
            { value: "moderated", label: "Moderated" },
            { value: "published", label: "Published" },
          ],
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
            name: "course_id",
            label: "Course",
            type: "select",
            lookupKey: "courses",
            required: true,
          },
          {
            name: "term_id",
            label: "Semester",
            type: "select",
            lookupKey: "terms",
            required: true,
          },
          {
            name: "status",
            label: "Approval Status",
            type: "select",
            defaultValue: "draft",
            options: [
              { value: "draft", label: "Draft" },
              { value: "moderated", label: "Moderated" },
              { value: "published", label: "Published" },
            ],
          },
          {
            name: "ca_score",
            label: "CA / Coursework Score (0–30)",
            type: "number",
            min: 0,
            max: 100,
            step: "0.5",
            defaultValue: 0,
            required: true,
          },
          {
            name: "exam_score",
            label: "Final Exam Score (0–70)",
            type: "number",
            min: 0,
            max: 100,
            step: "0.5",
            defaultValue: 0,
            required: true,
          },
          {
            name: "remarks",
            label: "Examiner Remarks",
            type: "textarea",
            placeholder: "Optional moderation note or transcript remark...",
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
            key: "course_id",
            label: "Course",
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("courses", row.course_id),
          },
          {
            key: "term_id",
            label: "Semester",
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("terms", row.term_id),
          },
          { key: "ca_score", label: "CA", align: "right" },
          { key: "exam_score", label: "Exam", align: "right" },
          {
            key: "total_score",
            label: "Total %",
            align: "right",
            render: (row) => (
              <span className="font-semibold text-slate-900">
                {Number(row.total_score ?? 0).toFixed(1)}%
              </span>
            ),
          },
          {
            key: "grade_letter",
            label: "Grade (GP)",
            align: "center",
            render: (row) => (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                  GRADE_STYLE[row.grade_letter] || "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {row.grade_letter || "—"} ({Number(row.grade_point ?? 0).toFixed(1)})
              </span>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  PUBLISH_STYLE[row.status] || PUBLISH_STYLE.draft
                }`}
              >
                {row.status || "draft"}
              </span>
            ),
          },
        ],
      },
    ],
    []
  );

  return (
    <LiveCrudModule
      title="Exams, Grades & GPA Transcripts"
      subtitle="Manage university exam moderation, automatic GPA calculation, and student academic transcript standings."
      badge="University Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.exam_grades || [];
        const published = rows.filter((r: any) => r.status === "published").length;
        const avgGpa =
          rows.length > 0
            ? (
                rows.reduce((s: number, r: any) => s + Number(r.grade_point ?? 0), 0) / rows.length
              ).toFixed(2)
            : "0.00";
        const passCount = rows.filter((r: any) => Number(r.total_score ?? 0) >= 45).length;
        const passRate = rows.length > 0 ? Math.round((passCount / rows.length) * 100) : 0;
        return [
          { label: "Total Grade Entries", value: rows.length, subtext: "All semesters", tone: "indigo" },
          { label: "Published Results", value: published, subtext: "Transcript visible", tone: "emerald" },
          { label: "Mean GPA (4.0)", value: avgGpa, subtext: "Live cohort GPA", tone: "blue" },
          { label: "Pass Rate", value: `${passRate}%`, subtext: "Score ≥ 45%", tone: "purple" },
        ];
      }}
      renderExtraPanel={({ recordsByTab, lookups, helpers }) => {
        const grades = recordsByTab.exam_grades || [];
        const coursesById = new Map<string, any>();
        for (const c of lookups.courses || []) {
          coursesById.set(String(c.id), c);
        }

        const filteredGrades =
          selectedStudentId === "all"
            ? grades
            : grades.filter((g: any) => String(g.student_id) === selectedStudentId);

        const byStudent = new Map<
          string,
          { studentId: string; entries: number; weightedPoints: number; totalCredits: number }
        >();

        for (const g of filteredGrades) {
          if (!g.student_id) continue;
          const course = coursesById.get(String(g.course_id));
          const credits = Number(course?.credits ?? 3);
          const gp = Number(g.grade_point ?? 0);
          const cur = byStudent.get(g.student_id) || {
            studentId: g.student_id,
            entries: 0,
            weightedPoints: 0,
            totalCredits: 0,
          };
          cur.entries += 1;
          cur.totalCredits += credits;
          cur.weightedPoints += gp * credits;
          byStudent.set(g.student_id, cur);
        }

        const transcripts = Array.from(byStudent.values())
          .map((item) => ({
            ...item,
            cgpa: item.totalCredits > 0 ? item.weightedPoints / item.totalCredits : 0,
          }))
          .sort((a, b) => b.cgpa - a.cgpa);

        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Live Student CGPA & Credit Transcript Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Credit-weighted GPA derived from live Supabase exam grades and course credit hours.
                </p>
              </div>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="all">All Students</option>
                {(lookups.students || []).map((st: any) => (
                  <option key={st.id} value={st.id}>
                    {st.display_label || `${st.first_name} ${st.last_name}`}
                  </option>
                ))}
              </select>
            </div>

            {transcripts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Record exam scores above to compute live student credit-weighted GPA standings.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-right">Courses Graded</th>
                      <th className="px-4 py-3 text-right">Total Credits</th>
                      <th className="px-4 py-3 text-right">Weighted Quality Points</th>
                      <th className="px-4 py-3 text-right">Computed CGPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transcripts.map((tr) => (
                      <tr key={tr.studentId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {helpers.formatLookup("students", tr.studentId)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{tr.entries}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{tr.totalCredits}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {tr.weightedPoints.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-xs font-bold text-indigo-700">
                            {tr.cgpa.toFixed(2)} / 4.00
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
