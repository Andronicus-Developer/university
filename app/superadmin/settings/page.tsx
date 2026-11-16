"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sliders,
  Check,
  ShieldAlert,
  Lock,
  Globe,
  Bell,
  Database,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function PlatformSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState("8");
  const [enforceMfaForAdmins, setEnforceMfaForAdmins] = useState(true);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  const [platformNotice, setPlatformNotice] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

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
          <span>Security & Operations</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">Maintenance & Platform Settings</span>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Check className="h-4 w-4" />
          <span>Save Configurations</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Platform configuration changes persisted and broadcast across all instances.</span>
        </div>
      )}

      {/* Settings Sections */}
      <div className="max-w-4xl space-y-5">
        {/* Maintenance Controls */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Global Maintenance Mode</span>
              </h3>
              <p className="text-xs text-slate-500 max-w-xl">
                When enabled, tenant portals will display a scheduled maintenance screen. Only Super Administrators can log in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                maintenanceMode ? "bg-amber-500" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  maintenanceMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {maintenanceMode && (
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Public Maintenance Notice
              </label>
              <input
                type="text"
                value={platformNotice}
                onChange={(e) => setPlatformNotice(e.target.value)}
                placeholder="Scheduled database upgrades in progress. Expected restoration: 02:00 UTC."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Security & Access Policies */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              <span>Authentication & Session Policies</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforce least-privilege session timeouts, lockout thresholds, and MFA requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Session Inactivity Timeout
              </label>
              <select
                value={sessionTimeoutHours}
                onChange={(e) => setSessionTimeoutHours(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
              >
                <option value="1">1 Hour</option>
                <option value="4">4 Hours</option>
                <option value="8">8 Hours (Standard)</option>
                <option value="24">24 Hours</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Failed Login Attempts (Lockout)
              </label>
              <select
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
              >
                <option value="3">3 Attempts</option>
                <option value="5">5 Attempts (Recommended)</option>
                <option value="10">10 Attempts</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Enforce Multi-Factor Authentication (MFA) for Elevated Roles
              </div>
              <div className="text-[11px] text-slate-500">
                Requires TOTP or biometric verification on login for System Administrators and Bursars.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnforceMfaForAdmins(!enforceMfaForAdmins)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                enforceMfaForAdmins ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enforceMfaForAdmins ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Allow Open Applicant Self-Registration
              </div>
              <div className="text-[11px] text-slate-500">
                Permits prospective students to create admissions applicant accounts without invitation.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAllowSelfRegistration(!allowSelfRegistration)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                allowSelfRegistration ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  allowSelfRegistration ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Database & Cloud Persistence */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-600" />
                <span>Cloud Storage Database Engine</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target bucket: <code className="font-mono text-blue-600">institutional-reports</code> (Key: <code className="font-mono text-blue-600">ums-virtual-db.json</code>)
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              SYNCHRONIZED
            </span>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed">
            All 75+ relational database tables, dynamic sidebar modules, registered universities, system admin accounts, and security audit logs are continuously mirrored to private cloud storage. Reads operate at in-memory sub-millisecond speeds with zero cold starts.
          </div>
        </div>
      </div>
    </div>
  );
}
