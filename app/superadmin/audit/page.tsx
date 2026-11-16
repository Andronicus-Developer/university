"use client";

import React, { useEffect, useState } from "react";
import {
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ShieldAlert,
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileCheck className="h-6 w-6 text-purple-400" />
            Global Platform Audit & Security Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable PostgreSQL security event stream recording root administration, logins, and tenant modifications
          </p>
        </div>

        <button
          onClick={loadAudit}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-purple-400" : ""}`} />
          Refresh Event Stream
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, actor role, entity..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <span className="text-xs text-slate-400">
          Showing <strong className="text-white">{filtered.length}</strong> immutable events
        </span>
      </div>

      {/* Logs Table */}
      <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <span className="text-xs">Fetching audit events from Supabase...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No audit records match your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400 uppercase text-[10.5px]">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Action</th>
                  <th className="pb-3 font-semibold">Actor Role</th>
                  <th className="pb-3 font-semibold">Entity Type</th>
                  <th className="pb-3 font-semibold">Outcome</th>
                  <th className="pb-3 font-semibold text-right">Event ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {filtered.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 font-mono text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-slate-500" />
                      {new Date(log.event_time).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 font-semibold text-slate-100 capitalize">
                      {log.action?.replace(/_/g, " ") || "Security Event"}
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/40 font-semibold">
                        {log.actor_role || "system"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300 capitalize">{log.entity_type || "platform"}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                          log.outcome === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {log.outcome || "SUCCESS"}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-[10.5px] text-slate-500">
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

