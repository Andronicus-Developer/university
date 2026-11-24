"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mail, MessageSquare, Phone, Send } from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  MigrationNoticeBanner,
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

export default function TeacherMessagesPage() {
  const { data, loading, error, reload, mutate } = useStaffPortalSection<any>("hs_messages");

  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [category, setCategory] = useState("academic");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const guardianOptions = useMemo(() => {
    const out: Array<{ parentId: string; studentId: string; label: string; phone?: string; email?: string }> = [];
    for (const st of data?.students || []) {
      for (const p of st.parents || []) {
        out.push({
          parentId: p.id,
          studentId: st.id,
          label: `${p.full_name} (${p.relationship || "Parent"} of ${st.full_name})`,
          phone: p.phone,
          email: p.email,
        });
      }
    }
    return out;
  }, [data?.students]);

  async function handleSendNotice(e: React.FormEvent) {
    e.preventDefault();
    const fallback = guardianOptions[0];
    const targetParentId = selectedParentId || fallback?.parentId || "";
    const targetStudentId = selectedStudentId || fallback?.studentId || "";
    if (!targetParentId || !subject.trim() || !body.trim()) {
      setBanner({ type: "error", text: "Select a linked parent/guardian, subject, and message." });
      return;
    }
    setSending(true);
    setBanner(null);
    const res = await mutate("send_parent_message", {
      parentGuardianId: targetParentId,
      studentId: targetStudentId || null,
      category,
      subject: subject.trim(),
      body: body.trim(),
    });
    setSending(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Could not send message." });
    } else {
      setSubject("");
      setBody("");
      setBanner({ type: "success", text: res.message || "Notice saved & delivered to Parent Portal." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading linked parents & notices..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Parent &amp; Guardian Communication Log</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
          Parent / Guardian Messages
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          View linked parents/guardians for students in your classes and log academic or conduct notices directly to Supabase.
        </p>
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

      {guardianOptions.length === 0 ? (
        <StaffEmptyState
          icon={MessageSquare}
          title="No Linked Parents Found in Your Classes"
          description="Link students to parents/guardians in Admin -> Students or Parents Directory to send academic or conduct notices."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Compose Form */}
          <form
            onSubmit={handleSendNotice}
            className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 self-start"
          >
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Send Parent / Guardian Notice
            </h2>
            <div>
              <label className="block text-[11px] font-semibold mb-1">
                Recipient Parent &amp; Student *
              </label>
              <select
                value={
                  selectedParentId
                    ? `${selectedParentId}:${selectedStudentId}`
                    : `${guardianOptions[0]?.parentId}:${guardianOptions[0]?.studentId}`
                }
                onChange={(e) => {
                  const [pId, sId] = e.target.value.split(":");
                  setSelectedParentId(pId);
                  setSelectedStudentId(sId);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {guardianOptions.map((opt) => (
                  <option
                    key={`${opt.parentId}:${opt.studentId}`}
                    value={`${opt.parentId}:${opt.studentId}`}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1">Notice Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="academic">Academic Progress</option>
                <option value="attendance">Attendance Notice</option>
                <option value="conduct">Conduct &amp; Behavior</option>
                <option value="general">General Announcement</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Midterm Mathematics Progress Update"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1">Message *</label>
              <textarea
                rows={4}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write notice to parent/guardian..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>Send Notice</span>
            </button>
          </form>

          {/* Directory + Message History */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Message Log ({(data?.messages || []).length})
              </h2>
              {(data?.messages || []).length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No messages logged yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                  {data.messages.map((m: any) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {m.subject}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {m.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        To: <strong>{m.parent_name}</strong>
                        {m.student_name ? ` (Re: ${m.student_name})` : ""} ·{" "}
                        {new Date(m.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 pt-1">{m.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Parent Contacts Directory ({guardianOptions.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {guardianOptions.map((g) => (
                  <div
                    key={`${g.parentId}:${g.studentId}`}
                    className="rounded-xl border border-slate-200/70 dark:border-slate-800 p-3 text-xs space-y-1"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">{g.label}</p>
                    {g.phone && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {g.phone}
                      </p>
                    )}
                    {g.email && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {g.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
