"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowDownRight,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Check,
  X,
  Loader2,
  DollarSign,
} from "lucide-react";

export default function RefundRequestsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: refs } = await db
        .from("refund_requests")
        .select(`
          id,
          amount,
          reason,
          status,
          created_at,
          approved_at,
          student:student_id (
            student_number,
            profile:profile_id (full_name, email, phone),
            programme:programme_id (code)
          ),
          payment:payment_id (
            provider_reference,
            amount,
            payment_method
          ),
          requester:requested_by (full_name),
          approver:approved_by (full_name)
        `)
        .order("created_at", { ascending: false });

      setRefunds(refs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (refundId: string, status: "approved" | "rejected") => {
    setActionLoading(`refund-${refundId}`);
    try {
      const res = await fetch("/api/finance/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_refund_status",
          refundId,
          status,
          comments: `Refund request ${status} through Bursar Refunds console`,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to update refund");

      setToastMsg(`Refund request marked as ${status}!`);
      await loadData();
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to process refund");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = refunds.filter((r) => {
    const sName = (r.student?.profile?.full_name || "").toLowerCase();
    const num = (r.student?.student_number || "").toLowerCase();
    const reason = (r.reason || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return sName.includes(q) || num.includes(q) || reason.includes(q);
  });

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Fee Refund Requests</h1>
          <p className="text-xs text-slate-500">Dual-control authorization for overpayments, withdrawals, and course drop refunds</p>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, reason, refund ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total Refund Cases: <span className="font-bold text-slate-900">{filtered.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Student Applicant</th>
                <th className="py-3 px-4">Refund Justification</th>
                <th className="py-3 px-4">Refund Amount</th>
                <th className="py-3 px-4">Payment Reference</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Dual-Control Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((ref) => {
                  const isProcessing = actionLoading === `refund-${ref.id}`;
                  return (
                    <tr key={ref.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">{ref.student?.profile?.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {ref.student?.student_number}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs text-slate-600">
                        {ref.reason}
                      </td>
                      <td className="py-3.5 px-4 font-black text-red-600 text-sm">
                        GHS {Number(ref.amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {ref.payment?.provider_reference || "Direct Payment"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                            ref.status === "approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : ref.status === "rejected"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {ref.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {ref.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateStatus(ref.id, "approved")}
                              disabled={isProcessing}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(ref.id, "rejected")}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {ref.approver?.full_name ? `By ${ref.approver.full_name}` : "Processed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No refund applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

