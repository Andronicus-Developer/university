"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileCheck2,
  GraduationCap,
  NotebookPen,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  formatMoney,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function StudentDashboardPage() {
  const { data, loading, error, reload } = useStudentPortalSection("dashboard");

  if (loading) {
    return <StudentPageLoading label="Loading your live institutional dashboard..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const schoolType: "university" | "high_school" | "vocational" =
    data.school?.schoolType || "university";
  const student = data.student;
  const kpis = data.kpis || {};
  const symbol = data.school?.currencySymbol || "$";
  const currency = data.school?.currency || "USD";

  return (
    <div className="space-y-6">
      {/* Personalized Welcome Hero */}
      <div
        className={`rounded-2xl p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          schoolType === "vocational"
            ? "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700"
            : schoolType === "high_school"
            ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700"
            : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700"
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/85">
            <span>{data.school?.name}</span>
            <span>·</span>
            <span>
              {schoolType === "vocational"
                ? "Vocational Trainee Portal"
                : schoolType === "high_school"
                ? "High School Student Portal"
                : "University Student Portal"}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Welcome back, {student.full_name}
          </h1>
          <p className="text-xs text-white/90">
            {schoolType === "vocational" && (
              <>
                Trainee ID: <strong>{student.student_number}</strong> ·{" "}
                {student.department_name || "Assigned Trade"} ·{" "}
                {student.intake_name || "Active Cohort"}
              </>
            )}
            {schoolType === "high_school" && (
              <>
                Admission #: <strong>{student.student_number}</strong> ·{" "}
                {student.programme_name || "Assigned Class"}{" "}
                {student.metadata?.stream ? `(${student.metadata.stream})` : ""}
                {data.activeTerm?.name ? ` · ${data.activeTerm.name}` : ""}
              </>
            )}
            {schoolType === "university" && (
              <>
                Matric #: <strong>{student.student_number}</strong> ·{" "}
                {student.programme_name || student.department_name || "Academic Program"} ·
                Level {student.current_level || 100}
                {data.activeTerm?.name ? ` · ${data.activeTerm.name}` : ""}
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={reload}
          className="self-start lg:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-semibold backdrop-blur-xs transition cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* UNIVERSITY KPIs & PANELS                                            */}
      {/* =================================================================== */}
      {schoolType === "university" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/student/registration"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-blue-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Registered Credits</span>
                <ClipboardList className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {kpis.registeredCredits ?? 0}{" "}
                <span className="text-sm font-semibold text-slate-400">
                  / {kpis.maxCredits ?? 24}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {kpis.registeredCoursesCount ?? 0} active courses registered
              </div>
            </Link>

            <Link
              href="/student/results"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-indigo-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Current CGPA</span>
                <Award className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                {Number(kpis.cgpa ?? 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                4.00 grading scale standing
              </div>
            </Link>

            <Link
              href="/student/fee-statement"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-rose-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Fee Balance</span>
                <CreditCard className="h-4 w-4 text-rose-600" />
              </div>
              <div
                className={`text-2xl font-extrabold mt-2 ${
                  Number(kpis.feeBalance ?? 0) > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatMoney(kpis.feeBalance ?? 0, symbol, currency)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {Number(kpis.feeBalance ?? 0) <= 0 ? "Account cleared" : "Outstanding tuition due"}
              </div>
            </Link>

            <Link
              href="/student/timetable"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-emerald-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Upcoming Lectures &amp; Exams</span>
                <CalendarDays className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {kpis.scheduleCount ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Timetabled sessions for your courses
              </div>
            </Link>
          </div>

          {(kpis.pendingAssignmentsCount ?? 0) > 0 && (
            <div className="rounded-2xl border border-amber-200/90 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {kpis.pendingAssignmentsCount} Pending Coursework{" "}
                      {kpis.pendingAssignmentsCount === 1 ? "Assignment" : "Assignments"}
                    </h2>
                    {(kpis.overdueAssignmentsCount ?? 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                        {kpis.overdueAssignmentsCount} Overdue
                      </span>
                    )}
                    {(kpis.dueSoonAssignmentsCount ?? 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 text-[10px] font-bold border border-amber-200 dark:border-amber-700">
                        {kpis.dueSoonAssignmentsCount} Due Within 7 Days
                      </span>
                    )}
                  </div>
                  {Array.isArray(data.pendingAssignments) && data.pendingAssignments[0] && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Next:{" "}
                      <span className="font-semibold">
                        {data.pendingAssignments[0].course?.code
                          ? `${data.pendingAssignments[0].course.code} — `
                          : ""}
                        {data.pendingAssignments[0].title}
                      </span>
                      {data.pendingAssignments[0].due_date
                        ? ` · Due ${data.pendingAssignments[0].due_date}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              <Link
                href="/student/assignments"
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs shrink-0"
              >
                <span>Open Assignments</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registered Courses */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span>Registered Semester Courses</span>
                </h2>
                <Link
                  href="/student/registration"
                  className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage Add / Drop</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {(data.courses || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  No courses registered yet for this semester. Open Course Registration to select courses.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.courses.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.course?.code} — {item.course?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 capitalize">
                          {item.course?.credits ?? 3} Credits · {item.course?.course_type || "core"}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Registered
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Timetable & Hostel Snapshot */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-emerald-600" />
                    <span>Weekly Schedule Preview</span>
                  </h2>
                  <Link href="/student/timetable" className="text-xs font-semibold text-blue-600 hover:underline">
                    Full Timetable
                  </Link>
                </div>
                {(data.schedule || []).length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">
                    No timetable slots published yet for your registered courses.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.schedule.map((slot: any) => (
                      <div
                        key={slot.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {slot.course?.code || slot.entry_type}: {slot.course?.name || "Lecture"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {slot.exam_date ? `Exam: ${slot.exam_date}` : slot.day_of_week} · {slot.start_time} – {slot.end_time}
                          </div>
                        </div>
                        {slot.room && (
                          <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold">
                            {slot.room}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {data.hostelAllocation
                        ? `${data.hostelAllocation.hostel?.name || "Residence Hall"} · Room ${data.hostelAllocation.room_number}`
                        : "Hostel & Accommodation"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {data.hostelAllocation
                        ? `Bed: ${data.hostelAllocation.bed_number || "Assigned"}`
                        : "No room allocated yet — submit an accommodation request"}
                    </div>
                  </div>
                </div>
                <Link
                  href="/student/hostel"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold shrink-0"
                >
                  Open Hostel
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* HIGH SCHOOL KPIs & PANELS                                           */}
      {/* =================================================================== */}
      {schoolType === "high_school" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/student/subjects"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-emerald-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Current Class / Form</span>
                <GraduationCap className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-2 truncate">
                {kpis.classLabel || "Assigned Class"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {kpis.subjectsCount ?? 0} assigned subjects
              </div>
            </Link>

            <Link
              href="/student/attendance"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-teal-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Attendance Rate</span>
                <CheckSquare className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-2">
                {kpis.attendanceRate ?? 100}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Roll call &amp; conduct standing
              </div>
            </Link>

            <Link
              href="/student/report-card"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-indigo-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Term Average Score</span>
                <Award className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                {Number(kpis.termAverage ?? 0).toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                CA &amp; terminal exams combined
              </div>
            </Link>

            <Link
              href="/student/fee-statement"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-rose-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Fee Balance</span>
                <CreditCard className="h-4 w-4 text-rose-600" />
              </div>
              <div
                className={`text-2xl font-extrabold mt-2 ${
                  Number(kpis.feeBalance ?? 0) > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatMoney(kpis.feeBalance ?? 0, symbol, currency)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Tuition &amp; term levies
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-emerald-600" />
                  <span>Upcoming Homework &amp; Assignments</span>
                </h2>
                <Link
                  href="/student/assignments"
                  className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Assignments</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {(data.upcomingAssignments || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  No active homework posted for your class right now.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.upcomingAssignments.map((a: any) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {a.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Due: {a.due_date || "Flexible"} · Max {a.max_score ?? 100} pts
                        </div>
                      </div>
                      <Link
                        href="/student/assignments"
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shrink-0"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span>My Class Subjects</span>
                </h2>
                <Link href="/student/subjects" className="text-xs font-semibold text-blue-600 hover:underline">
                  All Subjects
                </Link>
              </div>
              {(data.subjects || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  No subjects assigned to your class yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {data.subjects.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70"
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {sub.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 capitalize">
                        {sub.code} · {sub.weekly_periods ?? 4} periods/wk
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* VOCATIONAL TRAINEE KPIs & PANELS                                    */}
      {/* =================================================================== */}
      {schoolType === "vocational" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/student/modules"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-amber-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Trade Class &amp; Workshop</span>
                <Wrench className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-2 truncate">
                {kpis.tradeLabel || "Assigned Trade"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {kpis.intakeLabel || "Active Intake Cohort"}
              </div>
            </Link>

            <Link
              href="/student/modules"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-emerald-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Completed Modules</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {kpis.competentModules ?? 0}{" "}
                <span className="text-sm font-semibold text-slate-400">
                  / {kpis.totalModules ?? 0}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Verified competent units
              </div>
            </Link>

            <Link
              href="/student/competencies"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-indigo-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Practical Competency</span>
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                {kpis.progressPct ?? 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {kpis.certificationsCount ?? 0} trade certificates issued
              </div>
            </Link>

            <Link
              href="/student/fee-statement"
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 hover:border-rose-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Fee &amp; Materials Balance</span>
                <CreditCard className="h-4 w-4 text-rose-600" />
              </div>
              <div
                className={`text-2xl font-extrabold mt-2 ${
                  Number(kpis.feeBalance ?? 0) > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatMoney(kpis.feeBalance ?? 0, symbol, currency)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Tuition, toolkits &amp; consumables
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-amber-600" />
                  <span>Recent Practical Logbook Entries</span>
                </h2>
                <Link
                  href="/student/logbook"
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Log Workshop Task</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {(data.recentLogs || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  No workshop practicals logged yet. Record your completed tasks for instructor sign-off.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.recentLogs.map((l: any) => (
                    <div
                      key={l.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {l.task_title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {l.log_date} · {l.hours_spent} hrs
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-amber-50 text-amber-800 border border-amber-200">
                        {String(l.status || "submitted").replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <span>Industrial Attachment Status</span>
                </h2>
                <Link href="/student/attachments" className="text-xs font-semibold text-indigo-600 hover:underline">
                  Manage Reports
                </Link>
              </div>
              {data.attachment ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {data.attachment.company_name}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Supervisor: {data.attachment.supervisor_name || "Assigned"} {data.attachment.supervisor_phone ? `· ${data.attachment.supervisor_phone}` : ""}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {data.attachment.start_date || "Start TBD"} – {data.attachment.end_date || "Ongoing"}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4">
                  No industrial attachment host workshop assigned yet. Check back with your Trade Coordinator.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
