"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

const ALLOCATION_BADGE: Record<string, string> = {
  occupied: "border-emerald-200 bg-emerald-50 text-emerald-700",
  reserved: "border-blue-200 bg-blue-50 text-blue-700",
  checked_out: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function HostelsPage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "hostels",
      label: "Residence Halls",
      resource: "hostels",
      singularLabel: "Hostel / Residence Hall",
      pluralLabel: "Hostels & Residence Halls",
      description: "Configure campus halls, bed capacities, gender policies, and hall wardens.",
      searchFields: ["name", "code", "warden_name", "gender_policy"],
      filterField: {
        name: "gender_policy",
        label: "Gender Policies",
        options: [
          { value: "mixed", label: "Mixed" },
          { value: "male", label: "Male Only" },
          { value: "female", label: "Female Only" },
        ],
      },
      fields: [
        {
          name: "name",
          label: "Hostel / Hall Name",
          type: "text",
          required: true,
          placeholder: "e.g. Unity Hall",
        },
        {
          name: "code",
          label: "Hall Code",
          type: "text",
          placeholder: "e.g. UH-01",
        },
        {
          name: "gender_policy",
          label: "Gender Policy",
          type: "select",
          defaultValue: "mixed",
          options: [
            { value: "mixed", label: "Mixed" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ],
        },
        {
          name: "warden_name",
          label: "Hall Warden / Supervisor",
          type: "text",
          placeholder: "e.g. Mrs. Comfort Boateng",
        },
        {
          name: "total_rooms",
          label: "Total Rooms",
          type: "number",
          min: 0,
          defaultValue: 20,
        },
        {
          name: "total_beds",
          label: "Total Bed Capacity",
          type: "number",
          min: 0,
          defaultValue: 80,
        },
        {
          name: "address",
          label: "Campus Location / Block",
          type: "textarea",
          colSpan: 2,
        },
        {
          name: "is_active",
          label: "Hostel Open for Student Allocation",
          type: "checkbox",
          defaultValue: true,
          colSpan: 2,
        },
      ],
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Residence Hall" },
        {
          key: "gender_policy",
          label: "Policy",
          render: (row) => (
            <span className="capitalize text-slate-700">{row.gender_policy || "mixed"}</span>
          ),
        },
        { key: "total_rooms", label: "Rooms", align: "right" },
        { key: "total_beds", label: "Beds", align: "right" },
        { key: "warden_name", label: "Warden" },
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
              {row.is_active !== false ? "Open" : "Closed"}
            </span>
          ),
        },
      ],
    },
    {
      key: "hostel_allocations",
      label: "Room Allocations",
      resource: "hostel_allocations",
      singularLabel: "Room Allocation",
      pluralLabel: "Room Allocations",
      description: "Assign students to hostel rooms and track occupancy across academic years.",
      searchFields: ["room_number", "bed_number", "status"],
      filterField: {
        name: "hostel_id",
        label: "Hostels",
        lookupKey: "hostels",
      },
      fields: [
        {
          name: "student_id",
          label: "Student",
          type: "select",
          lookupKey: "students",
          required: true,
        },
        {
          name: "hostel_id",
          label: "Hostel / Residence Hall",
          type: "select",
          lookupKey: "hostels",
          required: true,
        },
        {
          name: "room_number",
          label: "Room Number",
          type: "text",
          required: true,
          placeholder: "e.g. A-204",
        },
        {
          name: "bed_number",
          label: "Bed / Bunk #",
          type: "text",
          placeholder: "e.g. Bed 2",
        },
        {
          name: "academic_year_id",
          label: "Academic Year",
          type: "select",
          lookupKey: "academic_years",
        },
        {
          name: "status",
          label: "Occupancy Status",
          type: "select",
          defaultValue: "occupied",
          options: [
            { value: "occupied", label: "Occupied" },
            { value: "reserved", label: "Reserved" },
            { value: "checked_out", label: "Checked Out" },
          ],
        },
      ],
      columns: [
        {
          key: "student_id",
          label: "Student",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("students", row.student_id),
        },
        {
          key: "hostel_id",
          label: "Hostel",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("hostels", row.hostel_id),
        },
        { key: "room_number", label: "Room" },
        { key: "bed_number", label: "Bed" },
        {
          key: "academic_year_id",
          label: "Academic Year",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("academic_years", row.academic_year_id),
        },
        {
          key: "status",
          label: "Status",
          render: (row) => (
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                ALLOCATION_BADGE[row.status] || "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {String(row.status || "occupied").replace(/_/g, " ")}
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Hostels & Student Accommodation"
      subtitle="Manage residential halls, bed capacities, and live student room assignments."
      badge="University Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const hostels = recordsByTab.hostels || [];
        const allocations = recordsByTab.hostel_allocations || [];
        const totalBeds = hostels.reduce((s: number, h: any) => s + Number(h.total_beds ?? 0), 0);
        const occupied = allocations.filter((a: any) => a.status === "occupied").length;
        const rate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;
        return [
          { label: "Residence Halls", value: hostels.length, subtext: "Campus blocks", tone: "indigo" },
          { label: "Total Bed Capacity", value: totalBeds, subtext: "Configured beds", tone: "blue" },
          { label: "Occupied Beds", value: occupied, subtext: "Active residents", tone: "emerald" },
          { label: "Occupancy Rate", value: `${rate}%`, subtext: "Live utilization", tone: "purple" },
        ];
      }}
    />
  );
}
