"use client";

import React from "react";
import Link from "next/link";
import { Award, CalendarDays, CheckSquare, UserCheck, Users } from "lucide-react";
import { useRegistrarSection } from "@/lib/registrar/useRegistrarPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicKpiCard,
  ClassicLoading,
  ClassicMigrationNotice,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface RegistrarDashboardData {
  school: { id: string; name: string; school_type: string };
  missingTables: string[];
  kpis: {
    totalEnrolled: number;
    totalRegistry: number;
    pendingAdmissionsAndReg: number;
    activeSessionLabel: string;
    clearanceCandidates: number;
  };
  recentApplications: Array<{
    id: string;
    application_number: string;
    full_name: string;
    unit_name: string;
    status: string;
    created_at: string;
  }>;
}

export default function RegistrarDashboardPage() {
  const { data, loading, error, reload } =
    useRegistrarSection<RegistrarDashboardData>("dashboard");

  if (loading) return <ClassicLoading label="Loading academic registry..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load registrar dashboard"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Academic Registry Dashboard"
        subtitle={`${data.school.name} • ${terms.schoolTypeLabel} Registry & Enrollment`}
        actions={
          <>
            <Link
              href="/registrar/admissions"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
            >
              Enroll {terms.learnerSingular}
            </Link>
            <Link
              href="/registrar/transcripts"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 text-xs font-medium"
            >
              Generate {terms.certificateLabel}
            </Link>
          </>
        }
      />

      <ClassicMigrationNotice tables={data.missingTables} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ClassicKpiCard
          label={`Active Enrolled ${terms.learnerPlural}`}
          value={data.kpis.totalEnrolled}
          hint={`${data.kpis.totalRegistry} total registry records`}
          icon={Users}
          tone="info"
        />
        <ClassicKpiCard
          label="Pending Admissions / Reg."
          value={data.kpis.pendingAdmissionsAndReg}
          hint="Awaiting review or approval"
          icon={UserCheck}
          tone={data.kpis.pendingAdmissionsAndReg > 0 ? "warning" : "success"}
        />
        <ClassicKpiCard
          label={`Active ${terms.sessionLabel}`}
          value={data.kpis.activeSessionLabel}
          hint="Current academic calendar"
          icon={CalendarDays}
        />
        <ClassicKpiCard
          label="Clearance Candidates"
          value={data.kpis.clearanceCandidates}
          hint="Pending or cleared for graduation"
          icon={CheckSquare}
          tone="success"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Pending Admissions Queue</h2>
          <Link
            href="/registrar/admissions"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Manage all admissions
          </Link>
        </div>
        {data.recentApplications.length === 0 ? (
          <div className="p-6">
            <ClassicEmpty
              icon={Award}
              title="No Pending Applications"
              description={`New ${terms.learnerSingular.toLowerCase()} applications waiting for matriculation or enrollment appear here.`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">App No.</th>
                  <th className="py-2.5 px-4">Applicant</th>
                  <th className="py-2.5 px-4">{terms.unitLabel}</th>
                  <th className="py-2.5 px-4">Submitted</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentApplications.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-4 font-mono">{a.application_number}</td>
                    <td className="py-2.5 px-4 font-medium">{a.full_name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{a.unit_name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{(a.created_at || "").slice(0, 10)}</td>
                    <td className="py-2.5 px-4">
                      <ClassicStatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
