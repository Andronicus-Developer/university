"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  GraduationCap,
  BookOpen,
  Award,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  School,
  FileText,
} from "lucide-react";

export default function StudentProgrammePage() {
  const [programme, setProgramme] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgramme() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let stu = null;
        if (user) {
          const { data: s } = await db
            .from("students")
            .select("*, programme:programme_id(*, department:department_id(name))")
            .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();
          stu = s;
        }

        if (!stu) {
          const { data: firstStu } = await db
            .from("students")
            .select("*, programme:programme_id(*, department:department_id(name))")
            .limit(1)
            .maybeSingle();
          stu = firstStu;
        }

        if (stu) {
          setStudent(stu);
          setProgramme(stu.programme);

          // Load curriculum courses
          const { data: allCourses } = await db
            .from("courses")
            .select("*")
            .order("code", { ascending: true });

          setCourses(allCourses || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProgramme();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading academic programme & curriculum...</p>
      </div>
    );
  }

  const creditsEarned = student?.total_credits_earned || 36;
  const totalRequired = programme?.credits_required || 130;
  const progressPercent = Math.min(100, Math.round((creditsEarned / totalRequired) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Academic Programme Curriculum</h1>
        <p className="text-xs text-slate-500">Degree syllabus, graduation requirements and curriculum overview</p>
      </div>

      {/* Programme Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              {programme?.code || "CS-BS"} • 4-Year Undergraduate Degree
            </span>
            <h2 className="text-2xl font-black text-slate-900">{programme?.name || "BSc Computer Science"}</h2>
            <p className="text-xs text-slate-500">
              Department: <span className="font-semibold text-slate-700">{programme?.department?.name || "Department of Computer Science"}</span> • Faculty of Science
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-600 block">Graduation Requirement</span>
              <span className="text-lg font-black text-blue-900">{totalRequired} Credits</span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Credits Earned</span>
              <span className="text-lg font-black text-emerald-900">{creditsEarned} Credits</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-700">Curriculum Completion Progress</span>
            <span className="text-blue-600">{progressPercent}% Completed</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {totalRequired - creditsEarned} remaining credits required across Level 200, 300, and 400 courses.
          </p>
        </div>
      </div>

      {/* Curriculum Course Structure */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Approved Department Course Modules</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">{courses.length} Courses in Catalogue</span>
        </div>

        <div className="divide-y divide-slate-100">
          {courses.map((c) => (
            <div key={c.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                    {c.code}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{c.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                    {c.course_type || "Core"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl">{c.description || "Core foundational curriculum course."}</p>
              </div>

              <div className="flex items-center gap-4 text-xs shrink-0">
                <div className="text-right">
                  <span className="font-bold text-slate-800">{c.credits} Credits</span>
                  <span className="block text-[10px] text-slate-400">{c.contact_hours || 3} Contact Hrs/Wk</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

