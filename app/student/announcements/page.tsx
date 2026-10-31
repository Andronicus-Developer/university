"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Megaphone,
  Pin,
  Calendar,
  Search,
  Sparkles,
} from "lucide-react";

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnnouncements() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: list } = await db
          .from("announcements")
          .select("*")
          .order("is_pinned", { ascending: false })
          .order("published_at", { ascending: false });

        setAnnouncements(list || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAnnouncements();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading campus announcements...</p>
      </div>
    );
  }

  const filtered = announcements.filter(
    (a) =>
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Campus Announcements & Notices</h1>
          <p className="text-xs text-slate-500">Official bulletins from University Registry, Faculties, and Student Affairs</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search notices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((ann) => (
          <div
            key={ann.id}
            className={`bg-white rounded-2xl border p-6 shadow-xs space-y-3 transition ${
              ann.is_pinned ? "border-amber-200 bg-amber-50/20" : "border-slate-200/80"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {ann.is_pinned && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1">
                      <Pin className="h-3 w-3" /> Pinned Bulletin
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] uppercase">
                    {ann.target_audience || "Campus Wide"}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">{ann.title}</h2>
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(ann.published_at).toLocaleDateString()}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{ann.content}</p>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
            No announcements matched your search query.
          </div>
        )}
      </div>
    </div>
  );
}

