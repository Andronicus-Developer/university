"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function UniversityCourseRegistrationPage() {
  const { data, loading, error, reload, mutate } =
    useStudentPortalSection("registration");

  const [searchQuery, setSearchQuery] = useState("");
  const [onlyMyProgram, setOnlyMyProgram] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const enrolments = useMemo(() => data?.enrolments || [], [data?.enrolments]);
  const courses = useMemo(() => data?.courses || [], [data?.courses]);
  const registeredIds = useMemo(
    () => new Set(enrolments.map((e: any) => String(e.course_id))),
    [enrolments]
  );

  const availableCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const stuDept = data?.student?.department_id
      ? String(data.student.department_id)
      : null;
    const stuProg = data?.student?.programme_id
      ? String(data.student.programme_id)
      : null;

    return courses.filter((c: any) => {
      if (registeredIds.has(String(c.id))) return false;
      if (onlyMyProgram && (stuDept || stuProg)) {
        const matchesProg =
          !c.programme_id || (stuProg && String(c.programme_id) === stuProg);
        const matchesDept =
          !c.department_id || (stuDept && String(c.department_id) === stuDept);
        if (!matchesProg && !matchesDept) return false;
      }
      if (!q) return true;
      return `${c.code} ${c.name} ${c.department_name} ${c.programme_name}`
        .toLowerCase()
        .includes(q);
    });
  }, [courses, registeredIds, onlyMyProgram, searchQuery, data?.student]);

  if (loading) {
    return <StudentPageLoading label="Loading semester course registration..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const registeredCredits = Number(data.registeredCredits ?? 0);
  const maxCredits = Number(data.maxCredits ?? 24);
  const creditPct = Math.min(100, Math.round((registeredCredits / maxCredits) * 100));

  const handleRegister = async (courseId: string) => {
    setBusyId(`add-${courseId}`);
    setToast(null);
    const res = await mutate("register_course", { courseId });
    setBusyId(null);
    setToast({
      type: res.ok ? "success" : "error",
      text: res.ok
        ? res.message || "Course registered successfully."
        : res.error || "Unable to register course.",
    });
  };

  const handleDrop = async (enrolmentId: string, courseCode: string) => {
    setBusyId(`drop-${enrolmentId}`);
    setToast(null);
    const res = await mutate("drop_course", { enrolmentId });
    setBusyId(null);
    setToast({
      type: res.ok ? "success" : "error",
      text: res.ok
        ? `${courseCode} dropped from your registration.`
        : res.error || "Unable to drop course.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Semester Course Registration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add or drop courses for {data.activeTerm?.name || "Current Semester"} within your institutional credit limit.
          </p>
        </div>

        {/* Credit Load Indicator */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 min-w-[230px]">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-600 dark:text-slate-300">Credit Load</span>
            <span className="text-blue-600 dark:text-blue-400">
              {registeredCredits} / {maxCredits} Credits
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${creditPct}%` }}
            />
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Registered Courses Section */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <span>Registered Courses ({enrolments.length})</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Total Credits: {registeredCredits}
          </span>
        </div>

        {enrolments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            You have not registered any courses yet. Browse available semester courses below to add them.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {enrolments.map((enr: any) => (
              <div
                key={enr.id}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {enr.course?.code || "COURSE"} — {enr.course?.name || "Registered Course"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {enr.course?.credits ?? 3} Credit Hours · {enr.course?.department_name || data.student.department_name || "Academic Unit"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold capitalize">
                    {enr.status || "registered"}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === `drop-${enr.id}`}
                    onClick={() => handleDrop(enr.id, enr.course?.code || "course")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {busyId === `drop-${enr.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Drop</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Course Catalog */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span>Available Semester Courses ({availableCourses.length})</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMyProgram}
                onChange={(e) => setOnlyMyProgram(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>My Department / Program only</span>
            </label>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code or course title..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {availableCourses.length === 0 ? (
          <StudentEmptyState
            title="No Additional Courses Available"
            description="All matching semester courses from your institution are already registered or filtered out."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {availableCourses.map((course: any) => (
              <div
                key={course.id}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                      {course.code}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {course.credits ?? 3} Credits
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {course.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {course.description ||
                      `${course.department_name || "General"} · ${course.programme_name || "All Programs"}`}
                  </p>
                  {course.lecturer_name && (
                    <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                      Lecturer: {course.lecturer_name}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={busyId === `add-${course.id}`}
                  onClick={() => handleRegister(course.id)}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {busyId === `add-${course.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>Add Course</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
