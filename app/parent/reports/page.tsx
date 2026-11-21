"use client";

import React, { useState } from "react";
import { FileCheck2, Download, Award, Calendar, School, Hammer } from "lucide-react";

export default function ParentReportsPage() {
  const [selectedTerm, setSelectedTerm] = useState("Term 2 (2026/2027)");

  const terms = [
    { term: "Term 2 (2026/2027)", gpa: "3.88", rank: "3 of 45", avg: "86.4%", status: "Current Term", honors: "Principal's Honor Roll" },
    { term: "Term 1 (2026/2027)", gpa: "3.82", rank: "4 of 45", avg: "84.8%", status: "Completed", honors: "Dean's Commendation" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Terminal Report Cards
            </span>
            <span className="text-xs text-slate-400">Official Academic Records</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Academic & Trade Progress Reports</h1>
          <p className="text-xs text-slate-500">
            Review terminal grades, WAEC aggregates, and NVTI practical competencies.
          </p>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs">
          <Download className="h-4 w-4" />
          <span>Download All Transcripts (PDF)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {terms.map((t, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">{t.term}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                t.status === "Current Term" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}>
                {t.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">GPA</span>
                <span className="text-base font-black text-blue-700">{t.gpa}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Average</span>
                <span className="text-base font-black text-slate-800">{t.avg}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Rank</span>
                <span className="text-base font-black text-slate-800">{t.rank}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> {t.honors}
              </span>
              <button className="text-blue-600 font-bold hover:underline">View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
