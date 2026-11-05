"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Receipt,
  Search,
  RefreshCw,
  Download,
  Printer,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: recs } = await db
        .from("receipts")
        .select(`
          id,
          receipt_number,
          amount,
          currency,
          issued_at,
          receipt_data,
          student:student_id (
            student_number,
            profile:profile_id (full_name, email),
            programme:programme_id (name, code)
          ),
          payment:payment_id (
            provider,
            provider_reference,
            payment_method
          )
        `)
        .order("issued_at", { ascending: false });

      setReceipts(recs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = receipts.filter((r) => {
    const num = r.receipt_number?.toLowerCase() || "";
    const name = r.student?.profile?.full_name?.toLowerCase() || "";
    const stuNum = r.student?.student_number?.toLowerCase() || "";
    const q = searchTerm.toLowerCase();
    return num.includes(q) || name.includes(q) || stuNum.includes(q);
  });

  const handlePrint = (receipt: any) => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Official Payment Receipts</h1>
          <p className="text-xs text-slate-500">Certified university financial receipts generated post-payment reconciliation</p>
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
            placeholder="Search receipt #, student name, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total Issued Receipts: <span className="font-bold text-slate-900">{filtered.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Receipt #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Channel & Reference</th>
                <th className="py-3 px-4">Amount Issued</th>
                <th className="py-3 px-4">Date Issued</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {r.receipt_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{r.student?.profile?.full_name}</div>
                      <div className="text-[10px] text-slate-400">{r.student?.student_number} • {r.student?.programme?.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{r.payment?.payment_method || r.receipt_data?.channel || "Electronic Payment"}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{r.payment?.provider_reference || r.receipt_data?.ref}</span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-emerald-700 text-sm">
                      GHS {Number(r.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {r.issued_at ? new Date(r.issued_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handlePrint(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No receipts found.
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

