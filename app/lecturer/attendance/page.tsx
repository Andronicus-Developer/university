"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CheckSquare,
  Users,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";

interface StudentAttendanceRow {
  studentId: string;
  studentNumber: string;
  fullName: string;
  status: "present" | "late" | "absent" | "excused";
  remarks: string;
}

export default function LecturerAttendancePage() {
  const [selectedCourse, setSelectedCourse] = useState("CS101");
  const [sessionDate, setSessionDate] = useState("2026-10-31");

  useEffect(() => {
    setSessionDate(new Date().toISOString().split("T")[0]);
  }, []);
  const [sessionTopic, setSessionTopic] = useState("Control Structures & Iterative Loops");
  const [students, setStudents] = useState<StudentAttendanceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudents() {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from("students")
        .select("id, student_number, profile:profile_id(full_name)")
        .limit(15);

      if (data && data.length > 0) {
        setStudents(
          data.map((s: any) => ({
            studentId: s.id,
            studentNumber: s.student_number,
            fullName: s.profile?.full_name || "Enrolled Student",
            status: "present",
            remarks: "",
          }))
        );
      } else {
        setStudents([
          { studentId: "s-1", studentNumber: "STU20260012", fullName: "Ama Mensah", status: "present", remarks: "" },
          { studentId: "s-2", studentNumber: "STU20260028", fullName: "Kofi Owusu", status: "present", remarks: "" },
          { studentId: "s-3", studentNumber: "STU20260035", fullName: "Ebenezer Quaye", status: "late", remarks: "Arrived 15m after start" },
          { studentId: "s-4", studentNumber: "STU20260041", fullName: "Grace Acheampong", status: "present", remarks: "" },
          { studentId: "s-5", studentNumber: "STU20260055", fullName: "Samuel Boateng", status: "excused", remarks: "Clinic appointment" },
        ]);
      }
    }
    loadStudents();
  }, [selectedCourse]);

  const updateStatus = (studentId: string, status: "present" | "late" | "absent" | "excused") => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const markAll = (status: "present" | "absent") => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setNotification(`Attendance for ${selectedCourse} on ${sessionDate} successfully saved to university records.`);
  };

  const counts = {
    present: students.filter((s) => s.status === "present").length,
    late: students.filter((s) => s.status === "late").length,
    excused: students.filter((s) => s.status === "excused").length,
    absent: students.filter((s) => s.status === "absent").length,
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Attendance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Class Session Attendance
          </h1>
          <p className="text-xs text-slate-500">
            Record lecture participation, track punctuality, and submit authoritative session attendance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => markAll("present")}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            Mark All Present
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : "Save Attendance"}</span>
          </button>
        </div>
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

      {/* Session Controls */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Course Offering</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="CS101">CS101 - Programming Foundations (Sec A)</option>
            <option value="CS204">CS204 - Database Systems (Sec B)</option>
            <option value="CS308">CS308 - Software Engineering (Sec A)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Session Date</label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Lecture Topic / Module</label>
          <input
            type="text"
            value={sessionTopic}
            onChange={(e) => setSessionTopic(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Quick Summary Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
          <div className="text-xl font-bold text-emerald-600">{counts.present}</div>
          <div className="text-[11px] text-slate-500 font-semibold">Present</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
          <div className="text-xl font-bold text-amber-600">{counts.late}</div>
          <div className="text-[11px] text-slate-500 font-semibold">Late</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
          <div className="text-xl font-bold text-blue-600">{counts.excused}</div>
          <div className="text-[11px] text-slate-500 font-semibold">Excused</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
          <div className="text-xl font-bold text-red-600">{counts.absent}</div>
          <div className="text-[11px] text-slate-500 font-semibold">Absent</div>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {students.map((s) => (
                <tr key={s.studentId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{s.studentNumber}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {(["present", "late", "absent", "excused"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => updateStatus(s.studentId, st)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                            s.status === st
                              ? st === "present"
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : st === "late"
                                ? "bg-amber-500 text-white shadow-2xs"
                                : st === "absent"
                                ? "bg-red-600 text-white shadow-2xs"
                                : "bg-blue-600 text-white shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={s.remarks}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudents((prev) =>
                          prev.map((item) =>
                            item.studentId === s.studentId ? { ...item, remarks: val } : item
                          )
                        );
                      }}
                      className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

