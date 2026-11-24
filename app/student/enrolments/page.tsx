"use client";

import React from "react";
import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function UniversityEnrolmentsAndMaterialsPage() {
  const { data, loading, error, reload } =
    useStudentPortalSection("enrolments");

  if (loading) {
    return <StudentPageLoading label="Loading registered courses & lecture materials..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const registeredCourses = data.registeredCourses || [];
  const materials = data.materials || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            My Courses &amp; Learning Materials
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Active course enrolments, assigned lecturers, course synopses, and uploaded syllabus/lecture notes.
          </p>
        </div>
      </div>

      {registeredCourses.length === 0 ? (
        <StudentEmptyState
          icon={BookOpen}
          title="No Registered Courses Yet"
          description="Register for semester courses first to view lecturer details, synopses, and shared lecture materials."
          actionHref="/student/registration"
          actionLabel="Go to Course Registration"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {registeredCourses.map((enr: any) => {
            const c = enr.course;
            const courseMaterials = materials.filter(
              (m: any) => String(m.course_id) === String(c?.id)
            );
            return (
              <div
                key={enr.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        {c?.code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 capitalize">
                        {c?.course_type || "core"} · {c?.credits ?? 3} Credits
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                      {c?.name}
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold capitalize">
                    {enr.status || "registered"}
                  </span>
                </div>

                {c?.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {c.description}
                  </p>
                )}

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {c?.lecturer_name || "Lecturer Pending Assignment"}
                    </span>
                  </div>
                  {c?.lecturer_email && (
                    <a
                      href={`mailto:${c.lecturer_email}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      <span>Email</span>
                    </a>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Syllabus &amp; Lecture Notes ({courseMaterials.length})
                  </div>
                  {courseMaterials.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">
                      No lecture notes uploaded for this course yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {courseMaterials.map((mat: any) => (
                        <div
                          key={mat.id}
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {mat.title}
                              </div>
                              <div className="text-[10px] text-slate-500 capitalize">
                                {String(mat.material_type || "lecture_notes").replace(/_/g, " ")}
                              </div>
                            </div>
                          </div>
                          {mat.file_url && (
                            <a
                              href={mat.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold shrink-0 hover:bg-blue-100"
                            >
                              <span>Open</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
