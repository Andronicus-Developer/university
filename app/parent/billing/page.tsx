"use client";

import React, { useState } from "react";
import { CreditCard, Loader2, Printer, Receipt, X } from "lucide-react";
import { useParentSection } from "@/lib/parent/useParentPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicKpiCard,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney, getPortalTerminology } from "@/lib/portals/school-type-labels";

interface BillingData {
  school: { id: string; name: string; school_type: string; currency: string };
  ward: any;
  noLinkedWard?: boolean;
  invoices: Array<{
    id: string;
    invoice_number: string;
    description: string | null;
    total_amount: number;
    paid_amount: number;
    balance: number;
    status: string;
    due_date: string | null;
    created_at: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    provider: string | null;
    provider_reference: string | null;
    receipt_number: string | null;
    payment_method: string | null;
    payment_date: string | null;
    status: string;
    created_at: string;
  }>;
  totals: {
    totalBilled: number;
    totalPaid: number;
    balanceDue: number;
  };
  onlinePaymentsEnabled: boolean;
  enabledGateways: string[];
}

export default function ParentBillingPage() {
  const { data, loading, error, reload, mutate } = useParentSection<BillingData>("billing");
  const [receiptModal, setReceiptModal] = useState<BillingData["payments"][0] | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("mobile_money");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (loading) return <ClassicLoading label="Loading bills & payment receipts..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load fee statement"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);
  if (data.noLinkedWard || !data.ward) {
    return (
      <ClassicEmpty
        icon={CreditCard}
        title={`No Linked ${terms.learnerSingular}`}
        description="Link a child/ward to inspect fee bills and official receipts."
      />
    );
  }

  async function handleOnlinePay(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("submit_online_payment", {
      amount: Number(payAmount),
      paymentMethod: payMethod,
      invoiceId: data?.invoices.find((i) => Number(i.balance) > 0)?.id || null,
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Unable to initiate online payment." });
      return;
    }
    setBanner({
      type: "success",
      text: "Payment reference submitted to School Bursary for gateway confirmation.",
    });
    setPayAmount("");
    setPayModal(false);
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title={`Fees & Payment Receipts (${terms.feeLabel})`}
        subtitle={`${data.school.name} • ${data.ward.full_name} (${data.ward.student_number})`}
        actions={
          <>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Statement</span>
            </button>
            {data.onlinePaymentsEnabled && data.totals.balanceDue > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPayAmount(String(data.totals.balanceDue));
                  setPayModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 text-xs font-medium cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Pay Online</span>
              </button>
            )}
          </>
        }
      />

      {banner && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium flex items-center justify-between ${
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ClassicKpiCard
          label="Total Billed"
          value={formatMoney(data.totals.totalBilled, data.school.currency)}
        />
        <ClassicKpiCard
          label="Total Paid"
          value={formatMoney(data.totals.totalPaid, data.school.currency)}
          tone="success"
        />
        <ClassicKpiCard
          label="Balance Due"
          value={formatMoney(data.totals.balanceDue, data.school.currency)}
          tone={data.totals.balanceDue > 0 ? "warning" : "success"}
        />
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Fee Bills / Invoices ({data.invoices.length})</h2>
        </div>
        {data.invoices.length === 0 ? (
          <div className="p-6 text-xs text-slate-500 text-center">No fee bills issued yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Billed</th>
                  <th className="py-2.5 px-4">Paid</th>
                  <th className="py-2.5 px-4">Balance</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2.5 px-4 font-mono font-medium">{inv.invoice_number}</td>
                    <td className="py-2.5 px-4">{inv.description || terms.feeLabel}</td>
                    <td className="py-2.5 px-4">{formatMoney(inv.total_amount, data.school.currency)}</td>
                    <td className="py-2.5 px-4">{formatMoney(inv.paid_amount, data.school.currency)}</td>
                    <td className="py-2.5 px-4 font-semibold">{formatMoney(inv.balance, data.school.currency)}</td>
                    <td className="py-2.5 px-4 text-slate-500">{(inv.due_date || "").slice(0, 10) || "—"}</td>
                    <td className="py-2.5 px-4">
                      <ClassicStatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments & Receipts */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Payment History & Receipts ({data.payments.length})</h2>
        </div>
        {data.payments.length === 0 ? (
          <div className="p-6 text-xs text-slate-500 text-center">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">Receipt / Reference</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right print:hidden">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-4 font-mono">
                      {p.receipt_number || p.provider_reference || p.id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {(p.payment_date || p.created_at || "").slice(0, 10)}
                    </td>
                    <td className="py-2.5 px-4 capitalize">
                      {String(p.payment_method || p.provider || "Cash").replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5 px-4 font-semibold">
                      {formatMoney(p.amount, p.currency || data.school.currency)}
                    </td>
                    <td className="py-2.5 px-4">
                      <ClassicStatusBadge status={p.status} />
                    </td>
                    <td className="py-2.5 px-4 text-right print:hidden">
                      <button
                        type="button"
                        onClick={() => setReceiptModal(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Receipt className="h-3 w-3" />
                        <span>View Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Official Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold">{data.school.name}</h3>
                <p className="text-[11px] text-slate-500">Official Fee Payment Receipt</p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer print:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">Receipt No.</dt>
                <dd className="font-mono font-semibold">
                  {receiptModal.receipt_number || receiptModal.provider_reference || receiptModal.id.slice(0, 8)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{terms.learnerSingular}</dt>
                <dd className="font-medium">
                  {data.ward.full_name} ({data.ward.student_number})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Payment Date</dt>
                <dd>{(receiptModal.payment_date || receiptModal.created_at || "").slice(0, 10)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Method</dt>
                <dd className="capitalize">
                  {String(receiptModal.payment_method || receiptModal.provider || "Cash").replace(/_/g, " ")}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-sm font-bold">
                <dt>Amount Paid</dt>
                <dd>{formatMoney(receiptModal.amount, receiptModal.currency || data.school.currency)}</dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
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

      {/* Online Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold">Initiate Online Fee Payment</h3>
              <button type="button" onClick={() => setPayModal(false)} className="cursor-pointer">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleOnlinePay} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Amount ({data.school.currency})</label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Channel</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="mobile_money">Mobile Money</option>
                  <option value="card">Card Payment</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Submit Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
