"use client";

import React, { useState } from "react";
import { UserCheck, CheckCircle2, Clock, Calendar, Users, Filter, Search, Download } from "lucide-react";

export default function TeacherAttendancePage() {
  const [selectedClass, setSelectedClass] = useState("Form 2 Science A");
  const [selectedDate, setSelectedDate] = useState("2026-11-21");

  const records = [
    { id: "1", name: "Kofi Mensah", roll: "SHS-2026-0842", p1: "P", p2: "P", p3: "P", p4: "P", overall: "Present" },
    { id: "2", name: "Ama Serwaa Boateng", roll: "SHS-2026-0845", p1: "P", p2: "P", p3: "P", p4: "P", overall: "Present" },
    { id: "3", name: "Kwabena Osei-Tutu", roll: "SHS-2026-0850", p1: "L", p2: "P", p3: "P", p4: "P", overall: "Late (15m)" },
    { id: "4", name: "Akosua Mansah Addo", roll: "SHS-2026-0856", p1: "P", p2: "P", p3: "P", p4: "P", overall: "Present" },
    { id: "5", name: "Yaw Frimpong", roll: "SHS-2026-0862", p1: "A", p2: "A", p3: "A", p4: "A", overall: "Excused Absent" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Daily Roll Call
            </span>
            <span className="text-xs text-slate-400">Official Homeroom Ledger</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Attendance Log & Punctuality</h1>
          <p className="text-xs text-slate-500">
            Period-by-period tracking for high school classes and vocational practical labs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
          />
          <button className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold text-[11px]">
              <th className="py-3 px-3">Student / Trainee</th>
              <th className="py-3 px-2">ID</th>
              <th className="py-3 px-2 text-center">Period 1</th>
              <th className="py-3 px-2 text-center">Period 2</th>
              <th className="py-3 px-2 text-center">Period 3 (Live)</th>
              <th className="py-3 px-2 text-center">Period 4</th>
              <th className="py-3 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-900">{r.name}</td>
                <td className="py-3 px-2 font-mono text-slate-500">{r.roll}</td>
                <td className="py-3 px-2 text-center font-bold text-emerald-600">{r.p1}</td>
                <td className="py-3 px-2 text-center font-bold text-emerald-600">{r.p2}</td>
                <td className="py-3 px-2 text-center font-bold text-emerald-600">{r.p3}</td>
                <td className="py-3 px-2 text-center font-bold text-emerald-600">{r.p4}</td>
                <td className="py-3 px-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.overall.includes("Present") ? "bg-emerald-100 text-emerald-800" :
                    r.overall.includes("Late") ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {r.overall}
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
