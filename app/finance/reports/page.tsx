"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Download,
  RefreshCw,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Printer,
} from "lucide-react";

export default function FinancialReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bursary Financial Reports & Executive Analytics</h1>
          <p className="text-xs text-slate-500">Statutory university collection ratios, aged debtors balance sheet, and revenue realization</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Financial Summary</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Gross Assessed Fees</span>
              <div className="text-2xl font-black text-slate-900">
                GHS {data.stats?.totalInvoiced?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400">Total debit postings</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Realized Revenue</span>
              <div className="text-2xl font-black text-emerald-600">
                GHS {data.stats?.totalCollected?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400">Net realized in bank</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Realization Efficiency</span>
              <div className="text-2xl font-black text-blue-600">
                {data.stats?.collectionRate}%
              </div>
              <p className="text-[11px] text-slate-400">Target baseline: 85%</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Unsettled Receivables</span>
              <div className="text-2xl font-black text-amber-600">
                GHS {data.stats?.totalOutstanding?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400">Aging &lt; 60 days</p>
            </div>
          </div>

          {/* Quarterly Collections Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Quarterly Realization Schedule</h3>
              <span className="text-xs font-semibold text-slate-500">Fiscal Year 2026/2027</span>
            </div>

            <div className="space-y-3">
              {data.quarterData?.map((q: any, idx: number) => {
                const pct = q.totalFee > 0 ? Math.min(100, Math.round((q.collectedFee / q.totalFee) * 100)) : 0;
                return (
                  <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>{q.quarter}</span>
                      <span>
                        GHS {q.collectedFee.toLocaleString()} / GHS {q.totalFee.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

