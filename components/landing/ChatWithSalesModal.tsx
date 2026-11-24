"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { submitLandingInquiryAction } from "@/lib/landing/inquiry-actions";

interface ChatWithSalesModalProps {
  open: boolean;
  onClose: () => void;
  onSwitchToDemo?: () => void;
}

const SCHOOL_TYPES = [
  { value: "university", label: "University / Tertiary" },
  { value: "high_school", label: "High School / Secondary" },
  { value: "vocational", label: "Vocational / Technical School" },
  { value: "other", label: "Other / Multi-Campus" },
] as const;

const INQUIRY_TOPICS = [
  "Pricing & Licensing Plans",
  "Multi-Tenant / Custom Deployment",
  "Data Migration",
  "Payment Gateway Integration",
  "Security & Compliance",
  "General Sales Inquiry",
];

const CHANNELS = ["Email", "Phone Call", "WhatsApp", "Video Meeting"];

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#7C3AED] dark:focus:border-[#A78BFA]";

export function ChatWithSalesModal({
  open,
  onClose,
  onSwitchToDemo,
}: ChatWithSalesModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [schoolType, setSchoolType] = useState<string>("university");
  const [topic, setTopic] = useState(INQUIRY_TOPICS[0]);
  const [preferredChannel, setPreferredChannel] = useState(CHANNELS[0]);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceId: string;
    message: string;
    submittedTopic: string;
    submittedChannel: string;
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
      const result = await submitLandingInquiryAction({
        inquiry_type: "sales_chat",
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        school_name: institutionName.trim(),
        school_type: schoolType,
        topic,
        preferred_channel: preferredChannel,
        message: message.trim(),
        website,
      });

      if (!result.ok) {
        throw new Error(result.error || "Unable to send your message.");
      }

      setConfirmation({
        referenceId: result.referenceId || "ERD-SALES-SENT",
        message:
          result.message ||
          "Thank you! Our sales specialists have received your message and will reply shortly.",
        submittedTopic: topic,
        submittedChannel: preferredChannel,
      });

      setFullName("");
      setEmail("");
      setPhone("");
      setInstitutionName("");
      setMessage("");
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
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-[#7C3AED] dark:text-[#C4B5FD] text-xs font-bold border border-purple-100 dark:border-purple-800/70">
                Ticket ID: {confirmation.referenceId}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Message Sent to Sales
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                {confirmation.message}
              </p>
            </div>

            <div className="max-w-md mx-auto rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 p-4 text-left text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Topic:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {confirmation.submittedTopic}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Reply Via:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {confirmation.submittedChannel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-6 py-2.5 rounded-full bg-[#0F0F14] dark:bg-white hover:bg-slate-800 dark:hover:bg-purple-50 text-white dark:text-[#0F0F14] text-xs font-semibold transition-colors cursor-pointer"
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
                  className="px-6 py-2.5 rounded-full bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[#7C3AED] dark:text-[#C4B5FD] text-xs font-semibold border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                >
                  Request a Live Demo
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Honeypot anti-spam field */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.edu"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  School / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="School or institution name"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  School Type
                </label>
                <select
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {SCHOOL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Inquiry Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={INPUT_CLASS}
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
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600"
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message / Questions *
              </label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about pricing, multi-campus licensing, onboarding timeline, or integrations..."
                className={`${INPUT_CLASS} resize-none`}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-full bg-[#0F0F14] dark:bg-white hover:bg-slate-800 dark:hover:bg-purple-50 disabled:opacity-60 text-white dark:text-[#0F0F14] text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
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
