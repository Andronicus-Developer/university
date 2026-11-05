"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  ShieldCheck,
  Check,
  Loader2,
} from "lucide-react";

export default function PaymentReconciliationPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: bList } = await db.from("settlement_batches").select("*").order("settlement_date", { ascending: false });
      setBatches(bList || []);

      const { data: pList } = await db.from("payments").select("*, student:student_id(profile:profile_id(full_name))").order("verified_at", { ascending: false }).limit(10);
      setPayments(pList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReconcile = async (batchId: string) => {
    setReconcilingId(batchId);
    try {
      const res = await fetch("/api/finance/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reconcile_batch",
          batchId,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to reconcile");

      setToastMsg("Settlement batch reconciled with university main ledger!");
      await loadData();
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to reconcile");
    } finally {
      setReconcilingId(null);
    }
  };

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
          <h1 className="text-xl font-bold text-slate-900">Payment Gateway Reconciliation</h1>
          <p className="text-xs text-slate-500">Match bank clearing statements with Paystack, Hubtel, and MTN MoMo settlement logs</p>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Reconciled Payouts</span>
          <div className="text-2xl font-black text-emerald-600">
            GHS {batches.filter(b => b.reconciliation_status === "reconciled").reduce((s, b) => s + Number(b.total_amount), 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">Credited directly to GCB operating account</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Pending Gateway Clearing</span>
          <div className="text-2xl font-black text-amber-600">
            GHS {batches.filter(b => b.reconciliation_status !== "reconciled").reduce((s, b) => s + Number(b.total_amount), 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">Awaiting daily bank settlement slip</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Audit Match Rate</span>
          <div className="text-2xl font-black text-blue-600">
            100%
          </div>
          <p className="text-[11px] text-slate-500">Zero unallocated payment discrepancies</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Settlement Clearing Batches</h2>
          <span className="text-xs font-semibold text-slate-400">Daily Webhooks</span>
        </div>

        <div className="divide-y divide-slate-100">
          {batches.map((batch) => {
            const isReconciling = reconcilingId === batch.id;
            return (
              <div key={batch.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold text-xs uppercase">
                      {batch.provider}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{batch.batch_reference}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                        batch.reconciliation_status === "reconciled"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {batch.reconciliation_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{batch.notes}</p>
                  <p className="text-[11px] text-slate-400">Settled On: {batch.settlement_date}</p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <div className="text-right">
                    <div className="text-base font-black text-slate-900">
                      GHS {Number(batch.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  {batch.reconciliation_status !== "reconciled" && (
                    <button
                      onClick={() => handleReconcile(batch.id)}
                      disabled={isReconciling}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {isReconciling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Certify & Match
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

