"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Receipt,
  CreditCard,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
} from "lucide-react";

export default function StudentFeeStatementPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFinance() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let stu = null;
        if (user) {
          const { data: s } = await db
            .from("students")
            .select("*, programme:programme_id(*), profile:profile_id(*)")
            .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();
          stu = s;
        }

        if (!stu) {
          const { data: firstStu } = await db
            .from("students")
            .select("*, programme:programme_id(*), profile:profile_id(*)")
            .limit(1)
            .maybeSingle();
          stu = firstStu;
        }

        if (stu) {
          setStudent(stu);

          const { data: invs } = await db
            .from("student_invoices")
            .select("*, lines:invoice_lines(*)")
            .eq("student_id", stu.id)
            .order("issue_date", { ascending: false });

          setInvoices(invs || []);

          const { data: pays } = await db
            .from("payments")
            .select("*")
            .eq("student_id", stu.id)
            .order("verified_at", { ascending: false });

          setPayments(pays || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadFinance();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading student fee statement...</p>
      </div>
    );
  }

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const balanceDue = totalInvoiced - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Official Student Fee Statement</h1>
          <p className="text-xs text-slate-500">Itemized financial billing ledger and payments history</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <Printer className="h-3.5 w-3.5" /> Print Statement
          </button>
          <Link
            href="/student/invoices"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <CreditCard className="h-3.5 w-3.5" /> Make a Payment
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Billed (Debits)</span>
          <p className="text-2xl font-black text-slate-900">
            GHS {totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400">Semester tuition, laboratory, and levies</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Paid (Credits)</span>
          <p className="text-2xl font-black text-emerald-600">
            GHS {totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400">Confirmed & receipted payments</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Net Balance Due</span>
          <p className="text-2xl font-black text-slate-900">
            GHS {balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-600 font-semibold">Payment deadline: 30 Nov 2026</p>
        </div>
      </div>

      {/* Statement Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Account Transactions & Ledger</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Reference No</th>
                <th className="py-3.5 px-6">Description</th>
                <th className="py-3.5 px-6">Debit (Billed)</th>
                <th className="py-3.5 px-6">Credit (Paid)</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 px-6 text-slate-600">{inv.issue_date}</td>
                  <td className="py-4 px-6 font-bold text-blue-700">{inv.invoice_number}</td>
                  <td className="py-4 px-6 font-semibold text-slate-800">First Semester Academic Fees Billing</td>
                  <td className="py-4 px-6 font-bold text-slate-900">
                    GHS {Number(inv.total_amount).toFixed(2)}
                  </td>
                  <td className="py-4 px-6 text-slate-400">-</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px] uppercase">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}

              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition bg-emerald-50/20">
                  <td className="py-4 px-6 text-slate-600">{new Date(p.verified_at).toLocaleDateString()}</td>
                  <td className="py-4 px-6 font-bold text-emerald-700">{p.provider_reference}</td>
                  <td className="py-4 px-6 font-semibold text-slate-800">Payment via {p.payment_method || p.provider}</td>
                  <td className="py-4 px-6 text-slate-400">-</td>
                  <td className="py-4 px-6 font-bold text-emerald-600">
                    GHS {Number(p.amount).toFixed(2)}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

