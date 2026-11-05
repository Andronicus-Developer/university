"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  FileCheck2,
  DollarSign,
  UserCheck,
  Lock,
  Loader2,
  Filter,
} from "lucide-react";

export default function ApprovalQueuePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      // 1. Fetch from refund_requests
      const { data: refunds } = await db
        .from("refund_requests")
        .select(`
          id,
          amount,
          reason,
          status,
          created_at,
          student:student_id (
            student_number,
            profile:profile_id (full_name, email),
            programme:programme_id (name, code)
          ),
          requester:requested_by (id, full_name),
          approver:approved_by (full_name)
        `)
        .order("created_at", { ascending: false });

      // 2. Fetch from waivers
      const { data: waivers } = await db
        .from("waivers")
        .select(`
          id,
          amount,
          reason,
          waiver_type,
          created_at,
          student:student_id (
            student_number,
            profile:profile_id (full_name, email),
            programme:programme_id (name, code)
          ),
          approver:approved_by (id, full_name)
        `)
        .order("created_at", { ascending: false });

      // 3. Fetch from financial_approvals
      const { data: finApprovals } = await db
        .from("financial_approvals")
        .select(`
          id,
          approval_type,
          amount,
          reason,
          status,
          created_at,
          student:student_id (
            student_number,
            profile:profile_id (full_name, email)
          ),
          requester:requested_by (id, full_name),
          approver:reviewed_by (full_name)
        `)
        .order("created_at", { ascending: false });

      const combined: any[] = [];

      // Map refunds
      if (refunds) {
        refunds.forEach((r: any) => {
          combined.push({
            id: r.id,
            sourceTable: "refund_requests",
            type: "Refund Request",
            category: "refund",
            amount: Number(r.amount || 0),
            studentName: r.student?.profile?.full_name || "N/A",
            studentNumber: r.student?.student_number || "N/A",
            programme: r.student?.programme?.code || "N/A",
            requesterName: r.requester?.full_name || "Bursary Officer",
            requesterId: r.requester?.id,
            reason: r.reason,
            status: r.status,
            createdAt: r.created_at,
          });
        });
      }

      // Map waivers
      if (waivers) {
        waivers.forEach((w: any) => {
          combined.push({
            id: w.id,
            sourceTable: "waivers",
            type: `Fee Waiver (${w.waiver_type || "Discount"})`,
            category: "waiver",
            amount: Number(w.amount || 0),
            studentName: w.student?.profile?.full_name || "N/A",
            studentNumber: w.student?.student_number || "N/A",
            programme: w.student?.programme?.code || "N/A",
            requesterName: w.approver?.full_name || "Financial Aid Desk",
            requesterId: w.approver?.id,
            reason: w.reason,
            status: "approved", // waivers in table are recorded waivers
            createdAt: w.created_at,
          });
        });
      }

      // Map financial_approvals
      if (finApprovals) {
        finApprovals.forEach((fa: any) => {
          combined.push({
            id: fa.id,
            sourceTable: "financial_approvals",
            type: fa.approval_type?.toUpperCase(),
            category: fa.approval_type,
            amount: Number(fa.amount || 0),
            studentName: fa.student?.profile?.full_name || "N/A",
            studentNumber: fa.student?.student_number || "N/A",
            programme: "DEG",
            requesterName: fa.requester?.full_name || "Finance Admin",
            requesterId: fa.requester?.id,
            reason: fa.reason,
            status: fa.status,
            createdAt: fa.created_at,
          });
        });
      }

      setItems(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDecision = async (item: any, newStatus: "approved" | "rejected") => {
    setActionLoading(item.id);
    setStatusMsg(null);
    const supabase = createClient();
    const db = supabase as any;

    try {
      if (item.sourceTable === "refund_requests") {
        const res = await fetch("/api/finance/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_refund_status",
            refundId: item.id,
            status: newStatus,
          }),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Failed to update refund");
      } else if (item.sourceTable === "financial_approvals") {
        const { error } = await db
          .from("financial_approvals")
          .update({
            status: newStatus,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        if (error) throw error;
      }

      // Log to audit events
      await db.from("audit_events").insert({
        action: `FINANCIAL_APPROVAL_${newStatus.toUpperCase()}`,
        entity_type: item.type,
        entity_id: item.id,
        actor_role: "bursar",
        outcome: "SUCCESS",
        reason: `Dual-control authorization ${newStatus} for amount GHS ${item.amount}`,
        new_values: { item_id: item.id, status: newStatus },
      });

      setStatusMsg({
        type: "success",
        message: `Item successfully marked as ${newStatus} and posted to financial audit ledger.`,
      });
      loadData();
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        message: err.message || "Failed to process approval authorization.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesFilter =
      activeFilter === "all"
        ? true
        : activeFilter === "pending"
        ? item.status === "submitted" || item.status === "pending"
        : activeFilter === "approved"
        ? item.status === "approved"
        : activeFilter === item.category;

    const matchesSearch =
      item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.studentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const pendingCount = items.filter((i) => i.status === "submitted" || i.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Dual-Control Financial Approval Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Maker-Checker Segregation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authorizations for refunds, fee waivers, adjustments, and ledger adjustments requiring Bursar sign-off
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dual Control Notice Banner */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Statutory Separation of Duties Policy (Internal Audit Standard 4.1): </span>
          The bursary officer who initiates a financial adjustment or refund cannot authorize it. Approvals must be executed
          by a designated Bursar, Deputy Bursar, or Financial Controller before balance transfers occur.
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            )}
            <span>{statusMsg.message}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Items", count: items.length },
            { id: "pending", label: "Pending Dual Authorization", count: pendingCount, highlight: true },
            { id: "refund", label: "Refunds", count: items.filter((i) => i.category === "refund").length },
            { id: "waiver", label: "Waivers & Grants", count: items.filter((i) => i.category === "waiver").length },
            { id: "approved", label: "Authorized / Posted", count: items.filter((i) => i.status === "approved").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : tab.highlight && tab.count > 0
                  ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeFilter === tab.id
                    ? "bg-white/20 text-white"
                    : tab.highlight && tab.count > 0
                    ? "bg-amber-200 text-amber-900 font-black"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, id, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading approval queue from database...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <FileCheck2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">No approval requests found</div>
            <p className="text-xs text-slate-400 mt-1">All financial adjustments have been processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Request Type</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Initiated By</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Bursar Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isPending = item.status === "submitted" || item.status === "pending";
                  const isApproved = item.status === "approved";
                  const isRejected = item.status === "rejected";

                  return (
                    <tr key={`${item.sourceTable}-${item.id}`} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.type}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.id.slice(0, 8)}... &bull; {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.studentName}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {item.studentNumber} &bull; {item.programme}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 font-mono text-sm">
                        GHS {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-slate-400" />
                          <span>{item.requesterName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Maker ID: {item.requesterId?.slice(0, 8) || "System"}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-600 truncate" title={item.reason}>
                        {item.reason}
                      </td>
                      <td className="py-3 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-2.5 w-2.5" />
                            Pending Authorization
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Authorized & Posted
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="h-2.5 w-2.5" />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDecision(item, "approved")}
                              disabled={actionLoading === item.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {actionLoading === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              <span>Authorize</span>
                            </button>
                            <button
                              onClick={() => handleDecision(item, "rejected")}
                              disabled={actionLoading === item.id}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="h-3 w-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">No action required</span>
                        )}
                      </td>
                    </tr>
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

