"use client";

import React, { useEffect, useMemo, useState } from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";
import { toPortalSchoolType } from "@/config/schoolPortalConfig";

const CONDUCT_BADGE: Record<string, string> = {
  commendation: "border-emerald-200 bg-emerald-50 text-emerald-700",
  counseling: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  disciplinary: "border-rose-200 bg-rose-50 text-rose-700",
};

const ATTENDANCE_BADGE: Record<string, string> = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-700",
  late: "border-amber-200 bg-amber-50 text-amber-700",
  excused: "border-blue-200 bg-blue-50 text-blue-700",
  absent: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function AttendanceAndConductPage() {
  const [schoolType, setSchoolType] = useState<string>("high_school");

  useEffect(() => {
    fetch("/api/settings/institution", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.institution?.school_type) {
          setSchoolType(toPortalSchoolType(data.institution.school_type));
        }
      })
      .catch(() => {});
  }, []);

  const isVocational = schoolType === "vocational";
  const learnerLabel = isVocational ? "Trainee" : "Student";
  const badgeLabel = isVocational
    ? "Vocational Portal"
    : schoolType === "university"
    ? "University Portal"
    : "High School Portal";

  const tabs: LiveCrudTabConfig[] = useMemo(
    () => [
      {
        key: "attendance_sessions",
        label: isVocational ? "Workshop Sessions" : "Roll Call Sessions",
        resource: "attendance_sessions",
        singularLabel: "Attendance Session",
        pluralLabel: "Attendance Sessions",
        description: "Open daily roll-call or practical attendance sessions.",
        searchFields: ["session_date", "session_type", "status"],
        fields: [
          {
            name: "session_date",
            label: "Session Date",
            type: "date",
            required: true,
          },
          {
            name: "session_type",
            label: "Session Type",
            type: "select",
            defaultValue: isVocational ? "practical" : "daily",
            options: [
              { value: "daily", label: "Daily Roll Call" },
              { value: "morning", label: "Morning Assembly / Block" },
              { value: "afternoon", label: "Afternoon Block" },
              { value: "practical", label: "Workshop Practical" },
              { value: "lecture", label: "Lecture Session" },
            ],
          },
          {
            name: "status",
            label: "Session Status",
            type: "select",
            defaultValue: "open",
            options: [
              { value: "open", label: "Open" },
              { value: "submitted", label: "Submitted" },
              { value: "closed", label: "Closed" },
            ],
          },
        ],
        columns: [
          { key: "session_date", label: "Date" },
          {
            key: "session_type",
            label: "Type",
            render: (row) => <span className="capitalize">{row.session_type || "daily"}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  row.status === "open"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                {row.status || "open"}
              </span>
            ),
          },
        ],
      },
      {
        key: "attendance_records",
        label: "Attendance Entries",
        resource: "attendance_records",
        singularLabel: "Attendance Entry",
        pluralLabel: "Attendance Entries",
        description: `Mark individual ${learnerLabel.toLowerCase()} present, absent, late, or excused for each session.`,
        searchFields: ["status"],
        filterField: {
          name: "status",
          label: "Attendance Statuses",
          options: [
            { value: "present", label: "Present" },
            { value: "late", label: "Late" },
            { value: "excused", label: "Excused" },
            { value: "absent", label: "Absent" },
          ],
        },
        fields: [
          {
            name: "session_id",
            label: "Attendance Session",
            type: "select",
            lookupKey: "attendance_sessions",
            required: true,
          },
          {
            name: "student_id",
            label: learnerLabel,
            type: "select",
            lookupKey: "students",
            required: true,
          },
          {
            name: "status",
            label: "Mark Status",
            type: "select",
            defaultValue: "present",
            required: true,
            options: [
              { value: "present", label: "Present" },
              { value: "late", label: "Late" },
              { value: "excused", label: "Excused" },
              { value: "absent", label: "Absent" },
            ],
            colSpan: 2,
          },
        ],
        columns: [
          {
            key: "session_id",
            label: "Session",
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("attendance_sessions", row.session_id),
          },
          {
            key: "student_id",
            label: learnerLabel,
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("students", row.student_id),
          },
          {
            key: "status",
            label: "Attendance",
            render: (row) => (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  ATTENDANCE_BADGE[row.status] || "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {row.status || "present"}
              </span>
            ),
          },
        ],
      },
      {
        key: "student_conduct_records",
        label: "Conduct & Behaviour",
        resource: "student_conduct_records",
        singularLabel: "Conduct Record",
        pluralLabel: "Conduct & Behaviour Records",
        description: `Log commendations, warnings, counseling notes, and conduct grades for ${learnerLabel.toLowerCase()}s.`,
        searchFields: ["record_type", "conduct_grade", "notes"],
        filterField: {
          name: "record_type",
          label: "Record Types",
          options: [
            { value: "commendation", label: "Commendation" },
            { value: "counseling", label: "Counseling" },
            { value: "warning", label: "Warning" },
            { value: "disciplinary", label: "Disciplinary" },
          ],
        },
        fields: [
          {
            name: "student_id",
            label: learnerLabel,
            type: "select",
            lookupKey: "students",
            required: true,
          },
          {
            name: "term_id",
            label: isVocational ? "Training Period" : "Academic Term",
            type: "select",
            lookupKey: "terms",
          },
          {
            name: "record_type",
            label: "Record Category",
            type: "select",
            required: true,
            defaultValue: "commendation",
            options: [
              { value: "commendation", label: "Commendation / Merit" },
              { value: "counseling", label: "Counseling Note" },
              { value: "warning", label: "Warning" },
              { value: "disciplinary", label: "Disciplinary Incident" },
            ],
          },
          {
            name: "conduct_grade",
            label: "Conduct Grade",
            type: "select",
            defaultValue: "Good",
            options: [
              { value: "Excellent", label: "Excellent" },
              { value: "Very Good", label: "Very Good" },
              { value: "Good", label: "Good" },
              { value: "Fair", label: "Fair" },
              { value: "Needs Improvement", label: "Needs Improvement" },
            ],
          },
          {
            name: "incident_date",
            label: "Date Recorded",
            type: "date",
          },
          {
            name: "notes",
            label: "Behaviour & Action Notes",
            type: "textarea",
            colSpan: 2,
          },
        ],
        columns: [
          { key: "incident_date", label: "Date" },
          {
            key: "student_id",
            label: learnerLabel,
            render: (row, _lookups, { formatLookup }) =>
              formatLookup("students", row.student_id),
          },
          {
            key: "record_type",
            label: "Category",
            render: (row) => (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  CONDUCT_BADGE[row.record_type] || "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {row.record_type || "commendation"}
              </span>
            ),
          },
          { key: "conduct_grade", label: "Conduct Grade" },
          { key: "notes", label: "Notes" },
        ],
      },
    ],
    [isVocational, learnerLabel]
  );

  return (
    <LiveCrudModule
      title={isVocational ? "Workshop Attendance" : "Attendance & Conduct"}
      subtitle={
        isVocational
          ? "Manage practical workshop sessions, trainee attendance logs, and safety conduct entries."
          : "Track daily student roll call sessions, individual attendance entries, and discipline/conduct records."
      }
      badge={badgeLabel}
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const sessions = recordsByTab.attendance_sessions || [];
        const entries = recordsByTab.attendance_records || [];
        const conduct = recordsByTab.student_conduct_records || [];
        const present = entries.filter(
          (e: any) => e.status === "present" || e.status === "late"
        ).length;
        const rate = entries.length > 0 ? Math.round((present / entries.length) * 100) : 0;
        const commendations = conduct.filter(
          (c: any) => c.record_type === "commendation"
        ).length;
        return [
          {
            label: "Recorded Sessions",
            value: sessions.length,
            subtext: "Roll-call logs",
            tone: "indigo",
          },
          {
            label: "Attendance Entries",
            value: entries.length,
            subtext: `${present} present/late`,
            tone: "blue",
          },
          {
            label: "Attendance Rate",
            value: `${rate}%`,
            subtext: "Present ratio",
            tone: "emerald",
          },
          {
            label: "Conduct Records",
            value: conduct.length,
            subtext: `${commendations} commendations`,
            tone: "purple",
          },
        ];
      }}
    />
  );
}
