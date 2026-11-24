"use client";

import React from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

export default function TeacherTimetablePage() {
  const { data, loading, error, reload } = useStaffPortalSection<any>("hs_timetable");

  if (loading) return <StaffPageLoading label="Loading weekly teaching timetable..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  const entries: any[] = data?.entries || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Weekly Period Schedule · {data?.activeTerm?.name || "Active Term"}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          Teaching Timetable
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Weekly class and subject lesson periods configured for your schedule.
        </p>
      </div>

      {entries.length === 0 ? (
        <StaffEmptyState
          icon={CalendarDays}
          title="No Timetable Periods Scheduled"
          description="Weekly class periods assigned by your School Administrator will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((slot) => (
            <div
              key={slot.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {slot.day_of_week}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  {String(slot.start_time || "").slice(0, 5)} –{" "}
                  {String(slot.end_time || "").slice(0, 5)}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {slot.subject_code ? `${slot.subject_code} — ` : ""}
                {slot.subject_name || "Class Period"}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {slot.class_name && <span className="font-semibold">{slot.class_name}</span>}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                  {slot.room || "Classroom TBA"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
