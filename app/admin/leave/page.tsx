"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle,
  Plus,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";

interface LeaveItem {
  id: string;
  staff_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

export default function LeaveRequestsPage() {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [staffList, setStaffList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setStartDate((p) => p || today);
    setEndDate((p) => p || today);
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/ops?resource=leave", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error || "Failed to load leave requests.");
      } else {
        setLeaves(data.leaves || []);
        setStaffList(data.staffList || []);
        setMissingTables(data.missingTables || []);
        if (data.staffList?.[0] && !staffName) {
          setStaffId(data.staffList[0].id);
          setStaffName(data.staffList[0].full_name);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    setErrorMsg(null);
    const res = await fetch("/api/admin/ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "leave", action: "update_status", id, status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data?.error || "Failed to update leave status.");
      return;
    }
    await fetchLeaves();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "leave",
          staff_id: staffId || null,
          staff_name: staffName || "Staff Member",
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(json?.error || "Failed to submit leave request.");
      } else {
        setShowModal(false);
        setReason("");
        await fetchLeaves();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Staff Leave Requests
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track, approve, or decline academic and administrative staff leave schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLeaves}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Leave Request</span>
          </button>
        </div>
      </div>

      {missingTables.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Run migration `20261124000010_audit_remediation_tables_and_rls.sql` in Supabase SQL Editor to enable leave tracking.</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs font-semibold text-rose-800 dark:text-rose-200">
          {errorMsg}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading leave records...</div>
        ) : leaves.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <CalendarRange className="h-7 w-7 mx-auto text-slate-400" />
            <p className="text-sm font-semibold">No Leave Requests Logged</p>
            <p className="text-xs text-slate-500">Logged staff leave requests will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 px-4 font-semibold">{l.staff_name}</td>
                    <td className="py-3 px-4 uppercase">{l.leave_type}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {l.start_date} – {l.end_date}
                    </td>
                    <td className="py-3 px-4 capitalize font-semibold">{l.status}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {l.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(l.id, "approved")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] cursor-pointer"
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(l.id, "rejected")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-200 text-rose-600 text-[11px] cursor-pointer"
                          >
                            <XCircle className="h-3 w-3" /> Decline
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold">Log Staff Leave Request</h3>
              <button type="button" onClick={() => setShowModal(false)} className="cursor-pointer">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              {staffList.length > 0 ? (
                <div>
                  <label className="block font-semibold mb-1">Staff Member</label>
                  <select
                    value={staffId}
                    onChange={(e) => {
                      setStaffId(e.target.value);
                      const m = staffList.find((s) => s.id === e.target.value);
                      if (m) setStaffName(m.full_name);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold mb-1">Staff Name *</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              )}
              <div>
                <label className="block font-semibold mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Medical / Sick Leave</option>
                  <option value="study">Study Leave</option>
                  <option value="compassionate">Compassionate Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  {saving ? "Saving..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
