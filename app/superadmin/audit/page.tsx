"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";

export default function SecurityAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadAudit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/superadmin/audit");
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const filtered = logs.filter((log) => {
    const act = (log.action || "").toLowerCase();
    const role = (log.actor_role || "").toLowerCase();
    const type = (log.entity_type || "").toLowerCase();
    const s = searchTerm.toLowerCase();
    return act.includes(s) || role.includes(s) || type.includes(s);
  });

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
          <span className="text-slate-800 font-semibold">Audit Logs</span>
        </div>

        <button
          onClick={loadAudit}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          <span>Refresh Event Stream</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, actor role, entity..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>
        <span className="text-xs text-slate-500">
          Showing <strong className="text-slate-800">{filtered.length}</strong> immutable events
        </span>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs">Fetching audit events from Supabase...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No audit records match your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor Role</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 text-right">Event ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>
                          {new Date(log.event_time).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 capitalize">
                      {log.action?.replace(/_/g, " ") || "Security Event"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                        {log.actor_role || "system"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 capitalize font-medium">
                      {log.entity_type || "platform"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.outcome === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            log.outcome === "SUCCESS" ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {log.outcome || "SUCCESS"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[10.5px] text-slate-400">
                      {log.id?.slice(0, 8) || `EVT-${idx + 1}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
