"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Filter,
  Search,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

export default function LecturerMarkSheetsPage() {
  const [selectedCourse, setSelectedCourse] = useState("CS101");

  const sampleRows = [
    { studentNumber: "STU20260012", name: "Ama Mensah", ca1: 14, mid: 27, prj: 18, final: 35, total: 94, grade: "A", gpa: "4.0" },
    { studentNumber: "STU20260028", name: "Kofi Owusu", ca1: 13, mid: 25, prj: 19, final: 34, total: 91, grade: "A", gpa: "4.0" },
    { studentNumber: "STU20260035", name: "Ebenezer Quaye", ca1: 11, mid: 21, prj: 16, final: 26, total: 74, grade: "B", gpa: "3.0" },
    { studentNumber: "STU20260041", name: "Grace Acheampong", ca1: 12, mid: 23, prj: 17, final: 29, total: 81, grade: "A", gpa: "4.0" },
    { studentNumber: "STU20260055", name: "Samuel Boateng", ca1: 10, mid: 18, prj: 14, final: 22, total: 64, grade: "C", gpa: "2.0" },
  ];

  const handleExportCSV = () => {
    let csv = "Student ID,Full Name,Quiz (15%),Midterm (30%),Project (20%),Final Exam (40%),Total (100%),Grade,Grade Point\n";
    sampleRows.forEach((r) => {
      csv += `"${r.studentNumber}","${r.name}",${r.ca1},${r.mid},${r.prj},${r.final},${r.total},"${r.grade}",${r.gpa}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mark_sheet_${selectedCourse}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <span className="text-slate-800 font-semibold">Mark Sheets</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Authoritative Course Mark Sheets
          </h1>
          <p className="text-xs text-slate-500">
            Consolidated course broadsheet, cumulative grade point calculations, and academic records reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Broadsheet CSV</span>
          </button>
        </div>
      </div>

      {/* Course Selection */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800">Course Broadsheet</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-700 focus:outline-none cursor-pointer mt-0.5"
            >
              <option value="CS101">CS101 - Programming Foundations (Section A)</option>
              <option value="CS204">CS204 - Database Systems (Section B)</option>
              <option value="CS308">CS308 - Software Engineering (Section A)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
            Status: Moderated & Approved
          </div>
        </div>
      </div>

      {/* Broadsheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-3 text-center">Quiz (15%)</th>
                <th className="py-3 px-3 text-center">Midterm (30%)</th>
                <th className="py-3 px-3 text-center">Project (20%)</th>
                <th className="py-3 px-3 text-center">Final (40%)</th>
                <th className="py-3 px-3 text-center">Total (100)</th>
                <th className="py-3 px-3 text-center">Grade</th>
                <th className="py-3 px-3 text-center">GP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sampleRows.map((r) => (
                <tr key={r.studentNumber} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">{r.studentNumber}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                  <td className="py-3 px-3 text-center font-mono">{r.ca1}</td>
                  <td className="py-3 px-3 text-center font-mono">{r.mid}</td>
                  <td className="py-3 px-3 text-center font-mono">{r.prj}</td>
                  <td className="py-3 px-3 text-center font-mono">{r.final}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900">{r.total}</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">{r.grade}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">{r.gpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

