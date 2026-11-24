"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  UserCheck,
  Users,
} from "lucide-react";
import { useParentSection } from "@/lib/parent/useParentPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicKpiCard,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { formatMoney, getPortalTerminology } from "@/lib/portals/school-type-labels";

interface DashboardData {
  school: { id: string; name: string; school_type: string; currency: string };
  ward: any;
  noLinkedWard?: boolean;
  activeTerm: { name: string; code?: string } | null;
  notices: Array<{
    id: string;
    title: string;
    description: string | null;
    event_type: string | null;
    start_date: string | null;
  }>;
  summary: {
    attendancePct: number | null;
    attendanceCount: number;
    totalBilled: number;
    totalPaid: number;
    balanceDue: number;
    latestGpa: number | null;
    latestAverage: number | null;
    competentCount: number;
    assessmentsTotal: number;
  };
}

export default function ParentDashboardPage() {
  const { data, loading, error, reload } = useParentSection<DashboardData>("dashboard");

  if (loading) return <ClassicLoading label="Loading ward overview..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load dashboard"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  if (data.noLinkedWard || !data.ward) {
    return (
      <div className="space-y-5">
        <ClassicPageHeader
          title="Parent Dashboard"
          subtitle={`${data.school.name} • ${terms.schoolTypeLabel}`}
        />
        <ClassicEmpty
          icon={Users}
          title={`No Linked ${terms.learnerSingular} Found`}
          description={`Your guardian account does not currently have any linked ${terms.learnerPlural.toLowerCase()}. Ask your School Administrator to link your child record to your email address.`}
        />
      </div>
    );
  }

  const wardPlacement =
    data.ward.class_group_name ||
    data.ward.programme_name ||
    data.ward.intake_name ||
    data.ward.department_name ||
    "Active Enrollment";

  const academicMetric =
    terms.schoolType === "university"
      ? data.summary.latestGpa !== null
        ? data.summary.latestGpa.toFixed(2)
        : "—"
      : terms.schoolType === "vocational"
      ? `${data.summary.competentCount} / ${data.summary.assessmentsTotal}`
      : data.summary.latestAverage !== null
      ? `${data.summary.latestAverage}%`
      : "—";

  const academicLabel =
    terms.schoolType === "university"
      ? "GPA Summary"
      : terms.schoolType === "vocational"
      ? "Competent Units"
      : "Latest Average";

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title={`${data.ward.full_name} — Overview`}
        subtitle={`${data.school.name} • ${terms.idLabel}: ${data.ward.student_number} • ${wardPlacement}${
          data.activeTerm ? ` • ${data.activeTerm.name}` : ""
        }`}
        actions={
          <Link
            href="/parent/billing"
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 text-xs font-medium"
          >
            View Fee Statement
          </Link>
        }
      />

      {/* Crisp 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ClassicKpiCard
          label={`Current ${terms.unitLabel}`}
          value={wardPlacement}
          hint={`${terms.idLabel}: ${data.ward.student_number}`}
          icon={GraduationCap}
        />
        <ClassicKpiCard
          label="Attendance Rate"
          value={
            data.summary.attendancePct !== null ? `${data.summary.attendancePct}%` : "No logs"
          }
          hint={`${data.summary.attendanceCount} recorded sessions`}
          icon={UserCheck}
          tone={
            data.summary.attendancePct !== null && data.summary.attendancePct >= 80
              ? "success"
              : "neutral"
          }
        />
        <ClassicKpiCard
          label={academicLabel}
          value={academicMetric}
          hint={terms.resultsLabel}
          icon={Award}
          tone="info"
        />
        <ClassicKpiCard
          label="Outstanding Fee Balance"
          value={formatMoney(data.summary.balanceDue, data.school.currency)}
          hint={`Paid: ${formatMoney(data.summary.totalPaid, data.school.currency)}`}
          icon={CreditCard}
          tone={data.summary.balanceDue > 0 ? "warning" : "success"}
        />
      </div>

      {/* Two-Column Ward Summary + School Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {terms.learnerSingular} Details & Quick Links
            </h2>
            <ClassicStatusBadge status={data.ward.status} />
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2 flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">Full Name</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">
                {data.ward.full_name}
              </dd>
            </div>
            <div className="py-2 flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">{terms.idLabel}</dt>
              <dd className="font-mono font-medium">{data.ward.student_number}</dd>
            </div>
            <div className="py-2 flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">{terms.unitLabel}</dt>
              <dd className="font-medium">{wardPlacement}</dd>
            </div>
            <div className="py-2 flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">Relationship</dt>
              <dd className="font-medium">{data.ward.relationship}</dd>
            </div>
          </dl>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/parent/reports"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span>Results</span>
            </Link>
            <Link
              href="/parent/attendance"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <UserCheck className="h-3.5 w-3.5 text-slate-500" />
              <span>Attendance</span>
            </Link>
            <Link
              href="/parent/timetable"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
              <span>Timetable</span>
            </Link>
            <Link
              href="/parent/messages"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Bell className="h-3.5 w-3.5 text-slate-500" />
              <span>Send Inquiry</span>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent School Notices & Events
            </h2>
            <Link
              href="/parent/messages"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              All notices & messages
            </Link>
          </div>
          {data.notices.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
              No recent school notices posted yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.notices.map((n) => (
                <div key={n.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {n.title}
                    </p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                      {(n.start_date || "").slice(0, 10) || "Notice"}
                    </span>
                  </div>
                  {n.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {n.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
