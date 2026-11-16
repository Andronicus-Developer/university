"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Check,
  ShieldCheck,
  CreditCard,
  GraduationCap,
  Users,
  BookOpen,
  Building2,
  BusFront,
  FileCheck2,
  Sparkles,
  Sliders,
} from "lucide-react";

interface ModuleConfig {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isEnabled: boolean;
  tier: "Standard" | "Enterprise" | "Flagship";
}

export default function PlatformModulesPage() {
  const [modules, setModules] = useState<ModuleConfig[]>([
    {
      id: "mod-admissions",
      name: "Admissions & Applicant Portal",
      code: "ADMISSIONS_CORE",
      description: "Online application submission, document scrutiny, scoring, and automated offer letter issuance.",
      icon: Users,
      isEnabled: true,
      tier: "Standard",
    },
    {
      id: "mod-finance",
      name: "Bursary & Dual-Control Finance",
      code: "FINANCE_BURSAR",
      description: "Student invoices, online payment gateways, reconciliation, waivers, and refund dual-control queues.",
      icon: CreditCard,
      isEnabled: true,
      tier: "Flagship",
    },
    {
      id: "mod-academics",
      name: "Curriculum & Timetabling",
      code: "ACADEMICS_SCHEDULING",
      description: "Course master, prerequisite verification, automatic conflict-free timetable generation, and routine docs.",
      icon: BookOpen,
      isEnabled: true,
      tier: "Standard",
    },
    {
      id: "mod-exams",
      name: "Examinations & Senate Broadsheet",
      code: "EXAMS_GRADING",
      description: "Lecturer marks entry, moderation approval workflow, GPA/CGPA computation, and sealed broadsheet outputs.",
      icon: FileCheck2,
      isEnabled: true,
      tier: "Enterprise",
    },
    {
      id: "mod-hostels",
      name: "Hostel & Room Allocation",
      code: "CAMPUS_HOUSING",
      description: "Hall, block, room, and bed inventory management, applicant quotas, check-in, and maintenance ticketing.",
      icon: Building2,
      isEnabled: true,
      tier: "Enterprise",
    },
    {
      id: "mod-transport",
      name: "Fleet & Transport Logistics",
      code: "CAMPUS_FLEET",
      description: "Bus routes, stops, driver assignments, pass issuance, and vehicle maintenance logs.",
      icon: BusFront,
      isEnabled: true,
      tier: "Standard",
    },
  ]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isEnabled: !m.isEnabled } : m))
    );
  };

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
          <span>Security & Operations</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">Feature Flags & Modules</span>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Check className="h-4 w-4" />
          <span>Apply Feature Flags</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium shadow-2xs">
          Feature flags successfully synced across all tenant workspaces!
        </div>
      )}

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className={`p-5 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                m.isEnabled
                  ? "border-slate-200/80 hover:border-blue-300 hover:shadow-md"
                  : "border-slate-200 opacity-60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      m.isEnabled
                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {m.tier}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{m.name}</h3>
                  <div className="text-[10.5px] font-mono text-blue-600 font-semibold mt-0.5">
                    {m.code}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Status:{" "}
                  <strong className={m.isEnabled ? "text-emerald-600" : "text-slate-400"}>
                    {m.isEnabled ? "Active" : "Disabled"}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => toggleModule(m.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    m.isEnabled ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      m.isEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
