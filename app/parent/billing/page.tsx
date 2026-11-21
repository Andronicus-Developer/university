"use client";

import React, { useState } from "react";
import { CreditCard, Download, CheckCircle2, Receipt, ShieldCheck } from "lucide-react";

export default function ParentBillingPage() {
  const [payModalOpen, setPayModalOpen] = useState(false);

  const bills = [
    { item: "Tuition & Core Academic Instruction", period: "Term 2", amount: "GH₵ 0.00", status: "Covered by Free SHS", paid: true },
    { item: "PTA Development & Maintenance Fund", period: "Term 2", amount: "GH₵ 150.00", status: "Paid in Full", paid: true },
    { item: "Science Lab Consumables & Reagents", period: "Term 2", amount: "GH₵ 200.00", status: "Paid in Full", paid: true },
    { item: "WASSCE / NVTI Final Testing Registration", period: "Annual", amount: "GH₵ 350.00", status: "Subsidized & Cleared", paid: true },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Fee Statement & Invoices
            </span>
            <span className="text-xs text-slate-400">Account #ACC-8842</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Fees, Levies & Payment Receipts</h1>
          <p className="text-xs text-slate-500">
            View term billing breakdowns, mobile money transaction records, and tax invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Balance: GH₵ 0.00 (Cleared)</span>
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold text-[11px]">
              <th className="py-3 px-3">Description</th>
              <th className="py-3 px-2">Academic Term</th>
              <th className="py-3 px-2 text-right">Amount</th>
              <th className="py-3 px-3 text-right">Payment Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.map((b, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-900">{b.item}</td>
                <td className="py-3 px-2 text-slate-500">{b.period}</td>
                <td className="py-3 px-2 text-right font-black text-slate-800">{b.amount}</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    <CheckCircle2 className="h-3 w-3" /> {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
