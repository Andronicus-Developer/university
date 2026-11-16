"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  HardDrive,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Globe,
  ShieldCheck,
} from "lucide-react";

export default function PlatformHealthPage() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
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
          <span className="text-slate-800 font-semibold">Monitoring & Health</span>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-blue-600 ${refreshing ? "animate-spin" : ""}`} />
          <span>Poll Telemetry</span>
        </button>
      </div>

      {/* Health Vitals Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Platform Uptime (30d)</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">99.98%</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">SLA Benchmark Met</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Database Latency</span>
            <Database className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">1.2 ms</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">In-Memory Engine</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Storage Capacity</span>
            <HardDrive className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">0.4%</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">4.2 GB of 1.0 TB Used</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">API Error Rate</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">0.002%</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Healthy HTTP 200s</div>
        </div>
      </div>

      {/* Telemetry Details */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Activity className="h-5 w-5 text-blue-600" />
          <span>Core Infrastructure Subsystem Diagnostics</span>
        </h3>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">Supabase Cloud Storage State Engine</div>
              <div className="text-[11px] text-slate-500">Mirroring 75+ tables to institutional-reports/ums-virtual-db.json</div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              ONLINE (0ms lag)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">Next.js App Router Edge Runtime</div>
              <div className="text-[11px] text-slate-500">Zero-downtime server components, middleware security guards active</div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              HEALTHY
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">Multi-Tenant University Isolation Barrier</div>
              <div className="text-[11px] text-slate-500">Strict foreign key tenant separation enforced on all database queries</div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              ENFORCED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
