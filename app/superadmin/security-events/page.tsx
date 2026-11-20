"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Lock,
  Clock,
  Eye,
} from "lucide-react";

interface ThreatEvent {
  id: string;
  eventType: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  actor: string;
  ipAddress: string;
  location: string;
  timestamp: string;
  status: "Mitigated" | "Investigating" | "Dismissed";
}

export default function SecurityEventsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const events: ThreatEvent[] = [
    {
      id: "SEC-901",
      eventType: "Multiple Failed Login Attempts (Burst)",
      severity: "Medium",
      actor: "unknown@external.net",
      ipAddress: "154.160.22.14",
      location: "Accra, Ghana",
      timestamp: "Today, 14:12",
      status: "Mitigated",
    },
    {
      id: "SEC-902",
      eventType: "Unusual Session Token Rotation",
      severity: "Low",
      actor: "admin@university.edu.gh",
      ipAddress: "102.176.64.9",
      location: "Tema, Ghana",
      timestamp: "Today, 11:45",
      status: "Dismissed",
    },
    {
      id: "SEC-903",
      eventType: "Privilege Elevation Verification Challenge",
      severity: "Low",
      actor: "superadmin@university.edu.gh",
      ipAddress: "127.0.0.1",
      location: "Local Cloud Engine",
      timestamp: "Today, 09:20",
      status: "Mitigated",
    },
  ];

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
          <span className="text-slate-800 font-semibold">Security Events & Threat Detection</span>
        </div>

        <button
          onClick={() => alert("Event scanner refreshed")}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <span>Refresh Threat Stream</span>
        </button>
      </div>

      {/* Events Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Security & Anomaly Guard</h3>
              <p className="text-[11px] text-slate-500">
                Live perimeter surveillance across all tenant schools
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            0 CRITICAL THREATS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Target / Actor</th>
                <th className="py-3 px-4">IP & Location</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{e.eventType}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        e.severity === "Critical"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : e.severity === "Medium"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {e.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-800">
                    {e.actor}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {e.ipAddress} ({e.location})
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{e.timestamp}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {e.status}
                    </span>
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
