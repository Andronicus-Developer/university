"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LifeBuoy,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
  MessageSquare,
} from "lucide-react";

export default function StudentSupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState("academic");
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let stuId = null;
      if (user) {
        const { data: stu } = await db
          .from("students")
          .select("id")
          .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();
        if (stu) stuId = stu.id;
      }

      if (!stuId) {
        const { data: firstStu } = await db.from("students").select("id").limit(1).maybeSingle();
        if (firstStu) stuId = firstStu.id;
      }

      if (stuId) {
        setStudent({ id: stuId });

        const { data: cases } = await db
          .from("support_cases")
          .select("*")
          .eq("student_id", stuId)
          .order("created_at", { ascending: false });

        setTickets(cases || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async () => {
    if (!student || !subject || !description) return;
    setSubmitting(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { error } = await db.from("support_cases").insert({
        student_id: student.id,
        category,
        priority,
        subject,
        description,
        status: "open",
        assigned_team: category === "finance" ? "Finance Help Desk" : "Student Support Services",
      });

      if (error) throw error;
      setModalOpen(false);
      setSubject("");
      setDescription("");
      await loadTickets();
    } catch (err: any) {
      alert("Failed to submit ticket: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading student support tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Support & Help Desk</h1>
          <p className="text-xs text-slate-500">Submit inquiry tickets to Registry, Financial Aid, or Academic Advising</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs self-start"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Open Support Ticket</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">My Support Tickets ({tickets.length})</h2>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {tickets.length > 0 ? (
            tickets.map((t) => (
              <div key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{t.subject}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        t.status === "resolved"
                          ? "bg-emerald-50 text-emerald-700"
                          : t.status === "in_progress"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                  <p className="text-[11px] text-slate-400">
                    Team: {t.assigned_team || "Registry"} • Created: {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="shrink-0">
                  <span className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs">
                    Priority: {t.priority}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">No support tickets found.</p>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Create New Support Case</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inquiry Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  <option value="academic">Academic Advising / Course Issues</option>
                  <option value="finance">Finance / Tuition & Receipt Queries</option>
                  <option value="hostel">Hostel & Accommodation</option>
                  <option value="technical">IT & Student Portal Access</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Summary of issue..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  placeholder="Provide context or explanation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

