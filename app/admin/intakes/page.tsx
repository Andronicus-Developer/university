"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

const STATUS_BADGE: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  upcoming: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-slate-200 bg-slate-100 text-slate-700",
};

export default function VocationalIntakesPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "vocational_intakes",
      label: "Intakes & Cohorts",
      resource: "vocational_intakes",
      singularLabel: "Intake Cohort",
      pluralLabel: "Intakes & Cohorts",
      description: "Schedule trade training cohorts, link them to trades, and manage capacity.",
      searchFields: ["name", "code", "status"],
      filterField: {
        name: "status",
        label: "Statuses",
        options: [
          { value: "active", label: "Active" },
          { value: "upcoming", label: "Upcoming" },
          { value: "completed", label: "Completed" },
        ],
      },
      fields: [
        {
          name: "name",
          label: "Cohort / Intake Name",
          type: "text",
          required: true,
          placeholder: "e.g. Welding Cohort Jan 2027",
        },
        {
          name: "code",
          label: "Cohort Code",
          type: "text",
          placeholder: "e.g. WLD-2027-A",
        },
        {
          name: "department_id",
          label: "Trade / Workshop Class",
          type: "select",
          lookupKey: "departments",
          required: true,
        },
        {
          name: "capacity",
          label: "Max Trainee Capacity",
          type: "number",
          min: 1,
          max: 500,
          defaultValue: 30,
        },
        {
          name: "start_date",
          label: "Start Date",
          type: "date",
        },
        {
          name: "end_date",
          label: "Expected Completion Date",
          type: "date",
        },
        {
          name: "status",
          label: "Cohort Status",
          type: "select",
          defaultValue: "upcoming",
          options: [
            { value: "upcoming", label: "Upcoming" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
          ],
          colSpan: 2,
        },
      ],
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Cohort Name" },
        {
          key: "department_id",
          label: "Trade",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("departments", row.department_id),
        },
        { key: "capacity", label: "Capacity", align: "right" },
        { key: "start_date", label: "Start Date" },
        { key: "end_date", label: "End Date" },
        {
          key: "status",
          label: "Status",
          render: (row) => (
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                STATUS_BADGE[row.status] || "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {row.status || "upcoming"}
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Intakes & Cohorts"
      subtitle="Organize vocational training cohorts by trade, schedule dates, and bench capacity."
      badge="Vocational Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.vocational_intakes || [];
        const active = rows.filter((r: any) => r.status === "active").length;
        const upcoming = rows.filter((r: any) => r.status === "upcoming").length;
        const totalSeats = rows.reduce(
          (sum: number, r: any) => sum + Number(r.capacity ?? 0),
          0
        );
        return [
          { label: "Total Cohorts", value: rows.length, subtext: "All intakes", tone: "indigo" },
          { label: "Active Cohorts", value: active, subtext: "Currently training", tone: "emerald" },
          { label: "Upcoming Cohorts", value: upcoming, subtext: "Open for intake", tone: "blue" },
          { label: "Total Bench Seats", value: totalSeats, subtext: "Combined capacity", tone: "purple" },
        ];
      }}
    />
  );
}
