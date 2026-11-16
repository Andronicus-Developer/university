"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Layers,
} from "lucide-react";

interface JobItem {
  id: string;
  name: string;
  schedule: string;
  lastRun: string;
  nextRun: string;
  status: "Running" | "Idle" | "Success" | "Failed";
  totalRuns: number;
}

export default function BackgroundJobsPage() {
  const [jobs] = useState<JobItem[]>([
    {
      id: "job-1",
      name: "Daily Bursary & Payment Webhook Settlement Reconciliation",
      schedule: "Every day at 00:00 UTC",
      lastRun: "6 hours ago (Success)",
      nextRun: "In 18 hours",
      status: "Idle",
      totalRuns: 142,
    },
    {
      id: "job-2",
      name: "Automated Academic Year & Semester Status Rollover",
      schedule: "Manual / Term End",
      lastRun: "1 week ago (Success)",
      nextRun: "Next Term End",
      status: "Idle",
      totalRuns: 4,
    },
    {
      id: "job-3",
      name: "Cloud Storage Virtual Database Persistence Mirror",
      schedule: "Continuous Real-time Sync",
      lastRun: "Just now (<1s ago)",
      nextRun: "Continuous",
      status: "Running",
      totalRuns: 2840,
    },
    {
      id: "job-4",
      name: "Student Overdue Invoice Reminders (SMS/Email)",
      schedule: "Every Monday at 08:00 UTC",
      lastRun: "Yesterday (Success)",
      nextRun: "In 6 days",
      status: "Idle",
      totalRuns: 48,
    },
    {
      id: "job-5",
      name: "Disaster Recovery Database Point-in-time Snapshot",
      schedule: "Every 6 hours",
      lastRun: "2 hours ago (Success)",
      nextRun: "In 4 hours",
      status: "Idle",
      totalRuns: 512,
    },
  ]);

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
          <span className="text-slate-800 font-semibold">Background Jobs & Workers</span>
        </div>

        <button
          onClick={() => alert("Job runner triggered manually")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Play className="h-4 w-4" />
          <span>Trigger Manual Run</span>
        </button>
      </div>

      {/* Jobs Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Queue Workers & Scheduled Automation</h3>
              <p className="text-[11px] text-slate-500">
                Managed async cron tasks, report exporters, and background reconciliation
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            ALL WORKERS OPERATIONAL
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Worker Task Name</th>
                <th className="py-3 px-4">Cadence</th>
                <th className="py-3 px-4">Last Execution</th>
                <th className="py-3 px-4">Next Target</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {j.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                    {j.schedule}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{j.lastRun}</td>
                  <td className="py-3.5 px-4 text-slate-600">{j.nextRun}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        j.status === "Running"
                          ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          j.status === "Running" ? "bg-blue-600" : "bg-emerald-500"
                        }`}
                      />
                      {j.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Starting worker task: ${j.name}`)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Run Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
