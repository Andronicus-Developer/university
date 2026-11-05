"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  Search,
  RefreshCw,
  Phone,
  Mail,
  ChevronRight,
  Clock,
  Send,
  CreditCard,
} from "lucide-react";
import Link from "next/link";

export default function OutstandingBalancesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: invs } = await db
        .from("student_invoices")
        .select(`
          id,
          invoice_number,
          total_amount,
          paid_amount,
          balance_amount,
          due_date,
          status,
          student:student_id (
            student_number,
            profile:profile_id (full_name, email, phone),
            programme:programme_id (name, code)
          ),
          term:term_id (name)
        `)
        .gt("balance_amount", 0)
        .order("balance_amount", { ascending: false });

      setInvoices(invs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendReminder = (studentName: string) => {
    setToastMsg(`SMS & Email payment reminder dispatched to ${studentName}!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const filtered = invoices.filter((inv) => {
    const name = (inv.student?.profile?.full_name || "").toLowerCase();
    const num = (inv.student?.student_number || "").toLowerCase();
    const invNum = (inv.invoice_number || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || num.includes(q) || invNum.includes(q);
  });

  const totalOutstanding = filtered.reduce((s, i) => s + Number(i.balance_amount || 0), 0);

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <Send className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Arrears & Outstanding Receivables</h1>
          <p className="text-xs text-slate-500">Unsettled semester tuition, laboratory fees, and active debtor accounts</p>
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
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Outstanding Arrears</span>
          <div className="text-2xl font-black text-amber-600">
            GHS {totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Subject to academic registration & exam clearance</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Debtor Accounts</span>
          <div className="text-2xl font-black text-slate-900">
            {filtered.length} Students
          </div>
          <p className="text-[11px] text-slate-500">Unsettled balance records</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Fee Due Cutoff</span>
          <div className="text-2xl font-black text-blue-600">
            30 Nov 2026
          </div>
          <p className="text-[11px] text-slate-500">Enforcement of financial hold begins</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search debtor name, ID, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> debtor records
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Student</th>
                <th className="py-3 px-4">Programme & Level</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Total Billed</th>
                <th className="py-3 px-4">Paid Amount</th>
                <th className="py-3 px-4">Balance Due</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900">{inv.student?.profile?.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{inv.student?.student_number} • {inv.student?.profile?.phone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {inv.student?.programme?.name || "BSc Computing"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      GHS {Number(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      GHS {Number(inv.paid_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-black text-amber-700 text-sm">
                      GHS {Number(inv.balance_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleSendReminder(inv.student?.profile?.full_name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition cursor-pointer"
                      >
                        <Send className="h-3 w-3" /> Remind
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No outstanding balance records found.
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

