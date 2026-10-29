"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Users,
} from "lucide-react";

interface AttendanceRecordItem {
  id: string;
  student_number: string;
  student_name: string;
  course_code: string;
  status: string;
  recorded_at: string;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data } = await db
        .from("attendance_records")
        .select(`
          id,
          status,
          recorded_at,
          student:student_id(
            student_number,
            profile:profile_id(full_name)
          )
        `)
        .limit(20);

      if (data && data.length > 0) {
        setRecords(
          data.map((r: any) => ({
            id: r.id,
            student_number: r.student?.student_number || "STU2026001",
            student_name: r.student?.profile?.full_name || "Enrolled Student",
            course_code: "CS101",
            status: r.status,
            recorded_at: new Date(r.recorded_at).toLocaleDateString(),
          }))
        );
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Attendance Tracking</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Student & Faculty Attendance Logs
          </h1>
          <p className="text-xs text-[#64748B]">
            Real-time biometric and roll-call logs across all university lectures and labs.
          </p>
        </div>

        <button
          onClick={() => alert("Marking manual session attendance.")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Record New Session</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Student ID</th>
              <th className="py-3 px-4">Course</th>
              <th className="py-3 px-4">Date Recorded</th>
              <th className="py-3 px-4">Attendance Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs">
            {records.length > 0 ? (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#1E293B]">{r.student_name}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#334155]">{r.student_number}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#2563EB]">{r.course_code}</td>
                  <td className="py-3.5 px-4 text-[#64748B]">{r.recorded_at}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === "present"
                          ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                          : r.status === "absent"
                          ? "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]"
                          : "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                      }`}
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Amending attendance status for: ${r.student_name}`)}
                      className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#334155]"
                    >
                      Amend
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-[#94A3B8]">
                  {loading ? "Reading attendance database..." : "No attendance logs found in database."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

