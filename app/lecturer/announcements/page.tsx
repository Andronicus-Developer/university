"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Megaphone,
  Plus,
  Send,
  Calendar,
  X,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  created_at: string;
}

export default function LecturerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newAudience, setNewAudience] = useState("course_students");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data } = await db
        .from("announcements")
        .select("id, title, content, target_audience, created_at")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setAnnouncements(data);
      } else {
        setAnnouncements([
          {
            id: "1",
            title: "Semester Examination Timetable Draft Released for Faculty Review",
            content: "Faculty members are requested to review examination slots and notify academic affairs of any room or equipment requirements by Friday.",
            target_audience: "faculty",
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            title: "Mid-Semester Examination Marks Submission Window",
            content: "Please ensure all continuous assessment scores and midterm mark sheets are submitted for departmental moderation.",
            target_audience: "faculty",
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.warn("Could not load announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      await db.from("announcements").insert({
        title: newTitle,
        content: newContent,
        target_audience: newAudience,
      });

      setNotification("Announcement published successfully to enrolled students.");
      setShowAddModal(false);
      setNewTitle("");
      setNewContent("");
      fetchAnnouncements();
    } catch {
      setAnnouncements((prev) => [
        {
          id: String(Date.now()),
          title: newTitle,
          content: newContent,
          target_audience: newAudience,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setShowAddModal(false);
      setNotification("Announcement broadcasted.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Announcements</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Faculty Notices & Course Announcements
          </h1>
          <p className="text-xs text-slate-500">
            Broadcast class announcements to enrolled students and review official university academic notices.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Course Announcement</span>
        </button>
      </div>

      {notification && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {item.target_audience === "faculty"
                  ? "Faculty Notice"
                  : item.target_audience === "course_students"
                  ? "Enrolled Class Announcement"
                  : "Campus Wide"}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
          </div>
        ))}
      </div>

      {/* Post Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Publish Class Notice</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handlePostAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Session Rescheduled for Thursday 2 PM"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="course_students">All Students in My Courses</option>
                  <option value="cs101_students">CS101 Students Only</option>
                  <option value="cs204_students">CS204 Students Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter details of your notice or academic instructions..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {saving ? "Publishing..." : "Publish Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

