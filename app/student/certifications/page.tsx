"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  CreditCard,
  Printer,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

interface TradeCertification {
  id: string;
  certificate_number: string | null;
  qualification_title: string;
  issue_date: string | null;
  status: "pending" | "issued" | "revoked";
  trade_name: string | null;
  intake_name: string | null;
}

interface CertificationsPayload {
  school: { id: string; name: string };
  student: any | null;
  certifications: TradeCertification[];
  readiness: {
    competentModules: number;
    requiredModules: number;
    loggedHours: number;
    attachmentCompleted: boolean;
    feesCleared: boolean;
  };
}

const CERT_STYLES: Record<string, string> = {
  issued:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  revoked:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
};

export default function VocationalCertificationsPage() {
  const { data, loading, error, reload } =
    useStudentPortalSection<CertificationsPayload>("certifications");

  if (loading) return <StudentPageLoading label="Loading trade certifications & readiness..." />;
  if (error) return <StudentPageError error={error} onRetry={reload} />;
  if (!data?.student) return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;

  const readiness = data.readiness;
  const competencyMet =
    readiness.requiredModules > 0 && readiness.competentModules >= readiness.requiredModules;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
            <Award className="h-3.5 w-3.5" />
            <span>National Trade &amp; Competency Credentials</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Trade Certifications &amp; Graduation Readiness
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track certification eligibility criteria and download official qualification records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer self-start"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print Credential Summary</span>
        </button>
      </div>

      {/* Readiness Checklist */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Certification Readiness Checklist
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Module Competencies</span>
              {competencyMet ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {readiness.competentModules} / {readiness.requiredModules}
            </p>
            <Link
              href="/student/competencies"
              className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline print:hidden"
            >
              Inspect Assessments →
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Workshop Hours</span>
              {readiness.loggedHours > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {readiness.loggedHours.toFixed(1)} hrs
            </p>
            <Link
              href="/student/logbook"
              className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline print:hidden"
            >
              Open Logbook →
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Industrial Attachment</span>
              {readiness.attachmentCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Briefcase className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {readiness.attachmentCompleted ? "Completed" : "In Progress"}
            </p>
            <Link
              href="/student/attachments"
              className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline print:hidden"
            >
              View Placement →
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Fee Clearance</span>
              {readiness.feesCleared ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-500" />
              )}
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {readiness.feesCleared ? "Cleared" : "Balance Due"}
            </p>
            <Link
              href="/student/fee-statement"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline print:hidden"
            >
              <CreditCard className="h-3 w-3" />
              <span>View Statement →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Certifications list */}
      {(data.certifications || []).length === 0 ? (
        <StudentEmptyState
          icon={Award}
          title="No Trade Certificates Issued Yet"
          description="Once your trade modules, logbook hours, and industrial attachment evaluations are finalized, issued certificates will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.certifications.map((cert) => (
            <div
              key={cert.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <BadgeCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {cert.qualification_title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {cert.trade_name || "Trade Qualification"}
                      {cert.intake_name ? ` · ${cert.intake_name}` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${
                    CERT_STYLES[cert.status] || CERT_STYLES.pending
                  }`}
                >
                  {cert.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Certificate Number
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {cert.certificate_number || "Pending Issue"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Issue Date
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {cert.issue_date || "Not yet issued"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
