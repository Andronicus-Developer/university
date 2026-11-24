"use client";

import React, { useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

interface CompetencyAssessment {
  id: string;
  module_id: string | null;
  assessment_date: string | null;
  practical_score: number | null;
  verdict: "competent" | "not_yet_competent" | "in_progress";
  assessor_notes: string | null;
  assessor_name: string | null;
  intake_name: string | null;
  module: { id: string; code: string; name: string; credit_units?: number } | null;
}

interface CompetenciesPayload {
  school: { id: string; name: string };
  student: any | null;
  assessments: CompetencyAssessment[];
  totalTradeModules: number;
}

const VERDICT_CONFIG: Record<
  string,
  { label: string; badge: string; bar: string }
> = {
  competent: {
    label: "Competent",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    bar: "bg-emerald-500",
  },
  in_progress: {
    label: "In Progress",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    bar: "bg-amber-500",
  },
  not_yet_competent: {
    label: "Not Yet Competent",
    badge:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    bar: "bg-rose-500",
  },
};

export default function VocationalCompetenciesPage() {
  const { data, loading, error, reload } =
    useStudentPortalSection<CompetenciesPayload>("competencies");
  const [verdictFilter, setVerdictFilter] = useState<string>("all");

  const stats = useMemo(() => {
    const list = data?.assessments || [];
    const competentCount = list.filter((a) => a.verdict === "competent").length;
    const pendingCount = list.filter((a) => a.verdict !== "competent").length;
    const scored = list.filter((a) => typeof a.practical_score === "number");
    const avgScore =
      scored.length > 0
        ? scored.reduce((s, a) => s + Number(a.practical_score || 0), 0) / scored.length
        : null;
    const targetModules = Math.max(data?.totalTradeModules || 0, competentCount, 1);
    const completionPct = Math.min(100, Math.round((competentCount / targetModules) * 100));

    return { competentCount, pendingCount, avgScore, completionPct };
  }, [data?.assessments, data?.totalTradeModules]);

  const filtered = useMemo(() => {
    const list = data?.assessments || [];
    if (verdictFilter === "all") return list;
    return list.filter((a) => a.verdict === verdictFilter);
  }, [data?.assessments, verdictFilter]);

  if (loading) return <StudentPageLoading label="Loading competency assessments..." />;
  if (error) return <StudentPageError error={error} onRetry={reload} />;
  if (!data?.student) return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
          <ClipboardCheck className="h-3.5 w-3.5" />
          <span>CBET Practical Evaluations</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          Competency Assessments
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Track module-by-module practical scores, assessor remarks, and CBET competency verdicts.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Competent Verdicts</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.competentCount}
            <span className="text-xs font-semibold text-slate-400 ml-1">
              / {data.totalTradeModules || 0}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Average Practical Score</span>
            <TrendingUp className="h-4 w-4 text-teal-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.avgScore !== null ? `${stats.avgScore.toFixed(1)}%` : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Re-Assessment / Active</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Trade Mastery</span>
            <Award className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.completionPct}%
          </p>
        </div>
      </div>

      {/* Mastery progress bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
          <span>Overall Trade Competency Progress</span>
          <span>
            {stats.competentCount} of {data.totalTradeModules} trade modules competent
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
            style={{ width: `${stats.completionPct}%` }}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "All Assessments" },
          { key: "competent", label: "Competent" },
          { key: "in_progress", label: "In Progress" },
          { key: "not_yet_competent", label: "Not Yet Competent" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setVerdictFilter(item.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              verdictFilter === item.key
                ? "bg-teal-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <StudentEmptyState
          icon={ClipboardCheck}
          title="No Competency Assessments Recorded"
          description="Practical evaluations graded by your workshop instructors will appear here as soon as assessments are published."
          actionHref="/student/modules"
          actionLabel="View Trade Modules"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const cfg = VERDICT_CONFIG[item.verdict] || VERDICT_CONFIG.in_progress;
            const score = typeof item.practical_score === "number" ? item.practical_score : null;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {item.module?.code && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {item.module.code}
                        </span>
                      )}
                      {item.intake_name && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.intake_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                      {item.module?.name || "Trade Competency Unit"}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${cfg.badge}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                {score !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">Practical Score</span>
                      <span className="text-slate-900 dark:text-white">{score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cfg.bar}`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>Assessor: {item.assessor_name || "Assigned Instructor"}</span>
                  <span>Date: {item.assessment_date || "Scheduled"}</span>
                </div>

                {item.assessor_notes && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 p-3 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-teal-500" />
                      <span>Assessor Feedback</span>
                    </div>
                    <p>{item.assessor_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
