"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ScrollText,
  FileCheck2,
  Download,
  CheckCircle2,
  ShieldCheck,
  Plus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function StudentTranscriptsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTranscripts() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let stuId = null;
        if (user) {
          const { data: stu } = await db
            .from("students")
            .select("id, student_number")
            .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();
          if (stu) stuId = stu.id;
        }

        if (!stuId) {
          const { data: firstStu } = await db.from("students").select("id, student_number").limit(1).maybeSingle();
          if (firstStu) stuId = firstStu.id;
        }

        if (stuId) {
          const { data: docs } = await db
            .from("generated_documents")
            .select("*, service_request:service_request_id(*)")
            .eq("student_id", stuId)
            .order("issued_at", { ascending: false });

          setDocuments(docs || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadTranscripts();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading official transcripts & documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Official Transcripts & Attestation Letters</h1>
          <p className="text-xs text-slate-500">Certified academic transcripts, letters of introduction and verification letters</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Issued Documents ({documents.length})</h2>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <div key={doc.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {doc.service_request?.request_type ? doc.service_request.request_type.replace("_", " ").toUpperCase() : "ENROLLMENT VERIFICATION LETTER"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase">
                      {doc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Doc Ref: <span className="font-mono text-slate-700 font-bold">{doc.document_reference}</span> • Issued: {new Date(doc.issued_at).toLocaleDateString()}
                  </p>
                  <p className="text-[11px] text-blue-600 font-mono">
                    Digital Verification Code: <span className="font-bold">{doc.verification_code}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => alert(`Downloading verified document ${doc.document_reference}...`)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">
              No official documents issued yet. Request a document via Service Requests.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

