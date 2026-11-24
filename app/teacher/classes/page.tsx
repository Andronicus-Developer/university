"use client";

import React, { useState } from "react";
import { BookOpen, GraduationCap, Mail, Phone, Users } from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

interface ClassStudentItem {
  id: string;
  full_name: string;
  student_number: string;
  email: string;
  phone: string;
  boarding_status: string;
  stream_track: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  class_unassigned?: boolean;
}

interface HsClassesPayload {
  isClassTeacher: boolean;
  classes: Array<{ id: string; name: string; code: string; studentCount: number; isAssignedClass: boolean }>;
  subjects: Array<{
    id: string;
    code: string;
    name: string;
    programme_name: string;
    weekly_periods: number;
    pass_mark: number;
    description: string | null;
  }>;
  studentsByClass?: Record<string, ClassStudentItem[]>;
  formClass: {
    id: string;
    name: string;
    code: string;
    students: ClassStudentItem[];
  } | null;
}

export default function TeacherClassesPage() {
  const { data, loading, error, reload } =
    useStaffPortalSection<HsClassesPayload>("hs_classes");
  const [tab, setTab] = useState<"subjects" | "form_class">("subjects");
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const activeClassId =
    selectedClassId && (data?.classes || []).some((c) => c.id === selectedClassId)
      ? selectedClassId
      : data?.classes?.[0]?.id || "";
  const activeClassObj = (data?.classes || []).find((c) => c.id === activeClassId) || null;
  const activeClassStudents: ClassStudentItem[] = activeClassId
    ? data?.studentsByClass?.[activeClassId] || []
    : [];

  if (loading) return <StaffPageLoading label="Loading assigned classes & subjects..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Form &amp; Subject Allocations</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          My Classes &amp; Subjects
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          View your assigned classes/forms, teaching subjects, and homeroom Form Class student roster.
        </p>
      </div>

      {data?.formClass && (
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setTab("subjects")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === "subjects" ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Assigned Classes &amp; Subjects
          </button>
          <button
            type="button"
            onClick={() => setTab("form_class")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === "form_class" ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            My Form Class ({data.formClass.name} · {data.formClass.students.length})
          </button>
        </div>
      )}

      {tab === "form_class" && data?.formClass ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {data.formClass.name} ({data.formClass.code}) — Homeroom Roster
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data.isClassTeacher ? "Designated Class Teacher View" : "Assigned Class Roster"}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              {data.formClass.students.length} Students
            </span>
          </div>

          {data.formClass.students.length === 0 ? (
            <StaffEmptyState
              icon={Users}
              title="No Students Enrolled in Form Class"
              description="Students placed into this Class/Form will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Admission #</th>
                    <th className="py-2 pr-4 font-semibold">Student Name</th>
                    <th className="py-2 pr-4 font-semibold">Stream / Boarding</th>
                    <th className="py-2 pr-4 font-semibold">Parent / Guardian</th>
                    <th className="py-2 font-semibold">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.formClass.students.map((st) => (
                    <tr key={st.id}>
                      <td className="py-2.5 pr-4 font-mono">{st.student_number}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                        {st.full_name}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">
                        {[st.stream_track, st.boarding_status].filter(Boolean).join(" · ")}
                      </td>
                      <td className="py-2.5 pr-4 font-medium">{st.guardian_name || "—"}</td>
                      <td className="py-2.5">
                        <div className="flex flex-col text-[11px] text-slate-500">
                          {st.guardian_phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {st.guardian_phone}
                            </span>
                          )}
                          {st.guardian_email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {st.guardian_email}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Assigned Classes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.classes || []).map((cls) => {
              const isSelected = cls.id === activeClassId;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`text-left rounded-2xl border p-5 space-y-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20"
                      : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                      {cls.code}
                    </span>
                    {cls.isAssignedClass && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        Form Class
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{cls.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-500" />
                    {cls.studentCount} enrolled student(s)
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected Class Enrolled Students & Linked Parents */}
          {activeClassObj && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeClassObj.name} ({activeClassObj.code}) — Enrolled Students &amp; Guardians
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live roster of students registered in this class along with their linked parent/guardian contacts.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  {activeClassStudents.length} Student(s)
                </span>
              </div>

              {activeClassStudents.length === 0 ? (
                <StaffEmptyState
                  icon={Users}
                  title="No Students Enrolled in This Class"
                  description="Students assigned to this Class/Form by System Administration will appear here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2 pr-4 font-semibold">Admission #</th>
                        <th className="py-2 pr-4 font-semibold">Student Name</th>
                        <th className="py-2 pr-4 font-semibold">Stream / Boarding</th>
                        <th className="py-2 pr-4 font-semibold">Parent / Guardian</th>
                        <th className="py-2 font-semibold">Guardian Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeClassStudents.map((st) => (
                        <tr key={st.id}>
                          <td className="py-2.5 pr-4 font-mono">{st.student_number}</td>
                          <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                            {st.full_name}
                            {st.class_unassigned && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px]">
                                Unassigned Class
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">
                            {[st.stream_track, st.boarding_status].filter(Boolean).join(" · ")}
                          </td>
                          <td className="py-2.5 pr-4 font-medium">{st.guardian_name || "—"}</td>
                          <td className="py-2.5">
                            <div className="flex flex-col text-[11px] text-slate-500">
                              {st.guardian_phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {st.guardian_phone}
                                </span>
                              )}
                              {st.guardian_email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {st.guardian_email}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Assigned Subjects */}
          {(data?.subjects || []).length === 0 ? (
            <StaffEmptyState
              icon={BookOpen}
              title="No Subjects Assigned Yet"
              description="Subjects linked to your teacher profile in Admin -> Teachers will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data!.subjects.map((subj) => (
                <div
                  key={subj.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {subj.code}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {subj.weekly_periods} periods/wk · Pass {subj.pass_mark}%
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{subj.name}</h3>
                  {subj.programme_name && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      Class: {subj.programme_name}
                    </p>
                  )}
                  {subj.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{subj.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
