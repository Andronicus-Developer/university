"use client";

import React from "react";
import { BookOpen, Clock, GraduationCap, Mail } from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function HighSchoolSubjectsPage() {
  const { data, loading, error, reload } = useStudentPortalSection("subjects");

  if (loading) {
    return <StudentPageLoading label="Loading your class subjects..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const subjects = data.subjects || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          My Subjects &amp; Subject Teachers
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Subjects assigned to{" "}
          <strong>{data.student?.programme_name || "your Class / Form"}</strong>{" "}
          alongside weekly teaching periods and assigned subject teachers.
        </p>
      </div>

      {subjects.length === 0 ? (
        <StudentEmptyState
          icon={BookOpen}
          title="No Subjects Assigned Yet"
          description="Subjects configured for your Class / Form by your School Administrator will appear here automatically."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub: any) => (
            <div
              key={sub.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3.5 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  {sub.code}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold capitalize text-slate-600 dark:text-slate-300">
                  {sub.category || "core"}
                </span>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {sub.name}
                </h2>
                {sub.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {sub.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  {sub.weekly_periods ?? 4} periods / wk
                </span>
                <span className="font-semibold">
                  Pass Mark: {sub.pass_mark ?? 50}%
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 truncate">
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    {sub.teacher_name || "Teacher Pending"}
                  </span>
                </span>
                {sub.teacher_email && (
                  <a
                    href={`mailto:${sub.teacher_email}`}
                    className="text-emerald-600 hover:underline inline-flex items-center gap-1 text-[10px] font-bold shrink-0"
                  >
                    <Mail className="h-3 w-3" />
                    <span>Contact</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
