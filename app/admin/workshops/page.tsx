"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

export default function WorkshopModulesPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "vocational_modules",
      label: "Workshop Modules",
      resource: "vocational_modules",
      singularLabel: "Workshop Module",
      pluralLabel: "Workshop Modules",
      description:
        "Manage hands-on vocational curriculum modules with practical workshop hours, theory hours, and assigned instructors.",
      searchFields: ["code", "name", "description"],
      filterField: {
        name: "department_id",
        label: "Trades",
        lookupKey: "departments",
      },
      fields: [
        {
          name: "code",
          label: "Module Code",
          type: "text",
          required: true,
          placeholder: "e.g. MOD-WLD-101",
        },
        {
          name: "name",
          label: "Module Title",
          type: "text",
          required: true,
          placeholder: "e.g. Shielded Metal Arc Welding (SMAW)",
        },
        {
          name: "department_id",
          label: "Trade / Workshop Class",
          type: "select",
          lookupKey: "departments",
          required: true,
        },
        {
          name: "instructor_id",
          label: "Lead Workshop Instructor",
          type: "select",
          lookupKey: "staff",
        },
        {
          name: "practical_hours",
          label: "Practical Lab Hours",
          type: "number",
          min: 0,
          defaultValue: 20,
          required: true,
        },
        {
          name: "theory_hours",
          label: "Theory / Classroom Hours",
          type: "number",
          min: 0,
          defaultValue: 10,
          required: true,
        },
        {
          name: "credit_units",
          label: "Competency Units",
          type: "number",
          min: 1,
          defaultValue: 2,
        },
        {
          name: "is_active",
          label: "Active Training Module",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "description",
          label: "Safety & Competency Scope",
          type: "textarea",
          colSpan: 2,
        },
      ],
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Module Title" },
        {
          key: "department_id",
          label: "Trade",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("departments", row.department_id),
        },
        {
          key: "instructor_id",
          label: "Instructor",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("staff", row.instructor_id),
        },
        { key: "practical_hours", label: "Practical Hrs", align: "right" },
        { key: "theory_hours", label: "Theory Hrs", align: "right" },
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
              {row.is_active !== false ? "Active" : "Inactive"}
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Workshop Modules"
      subtitle="Define hands-on vocational training modules, practical hour ratios, and lead instructors."
      badge="Vocational Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.vocational_modules || [];
        const active = rows.filter((r: any) => r.is_active !== false).length;
        const totalPractical = rows.reduce(
          (s: number, r: any) => s + Number(r.practical_hours ?? 0),
          0
        );
        const totalTheory = rows.reduce(
          (s: number, r: any) => s + Number(r.theory_hours ?? 0),
          0
        );
        return [
          { label: "Total Modules", value: rows.length, subtext: "Live curriculum", tone: "indigo" },
          { label: "Active Modules", value: active, subtext: "Running now", tone: "emerald" },
          { label: "Practical Hours", value: totalPractical, subtext: "Hands-on training", tone: "blue" },
          { label: "Theory Hours", value: totalTheory, subtext: "Classroom instruction", tone: "purple" },
        ];
      }}
    />
  );
}
