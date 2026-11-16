"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Plus,
  Check,
  CheckCircle2,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function AcademicConfigurationPage() {
  const [gradingScale, setGradingScale] = useState("4.00_standard");
  const [minCredits, setMinCredits] = useState("15");
  const [maxCredits, setMaxCredits] = useState("21");
  const [passGrade, setPassGrade] = useState("D (50%)");
  const [broadsheetLockout, setBroadsheetLockout] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Sub-Header: Breadcrumbs + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link
            href="/superadmin/dashboard"
            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Super Admin
          </Link>
          <span className="text-slate-300">/</span>
          <span>Platform Configuration</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">Academic Configuration</span>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Check className="h-4 w-4" />
          <span>Save Academic Policies</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium shadow-2xs">
          Academic policies and grading rules saved successfully!
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="max-w-4xl space-y-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            <span>Grading Scale & GPA Calculation Scheme</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standard Grading Scheme
              </label>
              <select
                value={gradingScale}
                onChange={(e) => setGradingScale(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="4.00_standard">Ghana National / US 4.00 Scale (A: 80-100%, B: 70-79%)</option>
                <option value="5.00_scale">West African 5.00 Point CGPA System</option>
                <option value="percentage">Direct Percentage Scale (0 - 100%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Passing Benchmark
              </label>
              <select
                value={passGrade}
                onChange={(e) => setPassGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="D (50%)">Grade D (50% - Standard Undergraduate)</option>
                <option value="C (60%)">Grade C (60% - Postgraduate / Clinical)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span>Semester Registration & Credit Load Limits</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Full-time Credits Per Semester
              </label>
              <input
                type="number"
                value={minCredits}
                onChange={(e) => setMinCredits(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maximum Allowed Credits (Without Dean Override)
              </label>
              <input
                type="number"
                value={maxCredits}
                onChange={(e) => setMaxCredits(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Lock Marks After Senate Broadsheet Approval
              </div>
              <div className="text-[11px] text-slate-500">
                Requires formal amendment appeal and registrar sign-off to edit published grades.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBroadsheetLockout(!broadsheetLockout)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                broadsheetLockout ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  broadsheetLockout ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
