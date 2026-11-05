"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  DollarSign,
  Lock,
  Layers,
  FileCheck2,
  Sliders,
  Check,
  Building2,
} from "lucide-react";

export default function FinanceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings State
  const [financeConfig, setFinanceConfig] = useState({
    currency: "GHS",
    currency_symbol: "GH₵",
    academic_year: "2026/2027",
    active_semester: "Semester 1",
    auto_generate_invoices: true,
    dual_control_enforced: true,
    refund_dual_control_threshold: 500,
    write_off_limit: 50,
    debt_threshold_exam_block_pct: 30, // student can write exams if they paid at least 70%
    debt_transcript_hold: true,
    late_payment_penalty: 150,
    paystack_enabled: true,
    hubtel_enabled: true,
    cashier_desk_enabled: true,
    bank_wire_enabled: true,
    auto_receipt_generation: true,
  });

  const loadSettings = async () => {
    setLoading(true);
    setErrorMsg(null);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data, error } = await db
        .from("system_settings")
        .select("*")
        .in("setting_key", ["payment_gateways", "finance_policy", "academic_policy"]);

      if (error) throw error;

      if (data && data.length > 0) {
        let updated = { ...financeConfig };

        data.forEach((item: any) => {
          if (item.setting_key === "payment_gateways") {
            const v = item.setting_value || {};
            updated.currency = v.currency || updated.currency;
            updated.auto_receipt_generation = v.auto_receipt_generation ?? updated.auto_receipt_generation;
            if (v.supported_providers) {
              updated.paystack_enabled = v.supported_providers.includes("paystack");
              updated.hubtel_enabled = v.supported_providers.includes("hubtel");
              updated.cashier_desk_enabled = v.supported_providers.includes("cashier");
              updated.bank_wire_enabled = v.supported_providers.includes("bank_wire");
            }
          }

          if (item.setting_key === "finance_policy") {
            const v = item.setting_value || {};
            updated = { ...updated, ...v };
          }

          if (item.setting_key === "academic_policy") {
            const v = item.setting_value || {};
            if (v.current_academic_year) updated.academic_year = v.current_academic_year;
            if (v.active_semester) updated.active_semester = v.active_semester;
            if (v.late_registration_fine) updated.late_payment_penalty = v.late_registration_fine;
            if (v.restrict_transcript_on_debt !== undefined) updated.debt_transcript_hold = v.restrict_transcript_on_debt;
          }
        });

        setFinanceConfig(updated);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load finance settings from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const providers = [];
      if (financeConfig.paystack_enabled) providers.push("paystack");
      if (financeConfig.hubtel_enabled) providers.push("hubtel");
      if (financeConfig.cashier_desk_enabled) providers.push("cashier");
      if (financeConfig.bank_wire_enabled) providers.push("bank_wire");

      // 1. Update payment_gateways
      const { error: err1 } = await db.from("system_settings").upsert(
        {
          setting_key: "payment_gateways",
          category: "finance",
          description: "Payment provider configurations and digital receipt settings",
          setting_value: {
            currency: financeConfig.currency,
            default_provider: financeConfig.paystack_enabled ? "paystack" : "hubtel",
            supported_providers: providers,
            auto_receipt_generation: financeConfig.auto_receipt_generation,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      );
      if (err1) throw err1;

      // 2. Update finance_policy
      const { error: err2 } = await db.from("system_settings").upsert(
        {
          setting_key: "finance_policy",
          category: "finance",
          description: "Bursary dual-control, write-offs, refund thresholds, and collection rules",
          setting_value: {
            currency: financeConfig.currency,
            currency_symbol: financeConfig.currency_symbol,
            academic_year: financeConfig.academic_year,
            active_semester: financeConfig.active_semester,
            auto_generate_invoices: financeConfig.auto_generate_invoices,
            dual_control_enforced: financeConfig.dual_control_enforced,
            refund_dual_control_threshold: Number(financeConfig.refund_dual_control_threshold),
            write_off_limit: Number(financeConfig.write_off_limit),
            debt_threshold_exam_block_pct: Number(financeConfig.debt_threshold_exam_block_pct),
            debt_transcript_hold: financeConfig.debt_transcript_hold,
            late_payment_penalty: Number(financeConfig.late_payment_penalty),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      );
      if (err2) throw err2;

      // 3. Log to audit events
      await db.from("audit_events").insert({
        action: "FINANCE_POLICY_UPDATED",
        entity_type: "system_settings",
        entity_id: "finance_policy",
        actor_role: "bursar",
        outcome: "SUCCESS",
        reason: "Updated finance policy, payment gateways, and dual control rules",
        new_values: financeConfig,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to persist configuration to database.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Bursar & Financial Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              System Regulations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure default billing currency, payment gateway channels, dual-control limits, and debtor restrictions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadSettings}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Reload settings"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Financial configuration and payment settings saved successfully to the database.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Billing & Currency Defaults */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Billing & Currency Defaults</h2>
              <p className="text-[11px] text-slate-400">Institutional base currency, exchange ledger, and invoicing schedules</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Base Currency Code</label>
              <select
                value={financeConfig.currency}
                onChange={(e) => setFinanceConfig({ ...financeConfig, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="GHS">GHS - Ghana Cedi (GH₵)</option>
                <option value="USD">USD - United States Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Currency Symbol</label>
              <input
                type="text"
                value={financeConfig.currency_symbol}
                onChange={(e) => setFinanceConfig({ ...financeConfig, currency_symbol: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Active Billing Academic Year</label>
              <input
                type="text"
                value={financeConfig.academic_year}
                onChange={(e) => setFinanceConfig({ ...financeConfig, academic_year: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Active Billing Semester</label>
              <select
                value={financeConfig.active_semester}
                onChange={(e) => setFinanceConfig({ ...financeConfig, active_semester: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Trimester 3">Trimester 3 / Summer</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={financeConfig.auto_generate_invoices}
                onChange={(e) => setFinanceConfig({ ...financeConfig, auto_generate_invoices: e.target.checked })}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900">Auto-Generate Invoices on Student Registration</span>
                <p className="text-slate-500 text-[11px]">
                  Automatically create semester invoice ledger lines when students confirm course enrollments.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Dual Control & Approval Limits */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Dual-Control & Segregation of Duties</h2>
              <p className="text-[11px] text-slate-400">Maker-Checker policies preventing unilateral refunds and debt write-offs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Refund Dual-Control Threshold (GHS)
              </label>
              <input
                type="number"
                value={financeConfig.refund_dual_control_threshold}
                onChange={(e) =>
                  setFinanceConfig({ ...financeConfig, refund_dual_control_threshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <span className="text-[10px] text-slate-400">
                Any refund request equal or exceeding this amount strictly requires Bursar second-tier sign-off.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Max Automatic Debt Write-Off Limit (GHS)
              </label>
              <input
                type="number"
                value={financeConfig.write_off_limit}
                onChange={(e) => setFinanceConfig({ ...financeConfig, write_off_limit: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <span className="text-[10px] text-slate-400">
                Small rounding balances below this amount can be cleared automatically during graduation audit.
              </span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={financeConfig.dual_control_enforced}
                onChange={(e) => setFinanceConfig({ ...financeConfig, dual_control_enforced: e.target.checked })}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900">Enforce Strict Separation of Duties (PostgreSQL Trigger)</span>
                <p className="text-slate-500 text-[11px]">
                  Database trigger `check_refund_separation_of_duties` prevents the requester of a refund from approving it.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Payment Gateways & Receipting */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <CreditCard className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Payment Gateways & Clearing Channels</h2>
              <p className="text-[11px] text-slate-400">Electronic payment providers, mobile money aggregators, and cashier desk</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={financeConfig.paystack_enabled}
                onChange={(e) => setFinanceConfig({ ...financeConfig, paystack_enabled: e.target.checked })}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">Paystack Gateway</span>
                <p className="text-[10px] text-slate-500">Card, Visa, Mastercard, and Bank Direct Debit</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={financeConfig.hubtel_enabled}
                onChange={(e) => setFinanceConfig({ ...financeConfig, hubtel_enabled: e.target.checked })}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">Hubtel Mobile Money Aggregator</span>
                <p className="text-[10px] text-slate-500">MTN MobileMoney, Telecel Cash, AirtelTigo Money</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={financeConfig.cashier_desk_enabled}
                onChange={(e) => setFinanceConfig({ ...financeConfig, cashier_desk_enabled: e.target.checked })}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">On-Campus Bursar Cashier Desk</span>
                <p className="text-[10px] text-slate-500">Over-the-counter payments with immediate printed receipt</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={financeConfig.bank_wire_enabled}
                onChange={(e) => setFinanceConfig({ ...financeConfig, bank_wire_enabled: e.target.checked })}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">Direct Bank Wire & GIHOC Cleared</span>
                <p className="text-[10px] text-slate-500">Commercial bank branch slip deposits verified by bursary</p>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={financeConfig.auto_receipt_generation}
                onChange={(e) => setFinanceConfig({ ...financeConfig, auto_receipt_generation: e.target.checked })}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900">Instant Digital Receipt Generation</span>
                <p className="text-slate-500 text-[11px]">
                  Automatically generate unique serial numbered PDF receipts into `receipts` table upon transaction confirmation.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Section 4: Debtor Enforcement & Registration Restrictions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Lock className="h-5 w-5 text-rose-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Arrears & Academic Restriction Policies</h2>
              <p className="text-[11px] text-slate-400">Automated administrative holds applied to student accounts in default</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Late Registration / Late Payment Fine (GHS)
              </label>
              <input
                type="number"
                value={financeConfig.late_payment_penalty}
                onChange={(e) => setFinanceConfig({ ...financeConfig, late_payment_penalty: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              <span className="text-[10px] text-slate-400">Applied automatically when semester payment deadline elapses.</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Exam Clearance Max Outstanding Debt (%)
              </label>
              <input
                type="number"
                value={financeConfig.debt_threshold_exam_block_pct}
                onChange={(e) =>
                  setFinanceConfig({ ...financeConfig, debt_threshold_exam_block_pct: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              <span className="text-[10px] text-slate-400">
                Students with unpaid fee balance exceeding this % cannot generate semester examination admission slips.
              </span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={financeConfig.debt_transcript_hold}
                onChange={(e) => setFinanceConfig({ ...financeConfig, debt_transcript_hold: e.target.checked })}
                className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900">Withhold Official Transcripts for Indebted Students</span>
                <p className="text-slate-500 text-[11px]">
                  Bursary hold automatically blocks registrar dispatch of official academic transcripts if an outstanding balance exists.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? "Saving Changes..." : "Save Finance Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

