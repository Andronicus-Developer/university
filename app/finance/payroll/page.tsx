"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Plus, Trash2, Wallet, X } from "lucide-react";
import { useFinanceSection } from "@/lib/finance/useFinancePortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicMigrationNotice,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney } from "@/lib/portals/school-type-labels";

interface PayrollData {
  school: { id: string; name: string; currency: string };
  missingTables: string[];
  staffList: Array<{
    id: string;
    full_name: string;
    staff_number: string | null;
    designation: string | null;
  }>;
  records: Array<{
    id: string;
    staff_id: string;
    staff_name: string;
    staff_number: string;
    designation: string;
    pay_period: string;
    base_salary: number;
    allowances: number;
    deductions: number;
    net_pay: number;
    currency: string;
    status: string;
    payment_reference: string | null;
  }>;
}

export default function FinancePayrollPage() {
  const { data, loading, error, reload, mutate } =
    useFinanceSection<PayrollData>("payroll");

  const [staffId, setStaffId] = useState("");
  const [payPeriod, setPayPeriod] = useState("");
  const [baseSalary, setBaseSalary] = useState("0");
  const [allowances, setAllowances] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setPayPeriod((p) => p || new Date().toISOString().slice(0, 7));
  }, []);

  if (loading) return <ClassicLoading label="Loading staff payroll schedules..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load payroll"} onRetry={reload} />;
  }

  const chosenStaffId = staffId || data.staffList[0]?.id || "";

  async function handleSavePayroll(e: React.FormEvent) {
    e.preventDefault();
    if (!chosenStaffId) return;
    setSaving(true);
    setBanner(null);
    const res = await mutate("save_payroll", {
      staffId: chosenStaffId,
      payPeriod,
      baseSalary: Number(baseSalary),
      allowances: Number(allowances),
      deductions: Number(deductions),
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save payroll schedule." });
      return;
    }
    setBanner({ type: "success", text: "Staff salary schedule saved." });
  }

  async function handleMarkPaid(id: string) {
    setBanner(null);
    const res = await mutate("mark_payroll_paid", { id });
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to mark paid." });
    else setBanner({ type: "success", text: "Salary disbursement marked as paid." });
  }

  async function handleDelete(id: string) {
    const res = await mutate("delete_payroll", { id });
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to delete record." });
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Payroll & Staff Allowances"
        subtitle={`${data.school.name} • Manage monthly salary schedules and disburse staff pay`}
      />

      <ClassicMigrationNotice tables={data.missingTables} />

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
          <h2 className="text-sm font-semibold">Add / Update Salary Schedule</h2>
          <form onSubmit={handleSavePayroll} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium mb-1">Staff Member *</label>
              <select
                value={chosenStaffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {data.staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name} {st.designation ? `(${st.designation})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Pay Period (YYYY-MM) *</label>
              <input
                type="month"
                required
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-medium mb-1">Base Salary</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Allowances</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={allowances}
                  onChange={(e) => setAllowances(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Deductions</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 px-3 py-2 flex justify-between font-semibold">
              <span>Net Pay:</span>
              <span>
                {formatMoney(
                  Math.max(0, Number(baseSalary) + Number(allowances) - Number(deductions)),
                  data.school.currency
                )}
              </span>
            </div>
            <button
              type="submit"
              disabled={saving || data.staffList.length === 0}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Save Schedule</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-8">
          {data.records.length === 0 ? (
            <ClassicEmpty
              icon={Wallet}
              title="No Payroll Records Yet"
              description="Add a staff salary schedule on the left to manage monthly allowances and disbursements."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="py-2.5 px-4">Period</th>
                      <th className="py-2.5 px-4">Staff Member</th>
                      <th className="py-2.5 px-4">Net Pay</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.records.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 px-4 font-mono">{r.pay_period}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium">{r.staff_name}</span>
                          <span className="block text-[11px] text-slate-500">
                            {r.designation || r.staff_number}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold">
                          {formatMoney(r.net_pay, r.currency || data.school.currency)}
                        </td>
                        <td className="py-2.5 px-4">
                          <ClassicStatusBadge status={r.status} />
                        </td>
                        <td className="py-2.5 px-4 text-right space-x-2">
                          {r.status !== "paid" && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(r.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium cursor-pointer"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Mark Paid</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer align-middle"
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
