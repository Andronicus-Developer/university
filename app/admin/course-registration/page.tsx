"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

const STATUS_BADGES: Record<string, string> = {
  registered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  dropped: "border-amber-200 bg-amber-50 text-amber-700",
  withdrawn: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function CourseRegistrationPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "course_enrolments",
      label: "Course Registrations",
      resource: "course_enrolments",
      singularLabel: "Course Enrolment",
      pluralLabel: "Course Enrolments",
      description: "Enroll students into semester courses and manage add/drop statuses.",
      searchFields: ["status", "student_id", "course_id"],
      filterField: {
        name: "status",
        label: "Statuses",
        options: [
          { value: "registered", label: "Registered" },
          { value: "completed", label: "Completed" },
          { value: "dropped", label: "Dropped" },
          { value: "withdrawn", label: "Withdrawn" },
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
          name: "academic_year_id",
          label: "Academic Year",
          type: "select",
          lookupKey: "academic_years",
        },
        {
          name: "term_id",
          label: "Semester",
          type: "select",
          lookupKey: "terms",
        },
        {
          name: "status",
          label: "Enrolment Status",
          type: "select",
          required: true,
          defaultValue: "registered",
          options: [
            { value: "registered", label: "Registered" },
            { value: "completed", label: "Completed" },
            { value: "dropped", label: "Dropped" },
            { value: "withdrawn", label: "Withdrawn" },
          ],
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
          key: "academic_year_id",
          label: "Academic Year",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("academic_years", row.academic_year_id),
        },
        {
          key: "term_id",
          label: "Semester",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("terms", row.term_id),
        },
        {
          key: "status",
          label: "Status",
          render: (row) => (
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                STATUS_BADGES[row.status] || "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {row.status || "registered"}
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Course Registration"
      subtitle="Enroll university students in departmental courses by semester and track add/drop decisions."
      badge="University Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.course_enrolments || [];
        const registered = rows.filter((r: any) => r.status === "registered").length;
        const completed = rows.filter((r: any) => r.status === "completed").length;
        const dropped = rows.filter(
          (r: any) => r.status === "dropped" || r.status === "withdrawn"
        ).length;
        return [
          { label: "Total Enrolments", value: rows.length, subtext: "All terms", tone: "indigo" },
          { label: "Active Registered", value: registered, subtext: "Enrolled", tone: "emerald" },
          { label: "Completed", value: completed, subtext: "Passed/finished", tone: "blue" },
          { label: "Dropped / Withdrawn", value: dropped, subtext: "Modified", tone: "amber" },
        ];
      }}
    />
  );
}
