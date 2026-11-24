"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CheckSquare,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

function HighSchoolAttendanceView() {
  const { data, loading, error, reload, mutate } = useStaffPortalSection<any>("hs_attendance");

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [topic, setTopic] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Conduct log form state
  const [conductStudentId, setConductStudentId] = useState("");
  const [recordType, setRecordType] = useState("commendation");
  const [conductGrade, setConductGrade] = useState("Good");
  const [conductNotes, setConductNotes] = useState("");
  const [savingConduct, setSavingConduct] = useState(false);

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setSessionDate((p) => p || new Date().toISOString().slice(0, 10));
  }, []);

  const activeClassId = useMemo(() => {
    if (classId && (data?.classes || []).some((c: any) => c.id === classId)) return classId;
    return data?.classes?.[0]?.id || "";
  }, [classId, data?.classes]);

  const roster: any[] = useMemo(() => {
    const classList = activeClassId ? data?.studentsByClass?.[activeClassId] : null;
    if (Array.isArray(classList) && classList.length > 0) {
      return classList;
    }
    return data?.allStudents || [];
  }, [data?.studentsByClass, data?.allStudents, activeClassId]);

  async function handleSaveRollCall(e: React.FormEvent) {
    e.preventDefault();
    if (roster.length === 0) return;
    setSaving(true);
    setBanner(null);
    const res = await mutate("record_attendance", {
      programmeId: activeClassId || null,
      subjectId: subjectId || null,
      sessionDate,
      topic: topic.trim() || "Daily Form Roll Call",
      sessionType: "class",
      records: roster.map((s) => ({
        studentId: s.id,
        status: statusMap[s.id] || "present",
      })),
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save roll call." });
    } else {
      setTopic("");
      setBanner({ type: "success", text: res.message || "Attendance saved." });
    }
  }

  async function handleAddConduct(e: React.FormEvent) {
    e.preventDefault();
    const targetStu = conductStudentId || roster[0]?.id || data?.allStudents?.[0]?.id || "";
    if (!targetStu || !conductNotes.trim()) {
      setBanner({ type: "error", text: "Select a student and enter conduct remarks." });
      return;
    }
    setSavingConduct(true);
    setBanner(null);
    const res = await mutate("create_conduct_record", {
      studentId: targetStu,
      recordType,
      conductGrade,
      notes: conductNotes.trim(),
      incidentDate: sessionDate,
    });
    setSavingConduct(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Could not save conduct remark." });
    } else {
      setConductNotes("");
      setBanner({ type: "success", text: res.message || "Conduct remark recorded." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading class attendance & conduct ledger..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckSquare className="h-3.5 w-3.5" />
          <span>High School Attendance &amp; Conduct Tracking</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          Daily Attendance &amp; Conduct Remarks
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Record daily class/subject roll call and log student behavior remarks visible to students and guardians.
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

      {/* Roll Call Form */}
      <form
        onSubmit={handleSaveRollCall}
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Class / Form
            </label>
            <select
              value={activeClassId}
              onChange={(e) => {
                setClassId(e.target.value);
                setStatusMap({});
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              {(data?.classes || []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Subject (Optional)
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="">Morning / Homeroom Roll Call</option>
              {(data?.subjects || []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Session Note
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Period 1 / Assembly"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>

        {roster.length === 0 ? (
          <StaffEmptyState
            icon={CheckSquare}
            title="No Students Found in Class"
            description="Students assigned to this Class/Form will appear here for roll call."
          />
        ) : (
          <>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Students ({roster.length})
              </span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Roll Call</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Admission #</th>
                    <th className="py-2 pr-4 font-semibold">Student Name</th>
                    <th className="py-2 font-semibold">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roster.map((st) => {
                    const cur = statusMap[st.id] || "present";
                    return (
                      <tr key={st.id}>
                        <td className="py-2.5 pr-4 font-mono">{st.student_number}</td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                          {st.full_name}
                        </td>
                        <td className="py-2.5">
                          <div className="inline-flex gap-1.5">
                            {(["present", "late", "absent", "excused"] as const).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setStatusMap((p) => ({ ...p, [st.id]: opt }))}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize border cursor-pointer ${
                                  cur === opt
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

      {/* Conduct & Behavior Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleAddConduct}
          className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Plus className="h-4 w-4 text-emerald-600" />
            <span>Log Conduct / Behavior Remark</span>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Student
            </label>
            <select
              value={conductStudentId || roster[0]?.id || data?.allStudents?.[0]?.id || ""}
              onChange={(e) => setConductStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              {(roster.length > 0 ? roster : data?.allStudents || []).map((st: any) => (
                <option key={st.id} value={st.id}>
                  {st.full_name} ({st.student_number})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="commendation">Commendation</option>
                <option value="counseling">Counseling</option>
                <option value="warning">Warning</option>
                <option value="disciplinary">Disciplinary</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Conduct Grade
              </label>
              <select
                value={conductGrade}
                onChange={(e) => setConductGrade(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="Excellent">Excellent</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Satisfactory">Satisfactory</option>
                <option value="Needs Improvement">Needs Improvement</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Remarks *
            </label>
            <textarea
              rows={3}
              required
              value={conductNotes}
              onChange={(e) => setConductNotes(e.target.value)}
              placeholder="Describe conduct observation, teamwork, or punctuality remark..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={savingConduct}
            className="w-full py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
          >
            {savingConduct ? "Saving..." : "Save Conduct Entry"}
          </button>
        </form>

        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Recent Conduct &amp; Attendance Sessions
          </h2>
          {(data?.conductRecords || []).length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No conduct entries recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.conductRecords.map((c: any) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 flex justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {c.student_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        {c.record_type} · {c.conduct_grade}
                      </span>
                      <span className="text-[11px] text-slate-400">{c.incident_date}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">{c.notes}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => mutate("delete_conduct_record", { recordId: c.id })}
                    className="p-1.5 text-rose-500 hover:text-rose-600 self-start cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VocationalAttendanceView() {
  const { data, loading, error, reload, mutate } = useStaffPortalSection<any>("voc_attendance");

  const [moduleId, setModuleId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [topic, setTopic] = useState("");
  const [safetyBriefingCompleted, setSafetyBriefingCompleted] = useState(true);
  const [safetyNotes, setSafetyNotes] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [ppeMap, setPpeMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setSessionDate((p) => p || new Date().toISOString().slice(0, 10));
  }, []);

  const activeModuleId = useMemo(() => {
    if (moduleId && (data?.modules || []).some((m: any) => m.id === moduleId)) return moduleId;
    return data?.modules?.[0]?.id || "";
  }, [moduleId, data?.modules]);

  const trainees: any[] = data?.trainees || [];

  async function handleSaveWorkshopRollCall(e: React.FormEvent) {
    e.preventDefault();
    if (trainees.length === 0) return;
    setSaving(true);
    setBanner(null);
    const res = await mutate("record_attendance", {
      moduleId: activeModuleId || null,
      sessionDate,
      topic: topic.trim() || "Workshop Practical Session",
      sessionType: "workshop",
      safetyBriefingCompleted,
      safetyNotes: safetyNotes.trim(),
      records: trainees.map((t) => ({
        studentId: t.id,
        status: statusMap[t.id] || "present",
        ppeCompliant: ppeMap[t.id] !== false,
      })),
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save workshop attendance." });
    } else {
      setTopic("");
      setSafetyNotes("");
      setBanner({ type: "success", text: res.message || "Workshop attendance & PPE check saved." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading trainee attendance & PPE safety..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Workshop Roll Call &amp; Occupational Safety</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          Trainee Attendance &amp; Workshop Safety
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Record practical workshop attendance, pre-session safety briefings, and per-trainee PPE compliance.
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

      <form
        onSubmit={handleSaveWorkshopRollCall}
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Trade Module
            </label>
            <select
              value={activeModuleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="">General Workshop Practice</option>
              {(data?.modules || []).map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Session Date
            </label>
            <input
              type="date"
              required
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Workshop Task / Station
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Bay 2 Arc Welding Practice"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 p-3.5 space-y-2">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={safetyBriefingCompleted}
              onChange={(e) => setSafetyBriefingCompleted(e.target.checked)}
              className="rounded border-amber-400 text-amber-600"
            />
            <span>Pre-Workshop Safety Briefing &amp; Machine Guard Check Completed</span>
          </label>
          <input
            type="text"
            value={safetyNotes}
            onChange={(e) => setSafetyNotes(e.target.value)}
            placeholder="Optional safety inspection remarks (ventilation, PPE goggles/boots verified)..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900"
          />
        </div>

        {trainees.length === 0 ? (
          <StaffEmptyState
            icon={ShieldCheck}
            title="No Trainees Registered"
            description="Trainees assigned to this trade workshop will appear here."
          />
        ) : (
          <>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Trainee Roster ({trainees.length})
              </span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Workshop Attendance</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Trainee ID</th>
                    <th className="py-2 pr-4 font-semibold">Trainee Name</th>
                    <th className="py-2 pr-4 font-semibold">Attendance</th>
                    <th className="py-2 font-semibold">PPE Compliant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {trainees.map((t) => {
                    const cur = statusMap[t.id] || "present";
                    const ppeOk = ppeMap[t.id] !== false;
                    return (
                      <tr key={t.id}>
                        <td className="py-2.5 pr-4 font-mono">{t.student_number}</td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                          {t.full_name}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="inline-flex gap-1.5">
                            {(["present", "late", "absent", "excused"] as const).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setStatusMap((p) => ({ ...p, [t.id]: opt }))}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize border cursor-pointer ${
                                  cur === opt
                                    ? "bg-amber-600 text-white border-amber-600"
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold">
                            <input
                              type="checkbox"
                              checked={ppeOk}
                              onChange={(e) =>
                                setPpeMap((p) => ({ ...p, [t.id]: e.target.checked }))
                              }
                              className="rounded border-emerald-400 text-emerald-600"
                            />
                            <span className={ppeOk ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}>
                              {ppeOk ? "PPE OK" : "Missing PPE"}
                            </span>
                          </label>
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

      {(data?.sessions || []).length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Workshop Attendance &amp; Safety Logs ({data.sessions.length})
          </h2>
          <div className="space-y-2">
            {data.sessions.map((s: any) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-mono font-semibold mr-2">{s.session_date}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {s.topic || "Workshop Session"}
                  </span>
                  {s.module_code && (
                    <span className="ml-2 text-[11px] text-amber-700 dark:text-amber-400">
                      ({s.module_code})
                    </span>
                  )}
                </div>
                <div className="text-[11px]">
                  <span className="text-emerald-600 font-semibold">{s.present_count} Present</span>
                  {" · "}
                  <span className="text-slate-600 dark:text-slate-300">
                    {s.ppe_compliant_count} PPE Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherAttendancePage() {
  const { data, loading, error, reload } = useStaffPortalSection<any>("header");
  if (loading) return <StaffPageLoading label="Loading attendance workspace..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;
  return data?.school?.schoolType === "vocational" ? (
    <VocationalAttendanceView />
  ) : (
    <HighSchoolAttendanceView />
  );
}
