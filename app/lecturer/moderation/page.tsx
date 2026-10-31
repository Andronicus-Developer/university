"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  FileCheck2,
} from "lucide-react";

export default function LecturerModerationPage() {
  const submissions = [
    {
      id: "sub-1",
      courseCode: "CS101",
      courseName: "Programming Foundations (Sec A)",
      component: "Continuous Assessment & Midterm Mark Sheet",
      submittedAt: "24 Oct 2026",
      stages: [
        { name: "Lecturer Submission", status: "completed", date: "24 Oct 2026" },
        { name: "Department Moderation (HOD)", status: "completed", date: "26 Oct 2026" },
        { name: "Faculty Board of Examiners", status: "in_progress", date: "Under Review" },
        { name: "Academic Board Approval", status: "pending", date: "Awaiting" },
      ],
      currentStage: "Faculty Board of Examiners",
      status: "under_moderation",
    },
    {
      id: "sub-2",
      courseCode: "CS204",
      courseName: "Database Systems (Sec B)",
      component: "Midterm Examination Mark Sheet",
      submittedAt: "26 Oct 2026",
      stages: [
        { name: "Lecturer Submission", status: "completed", date: "26 Oct 2026" },
        { name: "Department Moderation (HOD)", status: "in_progress", date: "Under Review" },
        { name: "Faculty Board of Examiners", status: "pending", date: "Awaiting" },
        { name: "Academic Board Approval", status: "pending", date: "Awaiting" },
      ],
      currentStage: "Department Moderation",
      status: "submitted",
    },
    {
      id: "sub-3",
      courseCode: "CS308",
      courseName: "Software Engineering (Sec A)",
      component: "Term 1 Project & Laboratory Scores",
      submittedAt: "12 Oct 2026",
      stages: [
        { name: "Lecturer Submission", status: "completed", date: "12 Oct 2026" },
        { name: "Department Moderation (HOD)", status: "completed", date: "14 Oct 2026" },
        { name: "Faculty Board of Examiners", status: "completed", date: "18 Oct 2026" },
        { name: "Academic Board Approval", status: "completed", date: "20 Oct 2026" },
      ],
      currentStage: "Officially Published",
      status: "approved",
    },
  ];

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Moderation & Submission Status</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
          Results Approval & Moderation Tracking
        </h1>
        <p className="text-xs text-slate-500">
          Independent verification stages, department scrutiny, board review milestones, and published result audits.
        </p>
      </div>

      <div className="space-y-4">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-0.5 rounded text-slate-800">
                    {sub.courseCode}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{sub.courseName}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Component: <strong className="text-slate-700">{sub.component}</strong> · Submitted on {sub.submittedAt}
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${
                  sub.status === "approved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : sub.status === "under_moderation"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {sub.currentStage}
              </span>
            </div>

            {/* Stages Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {sub.stages.map((st, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-xs ${
                    st.status === "completed"
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                      : st.status === "in_progress"
                      ? "bg-amber-50/50 border-amber-200 text-amber-900"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {st.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : st.status === "in_progress" ? (
                      <Clock className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className="font-bold truncate">{st.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-6">{st.date}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

