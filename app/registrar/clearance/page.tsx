"use client";

import React, { useState } from "react";
import { CheckCircle2, CheckSquare, Loader2, Plus, X } from "lucide-react";
import { useRegistrarSection } from "@/lib/registrar/useRegistrarPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicMigrationNotice,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney, getPortalTerminology } from "@/lib/portals/school-type-labels";

interface ClearanceData {
  school: { id: string; name: string; school_type: string; currency: string };
  missingTables: string[];
  clearances: Array<{
    id: string;
    student_id: string;
    student_name: string;
    student_number: string;
    fee_balance: number;
    cohort_label: string | null;
    academic_cleared: boolean;
    finance_cleared: boolean;
    library_cleared: boolean;
    hostel_cleared: boolean;
    workshop_cleared: boolean;
    overall_status: string;
    graduated_at: string | null;
  }>;
  students: Array<{ id: string; student_number: string; full_name: string; fee_balance: number }>;
  academicYears: Array<{ id: string; name: string }>;
}

export default function RegistrarClearancePage() {
  const { data, loading, error, reload, mutate } =
    useRegistrarSection<ClearanceData>("clearance");

  const [studentId, setStudentId] = useState("");
  const [cohortLabel, setCohortLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (loading) return <ClassicLoading label="Loading clearance & graduation records..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load clearance"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);
  const chosenStudentId = studentId || data.students[0]?.id || "";

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    if (!chosenStudentId) return;
    setSaving(true);
    setBanner(null);
    const st = data?.students.find((s) => s.id === chosenStudentId);
    const res = await mutate("save_clearance", {
      studentId: chosenStudentId,
      cohortLabel: cohortLabel.trim() || null,
      financeCleared: (st?.fee_balance || 0) <= 0,
      academicCleared: false,
      libraryCleared: false,
      hostelCleared: false,
      workshopCleared: false,
    });
    setSaving(false);
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to add candidate." });
    else {
      setBanner({ type: "success", text: "Candidate added to graduation clearance list." });
      setCohortLabel("");
    }
  }

  async function toggleSignOff(
    row: ClearanceData["clearances"][0],
    field:
      | "academic_cleared"
      | "finance_cleared"
      | "library_cleared"
      | "hostel_cleared"
      | "workshop_cleared"
  ) {
    const res = await mutate("save_clearance", {
      studentId: row.student_id,
      cohortLabel: row.cohort_label,
      academicCleared: field === "academic_cleared" ? !row.academic_cleared : row.academic_cleared,
      financeCleared: field === "finance_cleared" ? !row.finance_cleared : row.finance_cleared,
      libraryCleared: field === "library_cleared" ? !row.library_cleared : row.library_cleared,
      hostelCleared: field === "hostel_cleared" ? !row.hostel_cleared : row.hostel_cleared,
      workshopCleared: field === "workshop_cleared" ? !row.workshop_cleared : row.workshop_cleared,
    });
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to update clearance." });
  }

  async function handleGraduate(row: ClearanceData["clearances"][0]) {
    const res = await mutate("mark_graduated", {
      clearanceId: row.id,
      studentId: row.student_id,
    });
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to graduate learner." });
    else setBanner({ type: "success", text: `${row.student_name} marked as Graduated.` });
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Clearance & Graduation"
        subtitle={`${data.school.name} • Track departmental clearances and graduate final-year cohorts`}
      />

      <ClassicMigrationNotice tables={data.missingTables} />

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

      <form
        onSubmit={handleAddCandidate}
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end text-xs"
      >
        <div>
          <label className="block font-medium mb-1">Add Graduation Candidate ({terms.learnerSingular})</label>
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
          <label className="block font-medium mb-1">Graduating Cohort Label</label>
          <input
            type="text"
            value={cohortLabel}
            onChange={(e) => setCohortLabel(e.target.value)}
            placeholder="e.g. Class of 2026"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
        <button
          type="submit"
          disabled={saving || data.students.length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          <span>Add to Clearance</span>
        </button>
      </form>

      {data.clearances.length === 0 ? (
        <ClassicEmpty
          icon={CheckSquare}
          title="No Clearance Candidates Added"
          description="Add graduating students or trainees above to track academic, finance, library, and workshop clearance."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">{terms.learnerSingular}</th>
                  <th className="py-2.5 px-3 text-center">Academic</th>
                  <th className="py-2.5 px-3 text-center">Finance / Bal</th>
                  <th className="py-2.5 px-3 text-center">Library</th>
                  <th className="py-2.5 px-3 text-center">Hostel / Workshop</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.clearances.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 px-4">
                      <p className="font-medium">{row.student_name}</p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {row.student_number}
                        {row.cohort_label ? ` • ${row.cohort_label}` : ""}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.academic_cleared}
                        onChange={() => toggleSignOff(row, "academic_cleared")}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.finance_cleared}
                        onChange={() => toggleSignOff(row, "finance_cleared")}
                        className="cursor-pointer"
                      />
                      <span className="block text-[10px] text-slate-500">
                        {row.fee_balance > 0
                          ? `Owes ${formatMoney(row.fee_balance, data.school.currency)}`
                          : "Cleared"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.library_cleared}
                        onChange={() => toggleSignOff(row, "library_cleared")}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.hostel_cleared && row.workshop_cleared}
                        onChange={() => toggleSignOff(row, "workshop_cleared")}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <ClassicStatusBadge status={row.overall_status} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {row.overall_status !== "graduated" && (
                        <button
                          type="button"
                          onClick={() => handleGraduate(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium cursor-pointer"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Graduate</span>
                        </button>
                      )}
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
