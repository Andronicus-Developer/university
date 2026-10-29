"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  AlertOctagon,
  Clock,
  Shield,
  RefreshCw,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  outcome: string;
  ip_address: string;
  actor_name: string;
  event_time: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data } = await db
        .from("audit_events")
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          outcome,
          ip_address,
          event_time,
          actor:actor_id(full_name)
        `)
        .order("event_time", { ascending: false })
        .limit(30);

      if (data && data.length > 0) {
        setLogs(
          data.map((l: any) => ({
            id: l.id,
            action: l.action,
            entity_type: l.entity_type,
            entity_id: l.entity_id || "-",
            outcome: l.outcome || "SUCCESS",
            ip_address: l.ip_address || "127.0.0.1",
            actor_name: l.actor?.full_name || "System Process",
            event_time: new Date(l.event_time).toLocaleString(),
          }))
        );
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Security & Auditing</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            System Audit Trail & Compliance Events
          </h1>
          <p className="text-xs text-[#64748B]">
            Immutable record of authentication attempts, database changes, and administrative actions.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#475569] shadow-2xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-4">Event Timestamp</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity Target</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4 text-right">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs font-mono">
            {logs.length > 0 ? (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                  <td className="py-3.5 px-4 text-[#64748B]">{l.event_time}</td>
                  <td className="py-3.5 px-4 font-bold text-[#1E293B]">{l.actor_name}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#2563EB]">{l.action}</td>
                  <td className="py-3.5 px-4 text-[#475569]">{l.entity_type} ({l.entity_id.slice(0, 8)})</td>
                  <td className="py-3.5 px-4 text-[#64748B]">{l.ip_address}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        l.outcome === "SUCCESS"
                          ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                          : "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]"
                      }`}
                    >
                      {l.outcome}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs font-sans text-[#94A3B8]">
                  {loading ? "Reading security audit records..." : "No audit events logged yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

