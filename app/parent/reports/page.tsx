"use client";

import React, { useMemo } from "react";
import { Award, Printer } from "lucide-react";
import { useParentSection } from "@/lib/parent/useParentPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface ReportsData {
  school: { id: string; name: string; school_type: string };
  ward: any;
  noLinkedWard?: boolean;
  activeTerm: { name: string } | null;
  grades: Array<{
    id: string;
    course_code: string;
    course_name: string;
    credits: number;
    term_name: string;
    ca_score: number | null;
    exam_score: number | null;
    total_score: number | null;
    grade_letter: string | null;
    grade_point: number | null;
    remarks: string | null;
    status: string;
  }>;
  reportCards: Array<{
    id: string;
    subject_code: string;
    subject_name: string;
    term_name: string;
    ca_score: number | null;
    exam_score: number | null;
    total_score: number | null;
    grade: string | null;
    teacher_remarks: string | null;
  }>;
  competencies: Array<{
    id: string;
    module_code: string;
    module_name: string;
    assessment_date: string | null;
    practical_score: number | null;
    verdict: string;
    assessor_notes: string | null;
  }>;
  certifications: Array<{
    id: string;
    certificate_number: string;
    qualification_title: string;
    issue_date: string | null;
    status: string;
  }>;
}

export default function ParentReportsPage() {
  const { data, loading, error, reload } = useParentSection<ReportsData>("reports");

  const gpa = useMemo(() => {
    const grades = data?.grades || [];
    let pts = 0;
    let creds = 0;
    for (const g of grades) {
      if (g.grade_point != null && Number.isFinite(Number(g.grade_point))) {
        const c = Number(g.credits || 3);
        pts += Number(g.grade_point) * c;
        creds += c;
      }
    }
    return creds > 0 ? (pts / creds).toFixed(2) : null;
  }, [data?.grades]);

  if (loading) return <ClassicLoading label="Loading academic results..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load academic results"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);
  if (data.noLinkedWard || !data.ward) {
    return (
      <ClassicEmpty
        icon={Award}
        title={`No Linked ${terms.learnerSingular}`}
        description="Select or link a child/ward to view official academic reports."
      />
    );
  }

  const hasRecords =
    data.grades.length > 0 ||
    data.reportCards.length > 0 ||
    data.competencies.length > 0 ||
    data.certifications.length > 0;

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title={terms.resultsLabel}
        subtitle={`${data.school.name} • ${data.ward.full_name} (${data.ward.student_number})`}
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
        }
      />

      {/* Print Header */}
      <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
        <h2 className="text-lg font-bold">{data.school.name}</h2>
        <p className="text-xs">
          {terms.certificateLabel} — {data.ward.full_name} ({terms.idLabel}:{" "}
          {data.ward.student_number})
        </p>
      </div>

      {!hasRecords ? (
        <ClassicEmpty
          icon={Award}
          title={`No ${terms.resultsLabel} Published Yet`}
          description={`Once ${terms.instructorLabel.toLowerCase()}s publish assessments or term scores for ${data.ward.full_name}, they will appear here ready for viewing and printing.`}
        />
      ) : (
        <div className="space-y-5">
          {terms.schoolType === "university" && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Semester Course Grades</h2>
                {gpa && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                    Cumulative GPA: {gpa}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="py-2.5 px-4">Course</th>
                      <th className="py-2.5 px-4">Semester</th>
                      <th className="py-2.5 px-4">Credits</th>
                      <th className="py-2.5 px-4">CA</th>
                      <th className="py-2.5 px-4">Exam</th>
                      <th className="py-2.5 px-4">Total</th>
                      <th className="py-2.5 px-4">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.grades.map((g) => (
                      <tr key={g.id}>
                        <td className="py-2.5 px-4">
                          <span className="font-semibold">{g.course_code}</span> — {g.course_name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{g.term_name}</td>
                        <td className="py-2.5 px-4">{g.credits}</td>
                        <td className="py-2.5 px-4">{g.ca_score ?? "—"}</td>
                        <td className="py-2.5 px-4">{g.exam_score ?? "—"}</td>
                        <td className="py-2.5 px-4 font-semibold">{g.total_score ?? "—"}</td>
                        <td className="py-2.5 px-4 font-bold">{g.grade_letter || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {terms.schoolType === "high_school" && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold">Term Subject Report Card</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="py-2.5 px-4">Subject</th>
                      <th className="py-2.5 px-4">Term</th>
                      <th className="py-2.5 px-4">Class Work</th>
                      <th className="py-2.5 px-4">Exam</th>
                      <th className="py-2.5 px-4">Total</th>
                      <th className="py-2.5 px-4">Grade</th>
                      <th className="py-2.5 px-4">Teacher Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.reportCards.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 px-4 font-medium">
                          {r.subject_code ? `${r.subject_code} — ` : ""}
                          {r.subject_name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{r.term_name}</td>
                        <td className="py-2.5 px-4">{r.ca_score ?? "—"}</td>
                        <td className="py-2.5 px-4">{r.exam_score ?? "—"}</td>
                        <td className="py-2.5 px-4 font-semibold">{r.total_score ?? "—"}</td>
                        <td className="py-2.5 px-4 font-bold">{r.grade || "—"}</td>
                        <td className="py-2.5 px-4 text-slate-500">{r.teacher_remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {terms.schoolType === "vocational" && (
            <>
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-semibold">Trade Competency Assessments</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                        <th className="py-2.5 px-4">Trade Module</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Practical Score</th>
                        <th className="py-2.5 px-4">Verdict</th>
                        <th className="py-2.5 px-4">Assessor Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.competencies.map((c) => (
                        <tr key={c.id}>
                          <td className="py-2.5 px-4 font-medium">
                            {c.module_code ? `${c.module_code} — ` : ""}
                            {c.module_name}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">
                            {(c.assessment_date || "").slice(0, 10) || "—"}
                          </td>
                          <td className="py-2.5 px-4 font-semibold">
                            {c.practical_score != null ? `${c.practical_score}%` : "—"}
                          </td>
                          <td className="py-2.5 px-4">
                            <ClassicStatusBadge status={c.verdict} />
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">
                            {c.assessor_notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {data.certifications.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 space-y-2">
                  <h2 className="text-sm font-semibold">Trade Certifications Issued</h2>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {data.certifications.map((cert) => (
                      <div key={cert.id} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{cert.qualification_title}</p>
                          <p className="text-slate-500 font-mono">
                            {cert.certificate_number} • Issued {(cert.issue_date || "").slice(0, 10)}
                          </p>
                        </div>
                        <ClassicStatusBadge status={cert.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
