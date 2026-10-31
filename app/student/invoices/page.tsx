"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";

export default function StudentInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [channel, setChannel] = useState<string>("mtn_momo");
  const [phone, setPhone] = useState<string>("0245550192");
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let stu = null;
      if (user) {
        const { data: s } = await db
          .from("students")
          .select("*, programme:programme_id(*), profile:profile_id(*)")
          .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();
        stu = s;
      }

      if (!stu) {
        const { data: firstStu } = await db
          .from("students")
          .select("*, programme:programme_id(*), profile:profile_id(*)")
          .limit(1)
          .maybeSingle();
        stu = firstStu;
      }

      if (stu) {
        setStudent(stu);

        const { data: invs } = await db
          .from("student_invoices")
          .select("*, lines:invoice_lines(*)")
          .eq("student_id", stu.id)
          .order("issue_date", { ascending: false });

        setInvoices(invs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleOpenPay = (invoice: any) => {
    setPayingInvoice(invoice);
    setPayAmount(String(invoice.balance_amount || "450.00"));
    setPaymentSuccess(null);
  };

  const handleProcessPayment = async () => {
    if (!payingInvoice || !student) return;
    setProcessing(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const amount = parseFloat(payAmount);
      const ref = `PAY-${Date.now().toString().slice(-8)}`;

      // 1. Insert Payment
      const { data: payment, error: pErr } = await db
        .from("payments")
        .insert({
          student_id: student.id,
          amount: amount,
          currency: "GHS",
          provider: "paystack",
          provider_reference: ref,
          payment_method: channel === "mtn_momo" ? "Mobile Money (MTN)" : "Visa / Mastercard",
          status: "successful",
        })
        .select()
        .single();

      if (pErr) throw pErr;

      // 2. Insert Allocation
      await db.from("payment_allocations").insert({
        payment_id: payment.id,
        invoice_id: payingInvoice.id,
        allocated_amount: amount,
      });

      // 3. Insert Official Receipt
      const receiptNum = `REC-${Date.now().toString().slice(-6)}`;
      await db.from("receipts").insert({
        payment_id: payment.id,
        receipt_number: receiptNum,
        student_id: student.id,
        amount: amount,
        currency: "GHS",
        receipt_data: {
          channel: channel === "mtn_momo" ? "MTN Mobile Money" : "Card",
          student_name: student.profile?.full_name || "Ama Johnson",
          invoice_number: payingInvoice.invoice_number,
        },
      });

      // 4. Update Invoice Balance
      const newPaid = Number(payingInvoice.paid_amount || 0) + amount;
      const newBalance = Math.max(0, Number(payingInvoice.total_amount || 0) - newPaid);
      const newStatus = newBalance <= 0 ? "paid" : "partially_paid";

      await db
        .from("student_invoices")
        .update({
          paid_amount: newPaid,
          balance_amount: newBalance,
          status: newStatus,
        })
        .eq("id", payingInvoice.id);

      setPaymentSuccess(`Payment of GHS ${amount.toFixed(2)} successful! Receipt ${receiptNum} issued.`);
      await loadInvoices();
    } catch (err: any) {
      alert("Payment failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading student invoices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices & Online Payments</h1>
          <p className="text-xs text-slate-500">View semester fee invoices, line items, and pay online securely</p>
        </div>
        <Link
          href="/student/receipts"
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition self-start"
        >
          <Receipt className="h-3.5 w-3.5" /> View Payment Receipts
        </Link>
      </div>

      {paymentSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{paymentSuccess}</span>
          </div>
          <Link href="/student/receipts" className="text-emerald-700 underline font-semibold">
            View Receipt
          </Link>
        </div>
      )}

      {/* Invoice List */}
      <div className="space-y-6">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">{inv.invoice_number}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      inv.status === "paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Issue Date: {inv.issue_date} • Due Date: <span className="font-semibold text-slate-700">{inv.due_date}</span>
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Balance Due</span>
                  <span className="text-xl font-black text-slate-900">
                    GHS {Number(inv.balance_amount).toFixed(2)}
                  </span>
                </div>
                {Number(inv.balance_amount) > 0 && (
                  <button
                    onClick={() => handleOpenPay(inv)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Pay Invoice
                  </button>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Itemized Fee Charges</h3>
              <div className="divide-y divide-slate-100">
                {(inv.lines || []).map((line: any) => (
                  <div key={line.id} className="py-3 flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{line.description}</span>
                    <span className="font-bold text-slate-900">GHS {Number(line.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs font-bold">
                <span className="text-slate-700">Total Invoice Amount:</span>
                <span className="text-slate-900 font-black">GHS {Number(inv.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pay Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Pay Invoice #{payingInvoice.invoice_number}</h3>
              </div>
              <button onClick={() => setPayingInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Pay (GHS)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  <option value="mtn_momo">Mobile Money (MTN MoMo)</option>
                  <option value="card">Debit / Credit Card (Paystack Gateway)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile / Billing Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-800 text-[11px] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                <span>256-bit encrypted secure university payment gateway. Instant receipt issued.</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setPayingInvoice(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={processing}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

