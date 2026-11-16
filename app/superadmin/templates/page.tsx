"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Eye,
  CheckCircle2,
  Copy,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface TemplateItem {
  id: string;
  name: string;
  category: "Registry" | "Admissions" | "Finance" | "Examinations";
  code: string;
  status: "Active" | "Draft";
  updatedAt: string;
}

export default function DocumentTemplatesPage() {
  const [templates] = useState<TemplateItem[]>([
    {
      id: "tmpl-1",
      name: "Official Academic Transcript with Verification QR",
      category: "Registry",
      code: "REG_TRANSCRIPT_V2",
      status: "Active",
      updatedAt: "2026-11-10",
    },
    {
      id: "tmpl-2",
      name: "Provisional Admission Offer Letter",
      category: "Admissions",
      code: "ADM_OFFER_LETTER_2026",
      status: "Active",
      updatedAt: "2026-11-08",
    },
    {
      id: "tmpl-3",
      name: "Student Status / Enrollment Attestation Letter",
      category: "Registry",
      code: "REG_ENROLLMENT_ATTEST",
      status: "Active",
      updatedAt: "2026-11-05",
    },
    {
      id: "tmpl-4",
      name: "Official Fee Payment Receipt & Ledger Statement",
      category: "Finance",
      code: "FIN_RECEIPT_STMT",
      status: "Active",
      updatedAt: "2026-11-02",
    },
    {
      id: "tmpl-5",
      name: "Degree Certificate Seal Layout",
      category: "Examinations",
      code: "EXAM_DEGREE_CERT_FINAL",
      status: "Active",
      updatedAt: "2026-10-28",
    },
  ]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Sub-Header: Breadcrumbs + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link
            href="/superadmin/dashboard"
            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Super Admin
          </Link>
          <span className="text-slate-300">/</span>
          <span>Platform Configuration</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">Document Templates</span>
        </div>

        <button
          onClick={() => alert("New template designer modal")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Document Template</span>
        </button>
      </div>

      {/* Templates Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Institutional Document Engine</h3>
              <p className="text-[11px] text-slate-500">
                Controlled templates with automated reference numbering & QR security
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">{templates.length} templates active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Template Title</th>
                <th className="py-3 px-4">Domain Category</th>
                <th className="py-3 px-4">System Code</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {t.name}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {t.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {t.code}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Previewing template: ${t.name}`)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Preview & Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
