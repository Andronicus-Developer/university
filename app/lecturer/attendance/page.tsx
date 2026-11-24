"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CheckSquare, Loader2, Save, Users } from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

interface UniAttendancePayload {
  courses: Array<{ id: string; code: string; name: string }>;
  enrolmentsByCourse: Record<
    string,
    Array<{ enrolment_id: string; student_id: string; full_name: string; student_number: string; email: string; level: number }>
  >;
  sessions: Array<{
    id: string;
    course_id: string;
    course_code: string;
    course_name: string;
    session_date: string;
    topic: string;
    present_count: number;
    late_count: number;
    absent_count: number;
    excused_count: number;
    total_count: number;
  }>;
}

export default function LecturerAttendancePage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<UniAttendancePayload>("uni_attendance");

  const [courseId, setCourseId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [topic, setTopic] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setSessionDate((prev) => prev || new Date().toISOString().slice(0, 10));
  }, []);

  const activeCourseId = useMemo(() => {
    if (courseId && (data?.courses || []).some((c) => c.id === courseId)) return courseId;
    return data?.courses?.[0]?.id || "";
  }, [data?.courses, courseId]);

  const roster = useMemo(
    () => (activeCourseId ? data?.enrolmentsByCourse?.[activeCourseId] || [] : []),
    [data?.enrolmentsByCourse, activeCourseId]
  );

  function getStatus(studentId: string): string {
    return statusMap[studentId] || "present";
  }

  function markAll(st: string) {
    const next: Record<string, string> = {};
    for (const r of roster) next[r.student_id] = st;
    setStatusMap(next);
  }

  async function handleSaveAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCourseId || roster.length === 0) {
      setBanner({ type: "error", text: "Select a course with registered students first." });
      return;
    }
    setSaving(true);
    setBanner(null);
    const res = await mutate("record_attendance", {
      courseId: activeCourseId,
      sessionDate,
      topic: topic.trim() || "Scheduled Lecture Session",
      sessionType: "lecture",
      records: roster.map((r) => ({
        studentId: r.student_id,
        status: getStatus(r.student_id),
      })),
    });
    setSaving(false);

    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save attendance." });
    } else {
      setTopic("");
      setBanner({ type: "success", text: res.message || "Lecture attendance recorded." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading course class lists & attendance..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <Users className="h-3.5 w-3.5" />
          <span>Course Enrolments &amp; Lecture Attendance</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          Class Lists &amp; Lecture Attendance
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          View registered students per course and record verified lecture attendance directly to Supabase.
        </p>
      </div>

      {banner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      {(data?.courses || []).length === 0 ? (
        <StaffEmptyState
          icon={CheckSquare}
          title="No Courses Assigned"
          description="No university courses are currently assigned to take lecture attendance."
        />
      ) : (
        <form
          onSubmit={handleSaveAttendance}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Course
              </label>
              <select
                value={activeCourseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setStatusMap({});
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {data!.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Lecture Date
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Lecture Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Week 4: Asymptotic Analysis"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {roster.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
              No students have registered for this course yet. Students can register from Course Registration in the Student Portal.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Registered Students ({roster.length})
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => markAll("present")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>Save Attendance Session</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4 font-semibold">Matric #</th>
                      <th className="py-2 pr-4 font-semibold">Student Name</th>
                      <th className="py-2 pr-4 font-semibold">Level</th>
                      <th className="py-2 font-semibold">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {roster.map((st) => {
                      const current = getStatus(st.student_id);
                      return (
                        <tr key={st.student_id}>
                          <td className="py-2.5 pr-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {st.student_number}
                          </td>
                          <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                            {st.full_name}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-500">L{st.level}</td>
                          <td className="py-2.5">
                            <div className="inline-flex gap-1.5">
                              {(["present", "late", "absent", "excused"] as const).map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    setStatusMap((prev) => ({ ...prev, [st.student_id]: opt }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize cursor-pointer border ${
                                    current === opt
                                      ? opt === "present"
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : opt === "late"
                                        ? "bg-amber-500 text-white border-amber-500"
                                        : opt === "absent"
                                        ? "bg-rose-600 text-white border-rose-600"
                                        : "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </form>
      )}

      {/* Recorded Lecture Sessions History */}
      {(data?.sessions || []).length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Recorded Lecture Sessions ({data!.sessions.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Date</th>
                  <th className="py-2 pr-4 font-semibold">Course</th>
                  <th className="py-2 pr-4 font-semibold">Topic</th>
                  <th className="py-2 font-semibold">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data!.sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 pr-4 font-mono">{s.session_date}</td>
                    <td className="py-2.5 pr-4 font-semibold">{s.course_code || "—"}</td>
                    <td className="py-2.5 pr-4">{s.topic || "Lecture Session"}</td>
                    <td className="py-2.5">
                      <span className="text-emerald-600 font-semibold">{s.present_count} Present</span>
                      {" · "}
                      <span className="text-amber-600">{s.late_count} Late</span>
                      {" · "}
                      <span className="text-rose-600">{s.absent_count} Absent</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
