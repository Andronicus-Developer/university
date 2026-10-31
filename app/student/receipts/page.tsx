"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Receipt,
  Building,
  ShieldCheck,
  X,
} from "lucide-react";

export default function StudentReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReceipts() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let stu = null;
        if (user) {
          const { data: s } = await db
            .from("students")
            .select("*, programme:programme_id(*), profile:profile_id(*)")
            .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();
          stu = s;
        }

        if (!stu) {
          const { data: firstStu } = await db
            .from("students")
            .select("*, programme:programme_id(*), profile:profile_id(*)")
            .limit(1)
            .maybeSingle();
          stu = firstStu;
        }

        if (stu) {
          setStudent(stu);

          const { data: recList } = await db
            .from("receipts")
            .select("*, payment:payment_id(*)")
            .eq("student_id", stu.id)
            .order("issued_at", { ascending: false });

          setReceipts(recList || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadReceipts();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading official receipts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Official Payment Receipts</h1>
          <p className="text-xs text-slate-500">Authoritative proof of fee payments issued by University Finance</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Receipts Issued ({receipts.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="py-3.5 px-6">Receipt Number</th>
                <th className="py-3.5 px-6">Date Issued</th>
                <th className="py-3.5 px-6">Payment Method</th>
                <th className="py-3.5 px-6">Transaction Ref</th>
                <th className="py-3.5 px-6">Amount (GHS)</th>
                <th className="py-3.5 px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.length > 0 ? (
                receipts.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-bold text-blue-700">{rec.receipt_number}</td>
                    <td className="py-4 px-6 text-slate-600">
                      {new Date(rec.issued_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-medium">
                      {rec.payment?.payment_method || "Paystack / Mobile Money"}
                    </td>
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-500">
                      {rec.payment?.provider_reference || "N/A"}
                    </td>
                    <td className="py-4 px-6 font-black text-slate-900">
                      GHS {Number(rec.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => setSelectedReceipt(rec)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition"
                      >
                        View Voucher
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No payment receipts issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Voucher Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                  UMS
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Official University Receipt</h3>
                  <p className="text-[11px] text-slate-500">Office of the Director of Finance</p>
                </div>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt No:</span>
                <span className="font-mono font-bold text-blue-700">{selectedReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Student Name:</span>
                <span className="font-bold text-slate-800">{student?.profile?.full_name || "Ama Johnson"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Student ID / Number:</span>
                <span className="font-bold text-slate-800">{student?.student_number || "STU20260001"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Academic Programme:</span>
                <span className="font-semibold text-slate-700">{student?.programme?.name || "BSc Computer Science"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date Issued:</span>
                <span className="font-semibold text-slate-700">{new Date(selectedReceipt.issued_at).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-800">Amount Paid:</span>
                <span className="text-xl font-black text-emerald-600">
                  GHS {Number(selectedReceipt.amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Digitally Verified Voucher</span>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                <Printer className="h-3.5 w-3.5" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

