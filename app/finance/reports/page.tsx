"use client";

import React, { useState } from "react";
import { BarChart3, Download, Printer } from "lucide-react";
import { useFinanceSection } from "@/lib/finance/useFinancePortal";
import {
  ClassicError,
  ClassicKpiCard,
  ClassicLoading,
  ClassicMigrationNotice,
  ClassicPageHeader,
  downloadCsv,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney, getPortalTerminology } from "@/lib/portals/school-type-labels";

interface ReportsData {
  school: { id: string; name: string; school_type: string; currency: string };
  missingTables: string[];
  summary: {
    totalIncome: number;
    operationalExpenses: number;
    payrollDisbursed: number;
    totalExpenses: number;
    netSurplus: number;
    paymentsCount: number;
    expensesCount: number;
  };
  breakdownByUnit: Array<{
    group: string;
    billed: number;
    collected: number;
    outstanding: number;
  }>;
}

export default function FinanceReportsPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, loading, error, reload } = useFinanceSection<ReportsData>("reports", {
    from: fromDate || undefined,
    to: toDate || undefined,
  });

  if (loading) return <ClassicLoading label="Compiling financial reports..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load financial reports"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  function handleExportCsv() {
    downloadCsv(
      "finance-collection-breakdown.csv",
      [terms.unitLabel, "Billed", "Collected", "Outstanding"],
      (data?.breakdownByUnit || []).map((row) => [
        row.group,
        row.billed.toFixed(2),
        row.collected.toFixed(2),
        row.outstanding.toFixed(2),
      ])
    );
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Financial Reports"
        subtitle={`${data.school.name} • Income vs. Expense statement & fee breakdown by ${terms.unitLabel.toLowerCase()}`}
        actions={
          <>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 text-xs font-medium cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Report</span>
            </button>
          </>
        }
      />

      <ClassicMigrationNotice tables={data.missingTables} />

      {/* Date Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 flex flex-wrap items-end gap-3 print:hidden">
        <div className="text-xs">
          <label className="block font-medium mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          />
        </div>
        <div className="text-xs">
          <label className="block font-medium mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          />
        </div>
        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
          >
            Reset Dates
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ClassicKpiCard
          label="Fee Collections (Income)"
          value={formatMoney(data.summary.totalIncome, data.school.currency)}
          hint={`${data.summary.paymentsCount} payments`}
          tone="success"
        />
        <ClassicKpiCard
          label="Operational Expenses"
          value={formatMoney(data.summary.operationalExpenses, data.school.currency)}
          hint={`${data.summary.expensesCount} entries`}
          tone="warning"
        />
        <ClassicKpiCard
          label="Payroll Disbursed"
          value={formatMoney(data.summary.payrollDisbursed, data.school.currency)}
        />
        <ClassicKpiCard
          label="Net Position"
          value={formatMoney(data.summary.netSurplus, data.school.currency)}
          icon={BarChart3}
          tone={data.summary.netSurplus >= 0 ? "info" : "danger"}
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold">
            Fee Collection Breakdown by {terms.unitLabel}
          </h2>
        </div>
        {data.breakdownByUnit.length === 0 ? (
          <p className="p-6 text-xs text-slate-500 text-center">
            No billed cohorts found in the selected period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">{terms.unitLabel}</th>
                  <th className="py-2.5 px-4">Total Billed</th>
                  <th className="py-2.5 px-4">Collected</th>
                  <th className="py-2.5 px-4">Outstanding</th>
                  <th className="py-2.5 px-4">Collection Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.breakdownByUnit.map((row) => {
                  const pct =
                    row.billed > 0 ? Math.round((row.collected / row.billed) * 100) : 0;
                  return (
                    <tr key={row.group}>
                      <td className="py-2.5 px-4 font-medium">{row.group}</td>
                      <td className="py-2.5 px-4">{formatMoney(row.billed, data.school.currency)}</td>
                      <td className="py-2.5 px-4 text-emerald-700 dark:text-emerald-400">
                        {formatMoney(row.collected, data.school.currency)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold">
                        {formatMoney(row.outstanding, data.school.currency)}
                      </td>
                      <td className="py-2.5 px-4">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
