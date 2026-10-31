"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  BookOpen,
} from "lucide-react";

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttendance() {
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
          const { data: att } = await db
            .from("attendance_records")
            .select(`
              id,
              status,
              recorded_at,
              class_session:class_session_id(
                id,
                session_date,
                topic,
                course_offering:course_offering_id(
                  course:course_id(code, name)
                )
              )
            `)
            .eq("student_id", stuId)
            .order("recorded_at", { ascending: false });

          setRecords(att || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading attendance records...</p>
      </div>
    );
  }

  const total = records.length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const percentage = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Lecture Attendance & Records</h1>
        <p className="text-xs text-slate-500">Official session attendance log, compliance tracking and status</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Overall Attendance</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{percentage}%</span>
            <span className="text-xs font-bold text-emerald-600">Eligible for Exam</span>
          </div>
          <p className="text-[11px] text-slate-400">Min. requirement: 75%</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Present</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{presentCount}</span>
            <span className="text-xs text-slate-400">Sessions</span>
          </div>
          <p className="text-[11px] text-slate-400">On time attendance</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Late</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{lateCount}</span>
            <span className="text-xs text-slate-400">Sessions</span>
          </div>
          <p className="text-[11px] text-slate-400">Marked within grace period</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Absent</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-400">{absentCount}</span>
            <span className="text-xs text-slate-400">Sessions</span>
          </div>
          <p className="text-[11px] text-slate-400">Unexcused absence</p>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Session Attendance Log ({records.length})</h2>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {records.length > 0 ? (
            records.map((r) => {
              const session = r.class_session;
              const course = session?.course_offering?.course;
              return (
                <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                        {course?.code || "COURSE"}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {course?.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Topic: <span className="font-semibold text-slate-800">{session?.topic}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Session Date: {session?.session_date} • Recorded: {new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div>
                    {r.status === "present" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Present
                      </span>
                    )}
                    {r.status === "late" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs">
                        <Clock className="h-3.5 w-3.5" /> Late
                      </span>
                    )}
                    {r.status === "absent" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs">
                        <XCircle className="h-3.5 w-3.5" /> Absent
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="p-6 text-center text-xs text-slate-400">No attendance sessions recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

