"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

const STATUS_BADGE: Record<string, string> = {
  placed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  terminated: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function IndustrialAttachmentsPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "industrial_attachments",
      label: "Industrial Placements",
      resource: "industrial_attachments",
      singularLabel: "Attachment Placement",
      pluralLabel: "Industrial Attachments",
      description:
        "Assign vocational trainees to industry host workshops and monitor workplace supervisor evaluations.",
      searchFields: ["company_name", "supervisor_name", "status"],
      filterField: {
        name: "status",
        label: "Statuses",
        options: [
          { value: "pending", label: "Pending" },
          { value: "placed", label: "Placed" },
          { value: "completed", label: "Completed" },
          { value: "terminated", label: "Terminated" },
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
          name: "department_id",
          label: "Trade / Department",
          type: "select",
          lookupKey: "departments",
        },
        {
          name: "company_name",
          label: "Host Company / Workshop",
          type: "text",
          required: true,
          placeholder: "e.g. Apex Automotive & Welding Ltd.",
        },
        {
          name: "status",
          label: "Placement Status",
          type: "select",
          defaultValue: "pending",
          options: [
            { value: "pending", label: "Pending" },
            { value: "placed", label: "Placed" },
            { value: "completed", label: "Completed" },
            { value: "terminated", label: "Terminated" },
          ],
        },
        {
          name: "supervisor_name",
          label: "Workplace Supervisor",
          type: "text",
          placeholder: "e.g. Eng. Daniel Osei",
        },
        {
          name: "supervisor_phone",
          label: "Supervisor Contact",
          type: "tel",
          placeholder: "+233 ...",
        },
        {
          name: "start_date",
          label: "Start Date",
          type: "date",
        },
        {
          name: "end_date",
          label: "End Date",
          type: "date",
        },
        {
          name: "evaluation_notes",
          label: "Supervisor & Placement Notes",
          type: "textarea",
          placeholder: "Logbook sign-off notes, punctuality, industrial evaluation...",
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
        { key: "company_name", label: "Host Company" },
        { key: "supervisor_name", label: "Supervisor" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
        {
          key: "status",
          label: "Status",
          render: (row) => (
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                STATUS_BADGE[row.status] || "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {row.status || "pending"}
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Industrial Attachments & Internships"
      subtitle="Coordinate apprenticeship placements with industry partners and track workplace completion."
      badge="Vocational Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.industrial_attachments || [];
        const placed = rows.filter((r: any) => r.status === "placed").length;
        const completed = rows.filter((r: any) => r.status === "completed").length;
        const companies = new Set(
          rows.map((r: any) => String(r.company_name || "").trim().toLowerCase()).filter(Boolean)
        ).size;
        return [
          { label: "Total Placements", value: rows.length, subtext: "All attachments", tone: "indigo" },
          { label: "Currently Placed", value: placed, subtext: "Active on site", tone: "emerald" },
          { label: "Completed", value: completed, subtext: "Logbooks signed", tone: "blue" },
          { label: "Host Partners", value: companies, subtext: "Unique companies", tone: "purple" },
        ];
      }}
    />
  );
}
