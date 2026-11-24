"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

const VERDICT_CONFIG: Record<string, { label: string; badge: string }> = {
  competent: {
    label: "Competent",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  not_yet_competent: {
    label: "Not Yet Competent",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
  },
  in_progress: {
    label: "In Progress",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export default function CompetencyAssessmentsPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "competency_assessments",
      label: "Competency Assessments",
      resource: "competency_assessments",
      singularLabel: "Competency Assessment",
      pluralLabel: "Competency Assessments",
      description:
        "Evaluate practical trade demonstrations and record Competent / Not Yet Competent verdicts.",
      searchFields: ["verdict", "assessor_notes"],
      filterField: {
        name: "verdict",
        label: "Verdicts",
        options: [
          { value: "competent", label: "Competent" },
          { value: "in_progress", label: "In Progress" },
          { value: "not_yet_competent", label: "Not Yet Competent" },
        ],
      },
      fields: [
        {
          name: "student_id",
          label: "Trainee",
          type: "select",
          lookupKey: "students",
          required: true,
        },
        {
          name: "module_id",
          label: "Workshop Module",
          type: "select",
          lookupKey: "vocational_modules",
          required: true,
        },
        {
          name: "intake_id",
          label: "Intake Cohort",
          type: "select",
          lookupKey: "vocational_intakes",
        },
        {
          name: "instructor_id",
          label: "Assessor / Instructor",
          type: "select",
          lookupKey: "staff",
        },
        {
          name: "assessment_date",
          label: "Assessment Date",
          type: "date",
        },
        {
          name: "practical_score",
          label: "Practical Score (%)",
          type: "number",
          min: 0,
          max: 100,
          step: "0.5",
        },
        {
          name: "verdict",
          label: "Competency Verdict",
          type: "select",
          required: true,
          defaultValue: "in_progress",
          options: [
            { value: "competent", label: "Competent" },
            { value: "in_progress", label: "In Progress" },
            { value: "not_yet_competent", label: "Not Yet Competent" },
          ],
          colSpan: 2,
        },
        {
          name: "assessor_notes",
          label: "Assessor Practical Feedback",
          type: "textarea",
          placeholder: "Safety adherence, tool handling accuracy, tolerance checks...",
          colSpan: 2,
        },
      ],
      columns: [
        {
          key: "student_id",
          label: "Trainee",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("students", row.student_id),
        },
        {
          key: "module_id",
          label: "Module",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("vocational_modules", row.module_id),
        },
        {
          key: "intake_id",
          label: "Cohort",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("vocational_intakes", row.intake_id),
        },
        { key: "assessment_date", label: "Date" },
        {
          key: "practical_score",
          label: "Practical %",
          align: "right",
          render: (row) =>
            row.practical_score != null ? `${Number(row.practical_score).toFixed(1)}%` : "—",
        },
        {
          key: "verdict",
          label: "Verdict",
          render: (row) => {
            const cfg = VERDICT_CONFIG[row.verdict] || VERDICT_CONFIG.in_progress;
            return (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}
              >
                {cfg.label}
              </span>
            );
          },
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Competency Assessments"
      subtitle="Track hands-on practical skill evaluations, scores, and competency mastery across trade modules."
      badge="Vocational Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.competency_assessments || [];
        const competent = rows.filter((r: any) => r.verdict === "competent").length;
        const nyc = rows.filter((r: any) => r.verdict === "not_yet_competent").length;
        const passRate = rows.length > 0 ? Math.round((competent / rows.length) * 100) : 0;
        return [
          { label: "Total Assessments", value: rows.length, subtext: "Recorded tasks", tone: "indigo" },
          { label: "Competent", value: competent, subtext: "Verified mastery", tone: "emerald" },
          { label: "Not Yet Competent", value: nyc, subtext: "Needs re-assessment", tone: "rose" },
          { label: "Competency Rate", value: `${passRate}%`, subtext: "Pass benchmark", tone: "blue" },
        ];
      }}
    />
  );
}
