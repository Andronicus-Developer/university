"use client";

import React, { useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

export default function ParentsAndGuardiansPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
          placeholder: "Minimum 6 characters (auto-generated if blank)",
          visibleWhen: (formData) => Boolean(formData.create_account),
          colSpan: 2,
        },
      ],
      columns: [
        { key: "full_name", label: "Guardian Name" },
        { key: "relationship", label: "Relationship" },
        {
          key: "student_id",
          label: "Linked Student(s)",
          render: (row, _lookups, { formatLookup }) => {
            const ids: string[] = Array.isArray(row.linked_student_ids) && row.linked_student_ids.length > 0
              ? row.linked_student_ids
              : row.student_id
              ? [row.student_id]
              : [];
            if (ids.length === 0) return "—";
            return (
              <div className="flex flex-wrap gap-1">
                {ids.map((sid) => (
                  <span
                    key={sid}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    {formatLookup("students", sid)}
                  </span>
                ))}
              </div>
            );
          },
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
      renderExtraPanel={({ refresh }) => (
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Users className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
            <div className="text-xs text-indigo-950">
              <p className="font-semibold">
                Embedded Student Guardians &amp; Sibling Sync
              </p>
              <p className="text-indigo-800/90 mt-0.5">
                Automatically imports guardian details from existing student enrolments into this directory and links siblings sharing the same guardian email or phone.
              </p>
              {syncMessage && (
                <p
                  className={`mt-1 font-semibold ${
                    syncMessage.type === "error" ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  {syncMessage.text}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              setSyncMessage(null);
              try {
                const res = await fetch("/api/admin/portal-data/parent_guardians", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "sync_from_students" }),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setSyncMessage({
                    type: "error",
                    text: json?.error || "Sync failed.",
                  });
                } else {
                  const s = json.synced || {};
                  setSyncMessage({
                    type: "success",
                    text: `Sync complete: ${s.syncedStudents || 0} student(s) reconciled, ${s.syncedParents || 0} parent(s) added, ${s.linkedSiblings || 0} existing parent/sibling link(s) updated.`,
                  });
                  await refresh();
                }
              } catch (err: any) {
                setSyncMessage({
                  type: "error",
                  text: err?.message || "Network error during sync.",
                });
              } finally {
                setSyncing(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-3.5 py-2 text-xs font-semibold text-white shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing..." : "Sync Parents from Students"}</span>
          </button>
        </div>
      )}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.parent_guardians || [];
        const linked = rows.reduce(
          (acc: number, r: any) =>
            acc +
            (Array.isArray(r.linked_student_ids) && r.linked_student_ids.length > 0
              ? r.linked_student_ids.length
              : r.student_id
              ? 1
              : 0),
          0
        );
        const primary = rows.filter((r: any) => Boolean(r.is_primary_contact)).length;
        const portalAccounts = rows.filter((r: any) => Boolean(r.user_id)).length;
        return [
          { label: "Total Guardians", value: rows.length, subtext: "Registered contacts", tone: "indigo" },
          { label: "Student Links", value: linked, subtext: "Linked wards (incl. siblings)", tone: "emerald" },
          { label: "Primary Contacts", value: primary, subtext: "Emergency contacts", tone: "blue" },
          { label: "Portal Logins", value: portalAccounts, subtext: "Auth provisioned", tone: "purple" },
        ];
      }}
    />
  );
}
