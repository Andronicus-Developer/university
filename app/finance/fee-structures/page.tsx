"use client";

import React, { useState } from "react";
import { FileSpreadsheet, Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { useFinanceSection } from "@/lib/finance/useFinancePortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney, getPortalTerminology } from "@/lib/portals/school-type-labels";

interface FeeStructuresData {
  school: { id: string; name: string; school_type: string; currency: string };
  feeStructures: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    amount: number;
    currency: string;
    is_mandatory: boolean;
    description: string | null;
  }>;
  programmes: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  classGroups: Array<{ id: string; name: string }>;
  intakes: Array<{ id: string; name: string }>;
  terms: Array<{ id: string; name: string }>;
  students: Array<{ id: string; full_name: string; student_number: string }>;
  recentInvoices: Array<{
    id: string;
    invoice_number: string;
    student_name: string;
    student_number: string;
    description: string | null;
    total_amount: number;
    balance: number;
    status: string;
  }>;
}

export default function FinanceFeeStructuresPage() {
  const { data, loading, error, reload, mutate } =
    useFinanceSection<FeeStructuresData>("fee_structures");

  // Fee Template Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("tuition");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // Generate Bills Modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [targetMode, setTargetMode] = useState("all");
  const [targetId, setTargetId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [feeStructureId, setFeeStructureId] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDesc, setBillDesc] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (loading) return <ClassicLoading label="Loading fee templates & billing..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load fee structures"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("create_fee_structure", {
      name,
      code,
      category,
      amount: Number(amount),
      description,
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to save fee structure." });
      return;
    }
    setBanner({ type: "success", text: "Fee template created." });
    setName("");
    setCode("");
    setAmount("");
    setDescription("");
    setShowTemplateModal(false);
  }

  async function handleDeleteTemplate(id: string) {
    setBanner(null);
    const res = await mutate("delete_fee_structure", { id });
    if (!res.ok) setBanner({ type: "error", text: res.error || "Delete failed." });
  }

  function handlePickFeeTemplate(id: string) {
    setFeeStructureId(id);
    const found = data?.feeStructures.find((f) => f.id === id);
    if (found) {
      setBillAmount(String(found.amount));
      setBillDesc(found.name);
    }
  }

  async function handleGenerateBills(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("generate_invoices", {
      targetMode,
      targetId: targetId || null,
      studentId: studentId || null,
      feeStructureId: feeStructureId || null,
      amount: Number(billAmount),
      description: billDesc || terms.feeLabel,
      dueDate: dueDate || null,
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to generate bills." });
      return;
    }
    setBanner({
      type: "success",
      text: `Generated ${res.data?.count || 1} invoice(s) successfully.`,
    });
    setShowBillModal(false);
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Fee Structures & Billing"
        subtitle={`${data.school.name} • Define ${terms.feeLabel.toLowerCase()} and bill ${terms.learnerPlural.toLowerCase()} individually or in bulk`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Fee Template</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudentId(data.students[0]?.id || "");
                setShowBillModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 text-xs font-medium cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Generate Bills / Invoices</span>
            </button>
          </>
        }
      />

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

      {/* Fee Templates */}
      {data.feeStructures.length === 0 ? (
        <ClassicEmpty
          icon={FileSpreadsheet}
          title="No Fee Structures Defined"
          description="Create fee templates (Tuition, Boarding, Workshop Materials, PTA/Levies) to quickly generate student bills."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold">Fee Templates ({data.feeStructures.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Fee Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.feeStructures.map((f) => (
                  <tr key={f.id}>
                    <td className="py-2.5 px-4 font-mono">{f.code}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium">{f.name}</span>
                      {f.description && (
                        <span className="block text-[11px] text-slate-500">{f.description}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 capitalize">{String(f.category).replace(/_/g, " ")}</td>
                    <td className="py-2.5 px-4 font-semibold">
                      {formatMoney(f.amount, f.currency || data.school.currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          handlePickFeeTemplate(f.id);
                          setShowBillModal(true);
                        }}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Bill {terms.learnerPlural}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(f.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer align-middle"
                        title="Delete fee template"
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

      {/* Recent Generated Invoices */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Recent Bills Issued ({data.recentInvoices.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">{terms.learnerSingular}</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Total</th>
                <th className="py-2.5 px-4">Balance</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-2.5 px-4 font-mono">{inv.invoice_number}</td>
                  <td className="py-2.5 px-4">
                    {inv.student_name}{" "}
                    <span className="text-[11px] font-mono text-slate-500">
                      ({inv.student_number})
                    </span>
                  </td>
                  <td className="py-2.5 px-4">{inv.description || terms.feeLabel}</td>
                  <td className="py-2.5 px-4">{formatMoney(inv.total_amount, data.school.currency)}</td>
                  <td className="py-2.5 px-4 font-semibold">
                    {formatMoney(inv.balance, data.school.currency)}
                  </td>
                  <td className="py-2.5 px-4">
                    <ClassicStatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold">Create Fee Structure</h3>
              <button type="button" onClick={() => setShowTemplateModal(false)} className="cursor-pointer">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Fee Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Semester Tuition / Workshop Levy"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. TUI-2026"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Amount ({data.school.currency}) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="tuition">Tuition</option>
                  <option value="boarding">Boarding & Hostel</option>
                  <option value="workshop">Workshop / ICT Materials</option>
                  <option value="pta_levy">PTA / Levies</option>
                  <option value="examination">Examination Fee</option>
                  <option value="other">Other Fee</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Bills Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold">Generate Invoices / Bills</h3>
              <button type="button" onClick={() => setShowBillModal(false)} className="cursor-pointer">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleGenerateBills} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Fee Template (Optional)</label>
                <select
                  value={feeStructureId}
                  onChange={(e) => handlePickFeeTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">Custom Fee Amount</option>
                  {data.feeStructures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({formatMoney(f.amount, data.school.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Bill Target</label>
                <select
                  value={targetMode}
                  onChange={(e) => {
                    setTargetMode(e.target.value);
                    setTargetId("");
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="all">All Active {terms.learnerPlural}</option>
                  <option value="student">Single {terms.learnerSingular}</option>
                  {data.classGroups.length > 0 && <option value="class_group">By Class Group</option>}
                  {data.programmes.length > 0 && <option value="programme">By {terms.programLabel}</option>}
                  {data.departments.length > 0 && <option value="department">By {terms.unitLabel}</option>}
                  {data.intakes.length > 0 && <option value="intake">By Intake Cohort</option>}
                </select>
              </div>

              {targetMode === "student" && (
                <div>
                  <label className="block font-medium mb-1">Select {terms.learnerSingular}</label>
                  <select
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {data.students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.student_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetMode !== "all" && targetMode !== "student" && (
                <div>
                  <label className="block font-medium mb-1">Select Group</label>
                  <select
                    required
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Choose...</option>
                    {(targetMode === "class_group"
                      ? data.classGroups
                      : targetMode === "programme"
                      ? data.programmes
                      : targetMode === "intake"
                      ? data.intakes
                      : data.departments
                    ).map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Amount ({data.school.currency}) *</label>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={billDesc}
                  onChange={(e) => setBillDesc(e.target.value)}
                  placeholder={terms.feeLabel}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Issue Bills</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
