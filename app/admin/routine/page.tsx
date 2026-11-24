"use client";

import React from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetableAndRoutinePage() {
  const tabs: LiveCrudTabConfig[] = [
    {
      key: "timetable_entries",
      label: "Timetable Periods",
      resource: "timetable_entries",
      singularLabel: "Timetable Slot",
      pluralLabel: "Class Timetable",
      description:
        "Schedule weekly subject periods across classes, assign subject teachers, and allocate classrooms.",
      searchFields: ["day_of_week", "room", "start_time"],
      filterField: {
        name: "day_of_week",
        label: "Days",
        options: DAYS_ORDER.map((d) => ({ value: d, label: d })),
      },
      fields: [
        {
          name: "programme_id",
          label: "Class / Grade Level",
          type: "select",
          lookupKey: "programmes",
          required: true,
        },
        {
          name: "subject_id",
          label: "Subject",
          type: "select",
          lookupKey: "subjects",
          required: true,
        },
        {
          name: "teacher_id",
          label: "Subject Teacher",
          type: "select",
          lookupKey: "staff",
        },
        {
          name: "term_id",
          label: "Academic Term",
          type: "select",
          lookupKey: "terms",
        },
        {
          name: "day_of_week",
          label: "Day of Week",
          type: "select",
          required: true,
          defaultValue: "Monday",
          options: DAYS_ORDER.map((d) => ({ value: d, label: d })),
        },
        {
          name: "room",
          label: "Room / Lab",
          type: "text",
          placeholder: "e.g. Block B — Room 12",
        },
        {
          name: "start_time",
          label: "Start Time",
          type: "time",
          required: true,
          defaultValue: "08:00",
        },
        {
          name: "end_time",
          label: "End Time",
          type: "time",
          required: true,
          defaultValue: "09:00",
        },
      ],
      columns: [
        { key: "day_of_week", label: "Day" },
        {
          key: "time_window",
          label: "Time",
          render: (row) => `${row.start_time || "—"} – ${row.end_time || "—"}`,
        },
        {
          key: "programme_id",
          label: "Class",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("programmes", row.programme_id),
        },
        {
          key: "subject_id",
          label: "Subject",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("subjects", row.subject_id),
        },
        {
          key: "teacher_id",
          label: "Teacher",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("staff", row.teacher_id),
        },
        { key: "room", label: "Room" },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title="Timetable & Class Routine"
      subtitle="Build and maintain your high school weekly teaching timetable across classes, subjects, and rooms."
      badge="High School Portal"
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const rows = recordsByTab.timetable_entries || [];
        const classesScheduled = new Set(rows.map((r: any) => r.programme_id).filter(Boolean)).size;
        const activeTeachers = new Set(rows.map((r: any) => r.teacher_id).filter(Boolean)).size;
        const roomsUsed = new Set(
          rows.map((r: any) => String(r.room || "").trim()).filter(Boolean)
        ).size;
        return [
          { label: "Weekly Periods", value: rows.length, subtext: "Scheduled slots", tone: "indigo" },
          { label: "Classes Covered", value: classesScheduled, subtext: "Distinct grades", tone: "emerald" },
          { label: "Teachers Assigned", value: activeTeachers, subtext: "Timetabled staff", tone: "blue" },
          { label: "Rooms Allocated", value: roomsUsed, subtext: "Active classrooms", tone: "purple" },
        ];
      }}
      renderExtraPanel={({ recordsByTab, helpers }) => {
        const rows = recordsByTab.timetable_entries || [];
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-base font-semibold text-slate-900">Weekly Grid Overview</h3>
            <p className="mb-4 text-xs text-slate-500">
              Live visual schedule grouped by weekday across all classes.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {DAYS_ORDER.map((day) => {
                const daySlots = rows
                  .filter((r: any) => r.day_of_week === day)
                  .sort((a: any, b: any) =>
                    String(a.start_time || "").localeCompare(String(b.start_time || ""))
                  );
                return (
                  <div
                    key={day}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <p className="mb-2 border-b border-slate-200 pb-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
                      {day}
                    </p>
                    {daySlots.length === 0 ? (
                      <p className="text-[11px] text-slate-400">No periods scheduled</p>
                    ) : (
                      <div className="space-y-2">
                        {daySlots.map((slot: any) => (
                          <div
                            key={slot.id}
                            className="rounded-lg border border-indigo-100 bg-white p-2 text-xs shadow-2xs"
                          >
                            <p className="font-semibold text-indigo-700">
                              {helpers.formatLookup("subjects", slot.subject_id)}
                            </p>
                            <p className="text-[11px] text-slate-600">
                              {slot.start_time} – {slot.end_time}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {helpers.formatLookup("programmes", slot.programme_id)}
                              {slot.room ? ` • ${slot.room}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    />
  );
}
