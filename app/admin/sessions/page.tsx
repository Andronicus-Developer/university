"use client";

import React, { useEffect, useState } from "react";
import LiveCrudModule, { LiveCrudTabConfig } from "@/components/admin/LiveCrudModule";
import { toPortalSchoolType } from "@/config/schoolPortalConfig";

export default function SessionsAndTermsPage() {
  const [schoolType, setSchoolType] = useState<string>("university");

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

  const isHighSchool = schoolType === "high_school";
  const periodSingular = isHighSchool ? "Term" : "Semester";
  const periodPlural = isHighSchool ? "Terms" : "Semesters";

  const tabs: LiveCrudTabConfig[] = [
    {
      key: "academic_years",
      label: "Academic Years",
      resource: "academic_years",
      singularLabel: "Academic Year",
      pluralLabel: "Academic Years",
      description: "Define institutional academic calendars and mark the active year.",
      searchFields: ["name", "code"],
      fields: [
        {
          name: "name",
          label: "Academic Year Name",
          type: "text",
          required: true,
          placeholder: "e.g. 2026/2027 Academic Year",
          colSpan: 2,
        },
        {
          name: "code",
          label: "Year Code",
          type: "text",
          placeholder: "e.g. 2026-2027",
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
          name: "is_current",
          label: "Set as Current Active Academic Year",
          type: "checkbox",
          defaultValue: false,
          colSpan: 2,
        },
      ],
      columns: [
        { key: "name", label: "Academic Year" },
        { key: "code", label: "Code" },
        { key: "start_date", label: "Start Date" },
        { key: "end_date", label: "End Date" },
        {
          key: "is_current",
          label: "Status",
          render: (row) => (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                row.is_current
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {row.is_current ? "Current Session" : "Archived / Planned"}
            </span>
          ),
        },
      ],
    },
    {
      key: "terms",
      label: periodPlural,
      resource: "terms",
      singularLabel: periodSingular,
      pluralLabel: periodPlural,
      description: `Manage ${periodPlural.toLowerCase()} within each academic year.`,
      searchFields: ["name", "code"],
      filterField: {
        name: "academic_year_id",
        label: "Academic Years",
        lookupKey: "academic_years",
      },
      fields: [
        {
          name: "academic_year_id",
          label: "Academic Year",
          type: "select",
          lookupKey: "academic_years",
          required: true,
        },
        {
          name: "name",
          label: `${periodSingular} Name`,
          type: "text",
          required: true,
          placeholder: isHighSchool ? "e.g. First Term" : "e.g. First Semester",
        },
        {
          name: "code",
          label: `${periodSingular} Code`,
          type: "text",
          placeholder: isHighSchool ? "e.g. T1-2026" : "e.g. SEM1-2026",
        },
        {
          name: "term_number",
          label: `${periodSingular} Sequence #`,
          type: "number",
          min: 1,
          max: 12,
          defaultValue: 1,
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
          name: "is_current",
          label: `Current Active ${periodSingular}`,
          type: "checkbox",
          defaultValue: false,
        },
        {
          name: "is_active",
          label: "Open for Registration & Grading",
          type: "checkbox",
          defaultValue: true,
        },
      ],
      columns: [
        { key: "name", label: periodSingular },
        { key: "code", label: "Code" },
        {
          key: "academic_year_id",
          label: "Academic Year",
          render: (row, _lookups, { formatLookup }) =>
            formatLookup("academic_years", row.academic_year_id),
        },
        { key: "term_number", label: "Order", align: "center" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
        {
          key: "is_current",
          label: "Active",
          render: (row) => (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                row.is_current
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : row.is_active
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {row.is_current ? "Current" : row.is_active ? "Open" : "Closed"}
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <LiveCrudModule
      title={isHighSchool ? "Terms & Academic Year" : "Semesters & Academic Sessions"}
      subtitle={
        isHighSchool
          ? "Configure annual school calendars and academic terms for your high school."
          : "Configure academic years and semesters governing university registration, grading, and billing."
      }
      badge={isHighSchool ? "High School Portal" : "University Portal"}
      tabs={tabs}
      computeKpis={(recordsByTab) => {
        const years = recordsByTab.academic_years || [];
        const terms = recordsByTab.terms || [];
        const currentYear = years.find((y: any) => y.is_current);
        const currentTerm = terms.find((t: any) => t.is_current);
        return [
          {
            label: "Academic Years",
            value: years.length,
            subtext: "Configured calendars",
            tone: "indigo",
          },
          {
            label: "Current Year",
            value: currentYear?.name || "Not Set",
            subtext: currentYear ? "Active" : "Needs selection",
            tone: currentYear ? "emerald" : "amber",
          },
          {
            label: periodPlural,
            value: terms.length,
            subtext: `${terms.filter((t: any) => t.is_active).length} open`,
            tone: "blue",
          },
          {
            label: `Active ${periodSingular}`,
            value: currentTerm?.name || "Not Set",
            subtext: currentTerm ? "Current window" : "Select one",
            tone: currentTerm ? "emerald" : "amber",
          },
        ];
      }}
    />
  );
}
