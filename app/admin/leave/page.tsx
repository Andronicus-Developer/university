"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarRange,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
} from "lucide-react";

interface LeaveItem {
  id: string;
  staff_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export default function LeaveRequestsPage() {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data } = await db
        .from("leave_requests")
        .select(`
          id,
          leave_type,
          start_date,
          end_date,
          status,
          created_at,
          staff:staff_id(
            profile:profile_id(full_name)
          )
        `)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setLeaves(
          data.map((l: any) => ({
            id: l.id,
            staff_name: l.staff?.profile?.full_name || "Faculty Member",
            leave_type: l.leave_type?.toUpperCase() || "ANNUAL",
            start_date: l.start_date,
            end_date: l.end_date,
            status: l.status,
            created_at: new Date(l.created_at).toLocaleDateString(),
          }))
        );
      } else {
        setLeaves([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    const supabase = createClient();
    const db = supabase as any;
    try {
      await db.from("leave_requests").update({ status }).eq("id", id);
      setLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
      alert(`Leave request ${status}.`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">HR & Faculty Leave</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Faculty & Staff Leave Management
          </h1>
          <p className="text-xs text-[#64748B]">
            Approve, track, and reconcile annual, study, maternity, and sick leave balances.
          </p>
        </div>

        <button
          onClick={() => alert("Submit Leave Application modal opened.")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Apply For Leave</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-4">Applicant</th>
              <th className="py-3 px-4">Leave Type</th>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4">Applied Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Approval Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs">
            {leaves.length > 0 ? (
              leaves.map((l) => (
                <tr key={l.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#1E293B]">{l.staff_name}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#475569]">{l.leave_type}</td>
                  <td className="py-3.5 px-4 text-[#64748B]">
                    {l.start_date} → {l.end_date}
                  </td>
                  <td className="py-3.5 px-4 text-[#64748B]">{l.created_at}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === "approved"
                          ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                          : l.status === "rejected"
                          ? "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]"
                          : "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                      }`}
                    >
                      {l.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => handleUpdateStatus(l.id, "approved")}
                      className="px-2.5 py-1 rounded-lg bg-[#DCFCE7] text-[#16A34A] hover:bg-[#BBF7D0] text-xs font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(l.id, "rejected")}
                      className="px-2.5 py-1 rounded-lg bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA] text-xs font-semibold"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-[#94A3B8]">
                  {loading ? "Checking leave records in database..." : "No leave requests pending in database."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

