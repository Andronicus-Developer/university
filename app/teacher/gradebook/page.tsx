"use client";

import React, { useState } from "react";
import { ClipboardCheck, Download, Award, Search, Check, Save } from "lucide-react";

export default function TeacherGradebookPage() {
  const [selectedSubject, setSelectedSubject] = useState("Elective Physics");
  const [saved, setSaved] = useState(false);

  const [marks, setMarks] = useState([
    { id: "1", name: "Kofi Mensah", roll: "SHS-2026-0842", classWork: 14, midTerm: 14, exam: 64, total: 92, grade: "A1" },
    { id: "2", name: "Ama Serwaa Boateng", roll: "SHS-2026-0845", classWork: 13, midTerm: 13, exam: 59, total: 85, grade: "A1" },
    { id: "3", name: "Kwabena Osei-Tutu", roll: "SHS-2026-0850", classWork: 11, midTerm: 11, exam: 52, total: 74, grade: "B2" },
    { id: "4", name: "Akosua Mansah Addo", roll: "SHS-2026-0856", classWork: 12, midTerm: 13, exam: 54, total: 79, grade: "B2" },
    { id: "5", name: "Yaw Frimpong", roll: "SHS-2026-0862", classWork: 9, midTerm: 10, exam: 45, total: 64, grade: "C4" },
  ]);

  const handleScoreChange = (id: string, field: "classWork" | "midTerm" | "exam", val: number) => {
    setMarks((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, [field]: Number(val) || 0 };
        const total = (updated.classWork || 0) + (updated.midTerm || 0) + (updated.exam || 0);
        let grade = "F9";
        if (total >= 80) grade = "A1";
        else if (total >= 75) grade = "B2";
        else if (total >= 70) grade = "B3";
        else if (total >= 65) grade = "C4";
        else if (total >= 60) grade = "C5";
        else if (total >= 55) grade = "C6";
        else if (total >= 50) grade = "D7";
        else if (total >= 45) grade = "E8";
        return { ...updated, total, grade };
      })
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Gradebook & Continuous Assessment
            </span>
            <span className="text-xs text-slate-400">Class Work 15% • Mid-Term 15% • Final Exam 70%</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Academic Marks Entry & Report Cards</h1>
          <p className="text-xs text-slate-500">
            Form 2 Science A • Computes WAEC / WASSCE terminal aggregates automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            <span>{saved ? "Marks Saved!" : "Save Marksheet"}</span>
          </button>
          <button className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            <span>Broadsheet</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold text-[11px]">
              <th className="py-3 px-3">Student Name</th>
              <th className="py-3 px-2">ID</th>
              <th className="py-3 px-2 text-center">Classwork (15)</th>
              <th className="py-3 px-2 text-center">Mid-Term (15)</th>
              <th className="py-3 px-2 text-center">Final Exam (70)</th>
              <th className="py-3 px-2 text-center">Total (100)</th>
              <th className="py-3 px-3 text-right">WASSCE Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {marks.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-900">{m.name}</td>
                <td className="py-3 px-2 font-mono text-slate-500">{m.roll}</td>
                <td className="py-3 px-2 text-center">
                  <input
                    type="number"
                    max={15}
                    min={0}
                    value={m.classWork}
                    onChange={(e) => handleScoreChange(m.id, "classWork", Number(e.target.value))}
                    className="w-16 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </td>
                <td className="py-3 px-2 text-center">
                  <input
                    type="number"
                    max={15}
                    min={0}
                    value={m.midTerm}
                    onChange={(e) => handleScoreChange(m.id, "midTerm", Number(e.target.value))}
                    className="w-16 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </td>
                <td className="py-3 px-2 text-center">
                  <input
                    type="number"
                    max={70}
                    min={0}
                    value={m.exam}
                    onChange={(e) => handleScoreChange(m.id, "exam", Number(e.target.value))}
                    className="w-16 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </td>
                <td className="py-3 px-2 text-center font-black text-indigo-700 text-sm">
                  {m.total}
                </td>
                <td className="py-3 px-3 text-right">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    m.grade === "A1" ? "bg-emerald-100 text-emerald-800" :
                    m.grade.startsWith("B") ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {m.grade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
