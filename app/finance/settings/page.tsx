"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, Loader2, Save, X } from "lucide-react";
import { useFinanceSection } from "@/lib/finance/useFinancePortal";
import {
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
} from "@/components/portals/ClassicPortalPrimitives";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

interface SettingsData {
  school: { id: string; name: string; currency: string };
  financeSettings: {
    receipt_prefix: string;
    receipt_footer: string;
    default_due_days: number;
    online_payments_enabled: boolean;
  };
  profile: {
    full_name: string;
    email: string;
    phone: string;
    designation: string;
  };
}

export default function FinanceSettingsPage() {
  const { data, loading, error, reload, mutate } =
    useFinanceSection<SettingsData>("settings");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [receiptPrefix, setReceiptPrefix] = useState("RCP");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [defaultDueDays, setDefaultDueDays] = useState("30");
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (data?.profile) {
      setFullName(data.profile.full_name || "");
      setPhone(data.profile.phone || "");
    }
    if (data?.financeSettings) {
      setReceiptPrefix(data.financeSettings.receipt_prefix || "RCP");
      setReceiptFooter(data.financeSettings.receipt_footer || "");
      setDefaultDueDays(String(data.financeSettings.default_due_days || 30));
      setOnlinePaymentsEnabled(Boolean(data.financeSettings.online_payments_enabled));
    }
  }, [data?.profile, data?.financeSettings]);

  if (loading) return <ClassicLoading label="Loading finance settings..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load settings"} onRetry={reload} />;
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving("settings");
    setBanner(null);
    const res = await mutate("save_finance_settings", {
      receiptPrefix,
      receiptFooter,
      defaultDueDays: Number(defaultDueDays),
      onlinePaymentsEnabled,
    });
    setSaving(null);
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to save receipt settings." });
    else setBanner({ type: "success", text: "Receipt & billing settings updated." });
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving("profile");
    setBanner(null);
    const res = await mutate("update_profile", { fullName, phone });
    setSaving(null);
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to update profile." });
    else setBanner({ type: "success", text: "Accountant profile saved." });
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setBanner({ type: "error", text: "Passwords do not match." });
      return;
    }
    setSaving("password");
    setBanner(null);
    const res = await mutate("change_password", { newPassword });
    setSaving(null);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to update password." });
      return;
    }
    setBanner({ type: "success", text: "Password updated successfully." });
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Profile & Bursary Settings"
        subtitle={`${data.school.name} • Receipt numbering, footer note, and account credentials`}
      />

      {banner && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium flex items-center justify-between ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <AvatarUpload name={data.profile.full_name} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-4">
          <h2 className="text-sm font-semibold">Official Receipt & Billing Configuration</h2>
          <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Receipt Number Prefix</label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Default Due Days</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={defaultDueDays}
                  onChange={(e) => setDefaultDueDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Receipt Footer Note</label>
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlinePaymentsEnabled}
                onChange={(e) => setOnlinePaymentsEnabled(e.target.checked)}
              />
              <span>Enable Parent Portal online fee payment submissions</span>
            </label>
            <button
              type="submit"
              disabled={saving === "settings"}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
            >
              {saving === "settings" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Save Receipt Settings</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-3">
            <h2 className="text-sm font-semibold">Bursar / Accountant Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Email</label>
                  <input
                    type="email"
                    disabled
                    value={data.profile.email}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving === "profile"}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
              >
                {saving === "profile" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Profile</span>
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold">Change Password</h2>
            </div>
            <form onSubmit={handlePassword} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="password"
                  minLength={8}
                  required
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="password"
                  minLength={8}
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={saving === "password"}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
              >
                {saving === "password" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
