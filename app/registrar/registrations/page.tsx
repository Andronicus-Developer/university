"use client";

import React, { useState } from "react";
import { BookOpen, CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";
import { useRegistrarSection } from "@/lib/registrar/useRegistrarPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface RegistrationsData {
  school: { id: string; name: string; school_type: string };
  students: Array<{
    id: string;
    student_number: string;
    full_name: string;
    class_group_id: string | null;
    class_group_name: string | null;
    programme_id: string | null;
    programme_name: string | null;
    intake_id: string | null;
    intake_name: string | null;
  }>;
  courses: Array<{ id: string; code: string; name: string; credits: number }>;
  courseEnrolments: Array<{
    id: string;
    student_name: string;
    student_number: string;
    course_code: string;
    course_name: string;
    credits: number;
    term_name: string;
    status: string;
  }>;
  subjects: Array<{ id: string; code: string; name: string; programme_name: string }>;
  modules: Array<{ id: string; code: string; name: string; department_name: string; practical_hours: number }>;
  programmes: Array<{ id: string; name: string }>;
  classGroups: Array<{ id: string; name: string }>;
  intakes: Array<{ id: string; name: string; code: string }>;
  terms: Array<{ id: string; name: string }>;
}

export default function RegistrarRegistrationsPage() {
  const { data, loading, error, reload, mutate } =
    useRegistrarSection<RegistrationsData>("registrations");

  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [termId, setTermId] = useState("");
  const [targetIntakeId, setTargetIntakeId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (loading) return <ClassicLoading label="Loading course & module registrations..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load registrations"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);
  const chosenStudentId = studentId || data.students[0]?.id || "";
  const chosenCourseId = courseId || data.courses[0]?.id || "";
  const chosenIntakeId = targetIntakeId || data.intakes[0]?.id || "";
  const chosenClassId = targetClassId || data.classGroups[0]?.id || "";

  async function handleUniRegister(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("create_course_enrolment", {
      studentId: chosenStudentId,
      courseId: chosenCourseId,
      termId: termId || data?.terms[0]?.id || null,
    });
    setSaving(false);
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to register course." });
    else setBanner({ type: "success", text: "Course registration added." });
  }

  async function handleApproveEnrol(enrolmentId: string) {
    const res = await mutate("approve_course_enrolment", { enrolmentId, status: "registered" });
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to approve registration." });
  }

  async function handleDropEnrol(enrolmentId: string) {
    const res = await mutate("drop_course_enrolment", { enrolmentId });
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to remove registration." });
  }

  async function handleAssignPlacement(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("assign_student_intake", {
      studentId: chosenStudentId,
      intakeId: terms.schoolType === "vocational" ? chosenIntakeId || null : null,
      classGroupId: terms.schoolType === "high_school" ? chosenClassId || null : null,
    });
    setSaving(false);
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to update assignment." });
    else setBanner({ type: "success", text: "Enrollment placement updated." });
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title={`${terms.curriculumLabel} & Cohort Registration`}
        subtitle={`${data.school.name} • Manage ${terms.curriculumPlural.toLowerCase()} and ${terms.learnerSingular.toLowerCase()} placements`}
      />

      {banner && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium flex items-center justify-between ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {terms.schoolType === "university" ? (
        <div className="space-y-5">
          <form
            onSubmit={handleUniRegister}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Student</label>
              <select
                value={chosenStudentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {data.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.student_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Course</label>
              <select
                value={chosenCourseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {data.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Semester</label>
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {data.terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving || data.courses.length === 0 || data.students.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Register Student</span>
            </button>
          </form>

          {data.courseEnrolments.length === 0 ? (
            <ClassicEmpty
              icon={BookOpen}
              title="No Course Registrations Yet"
              description="Student self-registrations and registrar enrollments appear here for approval."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="py-2.5 px-4">Student</th>
                      <th className="py-2.5 px-4">Course</th>
                      <th className="py-2.5 px-4">Semester</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.courseEnrolments.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2.5 px-4">
                          {e.student_name}{" "}
                          <span className="text-[11px] font-mono text-slate-500">
                            ({e.student_number})
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium">
                          {e.course_code} — {e.course_name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{e.term_name}</td>
                        <td className="py-2.5 px-4">
                          <ClassicStatusBadge status={e.status} />
                        </td>
                        <td className="py-2.5 px-4 text-right space-x-2">
                          {e.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleApproveEnrol(e.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] cursor-pointer"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Approve</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDropEnrol(e.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer align-middle"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Assign Class or Vocational Intake */}
          <form
            onSubmit={handleAssignPlacement}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end text-xs"
          >
            <div>
              <label className="block font-medium mb-1">{terms.learnerSingular}</label>
              <select
                value={chosenStudentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {data.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.student_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">
                {terms.schoolType === "vocational" ? "Assign Intake Cohort" : "Assign Class Group"}
              </label>
              {terms.schoolType === "vocational" ? (
                <select
                  value={chosenIntakeId}
                  onChange={(e) => setTargetIntakeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {data.intakes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code} — {i.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={chosenClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {data.classGroups.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="submit"
              disabled={saving || data.students.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Assign Placement</span>
            </button>
          </form>

          {/* Subjects or Vocational Modules List */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold">
                Active {terms.curriculumPlural} (
                {terms.schoolType === "vocational" ? data.modules.length : data.subjects.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">{terms.curriculumLabel}</th>
                    <th className="py-2.5 px-4">Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {terms.schoolType === "vocational"
                    ? data.modules.map((m) => (
                        <tr key={m.id}>
                          <td className="py-2.5 px-4 font-mono">{m.code}</td>
                          <td className="py-2.5 px-4 font-medium">{m.name}</td>
                          <td className="py-2.5 px-4 text-slate-500">
                            {m.department_name} ({m.practical_hours}h practical)
                          </td>
                        </tr>
                      ))
                    : data.subjects.map((sub) => (
                        <tr key={sub.id}>
                          <td className="py-2.5 px-4 font-mono">{sub.code}</td>
                          <td className="py-2.5 px-4 font-medium">{sub.name}</td>
                          <td className="py-2.5 px-4 text-slate-500">{sub.programme_name}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
