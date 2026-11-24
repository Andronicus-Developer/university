"use client";

import React, { useMemo, useState } from "react";
import { Award, CheckCircle2, Loader2, Printer, X } from "lucide-react";
import { useRegistrarSection } from "@/lib/registrar/useRegistrarPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface TranscriptsData {
  school: { id: string; name: string; school_type: string };
  students: Array<{
    id: string;
    student_number: string;
    full_name: string;
    programme_name: string | null;
    class_group_name: string | null;
    intake_name: string | null;
    status: string;
  }>;
  selectedStudent: {
    id: string;
    student_number: string;
    full_name: string;
    programme_name: string | null;
    class_group_name: string | null;
    intake_name: string | null;
    status: string;
  } | null;
  uniGrades: Array<{
    id: string;
    course_code: string;
    course_name: string;
    credits: number;
    term_name: string;
    total_score: number | null;
    grade_letter: string | null;
    grade_point: number | null;
    status: string;
  }>;
  hsScores: Array<{
    id: string;
    subject_code: string;
    subject_name: string;
    term_name: string;
    ca_score: number | null;
    exam_score: number | null;
    total_score: number | null;
    grade: string | null;
  }>;
  vocCompetencies: Array<{
    id: string;
    module_code: string;
    module_name: string;
    practical_score: number | null;
    verdict: string;
    assessment_date: string | null;
  }>;
  certifications: Array<{
    id: string;
    certificate_number: string;
    qualification_title: string;
    issue_date: string | null;
    status: string;
  }>;
}

export default function RegistrarTranscriptsPage() {
  const [selectedId, setSelectedId] = useState<string>("");
  const { data, loading, error, reload, mutate } =
    useRegistrarSection<TranscriptsData>("transcripts", {
      studentId: selectedId || undefined,
    });

  const [qualTitle, setQualTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const gpa = useMemo(() => {
    const grades = data?.uniGrades || [];
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
  }, [data?.uniGrades]);

  if (loading) return <ClassicLoading label="Loading transcript & certification registry..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load transcripts"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);
  const st = data.selectedStudent;

  async function handleVerifyGrades() {
    if (!st) return;
    setSaving(true);
    setBanner(null);
    const res = await mutate("verify_grades_status", { studentId: st.id });
    setSaving(false);
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to verify grades." });
    else setBanner({ type: "success", text: "Grades verified and marked published for transcript." });
  }

  async function handleIssueCert(e: React.FormEvent) {
    e.preventDefault();
    if (!st || !qualTitle.trim()) return;
    setSaving(true);
    setBanner(null);
    const res = await mutate("issue_trade_certificate", {
      studentId: st.id,
      qualificationTitle: qualTitle.trim(),
    });
    setSaving(false);
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to issue certificate." });
    else {
      setBanner({ type: "success", text: "Trade certificate / attestation issued." });
      setQualTitle("");
    }
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title={`Exams, ${terms.certificateLabel}s & Verification`}
        subtitle={`${data.school.name} • Verify approved results and print official academic documents`}
        actions={
          <button
            type="button"
            disabled={!st}
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 text-xs font-medium cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print {terms.certificateLabel}</span>
          </button>
        }
      />

      {banner && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium flex items-center justify-between print:hidden ${
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

      {/* Selector Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex-1 text-xs">
          <label className="block font-medium mb-1">Select {terms.learnerSingular}</label>
          <select
            value={st?.id || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            {data.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.student_number})
              </option>
            ))}
          </select>
        </div>
        {terms.schoolType === "university" && st && data.uniGrades.length > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={handleVerifyGrades}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>Verify & Publish Grades</span>
          </button>
        )}
      </div>

      {!st ? (
        <ClassicEmpty
          icon={Award}
          title={`No ${terms.learnerPlural} Enrolled`}
          description="Enroll students or trainees first to generate transcripts and certificates."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-6 space-y-5">
          {/* Official Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{data.school.name}</h2>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Official {terms.certificateLabel}
              </p>
            </div>
            <div className="text-xs sm:text-right">
              <p className="font-bold text-sm">{st.full_name}</p>
              <p className="font-mono text-slate-500">{terms.idLabel}: {st.student_number}</p>
              <p className="text-slate-500">
                {st.class_group_name || st.programme_name || st.intake_name || "Enrolled"}
              </p>
            </div>
          </div>

          {terms.schoolType === "university" && (
            <>
              {gpa && (
                <div className="text-xs font-semibold">
                  Cumulative GPA: <span className="text-sm">{gpa}</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="py-2 pr-4">Course</th>
                      <th className="py-2 pr-4">Semester</th>
                      <th className="py-2 pr-4">Credits</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Grade</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.uniGrades.map((g) => (
                      <tr key={g.id}>
                        <td className="py-2 pr-4 font-medium">
                          {g.course_code} — {g.course_name}
                        </td>
                        <td className="py-2 pr-4 text-slate-500">{g.term_name}</td>
                        <td className="py-2 pr-4">{g.credits}</td>
                        <td className="py-2 pr-4">{g.total_score ?? "—"}</td>
                        <td className="py-2 pr-4 font-bold">{g.grade_letter || "—"}</td>
                        <td className="py-2">
                          <ClassicStatusBadge status={g.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {terms.schoolType === "high_school" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500">
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Term</th>
                    <th className="py-2 pr-4">CA</th>
                    <th className="py-2 pr-4">Exam</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.hsScores.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4 font-medium">
                        {r.subject_code ? `${r.subject_code} — ` : ""}
                        {r.subject_name}
                      </td>
                      <td className="py-2 pr-4 text-slate-500">{r.term_name}</td>
                      <td className="py-2 pr-4">{r.ca_score ?? "—"}</td>
                      <td className="py-2 pr-4">{r.exam_score ?? "—"}</td>
                      <td className="py-2 pr-4 font-semibold">{r.total_score ?? "—"}</td>
                      <td className="py-2 font-bold">{r.grade || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {terms.schoolType === "vocational" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="py-2 pr-4">Trade Module</th>
                      <th className="py-2 pr-4">Practical Score</th>
                      <th className="py-2">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.vocCompetencies.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2 pr-4 font-medium">
                          {c.module_code ? `${c.module_code} — ` : ""}
                          {c.module_name}
                        </td>
                        <td className="py-2 pr-4">
                          {c.practical_score != null ? `${c.practical_score}%` : "—"}
                        </td>
                        <td className="py-2">
                          <ClassicStatusBadge status={c.verdict} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.certifications.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-1.5 text-xs">
                  <p className="font-semibold">Issued Trade Certifications</p>
                  {data.certifications.map((cert) => (
                    <div key={cert.id} className="flex justify-between">
                      <span>
                        {cert.qualification_title} ({cert.certificate_number})
                      </span>
                      <ClassicStatusBadge status={cert.status} />
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleIssueCert} className="flex flex-wrap gap-2 pt-2 print:hidden text-xs">
                <input
                  type="text"
                  required
                  value={qualTitle}
                  onChange={(e) => setQualTitle(e.target.value)}
                  placeholder="Qualification title to issue certificate..."
                  className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
                >
                  Issue Certificate
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
