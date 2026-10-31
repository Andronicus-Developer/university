"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  GraduationCap,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function StudentEnrolmentsPage() {
  const [enrolments, setEnrolments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEnrolments = async () => {
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
        const { data: list } = await db
          .from("course_enrolments")
          .select(`
            id,
            enrolment_status,
            registered_at,
            course_offering:course_offering_id(
              id,
              section,
              delivery_mode,
              course:course_id(id, code, name, credits, contact_hours, description),
              term:term_id(name),
              academic_year:academic_year_id(code)
            )
          `)
          .eq("student_id", stuId);

        setEnrolments(list || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnrolments();
  }, []);

  const handleDrop = async (enrolmentId: string, courseCode: string) => {
    if (!confirm(`Are you sure you want to drop ${courseCode}? It will be ready for enrollment immediately.`)) return;
    try {
      const res = await fetch("/api/student/courses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrolmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to drop course");
      alert(`${courseCode} dropped successfully! It is now available for registration.`);
      await loadEnrolments();
    } catch (err: any) {
      alert("Failed to drop: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading enrolled courses...</p>
      </div>
    );
  }

  const totalCredits = enrolments.reduce((sum, e) => sum + (e.course_offering?.course?.credits || 3), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Registered Course Enrolments</h1>
          <p className="text-xs text-slate-500">Official active course units for Academic Year 2026/2027</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
            {enrolments.length} Courses • {totalCredits} Credits
          </span>
          <Link
            href="/student/registration"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
          >
            Add Courses
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {enrolments.map((enr) => {
          const c = enr.course_offering?.course;
          const off = enr.course_offering;
          return (
            <div key={enr.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-blue-200 transition">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                      {c?.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] capitalize">
                      {enr.enrolment_status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{c?.name}</h2>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100 text-center shrink-0">
                  <span className="text-sm font-black text-slate-800">{c?.credits || 3}</span>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Credits</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 line-clamp-2">
                {c?.description || "Procedural and object-oriented programming with TypeScript and Python."}
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] block">Schedule & Section:</span>
                  <span className="font-semibold text-slate-700">Section {off?.section || "A"} • {off?.delivery_mode || "In-person"}</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/student/assessments`}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg transition"
                  >
                    Assessments
                  </Link>
                  <Link
                    href={`/student/timetable`}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition"
                  >
                    Timetable
                  </Link>
                  <button
                    onClick={() => handleDrop(enr.id, c?.code || "Course")}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition"
                    title="Drop course"
                  >
                    Drop
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

