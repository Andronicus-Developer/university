"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarRange,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";

export default function FeeSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeeItem, setSelectedFeeItem] = useState("");
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("100");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("2026-11-30");
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: scheds } = await db
        .from("fee_schedules")
        .select(`
          id,
          amount,
          currency,
          level,
          due_date,
          fee_item:fee_item_id(code, name, is_mandatory),
          programme:programme_id(code, name),
          term:term_id(code, name),
          academic_year:academic_year_id(code, name)
        `)
        .order("created_at", { ascending: false });

      setSchedules(scheds || []);

      const { data: items } = await db.from("fee_items").select("*").order("name");
      setFeeItems(items || []);
      if (items && items.length > 0 && !selectedFeeItem) setSelectedFeeItem(items[0].id);

      const { data: progs } = await db.from("programmes").select("id, code, name");
      setProgrammes(progs || []);
      if (progs && progs.length > 0 && !selectedProgramme) setSelectedProgramme(progs[0].id);

      const { data: trms } = await db.from("terms").select("id, code, name, academic_year_id");
      setTerms(trms || []);
      if (trms && trms.length > 0 && !selectedTerm) setSelectedTerm(trms[0].id);

      const { data: yrs } = await db.from("academic_years").select("id, code, name");
      setAcademicYears(yrs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const activeTerm = terms.find((t) => t.id === selectedTerm);
      const yearId = activeTerm?.academic_year_id || academicYears[0]?.id;

      const { error } = await db.from("fee_schedules").insert({
        academic_year_id: yearId,
        term_id: selectedTerm,
        programme_id: selectedProgramme,
        level: parseInt(selectedLevel),
        fee_item_id: selectedFeeItem,
        amount: parseFloat(amount || "0"),
        currency: "GHS",
        due_date: dueDate || null,
      });

      if (error) throw error;

      setToastMsg("Fee schedule item created successfully!");
      setModalOpen(false);
      setAmount("");
      await loadData();
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to create fee schedule");
    } finally {
      setSaving(false);
    }
  };

  const filtered = schedules.filter((s) => {
    const item = s.fee_item?.name?.toLowerCase() || "";
    const prog = s.programme?.name?.toLowerCase() || "";
    const q = searchTerm.toLowerCase();
    return item.includes(q) || prog.includes(q);
  });

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">University Fee Schedules</h1>
          <p className="text-xs text-slate-500">Approved term tuition, laboratory levies, and mandatory student charges</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Fee Schedule</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search fee item, programme, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total Scheduled Items: <span className="font-bold text-slate-900">{filtered.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Fee Item</th>
                <th className="py-3 px-4">Programme & Level</th>
                <th className="py-3 px-4">Term</th>
                <th className="py-3 px-4">Amount (GHS)</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-6 text-right">Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900">{s.fee_item?.name || "Tuition"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.fee_item?.code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{s.programme?.name || "All Programmes"}</div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                        Level {s.level}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {s.term?.name || "First Semester 2026/2027"}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                      GHS {Number(s.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {s.due_date || "End of Term"}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                        Mandatory
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No fee schedules found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Add University Fee Schedule Item</h3>

            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fee Item Charge</label>
                <select
                  value={selectedFeeItem}
                  onChange={(e) => setSelectedFeeItem(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  {feeItems.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code}) - Default: GHS {f.default_amount}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Programme</label>
                <select
                  value={selectedProgramme}
                  onChange={(e) => setSelectedProgramme(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Level</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="100">Level 100</option>
                    <option value="200">Level 200</option>
                    <option value="300">Level 300</option>
                    <option value="400">Level 400</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1200.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
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
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

