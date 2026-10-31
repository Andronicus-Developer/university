"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FolderOpen,
  FileText,
  Download,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Lock,
} from "lucide-react";

export default function StudentDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocs() {
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
          const { data: docs } = await db
            .from("generated_documents")
            .select("*")
            .eq("student_id", stuId);

          setDocuments(docs || []);

          const { data: recs } = await db
            .from("receipts")
            .select("*")
            .eq("student_id", stuId);

          setReceipts(recs || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDocs();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading student document vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Document Repository</h1>
          <p className="text-xs text-slate-500">Verified official files, letters, and payment vouchers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Admission Letter */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              Certified
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900">Official Letter of Admission (BSc CS)</h2>
            <p className="text-xs text-slate-500">Undergraduate Admissions Directorate • Admitted AY 2026/2027</p>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">PDF • 248 KB</span>
            <button
              onClick={() => alert("Downloading Official Letter of Admission...")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          </div>
        </div>

        {/* Generated Documents */}
        {documents.map((d) => (
          <div key={d.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="h-6 w-6" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                {d.status}
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900">Enrollment Attestation & Verification</h2>
              <p className="text-xs text-slate-500">
                Ref: <span className="font-mono text-slate-700">{d.document_reference}</span>
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-[11px] text-blue-600 font-mono font-bold">Code: {d.verification_code}</span>
              <button
                onClick={() => alert(`Downloading verified document ${d.document_reference}...`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
        ))}

        {/* Official Receipts */}
        {receipts.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <FileText className="h-6 w-6" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                Official Receipt
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900">Fee Payment Voucher #{r.receipt_number}</h2>
              <p className="text-xs text-slate-500">
                Amount: <span className="font-bold text-slate-800">GHS {Number(r.amount).toFixed(2)}</span>
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">{new Date(r.issued_at).toLocaleDateString()}</span>
              <button
                onClick={() => alert(`Downloading Receipt ${r.receipt_number}...`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

