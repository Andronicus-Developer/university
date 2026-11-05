"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowRight,
  Download,
  Calendar,
  Building2,
  DollarSign,
  ShieldCheck,
  Award,
  Sparkles,
  Users,
  FileText,
  Clock,
  X,
  CheckSquare,
  BarChart3,
  Loader2,
  ArrowDownRight,
  Layers,
  ChevronRight,
  Send,
  HelpCircle,
  Wallet,
  Check,
} from "lucide-react";

interface FinanceDashboardData {
  activeTerm: {
    name: string;
    code: string;
    academic_year?: { code: string; name: string };
  };
  stats: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionRate: number;
    totalInvoicesCount: number;
    paidInvoicesCount: number;
    partialInvoicesCount: number;
    overdueInvoicesCount: number;
    scholarshipsTotal: number;
    scholarshipsCount: number;
    waiversTotal: number;
    waiversCount: number;
    refundsPendingCount: number;
    refundsPendingAmount: number;
    settlementsReconciled: number;
    settlementsPending: number;
    settlementBatchesCount: number;
    feeSchedulesCount: number;
  };
  quarterData: { quarter: string; totalFee: number; collectedFee: number }[];
  paymentChannels: { name: string; total: number; count: number; percentage: number }[];
  recentPayments: any[];
  outstandingDebtors: any[];
  approvalQueue: {
    refunds: any[];
    waivers: any[];
  };
  settlementBatches: any[];
  auditEvents: any[];
}

