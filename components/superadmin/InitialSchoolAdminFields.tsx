"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

interface InitialSchoolAdminFieldsProps {
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  fullName: string;
  onFullNameChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  password: string;
  onPasswordChange: (val: string) => void;
  phone: string;
  onPhoneChange: (val: string) => void;
}

/**
 * Reusable form section for provisioning a School's first System Administrator
 * atomically alongside school creation via the server-side API route.
 */
export function InitialSchoolAdminFields({
  enabled,
  onToggleEnabled,
  fullName,
  onFullNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  phone,
  onPhoneChange,
}: InitialSchoolAdminFieldsProps) {
  return (
    <div className="col-span-2 mt-2 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Provision Initial School System Admin
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Creates the administrator login server-side and links it strictly to this
              school&apos;s generated ID without switching your Super Admin session.
            </p>
          </div>
        </div>
        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-800 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Create Admin</span>
        </label>
      </div>

      {enabled && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Admin Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required={enabled}
              value={fullName}
              onChange={(e) => onFullNameChange(e.target.value)}
              placeholder="e.g. Dr. Kwame Mensah"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Admin Login Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required={enabled}
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="admin@school.edu"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Temporary Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required={enabled}
              minLength={6}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Admin Phone (Optional)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="+233 24 000 0000"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
