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
  Loader2,
} from "lucide-react";

interface StudentAttendanceRow {
  studentId: string;
  studentNumber: string;
  fullName: string;
  status: "present" | "late" | "absent" | "excused";
  remarks: string;
}

export default function LecturerAttendancePage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>("");
  const [sessionDate, setSessionDate] = useState("2026-11-02");
  const [sessionTopic, setSessionTopic] = useState("Course Lecture & Discussion Session");
  const [students, setStudents] = useState<StudentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setSessionDate(new Date().toISOString().split("T")[0]);
  }, []);

  // 1. Load Course Offerings
  useEffect(() => {
    async function loadOfferings() {
      try {
        const res = await fetch("/api/lecturer/dashboard");
        const data = await res.json();
        if (data?.success && data.offerings && data.offerings.length > 0) {
          setOfferings(data.offerings);
          setSelectedOfferingId(data.offerings[0].id);
        } else {
          const supabase = createClient();
          const { data: offs } = await (supabase as any)
            .from("course_offerings")
            .select("id, section, course:course_id(code, name)")
            .limit(10);
          if (offs && offs.length > 0) {
            setOfferings(offs);
            setSelectedOfferingId(offs[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load offerings:", err);
      }
    }
    loadOfferings();
  }, []);

  // 2. Load Enrolled Students for selected course offering
  useEffect(() => {
    if (!selectedOfferingId) return;

    async function loadStudents() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: enrolments } = await (supabase as any)
          .from("course_enrolments")
          .select(`
            id,
            student_id,
            enrolment_status,
            student:student_id(
              id,
              student_number,
              profile:profile_id(full_name, email)
            )
          `)
          .eq("course_offering_id", selectedOfferingId)
          .eq("enrolment_status", "enrolled");

        if (enrolments && enrolments.length > 0) {
          setStudents(
            enrolments.map((e: any) => ({
              studentId: e.student_id,
              studentNumber: e.student?.student_number || "STU20260001",
              fullName: e.student?.profile?.full_name || "Enrolled Student",
              status: "present",
              remarks: "",
            }))
          );
        } else {
          setStudents([]);
        }
      } catch (err) {
        console.warn("Could not load enrolled students:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [selectedOfferingId]);

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
    if (!selectedOfferingId) {
      alert("Please select a course offering.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/lecturer/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseOfferingId: selectedOfferingId,
          sessionDate,
          topic: sessionTopic,
          records: students,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification(`Attendance session on ${sessionDate} successfully saved to database!`);
      } else {
        alert(data.error || "Failed to save attendance");
      }
    } catch (err: any) {
      alert(err.message || "Network error while saving attendance");
    } finally {
      setSaving(false);
    }
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
            <span className="text-slate-800 font-semibold">Attendance Entry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Class Attendance Management
          </h1>
          <p className="text-xs text-slate-500">
            Record lecture participation, track punctuality, and submit authoritative session attendance directly to database.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => markAll("present")}
            disabled={saving || loading || students.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Mark All Present
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving || loading || students.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Save className="h-3.5 w-3.5" />}
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
            value={selectedOfferingId}
            onChange={(e) => setSelectedOfferingId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
          >
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.course?.code || "COURSE"} - {o.course?.name || "Offering"} (Sec {o.section || "A"})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Session Date</label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Lecture Topic</label>
          <input
            type="text"
            value={sessionTopic}
            onChange={(e) => setSessionTopic(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Quick Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Present</span>
          <span className="text-base font-extrabold text-emerald-600">{counts.present}</span>
        </div>
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Late</span>
          <span className="text-base font-extrabold text-amber-600">{counts.late}</span>
        </div>
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Excused</span>
          <span className="text-base font-extrabold text-blue-600">{counts.excused}</span>
        </div>
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Absent</span>
          <span className="text-base font-extrabold text-red-600">{counts.absent}</span>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Session Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    <span>Loading class roster from database...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No enrolled students found for this course offering.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{s.studentNumber}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px]">
                        {(["present", "late", "absent", "excused"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => updateStatus(s.studentId, st)}
                            className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-all cursor-pointer ${
                              s.status === st
                                ? st === "present"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : st === "late"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : st === "absent"
                                  ? "bg-red-600 text-white shadow-xs"
                                  : "bg-blue-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-900"
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
                        placeholder="Remarks (e.g. excused clinic notice)..."
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
