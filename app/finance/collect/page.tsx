"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Printer, Receipt, Search, X } from "lucide-react";
import { useFinanceSection } from "@/lib/finance/useFinancePortal";
import {
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney, getPortalTerminology } from "@/lib/portals/school-type-labels";

interface CollectData {
  school: {
    id: string;
    name: string;
    school_type: string;
    currency: string;
    address: string;
    phone: string;
  };
  financeSettings: { receipt_prefix: string; receipt_footer: string };
  students: Array<{
    id: string;
    student_number: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    totalBilled: number;
    totalPaid: number;
    balance: number;
    openInvoices: Array<{
      id: string;
      invoice_number: string;
      description: string | null;
      balance: number;
    }>;
  }>;
  payments: Array<{
    id: string;
    student_id: string;
    student_name: string;
    student_number: string;
    amount: number;
    currency: string;
    payment_method: string | null;
    receipt_number: string | null;
    provider_reference: string | null;
    payment_date: string | null;
    status: string;
    notes: string | null;
    created_at: string;
  }>;
}

export default function FinanceCollectPage() {
  const { data, loading, error, reload, mutate } =
    useFinanceSection<CollectData>("collect");

  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  useEffect(() => {
    setPaymentDate((p) => p || new Date().toISOString().slice(0, 10));
  }, []);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data?.students || [];
    if (!q) return list.slice(0, 20);
    return list
      .filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          (s.student_number || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [data?.students, query]);

  const selectedStudent = useMemo(
    () => (data?.students || []).find((s) => s.id === selectedStudentId) || null,
    [data?.students, selectedStudentId]
  );

  if (loading) return <ClassicLoading label="Loading bursary cashier desk..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load fee collection desk"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  function pickStudent(s: CollectData["students"][0]) {
    setSelectedStudentId(s.id);
    setInvoiceId(s.openInvoices[0]?.id || "");
    setAmount(s.balance > 0 ? String(s.balance) : "");
  }

  async function handleCollect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    setBanner(null);
    const res = await mutate("record_payment", {
      studentId: selectedStudent.id,
      invoiceId: invoiceId || null,
      amount: Number(amount),
      paymentMethod,
      paymentDate,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to record payment." });
      return;
    }
    setBanner({ type: "success", text: "Payment recorded and student balance updated." });
    setActiveReceipt({
      ...res.data?.payment,
      student_name: selectedStudent.full_name,
      student_number: selectedStudent.student_number,
    });
    setReference("");
    setNotes("");
    setAmount("");
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Collect Fees & Issue Receipts"
        subtitle={`${data.school.name} • Lookup any ${terms.learnerSingular.toLowerCase()}, record payment, and print an official receipt`}
      />

      {banner && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium flex items-center justify-between print:hidden ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        {/* Student Lookup */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 space-y-3">
          <h2 className="text-sm font-semibold">1. Select {terms.learnerSingular}</h2>
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search name or ${terms.idLabel}...`}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filteredStudents.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickStudent(s)}
                className={`w-full text-left py-2.5 px-2.5 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  selectedStudentId === s.id
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{s.full_name}</p>
                  <p
                    className={`text-[11px] font-mono ${
                      selectedStudentId === s.id ? "opacity-80" : "text-slate-500"
                    }`}
                  >
                    {s.student_number}
                  </p>
                </div>
                <span className="font-semibold shrink-0">
                  {formatMoney(s.balance, data.school.currency)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Form */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-4">
          <h2 className="text-sm font-semibold">2. Record Payment</h2>
          {!selectedStudent ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Select a {terms.learnerSingular.toLowerCase()} on the left to record a fee payment.
            </p>
          ) : (
            <form onSubmit={handleCollect} className="space-y-3 text-xs">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{selectedStudent.full_name}</p>
                  <p className="text-slate-500 font-mono">{selectedStudent.student_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-500">Current Balance Due</p>
                  <p className="text-sm font-bold">
                    {formatMoney(selectedStudent.balance, data.school.currency)}
                  </p>
                </div>
              </div>

              {selectedStudent.openInvoices.length > 0 && (
                <div>
                  <label className="block font-medium mb-1">Apply to Invoice (Optional)</label>
                  <select
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Oldest unpaid invoice (Auto)</option>
                    {selectedStudent.openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {inv.description || terms.feeLabel} (Bal:{" "}
                        {formatMoney(inv.balance, data.school.currency)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Amount ({data.school.currency}) *</label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="bank_transfer">Bank Deposit / Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Bank / MoMo / Cheque Ref (Optional)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Cashier Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Paid by guardian / installment note"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Record Payment & Generate Receipt</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Recent Receipts Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden print:hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Recent Official Receipts ({data.payments.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                <th className="py-2.5 px-4">Receipt No.</th>
                <th className="py-2.5 px-4">{terms.learnerSingular}</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 px-4 font-mono font-medium">
                    {p.receipt_number || p.provider_reference || p.id.slice(0, 8)}
                  </td>
                  <td className="py-2.5 px-4">
                    {p.student_name}{" "}
                    <span className="text-[11px] font-mono text-slate-500">
                      ({p.student_number})
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">
                    {(p.payment_date || p.created_at || "").slice(0, 10)}
                  </td>
                  <td className="py-2.5 px-4 capitalize">
                    {String(p.payment_method || "cash").replace(/_/g, " ")}
                  </td>
                  <td className="py-2.5 px-4 font-semibold">
                    {formatMoney(p.amount, p.currency || data.school.currency)}
                  </td>
                  <td className="py-2.5 px-4">
                    <ClassicStatusBadge status={p.status} />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setActiveReceipt(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium cursor-pointer"
                    >
                      <Receipt className="h-3 w-3" />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Official Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 print:static print:bg-transparent print:p-0">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 print:border-slate-400">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold">{data.school.name}</h3>
                {data.school.address && (
                  <p className="text-[11px] text-slate-500">{data.school.address}</p>
                )}
                <p className="text-xs font-semibold mt-1 uppercase tracking-wide">
                  Official Fee Receipt
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="p-1 text-slate-400 cursor-pointer print:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">Receipt No.</dt>
                <dd className="font-mono font-bold">
                  {activeReceipt.receipt_number ||
                    activeReceipt.provider_reference ||
                    String(activeReceipt.id || "").slice(0, 8)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{terms.learnerSingular}</dt>
                <dd className="font-semibold">
                  {activeReceipt.student_name} ({activeReceipt.student_number})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Date</dt>
                <dd>
                  {String(activeReceipt.payment_date || activeReceipt.created_at || "").slice(0, 10)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Method</dt>
                <dd className="capitalize">
                  {String(activeReceipt.payment_method || "Cash").replace(/_/g, " ")}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-sm font-bold">
                <dt>Amount Received</dt>
                <dd>
                  {formatMoney(activeReceipt.amount, activeReceipt.currency || data.school.currency)}
                </dd>
              </div>
            </dl>
            <p className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
              {data.financeSettings.receipt_footer}
            </p>
            <div className="flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 text-xs font-medium cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
