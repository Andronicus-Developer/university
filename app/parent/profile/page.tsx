"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, Loader2, Save, Users, X } from "lucide-react";
import { useParentSection } from "@/lib/parent/useParentPortal";
import {
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface ProfileData {
  school: { id: string; name: string; school_type: string };
  parent: {
    id: string | null;
    full_name: string;
    email: string;
    phone: string;
    relationship: string;
    occupation: string;
    address: string;
  };
  wards: Array<{
    id: string;
    full_name: string;
    student_number: string;
    programme_name: string | null;
    class_group_name: string | null;
    intake_name: string | null;
    status: string;
    relationship: string;
  }>;
}

export default function ParentProfilePage() {
  const { data, loading, error, reload, mutate } = useParentSection<ProfileData>("profile");

  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [address, setAddress] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (data?.parent) {
      setPhone(data.parent.phone || "");
      setOccupation(data.parent.occupation || "");
      setAddress(data.parent.address || "");
    }
  }, [data?.parent]);

  if (loading) return <ClassicLoading label="Loading parent profile..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load profile"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setBanner(null);
    const res = await mutate("update_profile", { phone, occupation, address });
    setSavingProfile(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to update contact details." });
      return;
    }
    setBanner({ type: "success", text: "Contact details updated." });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setBanner({ type: "error", text: "New passwords do not match." });
      return;
    }
    setSavingPassword(true);
    setBanner(null);
    const res = await mutate("change_password", { newPassword });
    setSavingPassword(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to update password." });
      return;
    }
    setBanner({ type: "success", text: "Password changed successfully." });
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Profile & Settings"
        subtitle={`${data.school.name} • Guardian Account & Linked Wards`}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-4">
          <h2 className="text-sm font-semibold">Contact Details</h2>
          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={data.parent.full_name}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={data.parent.email}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Occupation</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Residential Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save Contact Details</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold">
                Linked {terms.learnerPlural} ({data.wards.length})
              </h2>
            </div>
            {data.wards.length === 0 ? (
              <p className="text-xs text-slate-500">No linked wards yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {data.wards.map((w) => (
                  <div key={w.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{w.full_name}</p>
                      <p className="text-slate-500">
                        {w.student_number} •{" "}
                        {w.class_group_name || w.programme_name || w.intake_name || "Enrolled"} (
                        {w.relationship})
                      </p>
                    </div>
                    <ClassicStatusBadge status={w.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold">Change Password</h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">New Password (min 8 chars)</label>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Confirm New Password</label>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                {savingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
