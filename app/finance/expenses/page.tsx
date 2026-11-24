"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Plus, Receipt, Trash2, X } from "lucide-react";
import { useFinanceSection } from "@/lib/finance/useFinancePortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicKpiCard,
  ClassicLoading,
  ClassicMigrationNotice,
  ClassicPageHeader,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney } from "@/lib/portals/school-type-labels";

interface ExpensesData {
  school: { id: string; name: string; currency: string };
  missingTables: string[];
  expenses: Array<{
    id: string;
    expense_date: string;
    category: string;
    vendor: string | null;
    description: string;
    amount: number;
    currency: string;
    payment_method: string;
    receipt_reference: string | null;
  }>;
}

export default function FinanceExpensesPage() {
  const { data, loading, error, reload, mutate } =
    useFinanceSection<ExpensesData>("expenses");

  const [expenseDate, setExpenseDate] = useState("");
  const [category, setCategory] = useState("utilities");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receiptReference, setReceiptReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setExpenseDate((p) => p || new Date().toISOString().slice(0, 10));
  }, []);

  if (loading) return <ClassicLoading label="Loading school expenses..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load expenses"} onRetry={reload} />;
  }

  const totalSpent = data.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("create_expense", {
      expenseDate,
      category,
      vendor,
      description,
      amount: Number(amount),
      paymentMethod,
      receiptReference,
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to record expense." });
      return;
    }
    setBanner({ type: "success", text: "Expense recorded." });
    setVendor("");
    setDescription("");
    setAmount("");
    setReceiptReference("");
  }

  async function handleDelete(id: string) {
    const res = await mutate("delete_expense", { id });
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to remove expense." });
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Expenses & Petty Cash"
        subtitle={`${data.school.name} • Track operational disbursements and vendor receipts`}
      />

      <ClassicMigrationNotice tables={data.missingTables} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ClassicKpiCard
          label="Total Recorded Expenses"
          value={formatMoney(totalSpent, data.school.currency)}
          icon={Receipt}
          tone="warning"
        />
        <ClassicKpiCard label="Expense Entries" value={data.expenses.length} />
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-3">
          <h2 className="text-sm font-semibold">Record Expense</h2>
          <form onSubmit={handleAdd} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium mb-1">Date</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="utilities">Utilities & Electricity</option>
                <option value="stationery">Stationery & Printing</option>
                <option value="maintenance">Repairs & Maintenance</option>
                <option value="workshop_supplies">Lab / Workshop Consumables</option>
                <option value="feeding">Boarding & Kitchen</option>
                <option value="transport">Transport & Fuel</option>
                <option value="operations">General Operations</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Vendor / Payee</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Supplier or technician"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Description *</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was purchased or paid for?"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                <label className="block font-medium mb-1">Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="cash">Petty Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Receipt / Voucher Ref</label>
              <input
                type="text"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Save Expense</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-8">
          {data.expenses.length === 0 ? (
            <ClassicEmpty
              icon={Receipt}
              title="No Expenses Recorded"
              description="Operational disbursements and petty cash vouchers appear here once recorded."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Description & Vendor</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="py-2.5 px-4 font-mono">{(exp.expense_date || "").slice(0, 10)}</td>
                        <td className="py-2.5 px-4 capitalize">{exp.category.replace(/_/g, " ")}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium">{exp.description}</span>
                          <span className="block text-[11px] text-slate-500">
                            {exp.vendor || "Direct"}
                            {exp.receipt_reference ? ` • Ref: ${exp.receipt_reference}` : ""}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold">
                          {formatMoney(exp.amount, exp.currency || data.school.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
