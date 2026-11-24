"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  NotebookPen,
  School,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import { StaffPageError, StaffPageLoading } from "@/components/staff/StaffPortalPrimitives";

export default function TeacherDashboardPage() {
  const { data, loading, error, reload } = useStaffPortalSection<any>("dashboard");

  if (loading) return <StaffPageLoading label="Loading live teaching dashboard..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  const schoolType = data?.school?.schoolType || "high_school";

  if (schoolType === "vocational") {
    const kpis = data?.kpis || {
      workshopName: "Trade Workshop",
      activeTraineesCount: 0,
      pendingLogbooksCount: 0,
      modulesTaughtCount: 0,
    };

    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <Wrench className="h-4 w-4" />
              <span>{data?.school?.name || "Vocational Center"} · Trade Workshop</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px]">
                {kpis.workshopName}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
              Welcome back{data?.staffProfile?.full_name ? `, ${data.staffProfile.full_name}` : ""}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {data?.activeTerm?.name || "Current Cohort"} · {data?.lowStockCount ?? 0} low-stock tool/material alert(s)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/teacher/attendance"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Workshop Roll Call</span>
            </Link>
            <Link
              href="/teacher/logbooks"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              <NotebookPen className="h-3.5 w-3.5" />
              <span>Review Logbooks</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/teacher/modules"
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-amber-300"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Assigned Trade Workshop</span>
              <Wrench className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-2 truncate">
              {kpis.workshopName}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Workshop modules →</p>
          </Link>

          <Link
            href="/teacher/attendance"
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-emerald-300"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Active Trainees</span>
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
              {kpis.activeTraineesCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Safety &amp; attendance →</p>
          </Link>

          <Link
            href="/teacher/logbooks"
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-rose-300"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Pending Logbook Sign-Offs</span>
              <NotebookPen className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
              {kpis.pendingLogbooksCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Approve practical tasks →</p>
          </Link>

          <Link
            href="/teacher/competencies"
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-indigo-300"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Modules Taught</span>
              <ClipboardCheck className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
              {kpis.modulesTaughtCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Competency evaluations →</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Trade Modules Assigned
            </h2>
            {(data?.modulesSummary || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No trade modules configured yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.modulesSummary.map((m: any) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-700 dark:text-amber-400 mr-2">
                        {m.code}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">{m.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {m.practical_hours}h Prac · {m.theory_hours}h Theory
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pending Practical Logbooks
              </h2>
              <Link
                href="/teacher/logbooks"
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                Open Sign-Off Queue →
              </Link>
            </div>
            {(data?.recentLogbooks || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-4">All submitted trainee logbook entries are reviewed.</p>
            ) : (
              <div className="space-y-2">
                {data.recentLogbooks.map((l: any) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-xs"
                  >
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>{l.task_title}</span>
                      <span className="text-amber-700 dark:text-amber-300">{l.hours_spent}h</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {l.student_name} · {l.module_code || "Workshop"} · {l.log_date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // High School Teacher Dashboard
  const kpis = data?.kpis || {
    assignedUnitsCount: 0,
    totalStudentsCount: 0,
    todaysPeriodsCount: 0,
    pendingAssessmentsCount: 0,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <School className="h-4 w-4" />
            <span>{data?.school?.name || "High School"} · Teacher Workspace</span>
            {data?.assignedClass?.name && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px]">
                {data.assignedClass.name}
                {data.isClassTeacher ? " (Class Teacher)" : ""}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Welcome back{data?.staffProfile?.full_name ? `, ${data.staffProfile.full_name}` : ""}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {data?.activeTerm?.name || "Active Term"} · {data?.recentConductCount ?? 0} conduct log entries this term
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/teacher/attendance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
            <span>Daily Roll Call</span>
          </Link>
          <Link
            href="/teacher/report-cards"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span>Enter Term Scores</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/teacher/classes"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-emerald-300"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Assigned Subjects &amp; Forms</span>
            <BookOpen className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {kpis.assignedUnitsCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">View classes &amp; roster →</p>
        </Link>

        <Link
          href="/teacher/attendance"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-teal-300"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Total Students</span>
            <Users className="h-4 w-4 text-teal-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {kpis.totalStudentsCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Roll call &amp; conduct →</p>
        </Link>

        <Link
          href="/teacher/timetable"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-indigo-300"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Periods</span>
            <CalendarDays className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {kpis.todaysPeriodsCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Teaching timetable →</p>
        </Link>

        <Link
          href="/teacher/homework"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-amber-300"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Active Homework</span>
            <ClipboardCheck className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {kpis.pendingAssessmentsCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Homework &amp; exercises →</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Classes &amp; Form Allocations
          </h2>
          {(data?.classesSummary || []).length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No classes assigned yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.classesSummary.map((c: any) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                    <span className="ml-2 text-slate-400 font-mono">({c.code})</span>
                  </div>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {c.studentCount} students
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Today&apos;s Teaching Periods
            </h2>
            <Link
              href="/teacher/timetable"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Weekly Grid →
            </Link>
          </div>
          {(data?.todaySchedule || []).length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No periods scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {data.todaySchedule.map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-xs flex justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {p.subject_name || "Class Period"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {p.class_name || ""} {p.room ? `· ${p.room}` : ""}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    {String(p.start_time || "").slice(0, 5)}–{String(p.end_time || "").slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
