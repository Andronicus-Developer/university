"use client";

import React from "react";
import { CheckCircle2, CreditCard, Printer, Receipt } from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  formatMoney,
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function StudentFeeStatementPage() {
  const { data, loading, error, reload } = useStudentPortalSection("fees");

  if (loading) {
    return <StudentPageLoading label="Loading fee statement & payment history..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const schoolType = data.school?.schoolType || "university";
  const symbol = data.school?.currencySymbol || "$";
  const currency = data.school?.currency || "USD";
  const summary = data.summary || { totalInvoiced: 0, totalPaid: 0, balanceDue: 0 };
  const invoices = data.invoices || [];
  const payments = data.payments || [];
  const feeStructures = data.feeStructures || [];

  const title =
    schoolType === "vocational"
      ? "Fees & Workshop Materials Statement"
      : schoolType === "high_school"
      ? "School Fees & Term Levies"
      : "Tuition & Fee Statement";

  const subtitle =
    schoolType === "vocational"
      ? "Live breakdown of training tuition, toolkit levies, workshop material charges, and receipts."
      : schoolType === "high_school"
      ? "Live breakdown of term tuition, boarding/day levies, payment receipts, and balance."
      : "Live breakdown of billed semester tuition, institutional levies, payments, and account balance.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer self-start"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="text-xs font-semibold text-slate-500">Total Billed</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {formatMoney(summary.totalInvoiced, symbol, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {invoices.length} issued invoice(s)
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="text-xs font-semibold text-slate-500">Total Paid</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatMoney(summary.totalPaid, symbol, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {payments.length} verified payment record(s)
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="text-xs font-semibold text-slate-500">Outstanding Balance</div>
          <div
            className={`text-2xl font-extrabold mt-1 ${
              Number(summary.balanceDue) > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatMoney(summary.balanceDue, symbol, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 inline-flex items-center gap-1">
            {Number(summary.balanceDue) <= 0 ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Cleared</span>
              </>
            ) : (
              <span>Payable at School Bursar / Finance Desk</span>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Invoices &amp; Billing Ledger
          </h2>
        </div>

        {invoices.length === 0 ? (
          <div className="p-6">
            <StudentEmptyState
              icon={Receipt}
              title="No Invoices Issued Yet"
              description="Fee invoices billed by the Bursar / Finance Office for your account will appear here automatically."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-right">Billed</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv: any) => {
                  const bal =
                    inv.balance != null
                      ? Number(inv.balance)
                      : Math.max(0, Number(inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0));
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {inv.invoice_number || inv.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold">
                        {formatMoney(inv.total_amount, symbol, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-emerald-600 font-semibold">
                        {formatMoney(inv.paid_amount, symbol, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {formatMoney(bal, symbol, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {inv.due_date || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {inv.status || "unpaid"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Receipts History & Applicable Fee Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span>Payment History &amp; Receipts</span>
          </h2>
          {payments.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">No payment receipts recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {payments.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {p.provider_reference || "Payment Receipt"}
                    </div>
                    <div className="text-[11px] text-slate-500 capitalize">
                      {String(p.payment_method || "manual").replace(/_/g, " ")} ·{" "}
                      {(p.verified_at || p.created_at || "").slice(0, 10)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-emerald-600">
                      {formatMoney(p.amount, symbol, p.currency || currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                      {p.status || "completed"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Applicable Fee Schedule Breakdown
          </h2>
          {feeStructures.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">
              No institutional fee structures configured for your cohort yet.
            </p>
          ) : (
            <div className="space-y-2">
              {feeStructures.map((fs: any) => (
                <div
                  key={fs.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {fs.name}
                    </div>
                    <div className="text-[11px] text-slate-500 capitalize">
                      {fs.code} · {String(fs.category || "tuition").replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatMoney(fs.amount, symbol, fs.currency || currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
