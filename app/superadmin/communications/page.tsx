"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Mail,
  Phone,
  Check,
  CheckCircle2,
  Lock,
  Globe,
  Sliders,
  Send,
} from "lucide-react";

export default function EmailSmsSettingsPage() {
  const [emailProvider, setEmailProvider] = useState("resend");
  const [smtpHost, setSmtpHost] = useState("smtp.resend.com");
  const [senderEmail, setSenderEmail] = useState("noreply@university.edu.gh");
  const [smsSenderId, setSmsSenderId] = useState("AIT-REGISTRY");
  const [smsProvider, setSmsProvider] = useState("hubtel");
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
          <span className="text-slate-800 font-semibold">Email & SMS Communications</span>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Check className="h-4 w-4" />
          <span>Save Channels</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium shadow-2xs">
          Communication gateway parameters updated successfully!
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="max-w-4xl space-y-5">
        {/* Email Gateway */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Mail className="h-4 w-4 text-blue-600" />
            <span>Transactional Email Gateway (Resend / SMTP)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Dispatch Provider
              </label>
              <select
                value={emailProvider}
                onChange={(e) => setEmailProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="resend">Resend API (Recommended)</option>
                <option value="smtp">Direct Institutional SMTP</option>
                <option value="sendgrid">SendGrid Central</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                System Default "From" Address
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* SMS Gateway */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone className="h-4 w-4 text-indigo-600" />
            <span>SMS Gateway & Alerts (Hubtel / Arkesel Ghana)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SMS Channel Provider
              </label>
              <select
                value={smsProvider}
                onChange={(e) => setSmsProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="hubtel">Hubtel SMS Ghana</option>
                <option value="arkesel">Arkesel Multi-network</option>
                <option value="mnotify">mNotify Ghana</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Alphanumeric Sender ID (Max 11 chars)
              </label>
              <input
                type="text"
                maxLength={11}
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
