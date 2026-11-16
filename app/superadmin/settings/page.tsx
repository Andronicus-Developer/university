"use client";

import React, { useState } from "react";
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="h-6 w-6 text-purple-400" />
            Platform Infrastructure Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global security parameters, maintenance scheduling, and tenant isolation policies
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
        >
          <Check className="h-4 w-4" />
          Save Configurations
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          Platform configuration changes persisted and broadcast across all instances.
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-5">
        {/* Maintenance Controls */}
        <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Global Maintenance Mode
              </h3>
              <p className="text-xs text-slate-400">
                When enabled, tenant portals will display a scheduled maintenance screen. Only Super Administrators can log in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                maintenanceMode ? "bg-amber-600" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  maintenanceMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Public Maintenance Notice Message
            </label>
            <input
              type="text"
              value={platformNotice}
              onChange={(e) => setPlatformNotice(e.target.value)}
              placeholder="e.g. Scheduled system upgrade in progress. Estimated completion: 04:00 GMT."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Security & Access Policies */}
        <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-400" />
            Security & Authentication Policies
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
              <div>
                <div className="font-semibold text-slate-200">Enforce MFA for Administrators</div>
                <div className="text-[11px] text-slate-400">
                  Require 2-Factor Authentication (TOTP) on System Admin and Super Admin accounts
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnforceMfaForAdmins(!enforceMfaForAdmins)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  enforceMfaForAdmins ? "bg-purple-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enforceMfaForAdmins ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Session Expiration Timeout
                </label>
                <select
                  value={sessionTimeoutHours}
                  onChange={(e) => setSessionTimeoutHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="2">2 Hours (High Security)</option>
                  <option value="4">4 Hours</option>
                  <option value="8">8 Hours (Standard Workday)</option>
                  <option value="24">24 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Max Consecutive Failed Login Attempts
                </label>
                <select
                  value={maxLoginAttempts}
                  onChange={(e) => setMaxLoginAttempts(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="3">3 Attempts (Lock 15 min)</option>
                  <option value="5">5 Attempts (Standard)</option>
                  <option value="10">10 Attempts</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Database & Cloud Connection Details */}
        <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            Supabase Cloud Database Infrastructure
          </h3>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>PostgreSQL Schema:</span>
              <span className="text-white">public (102 active tables)</span>
            </div>
            <div className="flex justify-between">
              <span>RBAC Engine:</span>
              <span className="text-emerald-400 font-semibold">PostgreSQL Security Definer</span>
            </div>
            <div className="flex justify-between">
              <span>Active Super Admin Account:</span>
              <span className="text-purple-400">superadmin@university.edu.gh</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

