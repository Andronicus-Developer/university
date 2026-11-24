"use client";

import React from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useParentSection } from "@/lib/parent/useParentPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface TimetableData {
  school: { id: string; name: string; school_type: string };
  ward: any;
  noLinkedWard?: boolean;
  timetable: Array<{
    id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    room: string;
    entry_type: string;
    unit_code: string;
    unit_name: string;
    teacher_name: string;
  }>;
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ParentTimetablePage() {
  const { data, loading, error, reload } = useParentSection<TimetableData>("timetable");

  if (loading) return <ClassicLoading label="Loading timetable..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load timetable"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);
  if (data.noLinkedWard || !data.ward) {
    return (
      <ClassicEmpty
        icon={CalendarDays}
        title={`No Linked ${terms.learnerSingular}`}
        description="Link a child/ward to view their timetable and workshop/class schedule."
      />
    );
  }

  const sorted = [...data.timetable].sort((a, b) => {
    const da = DAY_ORDER.indexOf(a.day_of_week);
    const db = DAY_ORDER.indexOf(b.day_of_week);
    if (da !== db) return (da === -1 ? 99 : da) - (db === -1 ? 99 : db);
    return String(a.start_time || "").localeCompare(String(b.start_time || ""));
  });

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title={terms.scheduleLabel}
        subtitle={`${data.school.name} • ${data.ward.full_name} (${data.ward.student_number})`}
      />

      {sorted.length === 0 ? (
        <ClassicEmpty
          icon={CalendarDays}
          title="No Timetable Slots Scheduled Yet"
          description="Weekly class, lecture, or workshop schedule entries created by the school will display here."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">Day</th>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">{terms.curriculumLabel}</th>
                  <th className="py-2.5 px-4">{terms.instructorLabel}</th>
                  <th className="py-2.5 px-4">Room / Bay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 font-semibold">{item.day_of_week}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {(item.start_time || "").slice(0, 5)} – {(item.end_time || "").slice(0, 5)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">
                        {item.unit_code ? `${item.unit_code} — ` : ""}
                        {item.unit_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {item.teacher_name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {item.room}
                      </span>
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
