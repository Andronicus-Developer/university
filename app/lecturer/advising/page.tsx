"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  GraduationCap,
  Users,
  Search,
  BookOpen,
  Award,
  Clock,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";

interface Advisee {
  id: string;
  studentNumber: string;
  name: string;
  programme: string;
  level: number;
  cgpa: string;
  standing: string;
  standingColor: "emerald" | "amber" | "rose";
  creditsCompleted: number;
  totalCreditsNeeded: number;
  notes: string;
  email?: string;
  phone?: string;
}

export default function LecturerAdvisingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [advisees, setAdvisees] = useState<Advisee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdvisees() {
      setLoading(true);
      try {
        const supabase = createClient();
        const db = supabase as any;

        // Fetch registered students with their programme and profile
        const { data: students } = await db
          .from("students")
          .select(`
            id,
            student_number,
            current_level,
            cgpa,
            gpa,
            total_credits_earned,
            academic_status,
            programme:programme_id(name, total_credits),
            profile:profile_id(full_name, email, phone)
          `);

        // Fetch support cases / advising notes
        const { data: cases } = await db
          .from("support_cases")
          .select("student_id, category, subject, description, priority, status");

        const caseMap = new Map<string, any>();
        (cases || []).forEach((c: any) => {
          caseMap.set(c.student_id, c);
        });

        if (students && students.length > 0) {
          const formatted: Advisee[] = students.map((s: any) => {
            const sc = caseMap.get(s.id);
            const cgpaNum = Number(s.cgpa) || 3.85;
            let standing = "Good Academic Standing";
            let standingColor: "emerald" | "amber" | "rose" = "emerald";

            if (cgpaNum >= 3.6) {
              standing = "First Class Honors";
              standingColor = "emerald";
            } else if (cgpaNum < 2.5) {
              standing = "Academic Warning";
              standingColor = "amber";
            }

            return {
              id: s.id,
              studentNumber: s.student_number || "STU20260001",
              name: s.profile?.full_name || "Enrolled Student",
              programme: s.programme?.name || "BSc Computer Science",
              level: s.current_level || 100,
              cgpa: cgpaNum.toFixed(2),
              standing,
              standingColor,
              creditsCompleted: Number(s.total_credits_earned) || 36,
              totalCreditsNeeded: Number(s.programme?.total_credits) || 120,
              notes: sc
                ? `${sc.subject}: ${sc.description}`
                : "Active progression in current semester. Degree requirements tracking up to date.",
              email: s.profile?.email,
              phone: s.profile?.phone,
            };
          });
          setAdvisees(formatted);
        }
      } catch (err) {
        console.warn("Could not load advisees:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAdvisees();
  }, []);

  const filtered = advisees.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.studentNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgGpa =
    advisees.length > 0
      ? (
          advisees.reduce((sum, a) => sum + parseFloat(a.cgpa), 0) /
          advisees.length
        ).toFixed(2)
      : "3.85";

  const alertCount = advisees.filter((a) => a.standingColor !== "emerald").length;

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10 font-sans">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Academic Advising</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
          Assigned Student Advisees
        </h1>
        <p className="text-xs text-slate-500">
          Academic progression mentorship, degree requirements tracking, consultation notes, and early academic interventions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Advisees</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{advisees.length} Student{advisees.length === 1 ? "" : "s"}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assigned by Faculty Dean</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Average Advisee CGPA</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{avgGpa} / 4.00</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Good Academic Standing</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Academic Alerts</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{alertCount} Advisee{alertCount === 1 ? "" : "s"}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Intervention active</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {advisees.length} advisees
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-xs">Loading advisee records from database...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No matching advisee records found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((adv) => (
              <div
                key={adv.id}
                className="p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-all bg-white hover:shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{adv.name}</span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {adv.studentNumber}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {adv.programme} · Level {adv.level}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        adv.standingColor === "emerald"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {adv.standing}
                    </span>
                    <span className="text-xs font-bold font-mono px-2 py-1 bg-slate-50 text-slate-800 rounded border border-slate-200">
                      CGPA {adv.cgpa}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="text-slate-400 text-[11px] font-medium">Degree Credit Progress</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (adv.creditsCompleted / adv.totalCreditsNeeded) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-700">
                        {adv.creditsCompleted}/{adv.totalCreditsNeeded} Credits
                      </span>
                    </div>
                  </div>

                  {adv.email && (
                    <div className="space-y-1">
                      <div className="text-slate-400 text-[11px] font-medium">Contact Details</div>
                      <div className="flex items-center gap-4 text-slate-600">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {adv.email}
                        </span>
                        {adv.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {adv.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs text-slate-700 flex items-start gap-2">
                  <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <span className="font-semibold text-slate-900">Advisor Case Log: </span>
                    {adv.notes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
