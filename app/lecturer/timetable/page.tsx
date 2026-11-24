"use client";

import React, { useState } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

interface TimetableSlot {
  id: string;
  course_code: string;
  course_name: string;
  day_of_week: string;
  exam_date?: string | null;
  start_time: string;
  end_time: string;
  room: string | null;
  entry_type: string | null;
}

interface UniTimetablePayload {
  activeTerm: { name: string } | null;
  lectures: TimetableSlot[];
  exams: TimetableSlot[];
}

export default function LecturerTimetablePage() {
  const { data, loading, error, reload } =
    useStaffPortalSection<UniTimetablePayload>("uni_timetable");
  const [tab, setTab] = useState<"lectures" | "exams">("lectures");

  if (loading) return <StaffPageLoading label="Loading teaching & invigilation timetable..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  const activeList = tab === "lectures" ? data?.lectures || [] : data?.exams || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Academic Schedule · {data?.activeTerm?.name || "Active Semester"}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          Lecture &amp; Exam Timetable
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Weekly lecture slots and examination invigilation schedule assigned to your courses.
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
        <button
          type="button"
          onClick={() => setTab("lectures")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            tab === "lectures"
              ? "bg-blue-600 text-white"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          Lecture Timetable ({data?.lectures?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setTab("exams")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            tab === "exams" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300"
          }`}
        >
          Exam &amp; Invigilation ({data?.exams?.length || 0})
        </button>
      </div>

      {activeList.length === 0 ? (
        <StaffEmptyState
          icon={CalendarDays}
          title={tab === "lectures" ? "No Lecture Slots Scheduled" : "No Exam Sessions Scheduled"}
          description="Timetable entries configured for your courses by the Academic Registry will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.map((slot) => (
            <div
              key={slot.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {tab === "exams" && slot.exam_date ? slot.exam_date : slot.day_of_week}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  {String(slot.start_time || "").slice(0, 5)} –{" "}
                  {String(slot.end_time || "").slice(0, 5)}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {slot.course_code ? `${slot.course_code} — ` : ""}
                {slot.course_name || "Course Session"}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                <span>{slot.room || "Venue TBA"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
