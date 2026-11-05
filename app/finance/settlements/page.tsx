"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Download,
} from "lucide-react";

export default function ProviderSettlementsPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: bList } = await db.from("settlement_batches").select("*").order("settlement_date", { ascending: false });
      setBatches(bList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = batches.filter((b) => {
    const prov = b.provider.toLowerCase();
    const ref = b.batch_reference.toLowerCase();
    const notes = (b.notes || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return prov.includes(q) || ref.includes(q) || notes.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payment Provider Settlement Batches</h1>
          <p className="text-xs text-slate-500">Bank clearing payouts from Paystack, Hubtel, and telecom mobile money aggregators</p>
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
            placeholder="Search provider, batch reference, bank note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Settlement Batches: <span className="font-bold text-slate-900">{filtered.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Batch Reference</th>
                <th className="py-3 px-4">Provider Gateway</th>
                <th className="py-3 px-4">Settlement Destination</th>
                <th className="py-3 px-4">Cleared Amount</th>
                <th className="py-3 px-4">Payout Date</th>
                <th className="py-3 px-6 text-right">Reconciliation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      {b.batch_reference}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 uppercase">
                      {b.provider}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                      {b.notes}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                      GHS {Number(b.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {b.settlement_date}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                          b.reconciliation_status === "reconciled"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {b.reconciliation_status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No settlement batches recorded.
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

