"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  MigrationNoticeBanner,
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

interface UniAdvisingPayload {
  students: Array<{
    id: string;
    full_name: string;
    student_number: string;
    email: string;
    current_level: number;
    programme_name: string;
  }>;
  notes: Array<{
    id: string;
    student_id: string;
    student_name: string;
    student_number: string;
    session_date: string;
    advising_type: string;
    topic: string;
    notes: string;
    action_items: string | null;
    follow_up_date: string | null;
    status: "open" | "resolved";
    advisor_name: string | null;
  }>;
  missingTables: string[];
}

export default function LecturerAdvisingPage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<UniAdvisingPayload>("uni_advising");

  const [showForm, setShowForm] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [advisingType, setAdvisingType] = useState("academic");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setSessionDate((p) => p || new Date().toISOString().slice(0, 10));
  }, []);

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    const targetStudentId = studentId || data?.students?.[0]?.id || "";
    if (!targetStudentId || !topic.trim() || !notes.trim()) {
      setBanner({ type: "error", text: "Select a student and provide topic and advising notes." });
      return;
    }
    setSaving(true);
    setBanner(null);
    const res = await mutate("create_advising_note", {
      studentId: targetStudentId,
      sessionDate,
      advisingType,
      topic: topic.trim(),
      notes: notes.trim(),
      actionItems: actionItems.trim(),
      followUpDate: followUpDate || null,
    });
    setSaving(false);

    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save advising note." });
    } else {
      setTopic("");
      setNotes("");
      setActionItems("");
      setFollowUpDate("");
      setShowForm(false);
      setBanner({ type: "success", text: res.message || "Advising note logged." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading advisees & mentorship records..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Academic Advising &amp; Project Supervision</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Student Advising &amp; Mentorship
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track academic progression meetings, project supervision check-ins, and follow-up actions.
          </p>
        </div>

        {(data?.students || []).length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer self-start"
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{showForm ? "Close Form" : "Log Advising Note"}</span>
          </button>
        )}
      </div>

      <MigrationNoticeBanner tables={data?.missingTables || []} />

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

      {showForm && (
        <form
          onSubmit={handleSaveNote}
          className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Record Mentorship / Advising Session
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Student / Advisee *
              </label>
              <select
                value={studentId || data?.students?.[0]?.id || ""}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {(data?.students || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.student_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Session Type
              </label>
              <select
                value={advisingType}
                onChange={(e) => setAdvisingType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="academic">Academic Progression</option>
                <option value="project">Final Year / Research Project</option>
                <option value="career">Career &amp; Internship Guidance</option>
                <option value="welfare">Student Support / Welfare</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Meeting Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Topic / Agenda *
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Semester course load & elective selection"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Follow-Up Date (Optional)
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Advising Summary &amp; Recommendations *
            </label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summary of discussion, academic standing review, and agreed milestones..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Action Items for Student
            </label>
            <input
              type="text"
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="e.g. Submit thesis proposal draft by next Friday"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Note</span>
            </button>
          </div>
        </form>
      )}

      {(data?.notes || []).length === 0 ? (
        <StaffEmptyState
          icon={GraduationCap}
          title="No Advising Notes Recorded"
          description="Log advising and project supervision meetings using the 'Log Advising Note' button above."
        />
      ) : (
        <div className="space-y-3">
          {data!.notes.map((n) => (
            <div
              key={n.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {n.advising_type}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {n.student_name} ({n.student_number})
                    </span>
                    <span className="text-[11px] text-slate-400">{n.session_date}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                    {n.topic}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      mutate("update_advising_note", {
                        noteId: n.id,
                        status: n.status === "resolved" ? "open" : "resolved",
                      })
                    }
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border cursor-pointer capitalize ${
                      n.status === "resolved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                    }`}
                  >
                    {n.status}
                  </button>
                  <button
                    type="button"
                    onClick={() => mutate("delete_advising_note", { noteId: n.id })}
                    className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.notes}</p>

              {n.action_items && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">Action Items:</strong>{" "}
                  {n.action_items}
                  {n.follow_up_date ? ` (Follow up: ${n.follow_up_date})` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
