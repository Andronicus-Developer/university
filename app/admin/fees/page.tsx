"use client";

import React, { useEffect, useMemo, useState } from "react";
import LiveCrudModule, {
  type FieldConfig,
  type LiveCrudTabConfig,
} from "@/components/admin/LiveCrudModule";
import { toPortalSchoolType, type PortalSchoolType } from "@/config/schoolPortalConfig";
import { getSchoolFormConfig } from "@/config/schoolFormConfig";

const INVOICE_BADGE: Record<string, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial: "border-blue-200 bg-blue-50 text-blue-700",
  unpaid: "border-amber-200 bg-amber-50 text-amber-700",
  overdue: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function FeesAndPaymentsPage() {
  const [schoolType, setSchoolType] = useState<PortalSchoolType>("university");
  const [currency, setCurrency] = useState<string>("USD");

  useEffect(() => {
    fetch("/api/settings/institution", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.institution?.school_type) {
          setSchoolType(toPortalSchoolType(data.institution.school_type));
        }
        if (data?.institution?.currency) {
          setCurrency(String(data.institution.currency));
        }
      })
      .catch(() => {});
  }, []);

  const feesSpec = useMemo(() => getSchoolFormConfig(schoolType).fees, [schoolType]);

  const meta = useMemo(() => {
    if (schoolType === "high_school") {
      return {
        title: "School Fees & Billing",
        subtitle:
          "Configure term fee schedules, boarding/dining levies, issue student billing invoices, and track payments.",
        badge: "High School Portal",
      };
    }
    if (schoolType === "vocational") {
      return {
        title: "Training Fees & Payments",
        subtitle:
          "Configure workshop materials, tools/PPE, NVTI test fees, issue trainee invoices, and record tuition receipts.",
        badge: "Vocational Portal",
      };
    }
    return {
      title: "Tuition & Fee Management",
      subtitle:
        "Configure departmental tuition structures, hostel/exam dues, manage student invoices, and record verified payments.",
      badge: "University Portal",
    };
  }, [schoolType]);

  const tabs: LiveCrudTabConfig[] = useMemo(() => {
    const structureFields: FieldConfig[] = [
      {
        name: "name",
        label: "Fee Title",
        type: "text",
        required: true,
        placeholder: feesSpec.feeTitlePlaceholder,
      },
      {
        name: "code",
        label: "Fee Code",
        type: "text",
        placeholder: feesSpec.feeCodePlaceholder,
      },
      {
        name: "category",
        label: "Fee Category",
        type: "select",
        defaultValue: feesSpec.categories[0]?.value || "tuition",
        options: feesSpec.categories,
      },
      {
        name: "amount",
        label: `Amount (${currency})`,
        type: "number",
        min: 0,
        step: "0.01",
        required: true,
        defaultValue: 0,
      },
      {
        name: "currency",
        label: "Currency Code",
        type: "text",
        defaultValue: currency,
      },
      {
        name: "term_id",
        label: feesSpec.termLabel,
        type: "select",
        lookupKey: "terms",
      },
    ];

    if (feesSpec.showDepartment) {
      structureFields.push({
        name: "department_id",
        label: feesSpec.departmentLabel,
        type: "select",
        lookupKey: "departments",
      });
    }

    if (feesSpec.showProgram) {
      structureFields.push({
        name: "programme_id",
        label: feesSpec.programLabel,
        type: "select",
        lookupKey: "programmes",
      });
    }

    structureFields.push(
      {
        name: "description",
        label: "Billing Scope & Notes",
        type: "textarea",
        colSpan: 2,
      },
      {
        name: "is_mandatory",
        label: "Mandatory Fee",
        type: "checkbox",
        defaultValue: true,
      },
      {
        name: "is_active",
        label: "Active Schedule",
        type: "checkbox",
        defaultValue: true,
      }
    );

    const categoryLabelByValue = new Map<string, string>(
      feesSpec.categories.map((c) => [c.value, c.label])
    );

    return [
      {
        key: "fee_structures",
        label: "Fee Structures",
        resource: "fee_structures",
        singularLabel: "Fee Item",
        pluralLabel: "Fee Structures",
        description: feesSpec.addItemSubtitle,
        searchFields: ["name", "code", "category", "description"],
        fields: structureFields,
        columns: [
          { key: "code", label: "Code" },
          { key: "name", label: "Fee Item" },
          {
            key: "category",
            label: "Category",
            render: (row) => (
              <span className="capitalize">
                {categoryLabelByValue.get(row.category) ||
                  String(row.category || "tuition").replace(/_/g, " ")}
              </span>
            ),
          },
          {
            key: "amount",
            label: "Amount",
            align: "right",
            render: (row) => (
              <span className="font-semibold text-slate-900">
                {row.currency || currency} {Number(row.amount ?? 0).toLocaleString()}
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
                {row.is_active !== false ? "Active" : "Inactive"}
              </span>
            ),
          },
        ],
      },
      {
        key: "invoices",
        label: `${feesSpec.learnerSingular} Invoices`,
        resource: "invoices",
        singularLabel: "Invoice",
        pluralLabel: `${feesSpec.learnerSingular} Invoices`,
        description: `Issue and track fee invoices per ${feesSpec.learnerSingular.toLowerCase()}.`,
        searchFields: ["invoice_number", "status"],
        filterField: {
          name: "status",
          label: "Invoice Statuses",
          options: [
            { value: "unpaid", label: "Unpaid" },
            { value: "partial", label: "Partial" },
            { value: "paid", label: "Paid" },
            { value: "overdue", label: "Overdue" },
          ],
        },
        fields: [
          {
            name: "student_id",
            label: feesSpec.learnerSingular,
            type: "select",
            lookupKey: "students",
            required: true,
          },
          {
            name: "invoice_number",
            label: "Invoice Number",
            type: "text",
            placeholder: "Auto-generated if blank (e.g. INV-2026-001)",
          },
          {
            name: "total_amount",
            label: `Total Billed (${currency})`,
            type: "number",
            min: 0,
            step: "0.01",
            required: true,
            defaultValue: 0,
          },
          {
            name: "paid_amount",
            label: `Paid So Far (${currency})`,
            type: "number",
            min: 0,
            step: "0.01",
            defaultValue: 0,
          },
          {
            name: "due_date",
            label: "Due Date",
            type: "date",
          },
          {
            name: "status",
            label: "Invoice Status",
            type: "select",
            defaultValue: "unpaid",
            options: [
              { value: "unpaid", label: "Unpaid" },
              { value: "partial", label: "Partial" },
              { value: "paid", label: "Paid" },
              { value: "overdue", label: "Overdue" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
        ],
        columns: [
          { key: "invoice_number", label: "Invoice #" },
          {
            key: "student_id",
            label: feesSpec.learnerSingular,
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("students", row.student_id),
          },
          {
            key: "total_amount",
            label: "Total",
            align: "right",
            render: (row) => `${currency} ${Number(row.total_amount ?? 0).toLocaleString()}`,
          },
          {
            key: "paid_amount",
            label: "Paid",
            align: "right",
            render: (row) => `${currency} ${Number(row.paid_amount ?? 0).toLocaleString()}`,
          },
          {
            key: "balance",
            label: "Balance",
            align: "right",
            render: (row) => {
              const bal =
                row.balance != null
                  ? Number(row.balance)
                  : Number(row.total_amount ?? 0) - Number(row.paid_amount ?? 0);
              return (
                <span className={`font-semibold ${bal > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {currency} {bal.toLocaleString()}
                </span>
              );
            },
          },
          { key: "due_date", label: "Due Date" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  INVOICE_BADGE[row.status] || "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {row.status || "unpaid"}
              </span>
            ),
          },
        ],
      },
      {
        key: "payments",
        label: "Payments Ledger",
        resource: "payments",
        singularLabel: "Payment",
        pluralLabel: "Payments Ledger",
        description:
          "Record cash, bank, mobile money, or card receipts and optionally settle a linked invoice automatically.",
        searchFields: ["provider_reference", "payment_method", "provider", "status"],
        fields: [
          {
            name: "student_id",
            label: feesSpec.learnerSingular,
            type: "select",
            lookupKey: "students",
            required: true,
          },
          {
            name: "invoice_id",
            label: "Apply Toward Invoice (Optional)",
            type: "select",
            lookupKey: "invoices",
            createOnly: true,
            helperText: "Automatically updates paid amount & status on the selected invoice.",
          },
          {
            name: "amount",
            label: `Payment Amount (${currency})`,
            type: "number",
            min: 0.01,
            step: "0.01",
            required: true,
          },
          {
            name: "currency",
            label: "Currency",
            type: "text",
            defaultValue: currency,
          },
          {
            name: "payment_method",
            label: "Payment Method",
            type: "select",
            defaultValue: "bank_transfer",
            options: [
              { value: "cash", label: "Cash / Bursar Counter" },
              { value: "bank_transfer", label: "Bank Transfer" },
              { value: "mobile_money", label: "Mobile Money" },
              { value: "card", label: "Card / Online Gateway" },
              { value: "cheque", label: "Cheque" },
            ],
          },
          {
            name: "provider",
            label: "Channel / Gateway",
            type: "text",
            defaultValue: "manual",
            placeholder: feesSpec.paymentProviderPlaceholder,
          },
          {
            name: "provider_reference",
            label: "Receipt / Transaction Ref",
            type: "text",
            placeholder: "Auto-generated if left blank",
          },
          {
            name: "status",
            label: "Payment Status",
            type: "select",
            defaultValue: "completed",
            options: [
              { value: "completed", label: "Verified / Completed" },
              { value: "pending", label: "Pending" },
              { value: "failed", label: "Failed" },
            ],
          },
        ],
        columns: [
          { key: "provider_reference", label: "Receipt Ref" },
          {
            key: "student_id",
            label: feesSpec.learnerSingular,
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("students", row.student_id),
          },
          {
            key: "amount",
            label: "Amount",
            align: "right",
            render: (row) => (
              <span className="font-semibold text-emerald-700">
                {row.currency || currency} {Number(row.amount ?? 0).toLocaleString()}
              </span>
            ),
          },
          {
            key: "payment_method",
            label: "Method",
            render: (row) => (
              <span className="capitalize">
                {String(row.payment_method || "manual").replace(/_/g, " ")}
              </span>
            ),
          },
          { key: "provider", label: "Channel" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  row.status === "success" || row.status === "completed" || row.status === "paid"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {row.status || "completed"}
              </span>
            ),
          },
        ],
      },
    ];
  }, [currency, feesSpec]);

  return (
    <LiveCrudModule
      title={meta.title}
      subtitle={meta.subtitle}
      badge={meta.badge}
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const structures = recordsByTab.fee_structures || [];
        const invoices = recordsByTab.invoices || [];
        const payments = recordsByTab.payments || [];

        const totalInvoiced = invoices.reduce(
          (s: number, i: any) => s + Number(i.total_amount ?? 0),
          0
        );
        const totalOutstanding = invoices.reduce((s: number, i: any) => {
          const bal =
            i.balance != null
              ? Number(i.balance)
              : Math.max(0, Number(i.total_amount ?? 0) - Number(i.paid_amount ?? 0));
          return s + bal;
        }, 0);
        const totalCollected = payments
          .filter((p: any) => ["success", "completed", "paid"].includes(String(p.status)))
          .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);

        return [
          {
            label: "Fee Schedules",
            value: structures.length,
            subtext: "Configured items",
            tone: "indigo",
          },
          {
            label: "Total Invoiced",
            value: `${currency} ${totalInvoiced.toLocaleString()}`,
            subtext: `${invoices.length} invoices`,
            tone: "blue",
          },
          {
            label: "Revenue Collected",
            value: `${currency} ${totalCollected.toLocaleString()}`,
            subtext: `${payments.length} receipts`,
            tone: "emerald",
          },
          {
            label: "Outstanding Balance",
            value: `${currency} ${totalOutstanding.toLocaleString()}`,
            subtext: totalOutstanding > 0 ? "Pending dues" : "Settled",
            tone: totalOutstanding > 0 ? "amber" : "emerald",
          },
        ];
      }}
    />
  );
}
