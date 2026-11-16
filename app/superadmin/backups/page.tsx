"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Database,
  Download,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Clock,
  RefreshCw,
  HardDrive,
} from "lucide-react";

interface SnapshotItem {
  id: string;
  name: string;
  size: string;
  createdOn: string;
  verified: boolean;
  type: "Automated Daily" | "Manual Pre-deployment" | "Storage Mirror";
}

export default function BackupRecoveryPage() {
  const [snapshots] = useState<SnapshotItem[]>([
    {
      id: "snap-1",
      name: "ums-storage-mirror-latest.json",
      size: "4.8 MB",
      createdOn: "Today, 17:00 UTC",
      verified: true,
      type: "Storage Mirror",
    },
    {
      id: "snap-2",
      name: "daily-database-export-2026-11-16.sql.gz",
      size: "18.2 MB",
      createdOn: "Today, 00:00 UTC",
      verified: true,
      type: "Automated Daily",
    },
    {
      id: "snap-3",
      name: "daily-database-export-2026-11-15.sql.gz",
      size: "17.9 MB",
      createdOn: "Yesterday, 00:00 UTC",
      verified: true,
      type: "Automated Daily",
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
          <span className="text-slate-800 font-semibold">Backup & Recovery Status</span>
        </div>

        <button
          onClick={() => alert("Creating point-in-time cloud backup snapshot...")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Database className="h-4 w-4" />
          <span>Take Manual Snapshot</span>
        </button>
      </div>

      {/* RPO / RTO Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Recovery Point Objective (RPO)</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">&lt; 1 Second</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Continuous Cloud Storage Sync</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Recovery Time Objective (RTO)</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">&lt; 5 Minutes</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">Instant In-Memory Hot Failover</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Snapshot Integrity</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">100% Verified</div>
          <div className="text-[11px] text-slate-500 mt-1">SHA-256 Checksum Validated</div>
        </div>
      </div>

      {/* Snapshots Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historical Backup Snapshots</h3>
              <p className="text-[11px] text-slate-500">
                Disaster recovery archives and point-in-time restoration points
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">{snapshots.length} snapshots available</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Snapshot Name</th>
                <th className="py-3 px-4">Archive Type</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Created Timestamp</th>
                <th className="py-3 px-4">Integrity Check</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshots.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                    {s.name}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {s.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{s.size}</td>
                  <td className="py-3.5 px-4 text-slate-500">{s.createdOn}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Passed
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Downloading backup archive: ${s.name}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
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
