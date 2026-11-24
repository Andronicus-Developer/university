"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

const CONDITION_BADGE: Record<string, { label: string; style: string }> = {
  good: { label: "Good", style: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  needs_repair: { label: "Needs Repair", style: "border-amber-200 bg-amber-50 text-amber-700" },
  out_of_service: { label: "Out of Service", style: "border-rose-200 bg-rose-50 text-rose-700" },
};

export default function WorkshopInventoryPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "workshop_inventory",
      label: "Tools & Equipment",
      resource: "workshop_inventory",
      singularLabel: "Inventory Item",
      pluralLabel: "Workshop Inventory",
      description:
        "Monitor practical training tools, workshop machines, consumables, and PPE stock thresholds.",
      searchFields: ["item_code", "item_name", "category", "condition"],
      filterField: {
        name: "category",
        label: "Categories",
        options: [
          { value: "tool", label: "Hand / Power Tool" },
          { value: "machine", label: "Workshop Machine" },
          { value: "consumable", label: "Consumable Material" },
          { value: "safety_gear", label: "Safety Gear / PPE" },
        ],
      },
      fields: [
        {
          name: "item_name",
          label: "Item Name",
          type: "text",
          required: true,
          placeholder: "e.g. Digital Multimeter / MIG Welder",
        },
        {
          name: "item_code",
          label: "Asset / SKU Code",
          type: "text",
          placeholder: "e.g. INV-WLD-014",
        },
        {
          name: "department_id",
          label: "Assigned Trade / Lab",
          type: "select",
          lookupKey: "departments",
        },
        {
          name: "category",
          label: "Category",
          type: "select",
          defaultValue: "tool",
          options: [
            { value: "tool", label: "Tool" },
            { value: "machine", label: "Machine" },
            { value: "consumable", label: "Consumable" },
            { value: "safety_gear", label: "Safety Gear (PPE)" },
          ],
        },
        {
          name: "quantity",
          label: "Quantity On Hand",
          type: "number",
          min: 0,
          defaultValue: 0,
          required: true,
        },
        {
          name: "min_stock_threshold",
          label: "Reorder Alert Threshold",
          type: "number",
          min: 0,
          defaultValue: 5,
        },
        {
          name: "condition",
          label: "Operational Condition",
          type: "select",
          defaultValue: "good",
          options: [
            { value: "good", label: "Good" },
            { value: "needs_repair", label: "Needs Repair" },
            { value: "out_of_service", label: "Out of Service" },
          ],
        },
        {
          name: "unit_cost",
          label: "Unit Value",
          type: "number",
          min: 0,
          step: "0.01",
          defaultValue: 0,
        },
        {
          name: "notes",
          label: "Maintenance / Location Notes",
          type: "textarea",
          colSpan: 2,
        },
      ],
      columns: [
        { key: "item_code", label: "Code" },
        { key: "item_name", label: "Item Name" },
        {
          key: "category",
          label: "Category",
          render: (row) => (
            <span className="capitalize text-slate-600">
              {String(row.category || "tool").replace(/_/g, " ")}
            </span>
          ),
        },
        {
          key: "department_id",
          label: "Trade / Lab",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("departments", row.department_id),
        },
        {
          key: "quantity",
          label: "Stock Level",
          align: "right",
          render: (row) => {
            const qty = Number(row.quantity ?? 0);
            const min = Number(row.min_stock_threshold ?? 0);
            const isLow = qty <= min;
            return (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isLow
                    ? "border border-rose-200 bg-rose-50 text-rose-700"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {qty} {isLow ? `(Low ≤ ${min})` : "In Stock"}
              </span>
            );
          },
        },
        {
          key: "condition",
          label: "Condition",
          render: (row) => {
            const cfg = CONDITION_BADGE[row.condition] || CONDITION_BADGE.good;
            return (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.style}`}
              >
                {cfg.label}
              </span>
            );
          },
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Tools & Workshop Inventory"
      subtitle="Track practical tools, machinery condition, consumable supplies, and low-stock reorder alerts."
      badge="Vocational Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.workshop_inventory || [];
        const lowStock = rows.filter(
          (r: any) => Number(r.quantity ?? 0) <= Number(r.min_stock_threshold ?? 0)
        ).length;
        const repair = rows.filter(
          (r: any) => r.condition === "needs_repair" || r.condition === "out_of_service"
        ).length;
        const totalUnits = rows.reduce((s: number, r: any) => s + Number(r.quantity ?? 0), 0);
        return [
          { label: "Catalog Items", value: rows.length, subtext: "Tracked assets", tone: "indigo" },
          { label: "Total Units", value: totalUnits, subtext: "On-hand stock", tone: "blue" },
          {
            label: "Low Stock Alerts",
            value: lowStock,
            subtext: lowStock > 0 ? "Restock needed" : "Healthy",
            tone: lowStock > 0 ? "rose" : "emerald",
          },
          {
            label: "Needs Maintenance",
            value: repair,
            subtext: repair > 0 ? "Check equipment" : "All operational",
            tone: repair > 0 ? "amber" : "emerald",
          },
        ];
      }}
    />
  );
}
