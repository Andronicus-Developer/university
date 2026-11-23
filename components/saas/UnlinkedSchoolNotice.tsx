"use client";

import React from "react";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";

interface UnlinkedSchoolNoticeProps {
  error: string;
  onSignOut: () => void;
  isSigningOut?: boolean;
}

export function UnlinkedSchoolNotice({
  error,
  onSignOut,
  isSigningOut = false,
}: UnlinkedSchoolNoticeProps) {
  return (
    <div className="max-w-lg mx-auto mt-12 rounded-2xl bg-white border border-rose-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3 text-rose-700">
        <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Account Not Linked to a School
          </h2>
          <p className="text-xs text-slate-500">Multi-Tenant Access Verification</p>
        </div>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{error}</p>
      <div className="pt-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer transition-colors"
        >
          {isSigningOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
