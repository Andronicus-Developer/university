"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HardDrive,
  Database,
  ShieldCheck,
  Check,
  Lock,
  FileCheck,
} from "lucide-react";

export default function StorageFilePoliciesPage() {
  const [signedUrlExpirySeconds, setSignedUrlExpirySeconds] = useState("900");
  const [maxUploadMb, setMaxUploadMb] = useState("10");
  const [enforceMimeCheck, setEnforceMimeCheck] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const buckets = [
    {
      name: "institutional-reports",
      isPrivate: true,
      description: "Database snapshots, accreditation reports, and virtual cloud state cache.",
      objectsCount: 142,
    },
    {
      name: "student-documents",
      isPrivate: true,
      description: "Admissions certificates, WASSCE slips, transcripts, and official verification uploads.",
      objectsCount: 1204,
    },
    {
      name: "staff-confidential",
      isPrivate: true,
      description: "Lecturer CVs, employment contracts, medical clearances, and confidential HR files.",
      objectsCount: 318,
    },
    {
      name: "public-assets",
      isPrivate: false,
      description: "University logos, faculty seals, verified prospectus PDFs, and public emblems.",
      objectsCount: 88,
    },
  ];

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

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
          <span className="text-slate-800 font-semibold">Storage & File Policies</span>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Check className="h-4 w-4" />
          <span>Save Storage Policies</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium shadow-2xs">
          Storage bucket policies and signed URL timeout updated successfully!
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="max-w-4xl space-y-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <HardDrive className="h-4 w-4 text-blue-600" />
            <span>Supabase Cloud Storage Buckets</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buckets.map((b) => (
              <div
                key={b.name}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">{b.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.isPrivate
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {b.isPrivate ? "Private (Signed URLs)" : "Public CDN"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">{b.description}</p>
                <div className="text-[11px] font-medium text-slate-600 pt-1 border-t border-slate-200">
                  {b.objectsCount} active objects stored
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Lock className="h-4 w-4 text-indigo-600" />
            <span>Security & Upload Restrictions</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Private Signed URL Expiration (Seconds)
              </label>
              <select
                value={signedUrlExpirySeconds}
                onChange={(e) => setSignedUrlExpirySeconds(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="300">5 Minutes (300s)</option>
                <option value="900">15 Minutes (900s - Standard)</option>
                <option value="3600">1 Hour (3600s)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Document Upload Limit (MB)
              </label>
              <select
                value={maxUploadMb}
                onChange={(e) => setMaxUploadMb(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              >
                <option value="5">5 MB</option>
                <option value="10">10 MB (Recommended)</option>
                <option value="25">25 MB</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
