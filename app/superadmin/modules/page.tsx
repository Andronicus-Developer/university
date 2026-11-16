"use client";

import React, { useState } from "react";
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
      description: "Continuous assessment weighting, mark moderation, senate grade approvals, and transcript generation.",
      icon: FileCheck2,
      isEnabled: true,
      tier: "Enterprise",
    },
    {
      id: "mod-hostel",
      name: "Hostels & Bed Allocation",
      code: "HOSTEL_RESIDENCE",
      description: "Halls of residence, room inventory, bed space reservation, key issue tracking, and maintenance logs.",
      icon: Building2,
      isEnabled: true,
      tier: "Enterprise",
    },
    {
      id: "mod-transport",
      name: "Campus Fleet & Transport",
      code: "FLEET_LOGISTICS",
      description: "Bus routes, transport vehicle tracking, maintenance scheduling, and student bus pass issuance.",
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Boxes className="h-6 w-6 text-purple-400" />
            Institutional Feature Modules
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally govern feature flags, enterprise modules, and platform capabilities across institutions
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
        >
          <Check className="h-4 w-4" />
          Save Module Policies
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          Platform feature module configurations synchronized across all university instances!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                m.isEnabled
                  ? "bg-slate-800/80 border-slate-700/80 shadow-sm"
                  : "bg-slate-900/60 border-slate-800 opacity-60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800/50 uppercase tracking-wider">
                    {m.tier}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{m.name}</h3>
                  <span className="text-[10.5px] font-mono text-purple-400 font-semibold">{m.code}</span>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">{m.description}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between">
                <span className="text-xs text-slate-400">Status:</span>
                <button
                  type="button"
                  onClick={() => toggleModule(m.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    m.isEnabled ? "bg-purple-600" : "bg-slate-700"
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

