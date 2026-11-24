"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Banknote, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { useFinanceSection } from "@/lib/finance/useFinancePortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicKpiCard,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney, getPortalTerminology } from "@/lib/portals/school-type-labels";

interface FinanceDashboardData {
  school: { id: string; name: string; school_type: string; currency: string };
  activeTerm: { name: string; code?: string } | null;
  kpis: {
    expectedRevenue: number;
    collectedThisTerm: number;
    outstandingArrears: number;
    todaysCollections: number;
  };
  recentTransactions: Array<{
    id: string;
    student_name: string;
    student_number: string;
    amount: number;
    currency: string;
    payment_method: string | null;
    receipt_number: string | null;
    provider_reference: string | null;
    payment_date: string | null;
    status: string;
    created_at: string;
  }>;
}

export default function FinanceDashboardPage() {
  const { data, loading, error, reload } =
    useFinanceSection<FinanceDashboardData>("dashboard");

  if (loading) return <ClassicLoading label="Loading bursary overview..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load finance dashboard"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Bursary & Finance Overview"
        subtitle={`${data.school.name} • ${terms.feeLabel}${
          data.activeTerm ? ` • ${data.activeTerm.name}` : ""
        }`}
        actions={
          <>
            <Link
              href="/finance/fee-structures"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Manage Fees & Billing
            </Link>
            <Link
              href="/finance/collect"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 text-xs font-medium"
            >
              Collect Payment
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ClassicKpiCard
          label="Total Expected Revenue"
          value={formatMoney(data.kpis.expectedRevenue, data.school.currency)}
          hint="All issued invoices"
          icon={Banknote}
        />
        <ClassicKpiCard
          label={`Collected This ${terms.sessionLabel}`}
          value={formatMoney(data.kpis.collectedThisTerm, data.school.currency)}
          hint="Verified fee receipts"
          icon={CheckCircle2}
          tone="success"
        />
        <ClassicKpiCard
          label="Total Outstanding Arrears"
          value={formatMoney(data.kpis.outstandingArrears, data.school.currency)}
          hint="Unpaid invoice balances"
          icon={AlertCircle}
          tone={data.kpis.outstandingArrears > 0 ? "warning" : "success"}
        />
        <ClassicKpiCard
          label="Today's Collections"
          value={formatMoney(data.kpis.todaysCollections, data.school.currency)}
          hint="Payments recorded today"
          icon={Clock}
          tone="info"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Transactions</h2>
          <Link
            href="/finance/collect"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all / Collect fees
          </Link>
        </div>

        {data.recentTransactions.length === 0 ? (
          <div className="p-6">
            <ClassicEmpty
              icon={CreditCard}
              title="No Transactions Recorded Yet"
              description={`Recorded ${terms.learnerSingular.toLowerCase()} payments will appear here automatically.`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">Receipt / Ref</th>
                  <th className="py-2.5 px-4">{terms.learnerSingular}</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-2.5 px-4 font-mono font-medium">
                      {tx.receipt_number || tx.provider_reference || tx.id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium">{tx.student_name}</span>
                      <span className="block text-[11px] font-mono text-slate-500">
                        {tx.student_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 capitalize">
                      {String(tx.payment_method || "Cash").replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {(tx.payment_date || tx.created_at || "").slice(0, 10)}
                    </td>
                    <td className="py-2.5 px-4 font-semibold">
                      {formatMoney(tx.amount, tx.currency || data.school.currency)}
                    </td>
                    <td className="py-2.5 px-4">
                      <ClassicStatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
