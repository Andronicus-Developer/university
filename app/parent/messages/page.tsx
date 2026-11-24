"use client";

import React, { useState } from "react";
import { Bell, Loader2, MessageSquare, Send, X } from "lucide-react";
import { useParentSection } from "@/lib/parent/useParentPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicMigrationNotice,
  ClassicPageHeader,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface MessagesData {
  school: { id: string; name: string; school_type: string };
  ward: any;
  noLinkedWard?: boolean;
  notices: Array<{
    id: string;
    title: string;
    description: string | null;
    event_type: string | null;
    start_date: string | null;
  }>;
  messages: Array<{
    id: string;
    sender_role: string;
    sender_name: string | null;
    staff_name: string;
    category: string | null;
    subject: string;
    body: string;
    created_at: string;
  }>;
  staffContacts: Array<{ id: string; name: string; role: string }>;
  missingTables: string[];
}

export default function ParentMessagesPage() {
  const { data, loading, error, reload, mutate } = useParentSection<MessagesData>("messages");
  const [staffId, setStaffId] = useState("");
  const [category, setCategory] = useState("academic");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (loading) return <ClassicLoading label="Loading notices & inquiries..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load messages"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);
  if (data.noLinkedWard || !data.ward) {
    return (
      <ClassicEmpty
        icon={MessageSquare}
        title={`No Linked ${terms.learnerSingular}`}
        description="Link a child/ward to read school notices and send inquiries."
      />
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setBanner(null);
    const res = await mutate("send_message", {
      staffId: staffId || null,
      category,
      subject: subject.trim(),
      body: body.trim(),
    });
    setSending(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to send inquiry." });
      return;
    }
    setBanner({ type: "success", text: "Message sent to school staff." });
    setSubject("");
    setBody("");
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Messages & Notices"
        subtitle={`${data.school.name} • Direct parent inquiries for ${data.ward.full_name}`}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Send Inquiry Form */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-4">
          <h2 className="text-sm font-semibold">Send Message / Inquiry</h2>
          <form onSubmit={handleSend} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium mb-1">Recipient ({terms.instructorLabel} / Office)</label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">School Administration / General Office</option>
                {data.staffContacts.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Topic Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="academic">Academic Progress</option>
                <option value="attendance">Attendance & Absence Notice</option>
                <option value="conduct">Conduct & Welfare</option>
                <option value="fees">Fees & Billing</option>
                <option value="general">General Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief subject..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Message *</label>
              <textarea
                rows={4}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Write your inquiry regarding ${data.ward.full_name}...`}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>Send Message</span>
            </button>
          </form>
        </div>

        {/* Message History + Notices */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-3">
            <h2 className="text-sm font-semibold">
              Conversation History ({data.messages.length})
            </h2>
            {data.messages.length === 0 ? (
              <p className="text-xs text-slate-500">No messages sent or received yet for this ward.</p>
            ) : (
              <div className="space-y-3">
                {data.messages.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {m.subject}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {(m.created_at || "").slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {m.sender_role === "parent"
                        ? `Sent by you to ${m.staff_name}`
                        : `From ${m.sender_name || m.staff_name}`}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 pt-1">{m.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold">School Notices ({data.notices.length})</h2>
            </div>
            {data.notices.length === 0 ? (
              <p className="text-xs text-slate-500">No announcements published.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {data.notices.map((n) => (
                  <div key={n.id} className="py-2.5">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">{n.title}</span>
                      <span className="text-slate-500">{(n.start_date || "").slice(0, 10)}</span>
                    </div>
                    {n.description && (
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">{n.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
