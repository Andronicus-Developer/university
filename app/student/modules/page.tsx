"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Hammer,
  Layers,
  Mail,
  NotebookPen,
  Search,
  UserCheck,
  Wrench,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

interface TradeModule {
  id: string;
  code: string;
  name: string;
  practical_hours: number;
  theory_hours: number;
  credit_units: number;
  description: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  is_active: boolean;
}

interface WorkshopSession {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  module_id: string | null;
  entry_type: string | null;
}

interface ModulesPayload {
  school: { id: string; name: string };
  student: any | null;
  activeTerm: { id: string; name: string } | null;
  activeYear: { id: string; name: string } | null;
  modules: TradeModule[];
  workshopSchedule: WorkshopSession[];
}

export default function VocationalModulesPage() {
  const { data, loading, error, reload } = useStudentPortalSection<ModulesPayload>("modules");
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const filteredModules = useMemo(() => {
    const list = data?.modules || [];
    const q = search.trim().toLowerCase();
    return list.filter((m) => {
      if (onlyActive && m.is_active === false) return false;
      if (!q) return true;
      return (
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.instructor_name || "").toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q)
      );
    });
  }, [data?.modules, search, onlyActive]);

  const scheduleByModule = useMemo(() => {
    const map = new Map<string, WorkshopSession[]>();
    for (const entry of data?.workshopSchedule || []) {
      if (!entry.module_id) continue;
      const existing = map.get(entry.module_id) || [];
      existing.push(entry);
      map.set(entry.module_id, existing);
    }
    return map;
  }, [data?.workshopSchedule]);

  const totals = useMemo(() => {
    const mods = data?.modules || [];
    return {
      count: mods.length,
      practical: mods.reduce((sum, m) => sum + Number(m.practical_hours || 0), 0),
      theory: mods.reduce((sum, m) => sum + Number(m.theory_hours || 0), 0),
      credits: mods.reduce((sum, m) => sum + Number(m.credit_units || 0), 0),
    };
  }, [data?.modules]);

  if (loading) return <StudentPageLoading label="Loading trade modules & curriculum..." />;
  if (error) return <StudentPageError error={error} onRetry={reload} />;
  if (!data?.student) return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
            <Wrench className="h-3.5 w-3.5" />
            <span>Vocational Trade Curriculum</span>
            {data.activeYear?.name && (
              <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[10px]">
                {data.activeYear.name}
                {data.activeTerm?.name ? ` · ${data.activeTerm.name}` : ""}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Trade Modules &amp; Workshop Schedule
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Practical and theory modules configured for {data.school.name}.
          </p>
        </div>
        <Link
          href="/student/logbook"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-xs self-start"
        >
          <NotebookPen className="h-3.5 w-3.5" />
          <span>Open Practical Logbook</span>
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Trade Modules</span>
            <Layers className="h-4 w-4 text-teal-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{totals.count}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Practical Hours</span>
            <Hammer className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {totals.practical} hrs
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Theory Hours</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {totals.theory} hrs
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Total Credit Units</span>
            <Wrench className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{totals.credits}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by module code, trade title, or instructor..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span>Show active modules only</span>
        </label>
      </div>

      {filteredModules.length === 0 ? (
        <StudentEmptyState
          icon={Wrench}
          title="No Trade Modules Found"
          description="Your trade curriculum modules have not been published yet or none match your current filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredModules.map((mod) => {
            const sessions = scheduleByModule.get(mod.id) || [];
            const totalHrs = Number(mod.practical_hours || 0) + Number(mod.theory_hours || 0);
            const practicalPct =
              totalHrs > 0 ? Math.round((Number(mod.practical_hours || 0) / totalHrs) * 100) : 0;

            return (
              <div
                key={mod.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:border-teal-300 dark:hover:border-teal-800 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {mod.code}
                      </span>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                        {mod.name}
                      </h2>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      {mod.credit_units} {mod.credit_units === 1 ? "Unit" : "Units"}
                    </span>
                  </div>

                  {mod.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {mod.description}
                    </p>
                  )}

                  {/* Hours split bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <span>Practical: {mod.practical_hours}h</span>
                      <span>Theory: {mod.theory_hours}h</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${practicalPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                      <UserCheck className="h-3.5 w-3.5 text-teal-500" />
                      <span>{mod.instructor_name || "Instructor TBA"}</span>
                    </div>
                    {mod.instructor_email && (
                      <a
                        href={`mailto:${mod.instructor_email}`}
                        className="inline-flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        <span>{mod.instructor_email}</span>
                      </a>
                    )}
                  </div>

                  {sessions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {sessions.map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          <Calendar className="h-3 w-3 text-teal-500" />
                          <span>
                            {s.day_of_week} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                            {s.room ? ` · ${s.room}` : ""}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(data.workshopSchedule || []).length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Weekly Workshop Sessions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Day</th>
                  <th className="py-2 pr-4 font-semibold">Time Window</th>
                  <th className="py-2 pr-4 font-semibold">Workshop / Bay</th>
                  <th className="py-2 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {data.workshopSchedule.map((slot) => (
                  <tr key={slot.id} className="text-slate-700 dark:text-slate-300">
                    <td className="py-2.5 pr-4 font-semibold">{slot.day_of_week}</td>
                    <td className="py-2.5 pr-4">
                      {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                    </td>
                    <td className="py-2.5 pr-4">{slot.room || "Main Workshop"}</td>
                    <td className="py-2.5 capitalize">{slot.entry_type || "Workshop"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
