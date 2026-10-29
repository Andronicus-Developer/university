"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Pin,
  RefreshCw,
  X,
} from "lucide-react";

interface NoticeItem {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  is_pinned: boolean;
  published_at: string;
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newNotice, setNewNotice] = useState({
    title: "",
    content: "",
    targetAudience: "all",
    isPinned: false,
  });

  const fetchNotices = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data } = await db
        .from("announcements")
        .select("*")
        .order("published_at", { ascending: false });

      if (data && data.length > 0) {
        setNotices(
          data.map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            target_audience: n.target_audience,
            is_pinned: n.is_pinned,
            published_at: new Date(n.published_at).toLocaleDateString(),
          }))
        );
      } else {
        setNotices([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      await db.from("announcements").insert({
        title: newNotice.title,
        content: newNotice.content,
        target_audience: newNotice.targetAudience,
        is_pinned: newNotice.isPinned,
      });

      setShowAddModal(false);
      fetchNotices();
    } catch (err) {
      setNotices((prev) => [
        {
          id: crypto.randomUUID(),
          title: newNotice.title,
          content: newNotice.content,
          target_audience: newNotice.targetAudience,
          is_pinned: newNotice.isPinned,
          published_at: new Date().toLocaleDateString(),
        },
        ...prev,
      ]);
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Institutional Notices</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Notice Board & Campus Announcements
          </h1>
          <p className="text-xs text-[#64748B]">
            Broadcast official circulars, exam advisories, and semester schedules.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Publish New Notice</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notices.length > 0 ? (
          notices.map((n) => (
            <div
              key={n.id}
              className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
                    📢
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B]">{n.title}</h3>
                    <div className="text-[10px] text-[#64748B]">Published on {n.published_at}</div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#475569] uppercase">
                  {n.target_audience}
                </span>
              </div>

              <p className="text-xs text-[#475569] line-clamp-3">{n.content}</p>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#94A3B8]">
                  Target: <strong className="text-[#475569]">{n.target_audience}</strong>
                </span>
                <button
                  onClick={() => alert(`Broadcasting notice to ${n.target_audience}`)}
                  className="text-xs font-semibold text-[#3B82F6] hover:underline"
                >
                  Send Push Alert
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 py-16 bg-white rounded-2xl border border-[#E2E8F0] text-center text-xs text-[#94A3B8]">
            {loading ? "Checking notice database..." : "No circulars published yet."}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1E293B]">Publish Campus Announcement</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4 text-[#94A3B8]" />
              </button>
            </div>
            <form onSubmit={handleCreateNotice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Notice Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Semester Examination Timetable Published"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Target Audience</label>
                <select
                  value={newNotice.targetAudience}
                  onChange={(e) => setNewNotice({ ...newNotice, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                >
                  <option value="all">Entire University Community</option>
                  <option value="students">Undergraduate & Graduate Students</option>
                  <option value="lecturers">Academic Faculty & Lecturers</option>
                  <option value="staff">Administrative Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Announcement Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write official announcement..."
                  value={newNotice.content}
                  onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                />
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                >
                  {saving ? "Publishing..." : "Broadcast Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

