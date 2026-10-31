"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  HelpCircle,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
  FileText,
} from "lucide-react";

export default function StudentServiceRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [requestType, setRequestType] = useState("enrollment_letter");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let stu = null;
      if (user) {
        const { data: s } = await db
          .from("students")
          .select("id")
          .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();
        stu = s;
      }

      if (!stu) {
        const { data: firstStu } = await db.from("students").select("id").limit(1).maybeSingle();
        stu = firstStu;
      }

      if (stu) {
        setStudent(stu);

        const { data: reqs } = await db
          .from("service_requests")
          .select("*")
          .eq("student_id", stu.id)
          .order("submitted_at", { ascending: false });

        setRequests(reqs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmitRequest = async () => {
    if (!student) return;
    setSubmitting(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { error } = await db.from("service_requests").insert({
        student_id: student.id,
        request_type: requestType,
        status: "pending",
        fee_amount: requestType === "transcript" ? 50.00 : 25.00,
        is_paid: true,
        details: {
          purpose: purpose || "General administrative submission",
          requested_at: new Date().toISOString(),
        },
      });

      if (error) throw error;
      setModalOpen(false);
      setPurpose("");
      await loadRequests();
    } catch (err: any) {
      alert("Failed to submit request: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading service requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Registry Service Requests</h1>
          <p className="text-xs text-slate-500">Apply for official registry services, letters, deferrals and replacements</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs self-start"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Service Request</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Submitted Requests ({requests.length})</h2>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {requests.length > 0 ? (
            requests.map((req) => (
              <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 capitalize">
                      {req.request_type?.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        req.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : req.status === "in_progress"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Purpose: <span className="font-semibold text-slate-700">{req.details?.purpose || "Registry official verification"}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Submitted: {new Date(req.submitted_at).toLocaleString()} • Fee: GHS {Number(req.fee_amount).toFixed(2)} (Paid)
                  </p>
                </div>

                <div>
                  {req.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-xs">
                      <Clock className="h-3.5 w-3.5" /> In Processing
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">No active service requests submitted.</p>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Submit New Service Request</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Request Service Type</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  <option value="enrollment_letter">Enrollment Verification Letter (GHS 25.00)</option>
                  <option value="transcript">Official Academic Transcript (GHS 50.00)</option>
                  <option value="completion_letter">Letter of Programme Completion (GHS 30.00)</option>
                  <option value="id_replacement">Student ID Card Replacement (GHS 40.00)</option>
                  <option value="deferral">Academic Deferral Application (Free)</option>
                  <option value="leave_of_absence">Leave of Absence Request (Free)</option>
                  <option value="programme_change">Academic Programme Transfer (GHS 100.00)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purpose / Justification</label>
                <textarea
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. For visa embassy interview, scholarship application, employer verification..."
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
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

