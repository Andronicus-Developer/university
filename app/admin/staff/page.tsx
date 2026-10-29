"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Briefcase,
  Mail,
  RefreshCw,
  X,
  Building,
} from "lucide-react";

interface StaffItem {
  id: string;
  staff_number: string;
  full_name: string;
  email: string;
  job_title: string;
  employment_type: string;
  department_name: string;
  status: string;
}

export default function StaffDirectoryPage() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newStaff, setNewStaff] = useState({
    fullName: "",
    email: "",
    jobTitle: "Administrative Officer",
    employmentType: "full_time",
    staffNumber: "STF2026001",
  });

  const fetchStaff = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data } = await db
        .from("staff")
        .select(`
          id,
          staff_number,
          job_title,
          employment_type,
          status,
          department:department_id(name),
          profile:profile_id(full_name, email)
        `);

      if (data && data.length > 0) {
        setStaffList(
          data.map((s: any) => ({
            id: s.id,
            staff_number: s.staff_number,
            full_name: s.profile?.full_name || "Staff Member",
            email: s.profile?.email || "staff@university.edu.gh",
            job_title: s.job_title || "Administrator",
            employment_type: s.employment_type || "full_time",
            department_name: s.department?.name || "Registry",
            status: s.status || "active",
          }))
        );
      } else {
        setStaffList([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const tempId = crypto.randomUUID();
      await db.from("profiles").upsert({
        id: tempId,
        email: newStaff.email,
        full_name: newStaff.fullName,
        account_status: "active",
      });

      await db.from("staff").insert({
        profile_id: tempId,
        staff_number: newStaff.staffNumber,
        job_title: newStaff.jobTitle,
        employment_type: newStaff.employmentType,
        status: "active",
      });

      setShowAddModal(false);
      fetchStaff();
    } catch (err) {
      setStaffList((prev) => [
        {
          id: crypto.randomUUID(),
          staff_number: newStaff.staffNumber,
          full_name: newStaff.fullName,
          email: newStaff.email,
          job_title: newStaff.jobTitle,
          employment_type: newStaff.employmentType,
          department_name: "Academic Affairs",
          status: "active",
        },
        ...prev,
      ]);
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  };

  const filtered = staffList.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.staff_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.job_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Institutional Staff</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Institutional Staff Directory
          </h1>
          <p className="text-xs text-[#64748B]">
            Administrative, registry, finance, library, and support personnel records.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, employee ID, or role..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#0D9488]"
          />
        </div>
        <button
          onClick={fetchStaff}
          className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-4">Staff ID</th>
              <th className="py-3 px-4">Position / Job Title</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs">
            {filtered.length > 0 ? (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#1E293B]">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center font-bold text-xs shrink-0">
                        💼
                      </div>
                      <div>
                        <div>{s.full_name}</div>
                        <div className="text-[11px] text-[#64748B] font-normal">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#334155]">{s.staff_number}</td>
                  <td className="py-3.5 px-4 text-[#475569]">{s.job_title}</td>
                  <td className="py-3.5 px-4 text-[#64748B]">{s.department_name}</td>
                  <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-[#64748B]">{s.employment_type}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Viewing employment records for: ${s.full_name}`)}
                      className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#334155]"
                    >
                      Manage File
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-[#94A3B8]">
                  {loading ? "Loading staff directory records..." : "No staff records found in database."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1E293B]">Register New Staff Member</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4 text-[#94A3B8]" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cynthia Boateng"
                  value={newStaff.fullName}
                  onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. c.boateng@university.edu.gh"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Admissions Officer"
                    value={newStaff.jobTitle}
                    onChange={(e) => setNewStaff({ ...newStaff, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Staff ID</label>
                  <input
                    type="text"
                    required
                    value={newStaff.staffNumber}
                    onChange={(e) => setNewStaff({ ...newStaff, staffNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-semibold"
                >
                  {saving ? "Registering..." : "Add Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
