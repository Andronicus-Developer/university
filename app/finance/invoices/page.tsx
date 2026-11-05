"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Download,
  Loader2,
  DollarSign,
} from "lucide-react";

export default function InvoicesAndChargesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Invoice Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [dueDate, setDueDate] = useState("2026-11-30");
  const [lineDescription, setLineDescription] = useState("First Semester 2026/2027 Composite Academic Fees");
  const [saving, setSaving] = useState(false);
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
          currency,
          status,
          issue_date,
          due_date,
          created_at,
          student:student_id (
            student_number,
            profile:profile_id(full_name, email, phone),
            programme:programme_id(name, code)
          ),
          term:term_id (name, code),
          lines:invoice_lines(*)
        `)
        .order("created_at", { ascending: false });

      setInvoices(invs || []);

      const { data: stu } = await db.from("students").select("id, student_number, profile:profile_id(full_name)");
      setStudents(stu || []);
      if (stu && stu.length > 0 && !selectedStudent) setSelectedStudent(stu[0].id);

      const { data: trms } = await db.from("terms").select("id, name, code");
      setTerms(trms || []);
      if (trms && trms.length > 0 && !selectedTerm) setSelectedTerm(trms[0].id);

      const { data: items } = await db.from("fee_items").select("*");
      setFeeItems(items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const num = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const total = parseFloat(invoiceAmount || "0");

      const { data: newInv, error: invErr } = await db
        .from("student_invoices")
        .insert({
          student_id: selectedStudent,
          term_id: selectedTerm,
          invoice_number: num,
          total_amount: total,
          paid_amount: 0.00,
          balance_amount: total,
          currency: "GHS",
          status: "posted",
          due_date: dueDate || "2026-11-30",
        })
        .select()
        .single();

      if (invErr) throw invErr;

      // Add line item
      if (newInv && feeItems.length > 0) {
        await db.from("invoice_lines").insert({
          invoice_id: newInv.id,
          fee_item_id: feeItems[0].id,
          description: lineDescription || "Semester Tuition",
          amount: total,
        });
      }

      setToastMsg(`Invoice ${num} issued successfully!`);
      setModalOpen(false);
      setInvoiceAmount("");
      await loadData();
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const filtered = invoices.filter((inv) => {
    const studentName = inv.student?.profile?.full_name?.toLowerCase() || "";
    const studentNum = inv.student?.student_number?.toLowerCase() || "";
    const invNum = inv.invoice_number?.toLowerCase() || "";
    const q = searchTerm.toLowerCase();
    const matchesSearch = studentName.includes(q) || studentNum.includes(q) || invNum.includes(q);

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && inv.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Invoices & Fee Charges</h1>
          <p className="text-xs text-slate-500">Official billing records, debit postings, and term fee assessments</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate Student Invoice</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, student name, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="all">All Invoices</option>
            <option value="posted">Posted</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Fully Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Invoice #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Total Billed</th>
                <th className="py-3 px-4">Paid to Date</th>
                <th className="py-3 px-4">Balance Due</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{inv.student?.profile?.full_name || "Enrolled Student"}</div>
                      <div className="text-[10px] text-slate-400">{inv.student?.student_number} • {inv.student?.programme?.code}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      GHS {Number(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      GHS {Number(inv.paid_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-black text-amber-700">
                      GHS {Number(inv.balance_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {inv.due_date}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : inv.status === "partially_paid"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {inv.status?.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Generate Student Fee Invoice</h3>

            <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.profile?.full_name} ({s.student_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Academic Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fee Charge Description</label>
                <input
                  type="text"
                  value={lineDescription}
                  onChange={(e) => setLineDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Amount (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1450.00"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
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
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

