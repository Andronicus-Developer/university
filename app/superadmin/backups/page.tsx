"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { BackupSchoolRow } from "@/lib/superadmin/backups-service";

function formatTimestamp(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSchoolTypePill(type: string) {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "high_school") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (normalized === "vocational_school" || normalized === "vocational") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function extractFilenameFromDisposition(
  headerValue: string | null,
  fallbackSlug: string
): string {
  if (headerValue) {
    const match = headerValue.match(/filename="?([^";]+)"?/i);
    if (match?.[1]) return match[1].trim();
  }
  const datePart = new Date().toISOString().slice(0, 10);
  const safeSlug =
    String(fallbackSlug || "school")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "school";
  return `backup-${safeSlug}-${datePart}.json`;
}

export default function BackupRecoveryPage() {
  const [schools, setSchools] = useState<BackupSchoolRow[]>([]);
  const [liveTableCount, setLiveTableCount] = useState<number>(17);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [downloadingSchoolId, setDownloadingSchoolId] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadSchools = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/superadmin/backups", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch live schools list.");
      }

      setSchools(Array.isArray(data.schools) ? data.schools : []);
      if (typeof data.live_table_count === "number") {
        setLiveTableCount(data.live_table_count);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to load schools for backup.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSchools(false);
  }, [loadSchools]);

  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.school_type_label.toLowerCase().includes(q)
    );
  }, [schools, searchQuery]);

  const backedUpCount = useMemo(
    () => schools.filter((s) => Boolean(s.last_backup_at)).length,
    [schools]
  );

  const handleDownloadBackup = async (school: BackupSchoolRow) => {
    setDownloadingSchoolId(school.id);
    setErrorMsg(null);
    setDownloadSuccess(null);

    try {
      const res = await fetch(
        `/api/superadmin/backups/${encodeURIComponent(school.id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Failed to generate school backup.");
      }

      const headerFilename =
        res.headers.get("X-Backup-Filename") ||
        extractFilenameFromDisposition(
          res.headers.get("Content-Disposition"),
          school.slug || school.name
        );

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = headerFilename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(
        `Exported complete JSON backup (${headerFilename}) for ${school.name}.`
      );
      await loadSchools(true);
    } catch (err: any) {
      setErrorMsg(err?.message || `Failed to export backup for ${school.name}.`);
    } finally {
      setDownloadingSchoolId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Sub-Header: Breadcrumbs + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link
              href="/superadmin/dashboard"
              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Super Admin
            </Link>
            <span className="text-slate-300">/</span>
            <span>Security &amp; Operations</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">
              Backup &amp; Recovery Status
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">
            Per-School Backup &amp; Recovery Export
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Download complete, tenant-isolated JSON archives scoped strictly to each school&apos;s data.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadSchools(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh Live Schools</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Registered Schools
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {loading ? "—" : schools.length}
            </div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1">
              Live from public.schools
            </div>
          </div>
          <span className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Exported Schools
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {loading ? "—" : backedUpCount}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              On-demand verified JSON exports
            </div>
          </div>
          <span className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Tenant Export Scope
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {liveTableCount}+ Tables
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Strict school_id isolation per download
            </div>
          </div>
          <span className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <HardDrive className="h-5 w-5" />
          </span>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => loadSchools(true)}
            className="px-3 py-1 rounded-lg bg-white border border-red-200 text-red-700 font-semibold hover:bg-red-100 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Live Schools Backup Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Registered Schools &amp; Data Backups
              </h2>
              <p className="text-[11px] text-slate-500">
                Includes profiles, departments, programs, students, staff, attendance, invoices, and payments
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search school name, ID, or type..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">School Name</th>
                <th className="py-3 px-4">School ID</th>
                <th className="py-3 px-4">School Type</th>
                <th className="py-3 px-4">Last Backup / Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="h-4 w-44 rounded bg-slate-100" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-56 rounded bg-slate-100" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-5 w-24 rounded-full bg-slate-100" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-36 rounded bg-slate-100" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-8 w-32 rounded-xl bg-slate-100 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Building2 className="h-8 w-8 text-slate-300 mx-auto" />
                      <div className="text-sm font-bold text-slate-800">
                        {schools.length === 0
                          ? "No Registered Schools Found"
                          : "No Schools Match Your Search"}
                      </div>
                      <p className="text-xs text-slate-500">
                        {schools.length === 0
                          ? "Create a school in the Schools directory and it will appear here automatically for per-school JSON backups."
                          : "Try clearing or adjusting your search query."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => {
                  const isExporting = downloadingSchoolId === school.id;
                  const isCopied = copiedId === school.id;
                  const summary = school.record_summary;

                  return (
                    <tr
                      key={school.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-[13px]">
                          {school.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500">
                          <span className="font-mono font-semibold text-slate-600 uppercase">
                            {school.slug}
                          </span>
                          <span>·</span>
                          <span>{summary.profiles} users</span>
                          <span>·</span>
                          <span>{summary.students} students</span>
                          <span>·</span>
                          <span>{summary.departments} depts</span>
                          <span>·</span>
                          <span>{summary.programmes} progs</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-mono text-[11px] text-slate-700">
                          <span className="truncate max-w-[180px]" title={school.id}>
                            {school.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(school.id).catch(() => {});
                              setCopiedId(school.id);
                              setTimeout(() => setCopiedId(null), 1600);
                            }}
                            title="Copy School ID"
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${getSchoolTypePill(
                            school.school_type
                          )}`}
                        >
                          {school.school_type_label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {school.last_backup_at ? (
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{formatTimestamp(school.last_backup_at)}</span>
                            </div>
                            <div className="text-[10.5px] text-slate-400">
                              Updated: {formatTimestamp(school.updated_at)}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-semibold text-slate-600">
                              Updated: {formatTimestamp(school.updated_at)}
                            </div>
                            <div className="text-[10.5px] text-amber-600">
                              No manual export yet
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadBackup(school)}
                          disabled={Boolean(downloadingSchoolId)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isExporting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              <span>Download Backup</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
