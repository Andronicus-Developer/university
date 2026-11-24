"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Edit3, Loader2, Plus, Search, X } from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

interface VocModule {
  id: string;
  code: string;
  name: string;
}

interface VocTrainee {
  id: string;
  full_name: string;
  student_number: string | null;
  intake_id: string | null;
}

interface VocIntake {
  id: string;
  code: string;
  name: string;
}

interface CompetencyRow {
  id: string;
  student_id: string;
  student_name: string;
  student_number: string | null;
  module_id: string;
  module_code: string;
  module_name: string;
  intake_id: string | null;
  assessment_date: string;
  practical_score: number | null;
  verdict: "competent" | "not_yet_competent" | "in_progress";
  assessor_notes: string | null;
}

interface VocCompetenciesPayload {
  school: { id: string; name: string };
  modules: VocModule[];
  trainees: VocTrainee[];
  intakes: VocIntake[];
  assessments: CompetencyRow[];
}

export default function InstructorCompetenciesPage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<VocCompetenciesPayload>("voc_competencies");

  const [moduleFilter, setModuleFilter] = useState("all");
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [intakeId, setIntakeId] = useState("");
  const [assessmentDate, setAssessmentDate] = useState("");
  const [practicalScore, setPracticalScore] = useState("80");
  const [verdict, setVerdict] = useState<"competent" | "not_yet_competent" | "in_progress">(
    "competent"
  );
  const [assessorNotes, setAssessorNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setAssessmentDate((prev) => prev || new Date().toISOString().slice(0, 10));
  }, []);

  const stats = useMemo(() => {
    const list = data?.assessments || [];
    return {
      total: list.length,
      competent: list.filter((a) => a.verdict === "competent").length,
      inProgress: list.filter((a) => a.verdict === "in_progress").length,
      nyc: list.filter((a) => a.verdict === "not_yet_competent").length,
    };
  }, [data?.assessments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.assessments || []).filter((a) => {
      if (moduleFilter !== "all" && a.module_id !== moduleFilter) return false;
      if (verdictFilter !== "all" && a.verdict !== verdictFilter) return false;
      if (!q) return true;
      return (
        a.student_name.toLowerCase().includes(q) ||
        (a.student_number || "").toLowerCase().includes(q) ||
        a.module_code.toLowerCase().includes(q) ||
        a.module_name.toLowerCase().includes(q)
      );
    });
  }, [data?.assessments, moduleFilter, verdictFilter, query]);

  function openNewAssessment() {
    setStudentId(data?.trainees?.[0]?.id || "");
    setModuleId(data?.modules?.[0]?.id || "");
    setIntakeId(data?.trainees?.[0]?.intake_id || data?.intakes?.[0]?.id || "");
    setPracticalScore("80");
    setVerdict("competent");
    setAssessorNotes("");
    setShowModal(true);
  }

  function openEditAssessment(row: CompetencyRow) {
    setStudentId(row.student_id);
    setModuleId(row.module_id);
    setIntakeId(row.intake_id || "");
    setAssessmentDate((row.assessment_date || "").slice(0, 10) || assessmentDate);
    setPracticalScore(row.practical_score != null ? String(row.practical_score) : "75");
    setVerdict(row.verdict);
    setAssessorNotes(row.assessor_notes || "");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !moduleId) return;
    setSaving(true);
    setBanner(null);
    const parsedScore = practicalScore.trim() === "" ? null : Number(practicalScore);
    const result = await mutate("save_competency_assessment", {
      studentId,
      moduleId,
      intakeId: intakeId || null,
      assessmentDate,
      practicalScore: parsedScore,
      verdict,
      assessorNotes: assessorNotes.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setBanner({ type: "error", text: result.error || "Failed to save competency verdict." });
      return;
    }
    setBanner({ type: "success", text: "Competency assessment saved to trainee record." });
    setShowModal(false);
  }

  if (loading) return <StaffPageLoading label="Loading CBET competency assessments..." />;
  if (error || !data) {
    return <StaffPageError error={error || "Failed to load competencies"} onRetry={reload} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Competency Assessments & Sign-offs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.school.name} • Evaluate practical skill proficiency and CBET verdicts per trade unit
          </p>
        </div>
        <button
          type="button"
          onClick={openNewAssessment}
          disabled={data.trainees.length === 0 || data.modules.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Record Competency Assessment</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Evaluations", val: stats.total, tone: "text-slate-900 dark:text-slate-100" },
          { label: "Competent (C)", val: stats.competent, tone: "text-emerald-600 dark:text-emerald-400" },
          { label: "In Progress", val: stats.inProgress, tone: "text-amber-600 dark:text-amber-400" },
          { label: "Not Yet Competent", val: stats.nyc, tone: "text-rose-600 dark:text-rose-400" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {kpi.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${kpi.tone}`}>{kpi.val}</p>
          </div>
        ))}
      </div>

      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 ${
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

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by trainee name, ID, or module..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Modules</option>
            {data.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Verdicts</option>
            <option value="competent">Competent</option>
            <option value="in_progress">In Progress</option>
            <option value="not_yet_competent">Not Yet Competent</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <StaffEmptyState
          icon={Award}
          title="No Competency Assessments Recorded"
          description="Record your first practical CBET verdict above to track trainee readiness across trade units."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Trainee</th>
                  <th className="py-3 px-4">Trade Module</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4">Assessed Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filtered.map((row) => {
                  const badge =
                    row.verdict === "competent"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : row.verdict === "not_yet_competent"
                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {row.student_name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {row.student_number || "—"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {row.module_code}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {row.module_name}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {row.practical_score != null ? `${row.practical_score}%` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase ${badge}`}
                        >
                          {row.verdict.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {(row.assessment_date || "").slice(0, 10) || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditAssessment(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Update</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assessment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Save Competency Verdict
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trainee *
                  </label>
                  <select
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {data.trainees.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} {t.student_number ? `(${t.student_number})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trade Module *
                  </label>
                  <select
                    required
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {data.modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assessment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Practical Score (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={practicalScore}
                    onChange={(e) => setPracticalScore(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Verdict *
                  </label>
                  <select
                    value={verdict}
                    onChange={(e) =>
                      setVerdict(
                        e.target.value as "competent" | "not_yet_competent" | "in_progress"
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="competent">Competent</option>
                    <option value="in_progress">In Progress</option>
                    <option value="not_yet_competent">Not Yet Competent</option>
                  </select>
                </div>
              </div>

              {data.intakes.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Intake Cohort (Optional)
                  </label>
                  <select
                    value={intakeId}
                    onChange={(e) => setIntakeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Auto / Unspecified</option>
                    {data.intakes.map((intake) => (
                      <option key={intake.id} value={intake.id}>
                        {intake.code} — {intake.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assessor Observations
                </label>
                <textarea
                  rows={3}
                  value={assessorNotes}
                  onChange={(e) => setAssessorNotes(e.target.value)}
                  placeholder="Practical precision, safety compliance, areas for remediation..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Verdict</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
