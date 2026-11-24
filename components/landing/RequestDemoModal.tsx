"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { ErudianLogo } from "@/components/brand/ErudianLogo";

interface RequestDemoModalProps {
  open: boolean;
  onClose: () => void;
  defaultModule?: string;
  defaultPlan?: string;
}

const INSTITUTION_TYPES = [
  "University / Tertiary",
  "High School / Secondary",
  "Vocational / Technical School",
  "Multi-Campus Group",
];

const STUDENT_COUNTS = [
  "Under 500",
  "500 – 2,000",
  "2,000 – 10,000",
  "10,000+",
];

const ROLE_OPTIONS = [
  "Principal / Head of School",
  "System Administrator / IT",
  "Registrar / Academic Lead",
  "Bursar / Finance Officer",
  "School Owner / Director",
  "Other",
];

const TIME_SLOTS = [
  "Morning 9AM–12PM",
  "Afternoon 12PM–4PM",
  "Evening 4PM–6PM",
];

const INTEREST_MODULES = [
  "Student Management",
  "Attendance Tracking",
  "Exams & Grading",
  "Fees & Billing",
  "Parent Communication",
  "Multi-Tenant Governance",
];

export function RequestDemoModal({
  open,
  onClose,
  defaultModule,
  defaultPlan,
}: RequestDemoModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [schoolType, setSchoolType] = useState(INSTITUTION_TYPES[0]);
  const [studentCount, setStudentCount] = useState(STUDENT_COUNTS[1]);
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState(TIME_SLOTS[0]);
  const [interests, setInterests] = useState<string[]>([
    "Student Management",
    "Exams & Grading",
  ]);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceId: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (defaultModule && open) {
      setInterests((prev) =>
        prev.includes(defaultModule) ? prev : [...prev, defaultModule]
      );
    }
  }, [defaultModule, open]);

  useEffect(() => {
    if (!open) return;
    if (defaultPlan) {
      setNotes((prev) =>
        !prev.trim() || prev.startsWith("Interested in the ")
          ? `Interested in the ${defaultPlan} plan.`
          : prev
      );
    } else {
      setNotes((prev) => (prev.startsWith("Interested in the ") ? "" : prev));
    }
  }, [defaultPlan, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const toggleInterest = (mod: string) => {
    setInterests((prev) =>
      prev.includes(mod) ? prev.filter((item) => item !== mod) : [...prev, mod]
    );
  };

  const resetAndClose = () => {
    setErrorMsg(null);
    setConfirmation(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !email.trim() || !phone.trim() || !institutionName.trim()) {
      setErrorMsg("Please fill in your name, work email, phone number, and school name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "demo_request",
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          institution_name: institutionName.trim(),
          school_type: schoolType,
          student_count: studentCount,
          role,
          preferred_date: preferredDate || "Flexible",
          preferred_time: preferredTime,
          interests,
          notes: notes.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Unable to submit your demo request.");
      }

      setConfirmation({
        referenceId: data.referenceId || "ERD-DEMO-SUBMITTED",
        message:
          data.message ||
          "Your demo request has been logged. Our team will send a calendar invite shortly.",
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
        aria-labelledby="request-demo-title"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-100 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-[#FAF7FF] via-white to-[#F3ECFF] dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ErudianLogo size="sm" />
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:inline-block" />
            <h2
              id="request-demo-title"
              className="text-sm font-bold text-slate-900 dark:text-white"
            >
              Request a Personalized Demo
            </h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close modal"
            className="h-8 w-8 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#7C3AED] text-xs font-bold border border-purple-100">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Reference: {confirmation.referenceId}</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Demo Request Confirmed
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {confirmation.message}
              </p>
            </div>

            <div className="max-w-md mx-auto rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-left text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Institution:</span>
                <span className="font-semibold text-slate-900">{institutionName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Institution Type:</span>
                <span className="font-semibold text-slate-900">{schoolType}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Preferred Window:</span>
                <span className="font-semibold text-slate-900">
                  {preferredDate || "Next Available"} · {preferredTime}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-6 py-2.5 rounded-full bg-[#0F0F14] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-full bg-purple-50 hover:bg-purple-100 text-[#7C3AED] text-xs font-semibold border border-purple-200 transition-colors"
              >
                Sign In to Portal
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {defaultPlan && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-[#7C3AED] text-[11px] font-bold">
                <Sparkles className="h-3 w-3" />
                <span>Selected Plan: {defaultPlan}</span>
              </div>
            )}

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
                  placeholder="e.g. Dr. Kwame Mensah"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Work / Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  School / Institution Name *
                </label>
                <input
                  type="text"
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. Westbridge Academy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Institution Type
                </label>
                <select
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Estimated Student Population
                </label>
                <select
                  value={studentCount}
                  onChange={(e) => setStudentCount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                >
                  {STUDENT_COUNTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Your Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#7C3AED]" />
                      Preferred Date
                    </span>
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#7C3AED]" />
                      Time Slot
                    </span>
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Modules of Interest
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_MODULES.map((mod) => {
                  const selected = interests.includes(mod);
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleInterest(mod)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                        selected
                          ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-purple-300"
                      }`}
                    >
                      {mod}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Additional Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell us about your campuses, grading systems, or migration timeline..."
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
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-purple-500/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <span>Submit Demo Request</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
