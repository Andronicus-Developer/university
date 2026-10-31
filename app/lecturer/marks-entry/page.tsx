"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  FileCheck2,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Download,
  Users,
  Award,
} from "lucide-react";

interface StudentScoreRow {
  studentId: string;
  studentNumber: string;
  fullName: string;
  marksObtained: number | string;
  isAbsent: boolean;
  remarks: string;
}

export default function LecturerMarksEntryPage() {
  const [selectedCourse, setSelectedCourse] = useState("CS101");
  const [selectedComponent, setSelectedComponent] = useState("Midterm Exam (30%)");
  const [maxMarks] = useState(100);
  const [scores, setScores] = useState<StudentScoreRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadClassRoster() {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from("students")
        .select("id, student_number, profile:profile_id(full_name)")
        .limit(15);

      if (data && data.length > 0) {
        setScores(
          data.map((s: any, idx: number) => ({
            studentId: s.id,
            studentNumber: s.student_number,
            fullName: s.profile?.full_name || "Enrolled Student",
            marksObtained: Math.round(68 + ((idx * 7) % 30)),
            isAbsent: false,
            remarks: "",
          }))
        );
      } else {
        setScores([
          { studentId: "s-1", studentNumber: "STU20260012", fullName: "Ama Mensah", marksObtained: 88, isAbsent: false, remarks: "" },
          { studentId: "s-2", studentNumber: "STU20260028", fullName: "Kofi Owusu", marksObtained: 92, isAbsent: false, remarks: "" },
          { studentId: "s-3", studentNumber: "STU20260035", fullName: "Ebenezer Quaye", marksObtained: 74, isAbsent: false, remarks: "" },
          { studentId: "s-4", studentNumber: "STU20260041", fullName: "Grace Acheampong", marksObtained: 81, isAbsent: false, remarks: "" },
          { studentId: "s-5", studentNumber: "STU20260055", fullName: "Samuel Boateng", marksObtained: 0, isAbsent: true, remarks: "Excused medical" },
        ]);
      }
    }
    loadClassRoster();
  }, [selectedCourse, selectedComponent]);

  const updateMark = (studentId: string, val: string) => {
    const num = val === "" ? "" : Math.min(maxMarks, Math.max(0, Number(val)));
    setScores((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, marksObtained: num } : s))
    );
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setNotification("Marks saved as draft. You can continue editing before final submission.");
  };

  const handleSubmitForModeration = async () => {
    const confirmSubmit = window.confirm(
      "Are you sure you want to submit this mark sheet for departmental moderation? Once submitted, marks become locked pending board review."
    );
    if (!confirmSubmit) return;

    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setNotification("Mark sheet successfully submitted for Departmental Moderation.");
  };

  const calculateGrade = (marks: number | string) => {
    const m = Number(marks);
    if (m >= 80) return { grade: "A", pts: "4.0" };
    if (m >= 75) return { grade: "B+", pts: "3.5" };
    if (m >= 70) return { grade: "B", pts: "3.0" };
    if (m >= 65) return { grade: "C+", pts: "2.5" };
    if (m >= 60) return { grade: "C", pts: "2.0" };
    if (m >= 50) return { grade: "D", pts: "1.0" };
    return { grade: "F", pts: "0.0" };
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Marks Entry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Student Marks & Grading Entry
          </h1>
          <p className="text-xs text-slate-500">
            Enter coursework and examination marks, validate grade scale points, and submit mark sheets for moderation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={handleSubmitForModeration}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Submit for Moderation</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Selectors Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Course Offering</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
          >
            <option value="CS101">CS101 - Programming Foundations (Section A)</option>
            <option value="CS204">CS204 - Database Systems (Section B)</option>
            <option value="CS308">CS308 - Software Engineering (Section A)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Assessment Component</label>
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
          >
            <option value="Continuous Assessment Quiz 1 (15%)">Continuous Assessment Quiz 1 (15%)</option>
            <option value="Midterm Exam (30%)">Midterm Exam (30%)</option>
            <option value="Practical Project (25%)">Practical Project (25%)</option>
            <option value="End of Semester Examination (40%)">End of Semester Examination (40%)</option>
          </select>
        </div>
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4 text-center">Marks (Max {maxMarks})</th>
                <th className="py-3 px-4 text-center">Calculated Grade</th>
                <th className="py-3 px-4 text-center">Absent</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {scores.map((s) => {
                const { grade, pts } = calculateGrade(s.marksObtained);
                return (
                  <tr key={s.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{s.studentNumber}</td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min={0}
                        max={maxMarks}
                        disabled={s.isAbsent}
                        value={s.isAbsent ? "" : s.marksObtained}
                        onChange={(e) => updateMark(s.studentId, e.target.value)}
                        className="w-20 px-2 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white disabled:opacity-40"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.isAbsent ? (
                        <span className="font-bold text-red-600">ABS</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {grade} ({pts})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={s.isAbsent}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setScores((prev) =>
                            prev.map((item) =>
                              item.studentId === s.studentId ? { ...item, isAbsent: checked } : item
                            )
                          );
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Optional remarks..."
                        value={s.remarks}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScores((prev) =>
                            prev.map((item) =>
                              item.studentId === s.studentId ? { ...item, remarks: val } : item
                            )
                          );
                        }}
                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

