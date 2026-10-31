"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  X,
  Send,
  AlertCircle,
} from "lucide-react";

interface ReferralCase {
  id: string;
  studentNumber: string;
  studentName: string;
  category: string;
  priority: "high" | "medium" | "low";
  reason: string;
  status: "submitted" | "in_review" | "resolved";
  date: string;
}

export default function LecturerSupportCasesPage() {
  const [cases, setCases] = useState<ReferralCase[]>([
    {
      id: "ref-1",
      studentNumber: "STU20260067",
      studentName: "Emmanuel Tetteh",
      category: "Academic Tutoring & Peer Support",
      priority: "high",
      reason: "Student experiencing difficulties with foundational discrete mathematics and algorithms; requested one-on-one lab mentoring.",
      status: "in_review",
      date: "24 Oct 2026",
    },
    {
      id: "ref-2",
      studentNumber: "STU20260055",
      studentName: "Samuel Boateng",
      category: "Student Welfare & Health Support",
      priority: "medium",
      reason: "Chronic health condition affecting class attendance; student requested formal documentation for approved medical absence.",
      status: "resolved",
      date: "14 Oct 2026",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState("Academic Tutoring & Peer Support");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [reason, setReason] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const handleCreateReferral = (e: React.FormEvent) => {
    e.preventDefault();
    setCases((prev) => [
      {
        id: `ref-${Date.now()}`,
        studentNumber: studentId || "STU20260099",
        studentName: "Referral Advisee Student",
        category,
        priority,
        reason,
        status: "submitted",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      },
      ...prev,
    ]);
    setShowModal(false);
    setStudentId("");
    setReason("");
    setNotification("Student referral submitted to University Student Support Services.");
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Student Support Referrals</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Student Support & Welfare Referrals
          </h1>
          <p className="text-xs text-slate-500">
            Refer students requiring academic tutoring, mental welfare, financial aid, or disability services to university officers.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Student Referral</span>
        </button>
      </div>

      {notification && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Referrals List */}
      <div className="space-y-4">
        {cases.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{c.studentName}</h3>
                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {c.studentNumber}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Category: <strong className="text-slate-700">{c.category}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    c.priority === "high"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {c.priority} Priority
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    c.status === "resolved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {c.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {c.reason}
            </p>

            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Referred to Student Support Services</span>
              <span>{c.date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* New Referral Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">New Student Referral</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateReferral} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student ID Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU20260012"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Support Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="Academic Tutoring & Peer Support">Academic Tutoring & Peer Support</option>
                  <option value="Student Welfare & Counselling">Student Welfare & Counselling</option>
                  <option value="Disability & Accessibility Accommodation">Disability & Accessibility Accommodation</option>
                  <option value="Financial Hardship / Bursary Referral">Financial Hardship / Bursary Referral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High / Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confidential Referral Notes</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the circumstances, observed academic concerns, or requested support..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Submit Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

