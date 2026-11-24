"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

export default function SubjectsPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "subjects",
      label: "Subjects",
      resource: "subjects",
      singularLabel: "Subject",
      pluralLabel: "Subjects",
      description:
        "Manage high school subjects, link them to classes and academic terms, and assign subject teachers.",
      searchFields: ["code", "name", "category", "description"],
      filterField: {
        name: "category",
        label: "Categories",
        options: [
          { value: "core", label: "Core Subject" },
          { value: "elective", label: "Elective Subject" },
          { value: "extracurricular", label: "Extracurricular" },
        ],
      },
      fields: [
        {
          name: "name",
          label: "Subject Name",
          type: "text",
          required: true,
          placeholder: "e.g. Core Mathematics",
        },
        {
          name: "code",
          label: "Subject Code",
          type: "text",
          required: true,
          placeholder: "e.g. MATH-SHS1",
        },
        {
          name: "programme_id",
          label: "Class / Form",
          type: "select",
          lookupKey: "programmes",
        },
        {
          name: "term_id",
          label: "Academic Term",
          type: "select",
          lookupKey: "terms",
        },
        {
          name: "teacher_id",
          label: "Lead Subject Teacher",
          type: "select",
          lookupKey: "staff",
        },
        {
          name: "category",
          label: "Subject Category",
          type: "select",
          defaultValue: "core",
          options: [
            { value: "core", label: "Core" },
            { value: "elective", label: "Elective" },
            { value: "extracurricular", label: "Extracurricular" },
          ],
        },
        {
          name: "weekly_periods",
          label: "Weekly Teaching Periods",
          type: "number",
          min: 1,
          max: 30,
          defaultValue: 4,
        },
        {
          name: "pass_mark",
          label: "Pass Mark (%)",
          type: "number",
          min: 0,
          max: 100,
          defaultValue: 50,
        },
        {
          name: "is_active",
          label: "Active Curriculum Subject",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "description",
          label: "Syllabus Overview",
          type: "textarea",
          colSpan: 2,
        },
      ],
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Subject" },
        {
          key: "programme_id",
          label: "Class / Form",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("programmes", row.programme_id),
        },
        {
          key: "term_id",
          label: "Term",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("terms", row.term_id),
        },
        {
          key: "teacher_id",
          label: "Teacher",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("staff", row.teacher_id),
        },
        { key: "weekly_periods", label: "Periods / Wk", align: "right" },
        { key: "pass_mark", label: "Pass %", align: "right" },
        {
          key: "category",
          label: "Category",
          render: (row) => (
            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-indigo-700">
              {row.category || "core"}
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Subjects Management"
      subtitle="Organize high school curriculum subjects, assign teachers, and set weekly teaching periods and pass marks."
      badge="High School Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.subjects || [];
        const core = rows.filter((r: any) => r.category === "core").length;
        const elective = rows.filter((r: any) => r.category === "elective").length;
        const totalPeriods = rows.reduce(
          (s: number, r: any) => s + Number(r.weekly_periods ?? 0),
          0
        );
        return [
          { label: "Total Subjects", value: rows.length, subtext: "Curriculum list", tone: "indigo" },
          { label: "Core Subjects", value: core, subtext: "Compulsory", tone: "emerald" },
          { label: "Electives", value: elective, subtext: "Track options", tone: "blue" },
          { label: "Weekly Periods", value: totalPeriods, subtext: "Total timetable slots", tone: "purple" },
        ];
      }}
    />
  );
}
