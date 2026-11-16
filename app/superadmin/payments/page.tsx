"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  Check,
  CheckCircle2,
  Lock,
  Globe,
  Sliders,
  AlertTriangle,
} from "lucide-react";

export default function PaymentProviderSettingsPage() {
  const [provider, setProvider] = useState("paystack");
  const [paystackPublicKey, setPaystackPublicKey] = useState("pk_test_d389a0394b29c91024");
  const [hubtelClientId, setHubtelClientId] = useState("hub_live_891230");
  const [autoReconciliation, setAutoReconciliation] = useState(true);
  const [dualControlThreshold, setDualControlThreshold] = useState("5000");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Sub-Header: Breadcrumbs + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link
            href="/superadmin/dashboard"
            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Super Admin
          </Link>
          <span className="text-slate-300">/</span>
          <span>Platform Configuration</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">Payment Provider Settings</span>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Check className="h-4 w-4" />
          <span>Save Gateway Settings</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium shadow-2xs">
          Payment provider gateway and webhook parameters saved successfully!
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="max-w-4xl space-y-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span>Active Payment Gateway Integrations (Ghana & International)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Payment Processor
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="paystack">Paystack (Cards, MTN MoMo, Telecel Cash)</option>
                <option value="hubtel">Hubtel Direct Merchant Gateway</option>
                <option value="flutterwave">Flutterwave Central</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Refund Dual-Control Threshold (GHS)
              </label>
              <input
                type="number"
                value={dualControlThreshold}
                onChange={(e) => setDualControlThreshold(e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Refunds exceeding this threshold require Vice-Chancellor or Registrar sign-off.
              </p>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paystack Public API Key
              </label>
              <input
                type="text"
                value={paystackPublicKey}
                onChange={(e) => setPaystackPublicKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Automated Bank Webhook Reconciliation
              </div>
              <div className="text-[11px] text-slate-500">
                Idempotently verify signed webhooks, post student ledger invoices, and generate receipts.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoReconciliation(!autoReconciliation)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                autoReconciliation ? "bg-emerald-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoReconciliation ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
