"use client";

import React, { useState } from "react";
import { Calendar, Megaphone, Search } from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
} from "@/components/student/StudentPortalPrimitives";

interface AnnouncementsPayload {
  school: { name: string };
  announcements: Array<{
    id: string;
    title: string;
    description: string | null;
    event_type: string | null;
    start_date: string | null;
  }>;
}

export default function StudentAnnouncementsPage() {
  const { data, loading, error, reload } =
    useStudentPortalSection<AnnouncementsPayload>("announcements");
  const [search, setSearch] = useState("");

  if (loading) return <StudentPageLoading label="Loading school announcements..." />;
  if (error || !data) {
    return <StudentPageError error={error || "Failed to load announcements"} onRetry={reload} />;
  }

  const filtered = (data.announcements || []).filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (a.title || "").toLowerCase().includes(q) ||
      (a.description || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            School Announcements & Notices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official bulletins from {data.school.name}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search notices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <StudentEmptyState
          icon={Megaphone}
          title="No Announcements Yet"
          description="Official school bulletins posted by Administration will appear here."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((ann) => (
            <div
              key={ann.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase">
                  {ann.event_type || "Notice"}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {(ann.start_date || "").slice(0, 10) || "Recent"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{ann.title}</h3>
              {ann.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {ann.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
