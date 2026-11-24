"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Shield } from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  outcome: string;
  actor_email: string | null;
  actor_role: string | null;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/ops?resource=audit", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error || "Failed to load audit logs.");
      } else {
        setLogs(data.logs || []);
        setMissingTables(data.missingTables || []);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            System Audit Trail & Compliance Events
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            School-scoped record of administrative and registry actions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAuditLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {missingTables.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Run migration `20261124000010_audit_remediation_tables_and_rls.sql` in Supabase SQL Editor to enable live audit logging.</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs font-semibold text-rose-800 dark:text-rose-200">
          {errorMsg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading audit events...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Shield className="h-7 w-7 mx-auto text-slate-400" />
            <p className="text-sm font-semibold">No Audit Events Recorded Yet</p>
            <p className="text-xs text-slate-500">Compliance events for your school will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4 text-right">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 px-4 text-slate-500">{(l.created_at || "").slice(0, 19).replace("T", " ")}</td>
                    <td className="py-3 px-4">{l.actor_email || l.actor_role || "System"}</td>
                    <td className="py-3 px-4 font-semibold">{l.action}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {l.entity_type || "-"} {l.entity_id ? `(${l.entity_id.slice(0, 8)})` : ""}
                    </td>
                    <td className="py-3 px-4 text-right uppercase">{l.outcome}</td>
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
