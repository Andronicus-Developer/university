"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Award,
  CheckCircle2,
  Building,
  FileText,
  HelpCircle,
} from "lucide-react";

export default function StudentScholarshipsPage() {
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScholarships() {
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
            .from("scholarships")
            .select("*")
            .eq("student_id", stuId);

          setScholarships(list || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadScholarships();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading scholarships & sponsorships...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Scholarships & Sponsorships</h1>
          <p className="text-xs text-slate-500">Academic bursaries, institutional endowments and corporate sponsorships</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scholarships.map((sch) => (
          <div key={sch.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px] uppercase flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Merit Award
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    Active
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">{sch.name}</h2>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Award className="h-6 w-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Sponsor:</span>
                <span className="font-semibold text-slate-800">{sch.sponsor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coverage Type:</span>
                <span className="font-semibold text-slate-800 capitalize">{sch.coverage_type?.replace("_", " ")}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-700">Grant Value:</span>
                <span className="text-lg font-black text-emerald-600">
                  GHS {Number(sch.max_amount || 500).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Applied directly to First Semester tuition invoices</span>
            </div>
          </div>
        ))}

        {scholarships.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 col-span-2 text-xs text-slate-400">
            No scholarships currently recorded on file.
          </div>
        )}
      </div>
    </div>
  );
}

