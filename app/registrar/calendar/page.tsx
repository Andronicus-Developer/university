"use client";

import React, { useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { useRegistrarSection } from "@/lib/registrar/useRegistrarPortal";
import {
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface CalendarData {
  school: { id: string; name: string; school_type: string };
  academicYears: Array<{
    id: string;
    name: string;
    code: string;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
  }>;
  terms: Array<{
    id: string;
    academic_year_id: string | null;
    name: string;
    code: string;
    start_date: string | null;
    end_date: string | null;
    registration_deadline: string | null;
    is_current: boolean;
  }>;
  intakes: Array<{
    id: string;
    code: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
  }>;
}

export default function RegistrarCalendarPage() {
  const { data, loading, error, reload, mutate } =
    useRegistrarSection<CalendarData>("calendar");

  const [yearName, setYearName] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");

  const [termName, setTermName] = useState("");
  const [termYearId, setTermYearId] = useState("");
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");
  const [regDeadline, setRegDeadline] = useState("");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (loading) return <ClassicLoading label="Loading academic calendar..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load academic calendar"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  async function handleAddYear(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("save_academic_year", {
      name: yearName,
      code: yearName,
      startDate: yearStart || null,
      endDate: yearEnd || null,
      isCurrent: data?.academicYears.length === 0,
    });
    setSaving(false);
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to save academic year." });
    else {
      setBanner({ type: "success", text: "Academic year saved." });
      setYearName("");
    }
  }

  async function handleAddTerm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("save_term", {
      name: termName,
      code: termName,
      academicYearId: termYearId || data?.academicYears[0]?.id || null,
      startDate: termStart || null,
      endDate: termEnd || null,
      registrationDeadline: regDeadline || null,
      isCurrent: data?.terms.length === 0,
    });
    setSaving(false);
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to save term." });
    else {
      setBanner({ type: "success", text: `${terms.sessionLabel} saved.` });
      setTermName("");
    }
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Academic Calendar & Sessions"
        subtitle={`${data.school.name} • Manage academic years, ${terms.sessionLabel.toLowerCase()}s, and registration deadlines`}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Years */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold">Academic Years ({data.academicYears.length})</h2>
          </div>

          <form onSubmit={handleAddYear} className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <input
              type="text"
              required
              value={yearName}
              onChange={(e) => setYearName(e.target.value)}
              placeholder="e.g. 2026/2027"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="date"
              value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Add Year</span>
            </button>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {data.academicYears.map((y) => (
              <div key={y.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{y.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {y.start_date || "TBD"} – {y.end_date || "TBD"}
                  </p>
                </div>
                {y.is_current ? (
                  <ClassicStatusBadge status="active" />
                ) : (
                  <button
                    type="button"
                    onClick={() => mutate("set_current_academic_year", { id: y.id })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] cursor-pointer"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Set Current</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Semesters / Terms */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-4">
          <h2 className="text-sm font-semibold">
            {terms.sessionLabel}s & Deadlines ({data.terms.length})
          </h2>

          <form onSubmit={handleAddTerm} className="space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                placeholder={`e.g. ${terms.sessionLabel} 1`}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={termYearId}
                onChange={(e) => setTermYearId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">Academic Year (Auto)</option>
                {data.academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Start Date</label>
                <input
                  type="date"
                  value={termStart}
                  onChange={(e) => setTermStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Reg. Deadline</label>
                <input
                  type="date"
                  value={regDeadline}
                  onChange={(e) => setRegDeadline(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add {terms.sessionLabel}</span>
                </button>
              </div>
            </div>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {data.terms.map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {t.start_date || "TBD"} – {t.end_date || "TBD"}
                    {t.registration_deadline ? ` • Reg deadline: ${t.registration_deadline}` : ""}
                  </p>
                </div>
                {t.is_current ? (
                  <ClassicStatusBadge status="active" />
                ) : (
                  <button
                    type="button"
                    onClick={() => mutate("set_current_term", { id: t.id })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] cursor-pointer"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Set Current</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.intakes.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-3">
          <h2 className="text-sm font-semibold">Vocational Intakes ({data.intakes.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {data.intakes.map((i) => (
              <div
                key={i.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {i.code} • {i.start_date || "TBD"}
                  </p>
                </div>
                <ClassicStatusBadge status={i.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