export default function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payStudentId, setPayStudentId] = useState("");
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Direct Bank Deposit");
  const [payReference, setPayReference] = useState("");

  // Tabs
  const [analyticsTab, setAnalyticsTab] = useState<"Quarterly" | "Gateways" | "Settlements">("Quarterly");

  // Checklist
  const [todos, setTodos] = useState<{ id: number; text: string; time: string; completed: boolean }[]>([
    { id: 1, text: "Reconcile daily MTN Mobile Money settlements", time: "09:00 AM", completed: true },
    { id: 2, text: "Review pending student refund requests (Library deposit)", time: "11:30 AM", completed: false },
    { id: 3, text: "Audit scholarship fund allocations for Semester 1", time: "02:00 PM", completed: false },
    { id: 4, text: "Generate weekly cashflow report for Vice-Chancellor", time: "04:30 PM", completed: false },
    { id: 5, text: "Verify bank direct deposits against clearing slips", time: "05:15 PM", completed: false },
  ]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/finance/dashboard");
      if (!res.ok) {
        throw new Error(`Failed to load finance dashboard: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));

      // Preset student ID if debtor exists
      if (json.outstandingDebtors && json.outstandingDebtors.length > 0) {
        setPayStudentId(json.outstandingDebtors[0].student?.id || "");
        setPayInvoiceId(json.outstandingDebtors[0].id || "");
        setPayAmount(String(json.outstandingDebtors[0].balance_amount || ""));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load financial records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // 1. Approve / Reject Refund
  const handleUpdateRefund = async (refundId: string, status: "approved" | "rejected") => {
    setActionLoading(`refund-${refundId}`);
    try {
      const res = await fetch("/api/finance/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_refund_status",
          refundId,
          status,
          comments: `Refund ${status} through Bursar Dashboard Dual-Control authorization`,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to update refund");

      showToast(`Refund request successfully ${status}! Audit log recorded.`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || "Error processing refund", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Reconcile Settlement Batch
  const handleReconcileBatch = async (batchId: string, batchRef: string) => {
    setActionLoading(`batch-${batchId}`);
    try {
      const res = await fetch("/api/finance/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reconcile_batch",
          batchId,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to reconcile batch");

      showToast(`Batch ${batchRef} reconciled & certified with operating account.`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || "Error reconciling batch", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Record Manual Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("record-payment");
    try {
      const res = await fetch("/api/finance/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_payment",
          studentId: payStudentId,
          invoiceId: payInvoiceId || undefined,
          amount: payAmount,
          paymentMethod: payMethod,
          reference: payReference || `MAN-${Date.now().toString().slice(-6)}`,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to record payment");

      showToast(resJson.message || "Payment recorded and official receipt generated!");
      setPaymentModalOpen(false);
      setPayAmount("");
      setPayReference("");
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || "Error recording payment", "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">Loading live Bursar financial ledgers & gateway reconciliation...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-red-900">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>Unable to Load Financial Data</span>
        </div>
        <p className="text-xs text-red-700">{error || "No data received from financial database."}</p>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry Loading
        </button>
      </div>
    );
  }

  const { stats, quarterData, paymentChannels, recentPayments, outstandingDebtors, approvalQueue, settlementBatches, auditEvents, activeTerm } = data;

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 max-w-md animate-in slide-in-from-bottom-5 duration-200 ${
            toastMsg.type === "success"
              ? "bg-slate-900 text-white border-slate-800 shadow-slate-900/20"
              : "bg-red-600 text-white border-red-700 shadow-red-900/20"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-white shrink-0" />
          )}
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="ml-auto text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header Welcome & Quick Actions Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>{activeTerm?.academic_year?.name || "2026/2027 Academic Year"} • {activeTerm?.name || "First Semester"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Financial Operations & Bursary Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time university fee billing, mobile money collection reconciliation, and multi-channel audit ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Record Offline Payment</span>
          </button>

          <Link
            href="/finance/invoices"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <span>Invoices & Charges</span>
          </Link>

          <button
            onClick={fetchDashboardData}
            title="Refresh database records"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dismissible Operational Notice Banner */}
      {showAlert && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200/80 text-emerald-950 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold">Bursar Operational Status:</span> MTN Mobile Money, Paystack, and Hubtel settlement webhooks are operating at 100% capacity. Dual-control approval queue active for fee refunds.
            </div>
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className="text-slate-400 hover:text-slate-600 shrink-0 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 4 Primary Financial KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Invoiced */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Billed Fees</span>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              GHS {stats.totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                {stats.totalInvoicesCount} Total Invoices
              </span>
              <span className="text-[11px] text-slate-400">
                {stats.paidInvoicesCount} Cleared
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Semester Assessment</span>
            <Link href="/finance/invoices" className="font-bold text-blue-600 hover:underline flex items-center gap-0.5">
              View <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Realized Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Realized Collections</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">
              GHS {stats.totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                {stats.collectionRate}% Realized
              </span>
              <span className="text-[11px] text-slate-400">
                Verified Funds
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Verified Receipts</span>
            <Link href="/finance/payments" className="font-bold text-emerald-600 hover:underline flex items-center gap-0.5">
              Ledger <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Arrears</span>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">
              GHS {stats.totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold">
                {stats.partialInvoicesCount} Active Debtors
              </span>
              <span className="text-[11px] text-slate-400">
                {stats.overdueInvoicesCount} Overdue
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Due 30 Nov 2026</span>
            <Link href="/finance/outstanding" className="font-bold text-amber-600 hover:underline flex items-center gap-0.5">
              Watchlist <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Relief & Sponsorships */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scholarships & Relief</span>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-700">
              GHS {(stats.scholarshipsTotal + stats.waiversTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                {stats.scholarshipsCount} Scholars
              </span>
              <span className="text-[11px] text-slate-400">
                {stats.waiversCount} Fee Waivers
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>VC Merit & Trust</span>
            <Link href="/finance/scholarships" className="font-bold text-indigo-600 hover:underline flex items-center gap-0.5">
              Funds <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column 2/3, Right Column 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Analytics, Recent Payments Table, Outstanding Arrears, Settlements) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Analytics & Collection Trends */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Revenue & Collections Inflow</h2>
                  <p className="text-[11px] text-slate-500">Quarterly fee realization vs total academic billings</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setAnalyticsTab("Quarterly")}
                  className={`px-3 py-1 rounded-lg transition ${
                    analyticsTab === "Quarterly" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Quarterly
                </button>
                <button
                  onClick={() => setAnalyticsTab("Gateways")}
                  className={`px-3 py-1 rounded-lg transition ${
                    analyticsTab === "Gateways" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Payment Gateways
                </button>
              </div>
            </div>

            <div className="p-6">
              {analyticsTab === "Quarterly" ? (
                <div className="space-y-4">
                  {quarterData.map((q, idx) => {
                    const pct = q.totalFee > 0 ? Math.min(100, Math.round((q.collectedFee / q.totalFee) * 100)) : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{q.quarter}</span>
                          <span className="text-slate-500">
                            Collected: <strong className="text-emerald-600 font-extrabold">GHS {q.collectedFee.toLocaleString()}</strong> of GHS {q.totalFee.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {paymentChannels.map((ch, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{ch.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {ch.percentage}%
                        </span>
                      </div>
                      <div className="text-lg font-black text-slate-900">
                        GHS {ch.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] text-slate-400">{ch.count} transactions recorded & reconciled</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Verified Payments Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Recent Verified Collections ({recentPayments.length})</h2>
                  <p className="text-[11px] text-slate-500">Real-time gateway webhook postings and cashier receipts</p>
                </div>
              </div>
              <Link
                href="/finance/payments"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                All Payments <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold bg-slate-50/40">
                    <th className="py-3 px-6">Receipt / Ref</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Verified At</th>
                    <th className="py-3 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPayments.length > 0 ? (
                    recentPayments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-6 font-bold text-slate-900">
                          {p.receipt?.receipt_number || p.provider_reference}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{p.student?.profile?.full_name || "Enrolled Student"}</div>
                          <div className="text-[10px] text-slate-400">{p.student?.student_number} • {p.student?.programme?.code}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 capitalize">
                          {p.payment_method || p.provider}
                        </td>
                        <td className="py-3.5 px-4 font-black text-emerald-700">
                          GHS {Number(p.amount).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {p.verified_at ? new Date(p.verified_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Today"}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3" /> Certified
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">No verified payments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outstanding Arrears & Watchlist */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Outstanding Balances Watchlist</h2>
                  <p className="text-[11px] text-slate-500">Student accounts requiring collection or payment arrangement</p>
                </div>
              </div>
              <Link
                href="/finance/outstanding"
                className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
              >
                All Arrears <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-6 divide-y divide-slate-100">
              {outstandingDebtors.length > 0 ? (
                outstandingDebtors.map((inv: any) => (
                  <div key={inv.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">
                          {inv.student?.profile?.full_name || "Student"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {inv.student?.student_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold">
                          Due: {inv.due_date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Invoice: <span className="font-semibold text-slate-700">{inv.invoice_number}</span> • Billed: GHS {Number(inv.total_amount).toFixed(2)} • Paid: GHS {Number(inv.paid_amount).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-amber-700">
                          Balance: GHS {Number(inv.balance_amount).toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setPayStudentId(inv.student?.id);
                          setPayInvoiceId(inv.id);
                          setPayAmount(String(inv.balance_amount));
                          setPaymentModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition border border-emerald-200"
                      >
                        Receive
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No outstanding student arrears.</p>
              )}
            </div>
          </div>

          {/* Provider Settlements & Reconciliation Batches */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Provider Settlement Batches ({settlementBatches.length})</h2>
                  <p className="text-[11px] text-slate-500">Bank clearing payouts from Paystack, Hubtel & MTN MoMo</p>
                </div>
              </div>
              <Link
                href="/finance/settlements"
                className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
              >
                All Settlements <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-6 divide-y divide-slate-100">
              {settlementBatches.map((batch: any) => {
                const isReconciling = actionLoading === `batch-${batch.id}`;
                return (
                  <div key={batch.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold text-xs uppercase">
                          {batch.provider}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{batch.batch_reference}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                            batch.reconciliation_status === "reconciled"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {batch.reconciliation_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 max-w-xl">{batch.notes}</p>
                      <p className="text-[11px] text-slate-400">Settlement Date: {batch.settlement_date}</p>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <div className="text-sm font-black text-slate-900">
                        GHS {Number(batch.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      {batch.reconciliation_status !== "reconciled" && (
                        <button
                          onClick={() => handleReconcileBatch(batch.id, batch.batch_reference)}
                          disabled={isReconciling}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition"
                        >
                          {isReconciling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Reconcile
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (Approval Queue, Channel Mix, Checklist, Calendar, Audit) */}
        <div className="space-y-6">
          {/* Dual Control Approval Queue Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Bursar Approval Queue</h3>
                  <p className="text-[10px] text-slate-400">Dual-control authorization</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {stats.refundsPendingCount} Pending
              </span>
            </div>

            <div className="space-y-2.5">
              {approvalQueue.refunds.length > 0 ? (
                approvalQueue.refunds.map((ref: any) => {
                  const isProcessing = actionLoading === `refund-${ref.id}`;
                  return (
                    <div key={ref.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Refund Application</span>
                        <span className="font-black text-red-600">GHS {Number(ref.amount).toFixed(2)}</span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{ref.reason}</p>
                      <div className="text-[10px] text-slate-400">
                        Student: {ref.student?.profile?.full_name} ({ref.student?.student_number})
                      </div>

                      {ref.status === "pending" ? (
                        <div className="pt-1 flex gap-2">
                          <button
                            onClick={() => handleUpdateRefund(ref.id, "approved")}
                            disabled={isProcessing}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateRefund(ref.id, "rejected")}
                            disabled={isProcessing}
                            className="py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold capitalize">
                          Status: {ref.status}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-2">No pending financial approvals.</p>
              )}
            </div>
          </div>

          {/* Payment Gateways Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Payment Channel Mix</h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">Verified GHS</span>
            </div>

            <div className="space-y-3">
              {paymentChannels.map((ch, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{ch.name}</span>
                    <span className="font-black text-slate-900">GHS {ch.total.toLocaleString()} ({ch.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${ch.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Bursar Daily Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Bursar Operational Schedule</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Daily Ledger
              </span>
            </div>

            <div className="space-y-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => handleToggleTodo(todo.id)}
                  className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    todo.completed
                      ? "bg-slate-50/50 border-slate-100 opacity-60"
                      : "bg-white border-slate-200 hover:border-emerald-300 shadow-2xs"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-md mt-0.5 flex items-center justify-center transition-colors ${
                      todo.completed ? "bg-emerald-600 text-white" : "border border-slate-300"
                    }`}
                  >
                    {todo.completed && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-snug ${todo.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {todo.text}
                    </p>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5" /> {todo.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Calendar & Due Dates */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Key Financial Milestones</h3>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Semester 1 Fee Deadline</span>
                  <span className="text-amber-700">30 Nov 2026</span>
                </div>
                <p className="text-[10px] text-slate-500">Late penalty trigger of GHS 150.00 enforced after date</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Provider Settlement Audit</span>
                  <span className="text-emerald-700">Daily 17:00</span>
                </div>
                <p className="text-[10px] text-slate-500">Bank reconciliation with Paystack & Hubtel clearing logs</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Exam Clearance Cutoff</span>
                  <span className="text-blue-700">15 Dec 2026</span>
                </div>
                <p className="text-[10px] text-slate-500">70% minimum fee payment required for examination cards</p>
              </div>
            </div>
          </div>

          {/* Live Financial Audit Trail */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Financial Audit Trail</h3>
              </div>
              <Link href="/finance/audit" className="text-xs font-bold text-purple-600 hover:underline">
                All Logs
              </Link>
            </div>

            <div className="space-y-2">
              {auditEvents.slice(0, 4).map((ev: any) => (
                <div key={ev.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 font-mono text-[11px]">{ev.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {ev.event_time ? new Date(ev.event_time).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Today"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{ev.reason || `Entity: ${ev.entity_type}`}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: Record Manual Payment                         */}
      {/* ---------------------------------------------------- */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  ₵
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Record Manual Cash / Bank Deposit</h3>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Student</label>
                <select
                  value={payStudentId}
                  onChange={(e) => setPayStudentId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                >
                  {outstandingDebtors.map((d: any) => (
                    <option key={d.student?.id} value={d.student?.id}>
                      {d.student?.profile?.full_name} ({d.student?.student_number}) - Arrears: GHS {Number(d.balance_amount).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Record (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="e.g. 450.00"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                >
                  <option value="Direct Bank Deposit">Direct Bank Deposit (GCB / Ecobank)</option>
                  <option value="Cash at Bursar Office">Cash at Bursar Office</option>
                  <option value="Cheque Deposit">Bankers Draft / Cheque</option>
                  <option value="MTN Mobile Money Counter Transfer">MTN Mobile Money Counter Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Slip / Voucher Reference</label>
                <input
                  type="text"
                  placeholder="e.g. GCB-SLIP-984182"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "record-payment"}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading === "record-payment" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post Payment & Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

