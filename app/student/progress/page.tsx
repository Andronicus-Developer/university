"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Milestone,
  Flag,
} from "lucide-react";

export default function StudentProgressPage() {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let stu = null;
        if (user) {
          const { data: s } = await db
            .from("students")
            .select("*, programme:programme_id(*)")
            .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();
          stu = s;
        }

        if (!stu) {
          const { data: firstStu } = await db
            .from("students")
            .select("*, programme:programme_id(*)")
            .limit(1)
            .maybeSingle();
          stu = firstStu;
        }

        setStudent(stu);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading academic progress & degree audit...</p>
      </div>
    );
  }

  const creditsEarned = student?.total_credits_earned || 36;
  const totalRequired = student?.programme?.credits_required || 130;
  const progressPct = Math.min(100, Math.round((creditsEarned / totalRequired) * 100));

  const milestones = [
    { level: "Level 100 (Freshman Year)", credits: "36 Credits", status: "completed", desc: "Core computing foundations & mathematics" },
    { level: "Level 200 (Sophomore Year)", credits: "34 Credits", status: "in_progress", desc: "Data structures, algorithms & database systems" },
    { level: "Level 300 (Junior Year)", credits: "32 Credits", status: "upcoming", desc: "Operating systems, networks & software engineering" },
    { level: "Level 400 (Senior Year)", credits: "28 Credits", status: "upcoming", desc: "Cap-stone software thesis & elective specializations" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Academic Progress & Degree Audit</h1>
        <p className="text-xs text-slate-500">Curriculum completion tracking and 4-year degree audit milestones</p>
      </div>

      {/* Overview Progress Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              {student?.programme?.name || "BSc Computer Science"}
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              {creditsEarned} of {totalRequired} Credits Completed ({progressPct}%)
            </h2>
            <p className="text-xs text-slate-500">
              Standing: <span className="font-semibold text-emerald-600">Good Academic Standing (First Class Division)</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-100 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> On Track for 2029 Graduation
            </span>
          </div>
        </div>

        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Milestones Progression */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Milestone className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Four-Year Curriculum Milestone Roadmap</h3>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {milestones.map((m, idx) => (
            <div key={m.level} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    m.status === "completed"
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : m.status === "in_progress"
                      ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-md"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {m.status === "completed" ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                </div>
                {idx < milestones.length - 1 && (
                  <div
                    className={`w-0.5 h-12 my-1 ${
                      m.status === "completed" ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>

              <div className="space-y-1 flex-1 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-slate-900">{m.level}</h4>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-center capitalize ${
                      m.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : m.status === "in_progress"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {m.status === "completed" ? "Completed (36 Cr)" : m.status === "in_progress" ? "Current Enrolment" : "Upcoming"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

