"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  School,
  Hammer,
  GraduationCap,
  CalendarDays,
  Clock,
  CheckCircle2,
  FileCheck2,
  CreditCard,
  MessageSquare,
  Award,
  ShieldCheck,
  Briefcase,
  ChevronRight,
  Download,
  AlertCircle,
  FileText,
  Send,
  Check,
  X,
  Phone,
  Mail,
  Receipt,
  Sparkles,
} from "lucide-react";

export default function ParentDashboardPage() {
  const [wardType, setWardType] = useState<"high_school" | "vocational_school">("high_school");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [contactTeacherModalOpen, setContactTeacherModalOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [messageSuccess, setMessageSuccess] = useState(false);

  useEffect(() => {
    const handleSwitch = (e: any) => {
      if (e.detail?.wardType) {
        setWardType(e.detail.wardType);
      }
    };
    window.addEventListener("switch_parent_ward_view", handleSwitch);
    return () => window.removeEventListener("switch_parent_ward_view", handleSwitch);
  }, []);

  const handleToggleWard = (type: "high_school" | "vocational_school") => {
    setWardType(type);
    window.dispatchEvent(new CustomEvent("switch_parent_ward_view", { detail: { wardType: type } }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim()) return;
    setMessageSuccess(true);
    setTimeout(() => {
      setContactTeacherModalOpen(false);
      setMessageSuccess(false);
      setMessageBody("");
    }, 1500);
  };

  // High School Academic Grades dataset
  const hsGrades = [
    { subject: "Elective Physics", classWork: 14, midTerm: 14, exam: 64, total: 92, grade: "A1", remark: "Brilliant grasp of mechanics & optics" },
    { subject: "Elective Mathematics", classWork: 13, midTerm: 14, exam: 61, total: 88, grade: "A1", remark: "Strong algebraic and calculus ability" },
    { subject: "Chemistry", classWork: 13, midTerm: 12, exam: 58, total: 83, grade: "A1", remark: "High lab proficiency and clear reporting" },
    { subject: "Core Mathematics", classWork: 14, midTerm: 15, exam: 65, total: 94, grade: "A1", remark: "Top scorer in cohort" },
    { subject: "English Language", classWork: 12, midTerm: 11, exam: 55, total: 78, grade: "B2", remark: "Good essay composition; read widely" },
    { subject: "Integrated Science", classWork: 13, midTerm: 14, exam: 62, total: 89, grade: "A1", remark: "Excellent participation in practicals" },
    { subject: "Social Studies", classWork: 12, midTerm: 13, exam: 56, total: 81, grade: "A1", remark: "Insightful socio-economic analysis" },
  ];

  // Vocational Practical Competencies dataset
  const vocCompetencies = [
    { module: "Domestic Single-Phase Conduit Wiring", standard: "NVTI Standard II", status: "Mastered", score: "Distinction (94%)", instructor: "Master Boateng" },
    { module: "Solar PV Panel & Inverter Installation", standard: "NABPTEX / NVTI", status: "Certified", score: "Proficient (88%)", instructor: "Master Boateng" },
    { module: "Electrical Safety, Earthing & First Aid", standard: "OSHA / NVTI", status: "Certified", score: "100% Pass", instructor: "Safety Officer Kwarteng" },
    { module: "Conduit Bending & Trunking Fabrication", standard: "NVTI Standard II", status: "Mastered", score: "Distinction (91%)", instructor: "Master Appiah" },
    { module: "3-Phase Industrial Distribution Boards", standard: "NVTI Standard II", status: "In Progress", score: "72% In Training", instructor: "Master Boateng" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Welcome Card with Multi-Ward Toggle */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Parent & Guardian Oversight Dashboard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {wardType === "high_school"
                ? "Academic Progress: Kofi Mensah"
                : "Vocational & Trade Progress: Ama Serwaa"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {wardType === "high_school"
                ? "Form 2 Science A • Senior High School • Term 2 (2026/2027)"
                : "NVTI Level II Electrical & Solar Engineering • Vocational Institute"}
            </p>
          </div>

          {/* Quick Ward Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/15 backdrop-blur-md">
            <span className="text-[11px] font-bold text-slate-300 px-2 uppercase tracking-wider">
              Select Ward:
            </span>
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleToggleWard("high_school")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  wardType === "high_school"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <School className="h-3.5 w-3.5" />
                <span>Kofi (SHS)</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleWard("vocational_school")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  wardType === "vocational_school"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Hammer className="h-3.5 w-3.5" />
                <span>Ama (Vocational)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. HIGH SCHOOL WARD EXPERIENCE (KOFI MENSAH)                   */}
      {/* ============================================================== */}
      {wardType === "high_school" ? (
        <div className="space-y-6">
          {/* KPI Stat Cards: High School */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Academic Average & GPA */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Term Average & GPA
                </span>
                <div className="text-2xl font-black text-slate-900">86.4%</div>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Award className="h-3 w-3" /> GPA 3.88 • Rank 3 / 45
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>

            {/* Card 2: Attendance */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Live Attendance
                </span>
                <div className="text-2xl font-black text-slate-900">98.2%</div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  54 / 55 Days Present • 0 Absences
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>

            {/* Card 3: School Fees Balance */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Outstanding Balance
                </span>
                <div className="text-2xl font-black text-emerald-700">GH₵ 0.00</div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  All Term 2 Levies Settled
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>

            {/* Card 4: Form Master */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Homeroom Teacher
                </span>
                <div className="text-sm font-black text-slate-900 truncate max-w-[130px]">
                  Mr. K. Boateng
                </div>
                <button
                  type="button"
                  onClick={() => setContactTeacherModalOpen(true)}
                  className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="h-3 w-3" /> Send Inquiry
                </button>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <MessageSquare className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Gate Attendance & Check-in Live Alert */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-900">
                  Morning Roll Call Verified: Kofi Mensah entered Campus Gate at 07:42 AM today.
                </span>
                <p className="text-[11px] text-slate-500">
                  Present in all 4 scheduled periods (Physics, Elective Maths, ICT, Lab).
                </p>
              </div>
            </div>
            <Link
              href="/parent/attendance"
              className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View Attendance Log</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Two-Column Grid: Terminal Report Card + Fees & School Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Terminal Academic Report Card Preview */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Official Terminal Report Card (Term 2)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Class Work (15%) • Mid-Term (15%) • Final Exam (70%) • WAEC / WASSCE Standards
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Official PDF</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold text-[11px]">
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-2 text-center">Classwork</th>
                      <th className="py-2.5 px-2 text-center">Mid-Term</th>
                      <th className="py-2.5 px-2 text-center">Exam</th>
                      <th className="py-2.5 px-2 text-center">Total</th>
                      <th className="py-2.5 px-2 text-center">Grade</th>
                      <th className="py-2.5 px-3">Teacher Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hsGrades.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{g.subject}</td>
                        <td className="py-3 px-2 text-center text-slate-700">{g.classWork}</td>
                        <td className="py-3 px-2 text-center text-slate-700">{g.midTerm}</td>
                        <td className="py-3 px-2 text-center text-slate-700">{g.exam}</td>
                        <td className="py-3 px-2 text-center font-black text-indigo-700">
                          {g.total}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                            g.grade === "A1" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {g.grade}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">{g.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Form Master General Conduct: Exemplary leadership and discipline.</span>
                <Link
                  href="/parent/reports"
                  className="font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <span>View Historical Terms</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right 4 Cols: Fee Receipts & School Calendar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Fee Ledger Summary */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Term Fees & Receipts
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Cleared
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Tuition (Free SHS Subsidy)</span>
                    <span className="font-bold text-slate-800">GH₵ 0.00 (Govt Covered)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">PTA Development Levy</span>
                    <span className="font-bold text-emerald-600">GH₵ 150.00 (Paid)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Science Lab & Chemicals Fee</span>
                    <span className="font-bold text-emerald-600">GH₵ 200.00 (Paid)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReceiptModalOpen(true)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Official Receipt #REC-8842</span>
                  </button>
                </div>
              </div>

              {/* School Calendar & Next Visiting Day */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      School Calendar & Visiting
                    </h3>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950">Next Visiting Day</span>
                      <span className="font-extrabold text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                        Saturday
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-800">
                      14th December 2026 • 10:00 AM - 04:30 PM (Assembly Grounds)
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="font-bold text-slate-900">Term 2 Examinations</div>
                    <p className="text-[11px] text-slate-500">
                      Begins Monday, 18th January 2027
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* 2. VOCATIONAL WARD EXPERIENCE (AMA SERWAA)                     */
        /* ============================================================== */
        <div className="space-y-6">
          {/* KPI Stat Cards: Vocational */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Practical Competencies */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Trade Competency Mastery
                </span>
                <div className="text-2xl font-black text-slate-900">8 / 10 Modules</div>
                <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                  <Award className="h-3 w-3" /> NVTI Level II Certified (80%)
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Award className="h-6 w-6" />
              </div>
            </div>

            {/* Card 2: Workshop Safety Record */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Safety Compliance
                </span>
                <div className="text-2xl font-black text-emerald-700">100% Certified</div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  PPE Verified • 0 Safety Infractions
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            {/* Card 3: Dual Apprenticeship Placement */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Industrial Placement
                </span>
                <div className="text-sm font-black text-slate-900 truncate max-w-[140px]">
                  Ashanti Solar Ltd.
                </div>
                <span className="text-[11px] text-blue-600 font-semibold">
                  160 Hours Logged (4.9 / 5.0)
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>

            {/* Card 4: Toolkit & Materials Levy */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Toolkit Status
                </span>
                <div className="text-2xl font-black text-emerald-700">Issued</div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  Levy Cleared (GH₵ 0.00 Due)
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Hammer className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Practical Apprenticeship Highlights Banner */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-950">
                  NVTI National Trade Testing Registration Confirmed
                </span>
                <p className="text-[11px] text-slate-600">
                  Ama Serwaa is cleared for the Level II Practical Examination in Domestic & Solar Installation.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setContactTeacherModalOpen(true)}
              className="text-xs font-bold text-amber-900 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Message Workshop Lead</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Two-Column Grid: Competency Mastery Matrix + Apprenticeship Log & Tool Inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Practical Trade Competency Sign-Offs */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Trade Skill Mastery & Practical Milestone Rubric
                  </h3>
                  <p className="text-xs text-slate-500">
                    Electrical Engineering Technology • Certified under NVTI & CTVET Framework
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Skill Transcript</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold text-[11px]">
                      <th className="py-2.5 px-3">Practical Skill Module</th>
                      <th className="py-2.5 px-2">Accreditation</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                      <th className="py-2.5 px-2 text-center">Mastery Score</th>
                      <th className="py-2.5 px-3 text-right">Lead Inspector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vocCompetencies.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{comp.module}</td>
                        <td className="py-3 px-2 font-mono text-[10px] text-slate-500">{comp.standard}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            comp.status === "Mastered" ? "bg-emerald-100 text-emerald-800" :
                            comp.status === "Certified" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {comp.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-black text-slate-800">
                          {comp.score}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 font-medium">
                          {comp.instructor}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Progress: 8 of 10 Modules fully certified for graduation.</span>
                <Link
                  href="/parent/reports"
                  className="font-bold text-amber-800 hover:underline flex items-center gap-1"
                >
                  <span>View NVTI Syllabus Specifications</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right 4 Cols: Industry Apprenticeship Attachment Log & Tool Kit */}
            <div className="lg:col-span-4 space-y-6">
              {/* Dual Apprenticeship Placement */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Industrial Attachment
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    Active
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-900">Ashanti Solar Tech Ltd.</div>
                  <div className="text-[11px] text-slate-600">
                    Host Supervisor: Eng. Samuel Appiah
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-500">Hours Completed:</span>
                    <span className="font-bold text-blue-700">160 / 200 Hours</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Supervisor Rating:</span>
                    <span className="font-black text-amber-700">★ 4.9 / 5.0</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setContactTeacherModalOpen(true)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Inquire with Attachment Lead</span>
                  </button>
                </div>
              </div>

              {/* Tool Kit & Safety PPE Status */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Hammer className="h-4 w-4 text-amber-700" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Personal Toolkit & PPE
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Verified
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Insulated Multimeter (CAT III)</span>
                    <span className="font-bold text-emerald-600">Issued</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Steel-Toe Safety Boots & Helmet</span>
                    <span className="font-bold text-emerald-600">Inspected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Conduit Bending Spring & Pliers</span>
                    <span className="font-bold text-emerald-600">Issued</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* OFFICIAL REPORT CARD MODAL                                     */}
      {/* ============================================================== */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  {wardType === "high_school"
                    ? "Official Terminal Academic Report Card"
                    : "Official NVTI Trade Competency Transcript"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">
                  {wardType === "high_school" ? "Kofi Mensah" : "Ama Serwaa"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ID / Roll No:</span>
                <span className="font-mono font-bold text-slate-800">
                  {wardType === "high_school" ? "SHS-2026-0842" : "VOC-2026-0199"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Overall Assessment:</span>
                <span className="font-bold text-emerald-700">
                  {wardType === "high_school" ? "Distinction (Aggregate 06 • GPA 3.88)" : "NVTI Level II Distinction (88%)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Official Stamp:</span>
                <span className="font-mono text-emerald-700 font-bold">DIGITALLY CERTIFIED & VERIFIED</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>Save PDF File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FEE RECEIPT MODAL                                              */}
      {/* ============================================================== */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">Official Fee Receipt #REC-8842</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Reference:</span>
                <span className="font-mono font-bold text-slate-800">MNT-MOMO-20261102-8842</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payer Name:</span>
                <span className="font-bold text-slate-900">Mr. Kwame Mensah</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Paid:</span>
                <span className="font-black text-emerald-700 text-sm">GH₵ 350.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Balance:</span>
                <span className="font-bold text-emerald-700">GH₵ 0.00 (Cleared)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>Print / Download Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CONTACT TEACHER / WORKSHOP LEAD MODAL                          */}
      {/* ============================================================== */}
      {contactTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">
                  {wardType === "high_school"
                    ? "Inquiry with Form Master (Mr. Boateng)"
                    : "Message Workshop Lead (Master Boateng)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setContactTeacherModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {messageSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Message Delivered!</h4>
                <p className="text-xs text-slate-500">
                  The faculty member will receive this directly in their portal.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Inquiry Topic:
                  </label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500">
                    <option>Academic Performance & Study Materials</option>
                    <option>Attendance Excuse / Medical Notice</option>
                    <option>Practical Toolkit & Safety Gear</option>
                    <option>Parent-Teacher Conference (PTA) Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Message:
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type your message or inquiry..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setContactTeacherModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Message</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
