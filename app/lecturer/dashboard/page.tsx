"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileCheck2,
  GraduationCap,
  Users,
} from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import { StaffPageError, StaffPageLoading } from "@/components/staff/StaffPortalPrimitives";

interface UniDashboardPayload {
  school: { id: string; name: string; schoolType: string };
  staffProfile: any | null;
  department: { name: string } | null;
  activeYear: { name: string; code: string } | null;
  activeTerm: { name: string; code: string } | null;
  kpis: {
    assignedCoursesCount: number;
    totalEnrolledStudents: number;
    pendingGradeEntries: number;
    todaysLecturesCount: number;
  };
  todaySchedule: Array<{
    id: string;
    course_code: string;
    course_name: string;
    start_time: string;
    end_time: string;
    room: string | null;
    entry_type: string | null;
  }>;
  coursesSummary: Array<{
    id: string;
    code: string;
    name: string;
    credits: number;
    enrolledCount: number;
  }>;
  recentMaterialsCount: number;
}

export default function LecturerDashboardPage() {
  const { data, loading, error, reload } =
    useStaffPortalSection<UniDashboardPayload>("dashboard");

  if (loading) return <StaffPageLoading label="Loading University Lecturer Dashboard..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  const kpis = data?.kpis || {
    assignedCoursesCount: 0,
    totalEnrolledStudents: 0,
    pendingGradeEntries: 0,
    todaysLecturesCount: 0,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <GraduationCap className="h-4 w-4" />
            <span>{data?.school?.name || "University"} · Lecturer Workspace</span>
            {data?.department?.name && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px]">
                {data.department.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Welcome back{data?.staffProfile?.full_name ? `, ${data.staffProfile.full_name}` : ""}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {data?.activeTerm?.name || "Active Semester"}{" "}
            {data?.activeYear?.code ? `(${data.activeYear.code})` : ""} ·{" "}
            {data?.recentMaterialsCount ?? 0} published course materials
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/lecturer/attendance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
            <span>Take Attendance</span>
          </Link>
          <Link
            href="/lecturer/grades"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <Award className="h-3.5 w-3.5" />
            <span>Enter GPA Grades</span>
          </Link>
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/lecturer/courses"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Assigned Courses</span>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {kpis.assignedCoursesCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Courses &amp; materials →
          </p>
        </Link>

        <Link
          href="/lecturer/attendance"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Total Enrolled Students</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {kpis.totalEnrolledStudents}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            View class rosters →
          </p>
        </Link>

        <Link
          href="/lecturer/grades"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Pending Grade Entries</span>
            <FileCheck2 className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {kpis.pendingGradeEntries}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Enrolments ungraded →
          </p>
        </Link>

        <Link
          href="/lecturer/timetable"
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Lectures</span>
            <CalendarDays className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {kpis.todaysLecturesCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Teaching schedule →
          </p>
        </Link>
      </div>

      {/* Main Split: Assigned Course Load & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Assigned Semester Courses
            </h2>
            <Link
              href="/lecturer/courses"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>Manage Materials</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {(data?.coursesSummary || []).length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
              No courses are currently allocated to your lecturer profile.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data!.coursesSummary.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                        {c.code}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {c.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {c.credits} Credits · {c.enrolledCount} registered student(s)
                    </p>
                  </div>
                  <Link
                    href="/lecturer/grades"
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Grade Sheet
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Today&apos;s Teaching Schedule
            </h2>
            <Link
              href="/lecturer/timetable"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Full Timetable →
            </Link>
          </div>

          {(data?.todaySchedule || []).length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
              No lectures or exam invigilations scheduled for today.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data!.todaySchedule.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span>
                      {slot.course_code ? `${slot.course_code} — ` : ""}
                      {slot.course_name || "Scheduled Session"}
                    </span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400">
                      {String(slot.start_time || "").slice(0, 5)}–
                      {String(slot.end_time || "").slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {slot.room || "Hall TBA"} · {slot.entry_type || "Lecture"}
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
