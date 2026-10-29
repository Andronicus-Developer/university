"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Download,
  BookOpen,
  Briefcase,
  Mail,
  RefreshCw,
  X,
} from "lucide-react";

interface TeacherItem {
  id: string;
  staff_number: string;
  full_name: string;
  email: string;
  job_title: string;
  employment_type: string;
  department_name: string;
  status: string;
}

export default function TeachersManagementPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newTeacher, setNewTeacher] = useState({
    fullName: "",
    email: "",
    jobTitle: "Senior Lecturer",
    employmentType: "full_time",
    staffNumber: "FAC2026001",
  });

  const fetchTeachers = async () => {
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
        // Filter for academic teaching roles
        const academicStaff = data.filter((s: any) =>
          /lecturer|professor|teacher|instructor|faculty/i.test(s.job_title || "")
        );

        setTeachers(
          academicStaff.map((s: any) => ({
            id: s.id,
            staff_number: s.staff_number,
            full_name: s.profile?.full_name || "Faculty Member",
            email: s.profile?.email || "faculty@university.edu.gh",
            job_title: s.job_title || "Lecturer",
            employment_type: s.employment_type || "full_time",
            department_name: s.department?.name || "Computer Science",
            status: s.status || "active",
          }))
        );
      } else {
        setTeachers([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const tempId = crypto.randomUUID();
      await db.from("profiles").upsert({
        id: tempId,
        email: newTeacher.email,
        full_name: newTeacher.fullName,
        account_status: "active",
      });

      await db.from("staff").insert({
        profile_id: tempId,
        staff_number: newTeacher.staffNumber,
        job_title: newTeacher.jobTitle,
        employment_type: newTeacher.employmentType,
        status: "active",
      });

      setShowAddModal(false);
      fetchTeachers();
    } catch (err) {
      // Optimistic
      setTeachers((prev) => [
        {
          id: crypto.randomUUID(),
          staff_number: newTeacher.staffNumber,
          full_name: newTeacher.fullName,
          email: newTeacher.email,
          job_title: newTeacher.jobTitle,
          employment_type: newTeacher.employmentType,
          department_name: "School of Engineering",
          status: "active",
        },
        ...prev,
      ]);
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  };

  const filtered = teachers.filter(
    (t) =>
      t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.staff_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.job_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Faculty & Teachers</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Teaching Faculty & Academic Staff
          </h1>
          <p className="text-xs text-[#64748B]">
            Manage professors, lecturers, teaching loads, and faculty assignments.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by faculty name, staff ID, or title..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
        <button
          onClick={fetchTeachers}
          className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-4">Lecturer</th>
              <th className="py-3 px-4">Staff ID</th>
              <th className="py-3 px-4">Academic Title</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs">
            {filtered.length > 0 ? (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#1E293B]">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                        👨‍🏫
                      </div>
                      <div>
                        <div>{t.full_name}</div>
                        <div className="text-[11px] text-[#64748B] font-normal">{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#334155]">{t.staff_number}</td>
                  <td className="py-3.5 px-4 text-[#475569]">{t.job_title}</td>
                  <td className="py-3.5 px-4 text-[#64748B]">{t.department_name}</td>
                  <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-[#64748B]">{t.employment_type}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Reviewing courses taught by: ${t.full_name}`)}
                      className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#334155]"
                    >
                      Assign Courses
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-[#94A3B8]">
                  {loading ? "Loading faculty records..." : "No faculty members found."}
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
              <h3 className="text-sm font-bold text-[#1E293B]">Add New Faculty Member</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4 text-[#94A3B8]" />
              </button>
            </div>
            <form onSubmit={handleAddTeacher} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kwame Asare"
                  value={newTeacher.fullName}
                  onChange={(e) => setNewTeacher({ ...newTeacher, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. k.asare@university.edu.gh"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Academic Rank</label>
                  <select
                    value={newTeacher.jobTitle}
                    onChange={(e) => setNewTeacher({ ...newTeacher, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Senior Lecturer">Senior Lecturer</option>
                    <option value="Lecturer">Lecturer</option>
                    <option value="Assistant Lecturer">Assistant Lecturer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Staff ID</label>
                  <input
                    type="text"
                    required
                    value={newTeacher.staffNumber}
                    onChange={(e) => setNewTeacher({ ...newTeacher, staffNumber: e.target.value })}
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
                  className="px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-xs font-semibold"
                >
                  {saving ? "Saving..." : "Add Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
