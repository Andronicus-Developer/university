"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

const STATUS_BADGE: Record<string, string> = {
  issued: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  revoked: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function TradeCertificationsPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "trade_certifications",
      label: "Trade Certifications",
      resource: "trade_certifications",
      singularLabel: "Trade Certificate",
      pluralLabel: "Trade Certifications",
      description:
        "Issue national/institutional trade certificates for competent trainees finishing their cohort.",
      searchFields: ["certificate_number", "qualification_title", "status"],
      filterField: {
        name: "status",
        label: "Statuses",
        options: [
          { value: "pending", label: "Pending" },
          { value: "issued", label: "Issued" },
          { value: "revoked", label: "Revoked" },
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
          label: "Trade",
          type: "select",
          lookupKey: "departments",
        },
        {
          name: "intake_id",
          label: "Intake Cohort",
          type: "select",
          lookupKey: "vocational_intakes",
        },
        {
          name: "qualification_title",
          label: "Qualification / Certificate Title",
          type: "text",
          required: true,
          placeholder: "e.g. National Trade Certificate Level II in Welding",
          colSpan: 2,
        },
        {
          name: "certificate_number",
          label: "Certificate Serial Number",
          type: "text",
          placeholder: "Auto-generated if left blank (e.g. CERT-2026-001)",
        },
        {
          name: "issue_date",
          label: "Issue Date",
          type: "date",
        },
        {
          name: "status",
          label: "Certificate Status",
          type: "select",
          defaultValue: "pending",
          options: [
            { value: "pending", label: "Pending Verification" },
            { value: "issued", label: "Issued" },
            { value: "revoked", label: "Revoked" },
          ],
          colSpan: 2,
        },
      ],
      columns: [
        { key: "certificate_number", label: "Serial #" },
        {
          key: "student_id",
          label: "Trainee",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("students", row.student_id),
        },
        { key: "qualification_title", label: "Qualification" },
        {
          key: "department_id",
          label: "Trade",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("departments", row.department_id),
        },
        { key: "issue_date", label: "Issue Date" },
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
      title="Trade Certifications"
      subtitle="Verify trade completion requirements and issue official vocational qualification certificates."
      badge="Vocational Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.trade_certifications || [];
        const issued = rows.filter((r: any) => r.status === "issued").length;
        const pending = rows.filter((r: any) => r.status === "pending").length;
        const revoked = rows.filter((r: any) => r.status === "revoked").length;
        return [
          { label: "Total Certificates", value: rows.length, subtext: "All records", tone: "indigo" },
          { label: "Issued", value: issued, subtext: "Awarded", tone: "emerald" },
          { label: "Pending Sign-off", value: pending, subtext: "Awaiting issue", tone: "amber" },
          { label: "Revoked", value: revoked, subtext: "Invalidated", tone: "rose" },
        ];
      }}
    />
  );
}
