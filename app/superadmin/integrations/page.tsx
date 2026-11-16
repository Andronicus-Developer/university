"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Plus,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Cpu,
} from "lucide-react";

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  status: "Connected" | "Configured" | "Disabled";
  description: string;
  lastSync: string;
}

export default function IntegrationsPage() {
  const [integrations] = useState<IntegrationItem[]>([
    {
      id: "int-1",
      name: "Moodle Learning Management System (LMS)",
      category: "E-Learning",
      status: "Connected",
      description: "Automated student cohort sync, course enrollment provisioning, and gradebook passback.",
      lastSync: "10 mins ago",
    },
    {
      id: "int-2",
      name: "Paystack Payments & Mobile Money Gateway",
      category: "Fintech",
      status: "Connected",
      description: "Card checkout, MTN MoMo, Telecel Cash, and automated webhook settlement.",
      lastSync: "Live Webhook",
    },
    {
      id: "int-3",
      name: "Resend Transactional Email Engine",
      category: "Communications",
      status: "Connected",
      description: "High-deliverability official emails for offer letters, OTPs, and statements.",
      lastSync: "1 hour ago",
    },
    {
      id: "int-4",
      name: "Hubtel SMS Ghana",
      category: "Communications",
      status: "Connected",
      description: "Direct carrier SMS for emergency campus notices and admission alerts.",
      lastSync: "25 mins ago",
    },
    {
      id: "int-5",
      name: "External ERP / QuickBooks Financial Ledger",
      category: "Accounting",
      status: "Configured",
      description: "Scheduled daily export of student fee collection and general ledger vouchers.",
      lastSync: "Yesterday",
    },
  ]);

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
          <span className="text-slate-800 font-semibold">Integrations & External APIs</span>
        </div>

        <button
          onClick={() => alert("Configure Integration Modal")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Custom Integration</span>
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <Boxes className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {item.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.name}</h3>
                <span className="text-[10.5px] font-semibold text-blue-600">{item.category}</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Sync: {item.lastSync}</span>
              <button
                onClick={() => alert(`Configuring API keys for ${item.name}`)}
                className="text-blue-600 hover:text-blue-700 font-semibold text-[11px] cursor-pointer"
              >
                Settings →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
