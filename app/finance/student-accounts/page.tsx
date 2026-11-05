"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Search,
  RefreshCw,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function StudentAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      // Query students with profiles and their invoices
      const { data: students } = await db
        .from("students")
        .select(`
          id,
          student_number,
          current_level,
          status,
          profile:profile_id(full_name, email, phone, address),
          programme:programme_id(name, code),
          invoices:student_invoices(id, invoice_number, total_amount, paid_amount, balance_amount, status)
        `);

      const formatted = (students || []).map((s: any) => {
        let totalBilled = 0;
        let totalPaid = 0;
        let balanceDue = 0;

        (s.invoices || []).forEach((inv: any) => {
          totalBilled += Number(inv.total_amount || 0);
          totalPaid += Number(inv.paid_amount || 0);
          balanceDue += Number(inv.balance_amount || 0);
        });

        const isCleared = balanceDue === 0;

        return {
          id: s.id,
          studentNumber: s.student_number,
          fullName: s.profile?.full_name || "Student",
          email: s.profile?.email,
          phone: s.profile?.phone,
          programme: s.programme?.name,
          programmeCode: s.programme?.code,
          level: s.current_level,
          totalBilled,
          totalPaid,
          balanceDue,
          isCleared,
          invoicesCount: (s.invoices || []).length,
        };
      });

      setAccounts(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = accounts.filter((a) => {
    const name = a.fullName.toLowerCase();
    const num = a.studentNumber.toLowerCase();
    const prog = (a.programme || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || num.includes(q) || prog.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Financial Accounts Ledger</h1>
          <p className="text-xs text-slate-500">Comprehensive student balance statements, payment history, and credit clearance</p>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student account, name, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total Student Ledgers: <span className="font-bold text-slate-900">{filtered.length}</span>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Student Account</th>
                <th className="py-3 px-4">Programme & Level</th>
                <th className="py-3 px-4">Total Invoiced</th>
                <th className="py-3 px-4">Payments Made</th>
                <th className="py-3 px-4">Outstanding Balance</th>
                <th className="py-3 px-6 text-right">Clearance Standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900">{acc.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {acc.studentNumber}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{acc.programme || "BSc Computing"}</div>
                      <span className="text-[10px] text-slate-500">Level {acc.level}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      GHS {acc.totalBilled.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      GHS {acc.totalPaid.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      <span className={acc.balanceDue > 0 ? "text-amber-700" : "text-emerald-700"}>
                        GHS {acc.balanceDue.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {acc.isCleared ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Fully Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-bold text-[10px]">
                          <AlertCircle className="h-3 w-3" /> Balance Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No student accounts found.
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

