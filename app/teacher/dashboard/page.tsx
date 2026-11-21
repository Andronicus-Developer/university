"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  School,
  Hammer,
  BookOpen,
  Wrench,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  FileCheck2,
  ClipboardCheck,
  ChevronRight,
  Plus,
  Send,
  Eye,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  Briefcase,
  SlidersHorizontal,
  Flame,
  Award,
  Download,
  Sparkles,
} from "lucide-react";

interface HighSchoolStudent {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  attendanceToday: "present" | "absent" | "late";
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  conductRemark: string;
  parentName: string;
  parentPhone: string;
}

interface VocationalTrainee {
  id: string;
  name: string;
  traineeId: string;
  trade: string;
  level: string;
  safetyCertified: boolean;
  competencyCount: number;
  totalCompetencies: number;
  currentStation: string;
  industryPlacement: string;
  supervisorRating: number;
  guardianName: string;
}

export default function TeacherDashboardPage() {
  const [schoolType, setSchoolType] = useState<"high_school" | "vocational_school">("high_school");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageSentSuccess, setMessageSentSuccess] = useState(false);

  // Sync with layout school type switch
  useEffect(() => {
    // Check initial tenant school type
    fetch("/api/settings/institution")
      .then((res) => res.json())
      .then((data) => {
        if (data?.school_type === "vocational_school" || data?.school_type === "high_school") {
          setSchoolType(data.school_type);
        }
      })
      .catch(() => {});

    const handleSwitch = (e: any) => {
      if (e.detail?.schoolType) {
        setSchoolType(e.detail.schoolType);
      }
    };
    window.addEventListener("switch_school_type_view", handleSwitch);
    return () => window.removeEventListener("switch_school_type_view", handleSwitch);
  }, []);

  const handleSwitchType = (type: "high_school" | "vocational_school") => {
    setSchoolType(type);
    window.dispatchEvent(new CustomEvent("switch_school_type_view", { detail: { schoolType: type } }));
  };

  // High School Students dataset
  const [students, setStudents] = useState<HighSchoolStudent[]>([
    {
      id: "hs-1",
      name: "Kofi Mensah",
      rollNumber: "SHS-2026-0842",
      class: "Form 2 Science A",
      attendanceToday: "present",
      caScore: 28, // /30
      examScore: 64, // /70
      totalScore: 92,
      grade: "A1",
      conductRemark: "Exceptional grasp of Advanced Mechanics & Calculus. Active class leader.",
      parentName: "Mr. Kwame Mensah",
      parentPhone: "+233 24 411 9821",
    },
    {
      id: "hs-2",
      name: "Ama Serwaa Boateng",
      rollNumber: "SHS-2026-0845",
      class: "Form 2 Science A",
      attendanceToday: "present",
      caScore: 26,
      examScore: 59,
      totalScore: 85,
      grade: "A1",
      conductRemark: "Very disciplined student; excellent lab notebook write-ups.",
      parentName: "Mrs. Grace Boateng",
      parentPhone: "+233 20 892 3410",
    },
    {
      id: "hs-3",
      name: "Kwabena Osei-Tutu",
      rollNumber: "SHS-2026-0850",
      class: "Form 2 Science A",
      attendanceToday: "late",
      caScore: 22,
      examScore: 52,
      totalScore: 74,
      grade: "B2",
      conductRemark: "Arrived 15 mins late due to transport; commendable participation in group work.",
      parentName: "Dr. Emmanuel Osei",
      parentPhone: "+233 27 554 1120",
    },
    {
      id: "hs-4",
      name: "Akosua Mansah Addo",
      rollNumber: "SHS-2026-0856",
      class: "Form 2 Science A",
      attendanceToday: "present",
      caScore: 25,
      examScore: 54,
      totalScore: 79,
      grade: "B2",
      conductRemark: "Consistent scores; needs slight assistance in Chemical Bonding equations.",
      parentName: "Mrs. Victoria Addo",
      parentPhone: "+233 55 330 9981",
    },
    {
      id: "hs-5",
      name: "Yaw Frimpong",
      rollNumber: "SHS-2026-0862",
      class: "Form 2 Science A",
      attendanceToday: "absent",
      caScore: 19,
      examScore: 45,
      totalScore: 64,
      grade: "C4",
      conductRemark: "Reported fever via parent notice; missed physics lab experiment.",
      parentName: "Mr. Kwaku Frimpong",
      parentPhone: "+233 24 670 1234",
    },
  ]);

  // Vocational Trainees dataset
  const [trainees, setTrainees] = useState<VocationalTrainee[]>([
    {
      id: "voc-1",
      name: "Ama Serwaa",
      traineeId: "VOC-2026-0199",
      trade: "Electrical & Solar Tech",
      level: "NVTI Level II",
      safetyCertified: true,
      competencyCount: 8,
      totalCompetencies: 10,
      currentStation: "Station 2: Domestic & Industrial Conduit Wiring",
      industryPlacement: "Ashanti Solar Tech Ltd.",
      supervisorRating: 4.9,
      guardianName: "Mrs. Serwaa Mensah",
    },
    {
      id: "voc-2",
      name: "Kwame Kwarteng",
      traineeId: "VOC-2026-0204",
      trade: "Automotive Diagnostics",
      level: "NVTI Level II",
      safetyCertified: true,
      competencyCount: 7,
      totalCompetencies: 10,
      currentStation: "Station 1: Engine Overhaul & EFI Scanning",
      industryPlacement: "Suame Auto Engineering",
      supervisorRating: 4.7,
      guardianName: "Mr. Kofi Kwarteng",
    },
    {
      id: "voc-3",
      name: "Ebenezer Appiah",
      traineeId: "VOC-2026-0211",
      trade: "Welding & Fabrication",
      level: "NVTI Level I",
      safetyCertified: true,
      competencyCount: 6,
      totalCompetencies: 8,
      currentStation: "Station 3: Gas Metal Arc Welding (GMAW)",
      industryPlacement: "Volta Steel Fabricators",
      supervisorRating: 4.5,
      guardianName: "Madam Faustina Appiah",
    },
    {
      id: "voc-4",
      name: "Priscilla Baah",
      traineeId: "VOC-2026-0218",
      trade: "Electrical & Solar Tech",
      level: "NVTI Level II",
      safetyCertified: true,
      competencyCount: 9,
      totalCompetencies: 10,
      currentStation: "Station 2: Solar Inverter Synchronization",
      industryPlacement: "SunPower Solutions",
      supervisorRating: 5.0,
      guardianName: "Elder Samuel Baah",
    },
  ]);

  // Quick Attendance Taker state
  const handleToggleAttendance = (id: string, status: "present" | "absent" | "late") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, attendanceToday: status } : s))
    );
  };

  const handleOpenSendMessage = (studentName: string) => {
    setSelectedStudentForMessage(studentName);
    setMessageText("");
    setMessageSentSuccess(false);
    setMessageModalOpen(true);
  };

  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setMessageSentSuccess(true);
    setTimeout(() => {
      setMessageModalOpen(false);
      setMessageSentSuccess(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner: Mode Switcher & Greeting */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {schoolType === "vocational_school"
                  ? "Vocational & Technical Training Instructor Portal"
                  : "Senior High School Master Teacher Portal"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {schoolType === "vocational_school"
                ? "Workshop Instruction & Apprentice Mastery"
                : "Welcome back, Mr. Boateng"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {schoolType === "vocational_school"
                ? "Oversee practical workshops, NVTI competency sign-offs, and industrial attachments."
                : "Manage class periods, continuous assessment marks, daily roll call, and parent notices."}
            </p>
          </div>

          {/* Interactive School Type Pill Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/15 backdrop-blur-md">
            <span className="text-[11px] font-bold text-slate-300 px-2 uppercase tracking-wider">
              Preview Mode:
            </span>
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleSwitchType("high_school")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  schoolType === "high_school"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <School className="h-3.5 w-3.5" />
                <span>High School</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchType("vocational_school")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  schoolType === "vocational_school"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Vocational</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. HIGH SCHOOL TEACHER VIEW                                   */}
      {/* ============================================================== */}
      {schoolType === "high_school" ? (
        <div className="space-y-6">
          {/* KPI Cards: High School */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Today's Classes */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Today's Periods
                </span>
                <div className="text-2xl font-black text-slate-900">4 Classes</div>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Period 3 In Session
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>

            {/* Card 2: Homeroom Attendance */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Form 2 Attendance
                </span>
                <div className="text-2xl font-black text-slate-900">97.6%</div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  41 of 42 Students Present
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Users className="h-6 w-6" />
              </div>
            </div>

            {/* Card 3: Pending CA Grading */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pending CA Scripts
                </span>
                <div className="text-2xl font-black text-slate-900">18 Scripts</div>
                <span className="text-[11px] text-amber-600 font-semibold">
                  Mid-Term Test 2 Due Fri
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ClipboardCheck className="h-6 w-6" />
              </div>
            </div>

            {/* Card 4: Parent Inquiries */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Parent Inquiries
                </span>
                <div className="text-2xl font-black text-slate-900">3 Unread</div>
                <span className="text-[11px] text-indigo-600 font-semibold">
                  2 Medical • 1 Academic
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <MessageSquare className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Current Period in Session & Quick Roll Call Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900">
                    Live Period 3 (10:45 AM - 11:45 AM)
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">
                    Science Lab Block B • Room 14
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 mt-0.5">
                  Form 2 Science A — Elective Physics: Newton's Laws & Mechanics
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Take Live Roll Call</span>
              </button>
              <Link
                href="/teacher/gradebook"
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Enter Lab Marks
              </Link>
            </div>
          </div>

          {/* Two-Column Grid: Gradebook CA Table + Homeroom Conduct / WAEC Syllabus */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Continuous Assessment & Gradebook */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Continuous Assessment (CA) & Terminal Marks
                  </h3>
                  <p className="text-xs text-slate-500">
                    Form 2 Science A • Weight: Class Work 30% • Final Exam 70%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Grade Scheme:</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                    WAEC / WASSCE Standards
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold text-[11px]">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-2">ID</th>
                      <th className="py-2.5 px-2 text-center">CA (30)</th>
                      <th className="py-2.5 px-2 text-center">Exam (70)</th>
                      <th className="py-2.5 px-2 text-center">Total (100)</th>
                      <th className="py-2.5 px-2 text-center">Grade</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{student.name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {student.conductRemark}
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono text-[11px] text-slate-600">
                          {student.rollNumber}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">
                          {student.caScore}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">
                          {student.examScore}
                        </td>
                        <td className="py-3 px-2 text-center font-black text-indigo-700">
                          {student.totalScore}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                              student.grade === "A1"
                                ? "bg-emerald-100 text-emerald-800"
                                : student.grade === "B2"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {student.grade}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenSendMessage(student.name)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            Note to Parent
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Displaying 5 of 42 students in Form 2 Science A</span>
                <Link
                  href="/teacher/gradebook"
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>Open Full Gradebook</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right 4 Cols: Homeroom Conduct & WAEC Syllabus Tracker */}
            <div className="lg:col-span-4 space-y-6">
              {/* Daily Homeroom Roll Call Widget */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Today's Attendance Status
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Period 1-4
                  </span>
                </div>

                <div className="space-y-2">
                  {students.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <span className="font-bold text-slate-800 truncate">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(s.id, "present")}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            s.attendanceToday === "present"
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600 hover:bg-emerald-100"
                          }`}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(s.id, "late")}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            s.attendanceToday === "late"
                              ? "bg-amber-500 text-white"
                              : "bg-slate-200 text-slate-600 hover:bg-amber-100"
                          }`}
                        >
                          L
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(s.id, "absent")}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            s.attendanceToday === "absent"
                              ? "bg-rose-600 text-white"
                              : "bg-slate-200 text-slate-600 hover:bg-rose-100"
                          }`}
                        >
                          A
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href="/teacher/attendance"
                  className="block text-center py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Manage Monthly Roll Call Log
                </Link>
              </div>

              {/* WAEC WASSCE Syllabus Progress */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Term 2 Syllabus Completion
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    WAEC Track
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">Elective Physics</span>
                      <span className="font-extrabold text-blue-600">82%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: "82%" }} />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Module 7: Electromagnetic Induction in progress
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">Elective Mathematics</span>
                      <span className="font-extrabold text-emerald-600">75%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: "75%" }} />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Module 5: Differential Calculus & Applications
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">Integrated Science (Core)</span>
                      <span className="font-extrabold text-indigo-600">90%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: "90%" }} />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Module 9: Genetics & Heredity revision
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* 2. VOCATIONAL SCHOOL INSTRUCTOR VIEW                           */
        /* ============================================================== */
        <div className="space-y-6">
          {/* KPI Cards: Vocational */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Active Workshop Stations */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Stations
                </span>
                <div className="text-2xl font-black text-slate-900">3 Workshops</div>
                <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                  <Flame className="h-3 w-3" /> Electrical & Welding Labs
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Wrench className="h-6 w-6" />
              </div>
            </div>

            {/* Card 2: Trainees Enrolled */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Apprentice Cohort
                </span>
                <div className="text-2xl font-black text-slate-900">34 Trainees</div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  NVTI Level I & II Registered
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Users className="h-6 w-6" />
              </div>
            </div>

            {/* Card 3: Competencies Certified */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pending Sign-Offs
                </span>
                <div className="text-2xl font-black text-slate-900">14 Tasks</div>
                <span className="text-[11px] text-orange-600 font-semibold">
                  Conduit & Motor Rewinding
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <Award className="h-6 w-6" />
              </div>
            </div>

            {/* Card 4: PPE & Safety Status */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Safety Compliance
                </span>
                <div className="text-2xl font-black text-slate-900">100% Verified</div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  0 Workshop Incidents
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Active Practical Workshop Station Banner */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
                <Hammer className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-900">
                    Active Station 2 • Practical Lab
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">
                    Electrical Bay 4 • High Voltage Testing Area
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 mt-0.5">
                  Solar PV Array Grid-Tie Inverter Synchronization & Circuit Protection
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/teacher/workshops"
                className="px-4 py-2 rounded-xl bg-amber-600 text-slate-950 font-black text-xs hover:bg-amber-500 shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <ClipboardCheck className="h-4 w-4" />
                <span>Sign Off Competencies</span>
              </Link>
            </div>
          </div>

          {/* Two-Column Grid: NVTI Competency Rubric + Apprenticeship Attachment Log */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: NVTI / NABPTEX Competency-Based Assessment Table */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    NVTI / NABPTEX Practical Trade Competency Sign-Offs
                  </h3>
                  <p className="text-xs text-slate-500">
                    Electrical & Automotive Engineering Trainee Mastery Records
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                    NVTI Standard II
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold text-[11px]">
                      <th className="py-2.5 px-3">Trainee / Apprentice</th>
                      <th className="py-2.5 px-2">Trade</th>
                      <th className="py-2.5 px-2">Assigned Station</th>
                      <th className="py-2.5 px-2 text-center">Competencies</th>
                      <th className="py-2.5 px-2 text-center">Safety / PPE</th>
                      <th className="py-2.5 px-3 text-right">Instructor Sign-Off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trainees.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{t.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {t.traineeId} • {t.level}
                          </div>
                        </td>
                        <td className="py-3 px-2 font-semibold text-slate-700">
                          {t.trade}
                        </td>
                        <td className="py-3 px-2 text-slate-600 max-w-[180px] truncate">
                          {t.currentStation}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="font-black text-slate-900">
                            {t.competencyCount} / {t.totalCompetencies}
                          </span>
                          <div className="w-16 mx-auto h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{
                                width: `${(t.competencyCount / t.totalCompetencies) * 100}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {t.safetyCertified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="h-3 w-3" /> Certified
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenSendMessage(t.name)}
                            className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                          >
                            Update Guardian
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Displaying 4 active workshop apprentices</span>
                <Link
                  href="/teacher/workshops"
                  className="font-bold text-amber-800 hover:underline flex items-center gap-1"
                >
                  <span>Open Workshop Stations & Tool Audit</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right 4 Cols: Industrial Apprenticeship & Workshop Equipment Checklist */}
            <div className="lg:col-span-4 space-y-6">
              {/* Dual Apprenticeship Field Tracker */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-amber-700" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Industrial Placement Log
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                    Dual System
                  </span>
                </div>

                <div className="space-y-2.5">
                  {trainees.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{t.name}</span>
                        <span className="font-mono text-[10px] text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded">
                          ★ {t.supervisorRating.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-slate-400" />
                        <span>{t.industryPlacement}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href="/teacher/workshops"
                  className="block text-center py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  View Attachment Logbook Signatures
                </Link>
              </div>

              {/* Machinery & Heavy Tool Checklist */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-slate-700" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Workshop Tool Readiness
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Inspected
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Digital Multimeters (CAT III)</span>
                    <span className="font-bold text-emerald-600">18 / 18 Checked</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">MIG / TIG Welding Torches</span>
                    <span className="font-bold text-emerald-600">8 / 8 Safe</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Engine Diagnostic Scanners</span>
                    <span className="font-bold text-emerald-600">4 / 4 Calibrated</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Emergency Eye Wash & Extinguishers</span>
                    <span className="font-bold text-emerald-600">Pass</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* QUICK ATTENDANCE MODAL (HIGH SCHOOL)                           */}
      {/* ============================================================== */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Quick Attendance Roll Call
                </h3>
                <p className="text-xs text-slate-500">
                  Form 2 Science A • Period 3 (Physics Lab)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{student.name}</div>
                    <div className="text-[10px] text-slate-500">{student.rollNumber}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(student.id, "present")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        student.attendanceToday === "present"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-200 text-slate-600 hover:bg-emerald-100"
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(student.id, "late")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        student.attendanceToday === "late"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-200 text-slate-600 hover:bg-amber-100"
                      }`}
                    >
                      Late
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(student.id, "absent")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        student.attendanceToday === "absent"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-slate-200 text-slate-600 hover:bg-rose-100"
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Marked {students.filter((s) => s.attendanceToday === "present").length} /{" "}
                {students.length} Present
              </span>
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                Save Roll Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SEND NOTE TO PARENT / GUARDIAN MODAL                          */}
      {/* ============================================================== */}
      {messageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Send Note to Parent / Guardian
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMessageModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {messageSentSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Notice Dispatched!</h4>
                <p className="text-xs text-slate-500">
                  Delivered via Parent Portal notification and SMS alert.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessageSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student / Ward:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedStudentForMessage || ""}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notice Category:
                  </label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500">
                    <option>Academic Performance & Commendation</option>
                    <option>Attendance / Punctuality Notice</option>
                    <option>Workshop Safety / PPE Readiness</option>
                    <option>Upcoming Parent-Teacher Conference (PTA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Message Body:
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your official remarks or inquiry for the parent/guardian..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMessageModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Notice</span>
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
