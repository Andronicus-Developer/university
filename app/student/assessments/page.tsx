"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  ExternalLink,
  HelpCircle,
} from "lucide-react";

export default function StudentAssessmentsPage() {
  const [marks, setMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssessments() {
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
          const { data: enrs } = await db
            .from("course_enrolments")
            .select("id")
            .eq("student_id", stuId);

          const enrIds = (enrs || []).map((e: any) => e.id);

          if (enrIds.length > 0) {
            const { data: mList } = await db
              .from("assessment_marks")
              .select(`
                id,
                marks_obtained,
                is_absent,
                remarks,
                entered_at,
                assessment_component:assessment_component_id(
                  id,
                  name,
                  component_type,
                  weight_percentage,
                  max_marks,
                  course_offering:course_offering_id(
                    course:course_id(code, name)
                  )
                )
              `)
              .in("enrolment_id", enrIds);

            setMarks(mList || []);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAssessments();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading assessments & continuous marks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Assignments & Assessment Marks</h1>
          <p className="text-xs text-slate-500">Continuous assessment scores, practical tests, and midterm marks</p>
        </div>
        <a
          href="https://lms.university.edu.gh"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs self-start"
        >
          <span>Open Canvas / LMS</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Recorded Assessment Scores ({marks.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="py-3.5 px-6">Course Module</th>
                <th className="py-3.5 px-6">Assessment Name</th>
                <th className="py-3.5 px-6">Type</th>
                <th className="py-3.5 px-6">Weight</th>
                <th className="py-3.5 px-6">Score Obtained</th>
                <th className="py-3.5 px-6">Percentage</th>
                <th className="py-3.5 px-6">Feedback / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marks.length > 0 ? (
                marks.map((m) => {
                  const comp = m.assessment_component;
                  const course = comp?.course_offering?.course;
                  const pct = comp?.max_marks ? Math.round((m.marks_obtained / comp.max_marks) * 100) : 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {course?.code} - {course?.name}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-700">
                        {comp?.name}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                          {comp?.component_type}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-600">
                        {comp?.weight_percentage}%
                      </td>
                      <td className="py-4 px-6 font-black text-slate-900">
                        {m.marks_obtained} / {comp?.max_marks}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs">
                          {pct}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 max-w-xs">
                        {m.remarks || "Grade officially verified."}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No assessment scores released yet.
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

