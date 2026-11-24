"use client";

import React, { useMemo, useState } from "react";
import { Download, Search, Users } from "lucide-react";
import { useFinanceSection } from "@/lib/finance/useFinancePortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
  downloadCsv,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney, getPortalTerminology } from "@/lib/portals/school-type-labels";

interface BalancesData {
  school: { id: string; name: string; school_type: string; currency: string };
  ledger: Array<{
    id: string;
    student_number: string;
    full_name: string;
    unitName: string;
    billed: number;
    paid: number;
    balance: number;
    status: "paid" | "partial" | "unpaid";
  }>;
}

export default function FinanceBalancesPage() {
  const { data, loading, error, reload } = useFinanceSection<BalancesData>("balances");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.ledger || []).filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.full_name.toLowerCase().includes(q) ||
        (row.student_number || "").toLowerCase().includes(q) ||
        row.unitName.toLowerCase().includes(q)
      );
    });
  }, [data?.ledger, statusFilter, query]);

  if (loading) return <ClassicLoading label="Loading student balances..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load balances"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  function handleExportCsv() {
    downloadCsv(
      "student-balances.csv",
      [terms.idLabel, "Name", terms.unitLabel, "Billed", "Paid", "Balance", "Status"],
      filtered.map((r) => [
        r.student_number,
        r.full_name,
        r.unitName,
        r.billed.toFixed(2),
        r.paid.toFixed(2),
        r.balance.toFixed(2),
        r.status,
      ])
    );
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title={`${terms.learnerSingular} Balances & Debtors`}
        subtitle={`${data.school.name} • Real-time fee status across ${data.ledger.length} ${terms.learnerPlural.toLowerCase()}`}
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "paid", "partial", "unpaid"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${terms.learnerSingular.toLowerCase()}, ID, or ${terms.unitLabel.toLowerCase()}...`}
            className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-full sm:w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <ClassicEmpty
          icon={Users}
          title="No Matching Records"
          description="Try clearing your search or status filter."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">{terms.idLabel}</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">{terms.unitLabel}</th>
                  <th className="py-2.5 px-4">Billed</th>
                  <th className="py-2.5 px-4">Paid</th>
                  <th className="py-2.5 px-4">Balance Due</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-4 font-mono">{r.student_number}</td>
                    <td className="py-2.5 px-4 font-medium">{r.full_name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{r.unitName}</td>
                    <td className="py-2.5 px-4">{formatMoney(r.billed, data.school.currency)}</td>
                    <td className="py-2.5 px-4 text-emerald-700 dark:text-emerald-400">
                      {formatMoney(r.paid, data.school.currency)}
                    </td>
                    <td className="py-2.5 px-4 font-semibold">
                      {formatMoney(r.balance, data.school.currency)}
                    </td>
                    <td className="py-2.5 px-4">
                      <ClassicStatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
