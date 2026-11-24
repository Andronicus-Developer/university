"use client";

import React, { useMemo } from "react";
import { ShieldAlert, UserCheck } from "lucide-react";
import { useParentSection } from "@/lib/parent/useParentPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicKpiCard,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface AttendanceData {
  school: { id: string; name: string; school_type: string };
  ward: any;
  noLinkedWard?: boolean;
  attendance: Array<{
    id: string;
    status: string;
    session_date: string;
    session_type: string;
    topic: string | null;
    remarks: string | null;
    ppe_compliant: boolean | null;
  }>;
  conduct: Array<{
    id: string;
    incident_date: string | null;
    record_type: string;
    conduct_grade: string | null;
    notes: string | null;
  }>;
}

export default function ParentAttendancePage() {
  const { data, loading, error, reload } = useParentSection<AttendanceData>("attendance");

  const stats = useMemo(() => {
    const list = data?.attendance || [];
    const present = list.filter((a) => a.status === "present").length;
    const late = list.filter((a) => a.status === "late").length;
    const absent = list.filter((a) => a.status === "absent").length;
    const rate = list.length > 0 ? Math.round(((present + late) / list.length) * 100) : 0;
    return { total: list.length, present, late, absent, rate };
  }, [data?.attendance]);

  if (loading) return <ClassicLoading label="Loading attendance & conduct logs..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load attendance"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);
  if (data.noLinkedWard || !data.ward) {
    return (
      <ClassicEmpty
        icon={UserCheck}
        title={`No Linked ${terms.learnerSingular}`}
        description="Link a child/ward to inspect daily attendance and conduct records."
      />
    );
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Attendance & Conduct"
        subtitle={`${data.school.name} • ${data.ward.full_name} (${data.ward.student_number})`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ClassicKpiCard label="Attendance Rate" value={stats.total > 0 ? `${stats.rate}%` : "—"} icon={UserCheck} tone="info" />
        <ClassicKpiCard label="Present Sessions" value={stats.present} tone="success" />
        <ClassicKpiCard label="Late Arrivals" value={stats.late} tone="warning" />
        <ClassicKpiCard label="Absences" value={stats.absent} tone={stats.absent > 0 ? "danger" : "neutral"} />
      </div>

      {/* Conduct & Discipline Remarks */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold">
            {terms.instructorLabel} Conduct & Behavioral Remarks ({data.conduct.length})
          </h2>
        </div>
        {data.conduct.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No conduct or disciplinary remarks recorded.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {data.conduct.map((c) => (
              <div key={c.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-semibold capitalize">
                    {String(c.record_type || "Remark").replace(/_/g, " ")}
                  </span>
                  {c.notes && (
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{c.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {c.conduct_grade && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium mr-2">
                      Grade: {c.conduct_grade}
                    </span>
                  )}
                  <span className="text-slate-500">{(c.incident_date || "").slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Session Attendance Log ({data.attendance.length})</h2>
        </div>
        {data.attendance.length === 0 ? (
          <div className="p-6 text-xs text-slate-500 text-center">
            No attendance sessions recorded yet for this term.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Session Type</th>
                  <th className="py-2.5 px-4">Topic / Activity</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.attendance.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 px-4 font-mono">{(row.session_date || "").slice(0, 10)}</td>
                    <td className="py-2.5 px-4 capitalize">{row.session_type.replace(/_/g, " ")}</td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {row.topic || "Regular session"}
                    </td>
                    <td className="py-2.5 px-4">
                      <ClassicStatusBadge status={row.status} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {row.remarks ||
                        (row.ppe_compliant === false ? "PPE incomplete" : "—")}
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
