"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Users, Clock, Calendar, CheckCircle2, ChevronRight, School, Wrench } from "lucide-react";

export default function TeacherClassesPage() {
  const [activeTab, setActiveTab] = useState<"timetable" | "roster">("timetable");

  const timetable = [
    { period: "Period 1", time: "08:00 AM - 09:00 AM", class: "Form 3 General Arts B", subject: "Core Mathematics", room: "Room 102", students: 38 },
    { period: "Period 2", time: "09:15 AM - 10:15 AM", class: "Form 1 Elective ICT", subject: "Computer Studies", room: "ICT Lab 2", students: 45 },
    { period: "Period 3", time: "10:45 AM - 11:45 AM", class: "Form 2 Science A", subject: "Elective Physics", room: "Science Lab B", students: 42, active: true },
    { period: "Period 4", time: "01:00 PM - 02:00 PM", class: "Form 2 Science B", subject: "Integrated Science", room: "Room 204", students: 40 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Teaching Allocations
            </span>
            <span className="text-xs text-slate-400">Term 2 • 2026/2027</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Classes, Timetable & Workshop Batches</h1>
          <p className="text-xs text-slate-500">
            View allocated subject periods, active laboratory batches, and cohort rosters.
          </p>
        </div>
        <Link
          href="/teacher/attendance"
          className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Take Class Attendance</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {timetable.map((t, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl border transition-all ${
              t.active
                ? "bg-emerald-50/70 border-emerald-300 shadow-sm"
                : "bg-white border-slate-200/80 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                t.active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {t.period}
              </span>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {t.time}
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">{t.class}</h3>
            <p className="text-xs font-semibold text-emerald-800 mt-0.5">{t.subject}</p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{t.room}</span>
              <span className="font-bold text-slate-700">{t.students} Students</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
