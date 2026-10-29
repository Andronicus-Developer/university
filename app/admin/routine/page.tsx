"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  Plus,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Building,
} from "lucide-react";

interface RoutineEvent {
  id: string;
  course_title: string;
  course_code: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_code: string;
  lecturer_name: string;
}

export default function ClassRoutinePage() {
  const [routines, setRoutines] = useState<RoutineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const fetchRoutines = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data } = await db
        .from("timetable_events")
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          room:room_id(code, name),
          offering:course_offering_id(
            course:course_id(code, name)
          ),
          staff:staff_id(profile:profile_id(full_name))
        `)
        .order("start_time", { ascending: true });

      if (data && data.length > 0) {
        setRoutines(
          data.map((r: any) => ({
            id: r.id,
            course_code: r.offering?.course?.code || "CS101",
            course_title: r.offering?.course?.name || "Intro to Computer Science",
            day_of_week: r.day_of_week || 1,
            start_time: r.start_time?.slice(0, 5) || "09:00",
            end_time: r.end_time?.slice(0, 5) || "11:00",
            room_code: r.room?.code || "LT-A",
            lecturer_name: r.staff?.profile?.full_name || "Faculty Member",
          }))
        );
      } else {
        setRoutines([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const filtered = routines.filter((r) => r.day_of_week === selectedDay);

  const downloadTimetable = () => {
    const content = `University Class Routine - ${daysOfWeek[selectedDay - 1]}\nTime,Course,Room,Lecturer\n` +
      filtered.map((r) => `${r.start_time}-${r.end_time},${r.course_code}: ${r.course_title},${r.room_code},${r.lecturer_name}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `routine_${daysOfWeek[selectedDay - 1].toLowerCase()}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Timetable & Schedule</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Institutional Class Routines
          </h1>
          <p className="text-xs text-[#64748B]">
            Automated lecture schedule, room allocations, and faculty timetables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={downloadTimetable}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#475569] shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Day Routine</span>
          </button>

          <button
            onClick={() => alert("Opening Routine Generator modal.")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create New Routine</span>
          </button>
        </div>
      </div>

      {/* Day Selector Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {daysOfWeek.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx + 1)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedDay === idx + 1
                ? "bg-[#3B82F6] text-white shadow-xs"
                : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-4">Period / Time</th>
              <th className="py-3 px-4">Course</th>
              <th className="py-3 px-4">Classroom / Hall</th>
              <th className="py-3 px-4">Assigned Lecturer</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs">
            {filtered.length > 0 ? (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                    {r.start_time} - {r.end_time}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#1E293B]">{r.course_code}</div>
                    <div className="text-[11px] text-[#64748B]">{r.course_title}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#475569]">
                    <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                      {r.room_code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#334155]">{r.lecturer_name}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Rescheduling session: ${r.course_code}`)}
                      className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#334155]"
                    >
                      Reschedule
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-[#94A3B8]">
                  {loading ? "Loading timetable events..." : `No scheduled classes found for ${daysOfWeek[selectedDay - 1]}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

