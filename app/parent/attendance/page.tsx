"use client";

import React, { useState } from "react";
import { UserCheck, CheckCircle2, Clock, Calendar, AlertCircle } from "lucide-react";

export default function ParentAttendancePage() {
  const attendanceLog = [
    { date: "Friday, Nov 21, 2026", gateIn: "07:42 AM", status: "Present", periods: "4 / 4 Periods Attended", remark: "On time" },
    { date: "Thursday, Nov 20, 2026", gateIn: "07:38 AM", status: "Present", periods: "4 / 4 Periods Attended", remark: "On time" },
    { date: "Wednesday, Nov 19, 2026", gateIn: "07:45 AM", status: "Present", periods: "4 / 4 Periods Attended", remark: "On time" },
    { date: "Tuesday, Nov 18, 2026", gateIn: "08:12 AM", status: "Late", periods: "3 / 4 Periods Attended", remark: "Delayed by traffic (Excused)" },
    { date: "Monday, Nov 17, 2026", gateIn: "07:40 AM", status: "Present", periods: "4 / 4 Periods Attended", remark: "On time" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Presence Tracking
            </span>
            <span className="text-xs text-slate-400">98.2% Term Attendance</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Attendance & Campus Entry Logs</h1>
          <p className="text-xs text-slate-500">
            Real-time biometric and gate check-in alerts for your ward.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold text-[11px]">
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-2">Campus Gate In</th>
              <th className="py-3 px-2">Class Periods</th>
              <th className="py-3 px-2 text-center">Status</th>
              <th className="py-3 px-3 text-right">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {attendanceLog.map((log, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-900">{log.date}</td>
                <td className="py-3 px-2 font-mono text-slate-600">{log.gateIn}</td>
                <td className="py-3 px-2 text-slate-600">{log.periods}</td>
                <td className="py-3 px-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    log.status === "Present" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-slate-500">{log.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
