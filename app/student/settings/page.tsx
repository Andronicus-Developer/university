"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Settings,
  ShieldCheck,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

export default function StudentSettingsPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setMsg({ type: "error", text: "Please enter a new password." });
      return;
    }
    if (password !== confirmPassword) {
      setMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    setSaving(true);
    setMsg(null);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      setMsg({ type: "success", text: "Account password updated successfully." });
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Student Account Settings & Security</h1>
        <p className="text-xs text-slate-500">Security configurations, credentials update and portal access preferences</p>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
          <KeyRound className="h-4 w-4 text-blue-600" />
          <span>Change Account Password</span>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Security Health */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Security & Authentication Status</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Role-Based Access Control (RBAC)</p>
              <p className="text-slate-500 text-[11px]">Enforced least-privilege student portal authorization</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
              Active & Protected
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Two-Factor Authentication (2FA)</p>
              <p className="text-slate-500 text-[11px]">SMS or Authenticator App Verification</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
              Enabled by University Admin
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Active Device Session</p>
              <p className="text-slate-500 text-[11px]">Signed in via Web Browser</p>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">Current Session</span>
          </div>
        </div>
      </div>
    </div>
  );
}

