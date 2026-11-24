"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

export default function ParentsAndGuardiansPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "parent_guardians",
      label: "Parents & Guardians",
      resource: "parent_guardians",
      singularLabel: "Parent / Guardian",
      pluralLabel: "Parents & Guardians",
      description:
        "Maintain guardian contacts, link them to students, and optionally provision Parent Portal accounts.",
      searchFields: ["full_name", "email", "phone", "relationship", "occupation"],
      filterField: {
        name: "relationship",
        label: "Relationships",
        options: [
          { value: "Mother", label: "Mother" },
          { value: "Father", label: "Father" },
          { value: "Guardian", label: "Guardian" },
          { value: "Sponsor", label: "Sponsor" },
          { value: "Parent", label: "Parent" },
        ],
      },
      fields: [
        {
          name: "full_name",
          label: "Full Name",
          type: "text",
          required: true,
          placeholder: "e.g. Grace Mensah",
        },
        {
          name: "relationship",
          label: "Relationship",
          type: "select",
          required: true,
          defaultValue: "Parent",
          options: [
            { value: "Mother", label: "Mother" },
            { value: "Father", label: "Father" },
            { value: "Guardian", label: "Guardian" },
            { value: "Sponsor", label: "Sponsor" },
            { value: "Parent", label: "Parent" },
          ],
        },
        {
          name: "student_id",
          label: "Linked Student",
          type: "select",
          lookupKey: "students",
        },
        {
          name: "phone",
          label: "Phone Number",
          type: "tel",
          placeholder: "+233 ...",
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          placeholder: "parent@example.com",
        },
        {
          name: "occupation",
          label: "Occupation",
          type: "text",
          placeholder: "e.g. Civil Engineer",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          defaultValue: "active",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
        },
        {
          name: "is_primary_contact",
          label: "Primary Emergency & Billing Contact",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "address",
          label: "Residential Address",
          type: "textarea",
          placeholder: "Street, neighborhood, city",
          colSpan: 2,
        },
        {
          name: "create_account",
          label: "Also Create Parent Portal Login Account (Requires Email)",
          type: "checkbox",
          defaultValue: false,
          createOnly: true,
          colSpan: 2,
          helperText: "Provisions a verified Supabase Auth account with Parent role.",
        },
        {
          name: "password",
          label: "Initial Portal Password",
          type: "password",
          createOnly: true,
          placeholder: "Minimum 6 characters",
          visibleWhen: (formData) => Boolean(formData.create_account),
          colSpan: 2,
        },
      ],
      columns: [
        { key: "full_name", label: "Guardian Name" },
        { key: "relationship", label: "Relationship" },
        {
          key: "student_id",
          label: "Linked Student",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("students", row.student_id),
        },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        {
          key: "is_primary_contact",
          label: "Primary",
          render: (row) => (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                row.is_primary_contact
                  ? "border border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {row.is_primary_contact ? "Primary" : "Secondary"}
            </span>
          ),
        },
        {
          key: "status",
          label: "Portal Access",
          render: (row) => (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                row.status === "active"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {row.user_id ? "Portal Linked" : row.status || "active"}
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Parents & Guardians"
      subtitle="Manage student family contacts, link guardians to pupils, and provision Parent Portal login access."
      badge="High School Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.parent_guardians || [];
        const linked = rows.filter((r: any) => Boolean(r.student_id)).length;
        const primary = rows.filter((r: any) => Boolean(r.is_primary_contact)).length;
        const portalAccounts = rows.filter((r: any) => Boolean(r.user_id)).length;
        return [
          { label: "Total Guardians", value: rows.length, subtext: "Registered contacts", tone: "indigo" },
          { label: "Student Links", value: linked, subtext: "Mapped to students", tone: "emerald" },
          { label: "Primary Contacts", value: primary, subtext: "Emergency contacts", tone: "blue" },
          { label: "Portal Logins", value: portalAccounts, subtext: "Auth provisioned", tone: "purple" },
        ];
      }}
    />
  );
}
