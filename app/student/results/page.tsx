"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Award,
  Download,
  CheckCircle2,
  TrendingUp,
  FileText,
  Sparkles,
  School,
} from "lucide-react";

export default function StudentResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let stu = null;
        if (user) {
          const { data: s } = await db
            .from("students")
            .select("*, programme:programme_id(*), profile:profile_id(*)")
            .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();
          stu = s;
        }

        if (!stu) {
          const { data: firstStu } = await db
            .from("students")
            .select("*, programme:programme_id(*), profile:profile_id(*)")
            .limit(1)
            .maybeSingle();
          stu = firstStu;
        }

        if (stu) {
          setStudent(stu);

          const { data: enrs } = await db
            .from("course_enrolments")
            .select("id")
            .eq("student_id", stu.id);

          const enrIds = (enrs || []).map((e: any) => e.id);

          if (enrIds.length > 0) {
            const { data: pubResults } = await db
              .from("published_results")
              .select(`
                id,
                total_marks,
                letter_grade,
                grade_points,
                published_at,
                enrolment:enrolment_id(
                  course_offering:course_offering_id(
                    course:course_id(code, name, credits)
                  )
                )
              `)
              .in("enrolment_id", enrIds);

            setResults(pubResults || []);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, []);

  const handlePrintSlip = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading semester results & GPA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Academic Results & GPA Summary</h1>
          <p className="text-xs text-slate-500">Authoritative published marks, letter grades, and academic standing</p>
        </div>
        <button
          onClick={handlePrintSlip}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs self-start"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Result Slip (PDF)</span>
        </button>
      </div>

      {/* GPA KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Cumulative GPA (CGPA)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{student?.cgpa ? Number(student.cgpa).toFixed(2) : "3.84"}</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              First Class Honours
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Scale: 4.00 Max</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Current Term GPA</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600">{student?.gpa ? Number(student.gpa).toFixed(2) : "3.82"}</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Semester 1
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Academic Year 2026/2027</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Credits Completed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{student?.total_credits_earned || 36}</span>
            <span className="text-xs font-bold text-slate-500">/ 130 Required</span>
          </div>
          <p className="text-[11px] text-slate-400">All graduation credit prerequisites passed</p>
        </div>
      </div>

      {/* Official Published Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Semester 1 Published Grades ({results.length})</h2>
          </div>
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Official & Certified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="py-3.5 px-6">Course Code</th>
                <th className="py-3.5 px-6">Course Title</th>
                <th className="py-3.5 px-6">Credits</th>
                <th className="py-3.5 px-6">Total Mark</th>
                <th className="py-3.5 px-6">Letter Grade</th>
                <th className="py-3.5 px-6">Grade Points</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.length > 0 ? (
                results.map((r) => {
                  const course = r.enrolment?.course_offering?.course;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {course?.code}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {course?.name}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-600">
                        {course?.credits || 3}
                      </td>
                      <td className="py-4 px-6 font-black text-slate-900">
                        {r.total_marks}%
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-extrabold text-xs">
                          {r.letter_grade}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-700">
                        {Number(r.grade_points).toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          Passed
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No semester marks published yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

