"use client";

import React, { useState } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function StudentTimetablePage() {
  const { data, loading, error, reload } = useStudentPortalSection("timetable");
  const [uniTab, setUniTab] = useState<"lectures" | "exams">("lectures");

  if (loading) {
    return <StudentPageLoading label="Loading personalized timetable..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const isUniversity = data.school?.schoolType === "university";
  const entries = data.entries || [];
  const examEntries = entries.filter(
    (e: any) => e.entry_type === "exam" || Boolean(e.exam_date)
  );
  const weeklyEntries = entries.filter(
    (e: any) => e.entry_type !== "exam" && !e.exam_date
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {isUniversity ? "Lecture & Exam Timetable" : "Weekly Class Timetable"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isUniversity
              ? "Live class lectures and examination timetable for your registered courses."
              : `Weekly period schedule for ${data.student?.programme_name || "your assigned class"}.`}
          </p>
        </div>

        {isUniversity && (
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setUniTab("lectures")}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                uniTab === "lectures"
                  ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Lecture Schedule ({weeklyEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setUniTab("exams")}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                uniTab === "exams"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Exam Timetable ({examEntries.length})
            </button>
          </div>
        )}
      </div>

      {isUniversity && uniTab === "exams" ? (
        examEntries.length === 0 ? (
          <StudentEmptyState
            icon={CalendarDays}
            title="No Examination Slots Published Yet"
            description="Examination dates and hall allocations for your registered courses will appear here once scheduled by your School Administrator."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examEntries.map((slot: any) => (
              <div
                key={slot.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                    {slot.course?.code || "EXAM"}
                  </span>
                  <span className="text-xs font-bold text-rose-600">
                    {slot.exam_date || slot.day_of_week}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {slot.course?.name || "Scheduled Exam"}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {slot.start_time} – {slot.end_time}
                  </span>
                  {slot.room && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {slot.room}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : weeklyEntries.length === 0 ? (
        <StudentEmptyState
          icon={CalendarDays}
          title="No Weekly Sessions Scheduled"
          description={
            isUniversity
              ? "Ensure you have registered semester courses and that timetable slots have been published by your department."
              : "Your weekly period timetable has not been published for your class yet."
          }
          actionHref={isUniversity ? "/student/registration" : undefined}
          actionLabel={isUniversity ? "Manage Course Registration" : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS_OF_WEEK.map((day) => {
            const slots = weeklyEntries
              .filter(
                (s: any) =>
                  String(s.day_of_week || "").toLowerCase() === day.toLowerCase()
              )
              .sort((a: any, b: any) =>
                String(a.start_time || "").localeCompare(String(b.start_time || ""))
              );
            return (
              <div
                key={day}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {day}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {slots.length} {slots.length === 1 ? "slot" : "slots"}
                  </span>
                </div>

                {slots.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3">
                    No classes scheduled
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {slots.map((slot: any) => (
                      <div
                        key={slot.id}
                        className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                            {slot.course?.code || slot.subject?.code || "CLASS"}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {slot.start_time} – {slot.end_time}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {slot.course?.name || slot.subject?.name || "Scheduled Session"}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          {slot.teacher_name && <span>{slot.teacher_name}</span>}
                          {slot.room && <span>· {slot.room}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
