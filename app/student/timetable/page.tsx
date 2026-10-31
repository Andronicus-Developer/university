"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  Clock,
  MapPin,
  Building,
  RefreshCw,
  BookOpen,
} from "lucide-react";

export default function StudentTimetablePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTimetable() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let stuId = null;
        if (user) {
          const { data: stu } = await db
            .from("students")
            .select("id")
            .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();
          if (stu) stuId = stu.id;
        }

        if (!stuId) {
          const { data: firstStu } = await db.from("students").select("id").limit(1).maybeSingle();
          if (firstStu) stuId = firstStu.id;
        }

        if (stuId) {
          // Get enrolled offerings
          const { data: enrolments } = await db
            .from("course_enrolments")
            .select("course_offering_id")
            .eq("student_id", stuId);

          const offeringIds = (enrolments || []).map((e: any) => e.course_offering_id);

          if (offeringIds.length > 0) {
            const { data: evs } = await db
              .from("timetable_events")
              .select(`
                id,
                day_of_week,
                start_time,
                end_time,
                recurrence_pattern,
                course_offering:course_offering_id(
                  course:course_id(code, name, credits)
                ),
                room:room_id(name, building:building_id(name))
              `)
              .in("course_offering_id", offeringIds);

            setEvents(evs || []);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadTimetable();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading student timetable...</p>
      </div>
    );
  }

  const daysOfWeek = [
    { day: 1, name: "Monday" },
    { day: 2, name: "Tuesday" },
    { day: 3, name: "Wednesday" },
    { day: 4, name: "Thursday" },
    { day: 5, name: "Friday" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Weekly Class Timetable</h1>
        <p className="text-xs text-slate-500">Semester lecture schedule and lecture room assignments</p>
      </div>

      {/* Day by Day Cards */}
      <div className="space-y-4">
        {daysOfWeek.map((d) => {
          const dayEvents = events.filter((e) => e.day_of_week === d.day);
          return (
            <div key={d.day} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">{d.name}</span>
                <span className="text-xs font-semibold text-slate-500">
                  {dayEvents.length} {dayEvents.length === 1 ? "Session" : "Sessions"}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {dayEvents.length > 0 ? (
                  dayEvents.map((ev) => (
                    <div key={ev.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/40 transition">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-blue-50 text-blue-700 flex flex-col items-center justify-center shrink-0">
                          <Clock className="h-4 w-4" />
                          <span className="text-[10px] font-bold mt-1">
                            {ev.start_time?.slice(0, 5)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-xs">
                              {ev.course_offering?.course?.code}
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {ev.course_offering?.course?.name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <span>Time: {ev.start_time?.slice(0, 5)} - {ev.end_time?.slice(0, 5)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <MapPin className="h-3 w-3 text-red-500" />
                              {ev.room?.name || "Main Complex Room 101"} ({ev.room?.building?.name || "Science Block"})
                            </span>
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs self-start sm:self-center">
                        Weekly Lecture
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-5 text-center text-xs text-slate-400">No lecture scheduled for {d.name}.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

