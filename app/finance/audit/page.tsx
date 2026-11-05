"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Download,
  Shield,
  Eye,
  Calendar,
  Filter,
  ChevronDown,
  ChevronRight,
  Database,
  Lock,
} from "lucide-react";

export default function FinanceAuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [actionCategory, setActionCategory] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data, error } = await db
        .from("audit_events")
        .select(`
          id,
          event_time,
          actor_id,
          actor_role,
          action,
          entity_type,
          entity_id,
          outcome,
          ip_address,
          reason,
          approval_reference,
          old_values,
          new_values,
          actor:actor_id (full_name, email)
        `)
        .order("event_time", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Timestamp", "Action", "Actor Role", "Actor", "Entity Type", "Entity ID", "Outcome", "Reason"];
    const rows = logs.map((l) => [
      l.event_time,
      l.action,
      l.actor_role || "N/A",
      l.actor?.full_name || l.actor_id || "System",
      l.entity_type,
      l.entity_id || "N/A",
      l.outcome,
      `"${(l.reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bursary_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor_role?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOutcome = outcomeFilter === "all" ? true : log.outcome?.toUpperCase() === outcomeFilter.toUpperCase();

    const matchesCategory =
      actionCategory === "all"
        ? true
        : actionCategory === "payment"
        ? log.action?.toLowerCase().includes("pay")
        : actionCategory === "refund"
        ? log.action?.toLowerCase().includes("refund")
        : actionCategory === "waiver"
        ? log.action?.toLowerCase().includes("waiver")
        : actionCategory === "reconciliation"
        ? log.action?.toLowerCase().includes("reconcil") || log.action?.toLowerCase().includes("settle")
        : true;

    return matchesSearch && matchesOutcome && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Statutory Bursary & Financial Audit Trail</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Immutable Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete chronological record of ledger updates, payment postings, authorizations, waivers, and settlement reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Audit Log</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Security Assurance Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-slate-600 shrink-0" />
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900">Cryptographic Integrity Notice: </span>
            Audit entries are logged with ISO timestamps, actor profiles, origin IP addresses, and state before/after diffs.
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-500 shrink-0">Total Tracked Events: {logs.length}</div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Events" },
            { id: "payment", label: "Payments & Receipts" },
            { id: "refund", label: "Refunds" },
            { id: "waiver", label: "Waivers & Discounts" },
            { id: "reconciliation", label: "Reconciliation" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActionCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                actionCategory === cat.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="DENIED">Denied Only</option>
            <option value="FAILURE">Failure Only</option>
          </select>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search action, actor, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Main Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading audit events from database...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <Database className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">No audit events match current criteria</div>
            <p className="text-xs text-slate-400 mt-1">Try resetting search query or category filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor / Role</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Audit Reason & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedRow === log.id;
                  const isSuccess = log.outcome?.toUpperCase() === "SUCCESS";
                  const isDenied = log.outcome?.toUpperCase() === "DENIED";

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                        className={`hover:bg-slate-50/80 transition cursor-pointer ${isExpanded ? "bg-slate-50/60" : ""}`}
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {new Date(log.event_time).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {log.actor?.full_name || log.actor_id || "System Engine"}
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            {log.actor_role || "automated"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{log.entity_type}</div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {log.entity_id ? `${log.entity_id.slice(0, 8)}...` : "GLOBAL"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isSuccess && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              SUCCESS
                            </span>
                          )}
                          {isDenied && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="h-2.5 w-2.5" />
                              DENIED
                            </span>
                          )}
                          {!isSuccess && !isDenied && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="h-2.5 w-2.5" />
                              {log.outcome}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-sm truncate text-slate-600" title={log.reason || "N/A"}>
                          {log.reason || "Automatic system state transaction"}
                        </td>
                      </tr>

                      {/* Collapsible Row for Diffs / Metadata */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-4 pl-12 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Event ID & Network</span>
                                <div className="font-mono text-[11px] text-slate-700 mt-1 break-all">{log.id}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">IP: {log.ip_address || "Internal Loopback"}</div>
                              </div>
                              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Approval Reference</span>
                                <div className="font-mono text-[11px] text-slate-700 mt-1">
                                  {log.approval_reference || "None Required"}
                                </div>
                              </div>
                              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Full Reason</span>
                                <div className="text-[11px] text-slate-700 mt-1">{log.reason || "System logged execution"}</div>
                              </div>
                            </div>

                            {(log.old_values || log.new_values) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {log.old_values && (
                                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/60 font-mono text-[11px]">
                                    <div className="text-[10px] font-bold text-rose-700 uppercase mb-1">Prior State (old_values)</div>
                                    <pre className="overflow-x-auto text-slate-700 text-[10px] whitespace-pre-wrap">
                                      {JSON.stringify(log.old_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.new_values && (
                                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 font-mono text-[11px]">
                                    <div className="text-[10px] font-bold text-emerald-700 uppercase mb-1">New State (new_values)</div>
                                    <pre className="overflow-x-auto text-slate-700 text-[10px] whitespace-pre-wrap">
                                      {JSON.stringify(log.new_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

