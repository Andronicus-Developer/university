"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Download,
  Filter,
} from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: pays } = await db
        .from("payments")
        .select(`
          id,
          amount,
          currency,
          provider,
          provider_reference,
          payment_method,
          status,
          verified_at,
          created_at,
          student:student_id (
            student_number,
            profile:profile_id (full_name, email),
            programme:programme_id (code)
          )
        `)
        .order("verified_at", { ascending: false });

      // Join receipts
      const payIds = (pays || []).map((p: any) => p.id);
      let receiptMap = new Map();
      if (payIds.length > 0) {
        const { data: recs } = await db.from("receipts").select("payment_id, receipt_number").in("payment_id", payIds);
        (recs || []).forEach((r: any) => receiptMap.set(r.payment_id, r.receipt_number));
      }

      const formatted = (pays || []).map((p: any) => ({
        ...p,
        receiptNumber: receiptMap.get(p.id) || "—",
      }));

      setPayments(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = payments.filter((p) => {
    const name = p.student?.profile?.full_name?.toLowerCase() || "";
    const num = p.student?.student_number?.toLowerCase() || "";
    const ref = (p.provider_reference || "").toLowerCase();
    const rec = (p.receiptNumber || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || num.includes(q) || ref.includes(q) || rec.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Verified Payment Collections</h1>
          <p className="text-xs text-slate-500">Official university realization records from Paystack, Hubtel, and manual cashier deposits</p>
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
            placeholder="Search reference, student, receipt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total Transactions: <span className="font-bold text-slate-900">{filtered.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Provider Reference</th>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Method & Gateway</th>
                <th className="py-3 px-4">Amount (GHS)</th>
                <th className="py-3 px-4">Verified Date</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      {p.provider_reference}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{p.student?.profile?.full_name || "Student"}</div>
                      <div className="text-[10px] text-slate-400">{p.student?.student_number} • {p.student?.programme?.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{p.payment_method || "Online"}</div>
                      <span className="text-[10px] text-slate-400 uppercase">{p.provider}</span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                      GHS {Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {p.verified_at ? new Date(p.verified_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> Successful
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No payment transactions recorded.
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

