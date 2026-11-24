"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

export default function CoursesPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "courses",
      label: "Courses & Credit Hours",
      resource: "courses",
      singularLabel: "Course",
      pluralLabel: "Courses",
      description:
        "Manage university courses linked to academic departments and degree programs with assigned credit hours.",
      searchFields: ["code", "name", "course_type", "description"],
      filterField: {
        name: "department_id",
        label: "Departments",
        lookupKey: "departments",
      },
      fields: [
        {
          name: "code",
          label: "Course Code",
          type: "text",
          required: true,
          placeholder: "e.g. CSC 301",
        },
        {
          name: "name",
          label: "Course Title",
          type: "text",
          required: true,
          placeholder: "e.g. Data Structures & Algorithms",
        },
        {
          name: "department_id",
          label: "Department",
          type: "select",
          lookupKey: "departments",
        },
        {
          name: "programme_id",
          label: "Degree Program",
          type: "select",
          lookupKey: "programmes",
        },
        {
          name: "credits",
          label: "Credit Hours",
          type: "number",
          min: 1,
          max: 24,
          defaultValue: 3,
          required: true,
        },
        {
          name: "contact_hours",
          label: "Weekly Contact Hours",
          type: "number",
          min: 1,
          max: 40,
          defaultValue: 3,
        },
        {
          name: "course_type",
          label: "Course Classification",
          type: "select",
          defaultValue: "core",
          options: [
            { value: "core", label: "Core / Compulsory" },
            { value: "elective", label: "Elective" },
            { value: "general", label: "General Studies" },
          ],
        },
        {
          name: "semester_number",
          label: "Recommended Semester #",
          type: "number",
          min: 1,
          max: 12,
          defaultValue: 1,
        },
        {
          name: "description",
          label: "Course Synopsis",
          type: "textarea",
          placeholder: "Topics covered, prerequisites, assessment format...",
          colSpan: 2,
        },
        {
          name: "is_active",
          label: "Course is Active for Registration",
          type: "checkbox",
          defaultValue: true,
          colSpan: 2,
        },
      ],
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Course Title" },
        {
          key: "department_id",
          label: "Department",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("departments", row.department_id),
        },
        {
          key: "programme_id",
          label: "Program",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("programmes", row.programme_id),
        },
        { key: "credits", label: "Credits", align: "right" },
        {
          key: "course_type",
          label: "Type",
          render: (row) => (
            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-indigo-700">
              {row.course_type || "core"}
            </span>
          ),
        },
        {
          key: "is_active",
          label: "Status",
          render: (row) => (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                row.is_active !== false
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {row.is_active !== false ? "Active" : "Archived"}
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Courses & Credit Hours"
      subtitle="Define university courses, map them to departments and degree programs, and assign credit units."
      badge="University Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.courses || [];
        const active = rows.filter((r: any) => r.is_active !== false).length;
        const core = rows.filter((r: any) => r.course_type === "core").length;
        const totalCredits = rows.reduce((s: number, r: any) => s + Number(r.credits ?? 0), 0);
        return [
          { label: "Total Courses", value: rows.length, subtext: "Catalog items", tone: "indigo" },
          { label: "Active Courses", value: active, subtext: "Open for registration", tone: "emerald" },
          { label: "Core Requirements", value: core, subtext: "Mandatory units", tone: "blue" },
          { label: "Total Credit Hours", value: totalCredits, subtext: "Combined credits", tone: "purple" },
        ];
      }}
    />
  );
}
