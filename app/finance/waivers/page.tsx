"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  FileText,
  DollarSign,
  Loader2,
} from "lucide-react";

export default function WaiversAndDiscountsPage() {
  const [waivers, setWaivers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [waiverAmount, setWaiverAmount] = useState("");
  const [waiverReason, setWaiverReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: wList } = await db
        .from("waivers")
        .select(`
          id,
          amount,
          reason,
          approved_at,
          student:student_id (
            student_number,
            profile:profile_id (full_name)
          ),
          invoice:invoice_id (invoice_number, total_amount),
          approver:approved_by (full_name)
        `)
        .order("approved_at", { ascending: false });

      setWaivers(wList || []);

      const { data: stu } = await db.from("students").select("id, student_number, profile:profile_id(full_name)");
      setStudents(stu || []);
      if (stu && stu.length > 0 && !selectedStudent) setSelectedStudent(stu[0].id);

      const { data: invs } = await db.from("student_invoices").select("id, invoice_number, total_amount, balance_amount");
      setInvoices(invs || []);
      if (invs && invs.length > 0 && !selectedInvoice) setSelectedInvoice(invs[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await db.from("waivers").insert({
        student_id: selectedStudent,
        invoice_id: selectedInvoice,
        amount: parseFloat(waiverAmount || "0"),
        reason: waiverReason || "Bursar Approved Academic Fee Waiver",
        approved_by: user?.id || "a0000000-0000-0000-0000-000000000001",
      });

      if (error) throw error;

      setToastMsg("Fee waiver granted & recorded in ledger!");
      setModalOpen(false);
      setWaiverAmount("");
      setWaiverReason("");
      await loadData();
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to grant waiver");
    } finally {
      setSaving(false);
    }
  };

  const filtered = waivers.filter((w) => {
    const sName = (w.student?.profile?.full_name || "").toLowerCase();
    const num = (w.student?.student_number || "").toLowerCase();
    const r = (w.reason || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return sName.includes(q) || num.includes(q) || r.includes(q);
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
          <h1 className="text-xl font-bold text-slate-900">Fee Waivers & Administrative Discounts</h1>
          <p className="text-xs text-slate-500">Authorized fee exemptions, hardship relief, and Dean discounts</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Grant Fee Waiver</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, waiver reason, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total Granted Waivers: <span className="font-bold text-slate-900">{filtered.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Beneficiary Student</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Waiver Reason</th>
                <th className="py-3 px-4">Relief Amount</th>
                <th className="py-3 px-4">Authorized By</th>
                <th className="py-3 px-6 text-right">Date Approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900">{w.student?.profile?.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {w.student?.student_number}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {w.invoice?.invoice_number || "Invoice"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      {w.reason}
                    </td>
                    <td className="py-3.5 px-4 font-black text-emerald-700 text-sm">
                      GHS {Number(w.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {w.approver?.full_name || "Dean / Registrar"}
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-500">
                      {w.approved_at ? new Date(w.approved_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Today"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No fee waivers recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Grant Student Fee Waiver</h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.profile?.full_name} ({st.student_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Invoice</label>
                <select
                  value={selectedInvoice}
                  onChange={(e) => setSelectedInvoice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - Balance: GHS {inv.balance_amount}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Waiver Amount (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 100.00"
                  value={waiverAmount}
                  onChange={(e) => setWaiverAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exemption Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved merit discount / medical hardship relief"
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Waiver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

