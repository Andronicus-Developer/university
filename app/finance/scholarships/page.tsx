"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Award,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  Users,
  ChevronRight,
  Loader2,
  Building2,
} from "lucide-react";

export default function ScholarshipsPage() {
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [coverageType, setCoverageType] = useState("full");
  const [maxAmount, setMaxAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: schs } = await db
        .from("scholarships")
        .select(`
          id,
          name,
          sponsor_name,
          coverage_type,
          amount_percentage,
          max_amount,
          is_active,
          created_at,
          student:student_id (
            student_number,
            profile:profile_id (full_name, email),
            programme:programme_id (name, code)
          )
        `)
        .order("created_at", { ascending: false });

      setScholarships(schs || []);

      const { data: stu } = await db.from("students").select("id, student_number, profile:profile_id(full_name)");
      setStudents(stu || []);
      if (stu && stu.length > 0 && !selectedStudent) setSelectedStudent(stu[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { error } = await db.from("scholarships").insert({
        student_id: selectedStudent,
        name,
        sponsor_name: sponsorName,
        coverage_type: coverageType,
        max_amount: parseFloat(maxAmount || "0"),
        is_active: true,
      });

      if (error) throw error;

      setToastMsg("Scholarship grant created successfully!");
      setModalOpen(false);
      setName("");
      setSponsorName("");
      setMaxAmount("");
      await loadData();
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to add scholarship");
    } finally {
      setSaving(false);
    }
  };

  const filtered = scholarships.filter((s) => {
    const sName = s.name.toLowerCase();
    const sponsor = s.sponsor_name.toLowerCase();
    const stu = (s.student?.profile?.full_name || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return sName.includes(q) || sponsor.includes(q) || stu.includes(q);
  });

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Scholarships & Institutional Sponsorships</h1>
          <p className="text-xs text-slate-500">Government trusts, donor bursaries, and merit grants allocated to students</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Award Scholarship</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search scholarship name, sponsor, scholar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Active Scholarships: <span className="font-bold text-slate-900">{filtered.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Scholarship Grant</th>
                <th className="py-3 px-4">Sponsor / Trust</th>
                <th className="py-3 px-4">Beneficiary Student</th>
                <th className="py-3 px-4">Coverage Type</th>
                <th className="py-3 px-4">Maximum Amount</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {s.sponsor_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{s.student?.profile?.full_name}</div>
                      <div className="text-[10px] text-slate-400">{s.student?.student_number} • {s.student?.programme?.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 capitalize">
                      {s.coverage_type?.replace("_", " ")}
                    </td>
                    <td className="py-3.5 px-4 font-black text-indigo-700 text-sm">
                      GHS {Number(s.max_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No scholarships recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Award Student Scholarship</h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scholarship Title</label>
                <input
                  type="text"
                  placeholder="e.g. Ghana Cocobod Bursary Fund"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sponsoring Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Ghana Cocoa Board & Ministry of Finance"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Beneficiary Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.profile?.full_name} ({st.student_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Coverage</label>
                  <select
                    value={coverageType}
                    onChange={(e) => setCoverageType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="full">Full Tuition & Fees</option>
                    <option value="tuition_only">Tuition Only</option>
                    <option value="percentage">Percentage (50%)</option>
                    <option value="fixed_amount">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grant Cap (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500.00"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Grant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

