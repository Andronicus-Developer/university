"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";

interface ChatWithSalesModalProps {
  open: boolean;
  onClose: () => void;
  onSwitchToDemo?: () => void;
}

const SCHOOL_TYPES = [
  "University / Tertiary",
  "High School / Secondary",
  "Vocational / Technical School",
  "Other",
];

const INQUIRY_TOPICS = [
  "Pricing & Licensing Plans",
  "Multi-Tenant / Custom Deployment",
  "Data Migration",
  "Payment Gateway Integration",
  "Security & Compliance",
  "General Sales Inquiry",
];

const CHANNELS = ["Email", "Phone Call", "WhatsApp", "Video Meeting"];

export function ChatWithSalesModal({
  open,
  onClose,
  onSwitchToDemo,
}: ChatWithSalesModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [schoolType, setSchoolType] = useState(SCHOOL_TYPES[0]);
  const [topic, setTopic] = useState(INQUIRY_TOPICS[0]);
  const [preferredChannel, setPreferredChannel] = useState(CHANNELS[0]);
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceId: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const resetAndClose = () => {
    setErrorMsg(null);
    setConfirmation(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (
      !fullName.trim() ||
      !email.trim() ||
      !institutionName.trim() ||
      !message.trim()
    ) {
      setErrorMsg("Please provide your name, work email, institution, and message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sales_chat",
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          institution_name: institutionName.trim(),
          school_type: schoolType,
          topic,
          preferred_channel: preferredChannel,
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Unable to send your message.");
      }

      setConfirmation({
        referenceId: data.referenceId || "ERD-SALES-SENT",
        message:
          data.message ||
          "Thank you! Our sales specialists have received your message and will reply shortly.",
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-sales-title"
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-100 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Live Sales Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#7C3AED] to-[#9353FF] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 id="chat-sales-title" className="text-sm font-bold leading-tight">
                Chat with Erudian360 Sales
              </h2>
              <div className="text-[11px] text-purple-100 flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sales Team Online · Avg. response under 2 hours</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close modal"
            className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {confirmation ? (
          <div className="p-8 text-center space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full bg-purple-50 text-[#7C3AED] text-xs font-bold border border-purple-100">
                Ticket ID: {confirmation.referenceId}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                Message Sent to Sales
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {confirmation.message}
              </p>
            </div>

            <div className="max-w-md mx-auto rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-left text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Topic:</span>
                <span className="font-semibold text-slate-900">{topic}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Reply Via:</span>
                <span className="font-semibold text-slate-900">{preferredChannel}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-6 py-2.5 rounded-full bg-[#0F0F14] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              {onSwitchToDemo && (
                <button
                  type="button"
                  onClick={() => {
                    resetAndClose();
                    onSwitchToDemo();
                  }}
                  className="px-6 py-2.5 rounded-full bg-purple-50 hover:bg-purple-100 text-[#7C3AED] text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
                >
                  Request a Live Demo
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  School / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="School or institution name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  School Type
                </label>
                <select
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                >
                  {SCHOOL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Inquiry Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                >
                  {INQUIRY_TOPICS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Preferred Contact Channel
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHANNELS.map((ch) => {
                  const active = preferredChannel === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setPreferredChannel(ch)}
                      className={`py-2 px-3 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                        active
                          ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-purple-300"
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Message / Questions *
              </label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about pricing, multi-campus licensing, onboarding timeline, or integrations..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED] resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-full bg-[#0F0F14] hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
