"use client";

import React from "react";
import { CheckSquare, ShieldCheck } from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function HighSchoolAttendanceAndConductPage() {
  const { data, loading, error, reload } = useStudentPortalSection("attendance");

  if (loading) {
    return <StudentPageLoading label="Loading attendance & conduct records..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const records = data.records || [];
  const conduct = data.conduct || [];

  const total = records.length;
  const present = records.filter((r: any) => r.status === "present").length;
  const late = records.filter((r: any) => r.status === "late").length;
  const excused = records.filter((r: any) => r.status === "excused").length;
  const absent = records.filter((r: any) => r.status === "absent").length;
  const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Attendance &amp; Conduct
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Read-only view of your daily term attendance register and teacher conduct remarks.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Attendance Rate</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{pct}%</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Present</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{present}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Late</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{late}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Excused</div>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{excused}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Absent</div>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">{absent}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Attendance Entries */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-600" />
            <span>Roll Call Log ({records.length})</span>
          </h2>

          {records.length === 0 ? (
            <StudentEmptyState
              icon={CheckSquare}
              title="No Attendance Marked Yet"
              description="Daily roll-call sessions recorded by your teachers will appear here."
            />
          ) : (
            <div className="space-y-2">
              {records.map((rec: any) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {rec.session?.session_date || (rec.recorded_at || "").slice(0, 10) || "Session"}
                    </div>
                    <div className="text-[11px] text-slate-500 capitalize">
                      {rec.session?.session_type || "daily"} roll call
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    {rec.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conduct Remarks */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Conduct &amp; Behaviour Remarks ({conduct.length})</span>
          </h2>

          {conduct.length === 0 ? (
            <StudentEmptyState
              icon={ShieldCheck}
              title="No Conduct Notes Recorded"
              description="Teacher commendations, conduct grades, and term remarks appear here."
            />
          ) : (
            <div className="space-y-2.5">
              {conduct.map((c: any) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold capitalize text-slate-900 dark:text-white">
                      {c.record_type} · {c.conduct_grade || "Good"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {c.incident_date}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{c.notes}</p>
                  {c.recorded_by && (
                    <div className="text-[10px] text-slate-400">
                      Recorded by: {c.recorded_by}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
