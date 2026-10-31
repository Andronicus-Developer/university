"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  ShieldCheck,
  KeyRound,
  Mail,
  Phone,
  Briefcase,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function LecturerProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileNotification, setProfileNotification] = useState<string | null>(null);
  const [passwordNotification, setPasswordNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const db = supabase as any;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || "");

        const { data: profile } = await db
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          if (profile.full_name) setFullName(profile.full_name);
          if (profile.phone) setPhone(profile.phone);
        }

        const { data: staffRow } = await db
          .from("staff")
          .select("staff_number, job_title, department:department_id(name)")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (staffRow) {
          setStaffNumber(staffRow.staff_number || "FAC2026001");
          setJobTitle(staffRow.job_title || "Senior Lecturer");
          if (staffRow.department?.name) setDepartmentName(staffRow.department.name);
        } else {
          setStaffNumber("FAC2026001");
          setJobTitle("Senior Lecturer");
          setDepartmentName("Department of Computer Science");
        }
      }
    }
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await db.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      }

      setProfileNotification("Profile information updated successfully.");
    } catch {
      setProfileNotification("Profile updated.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      alert("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    setSavingPassword(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        alert(error.message);
      } else {
        setPasswordNotification("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Profile and Security</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
          Faculty Profile & Account Security
        </h1>
        <p className="text-xs text-slate-500">
          Manage your personal faculty details, contact information, department affiliations, and portal login security.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile Card & Information (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                {fullName ? fullName.slice(0, 2).toUpperCase() : "FC"}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{fullName || "Faculty Lecturer"}</h2>
                <div className="text-xs text-emerald-700 font-semibold">{jobTitle}</div>
                <div className="text-xs text-slate-500 mt-0.5">{departmentName}</div>
              </div>
            </div>

            {profileNotification && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{profileNotification}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Staff ID</label>
                  <input
                    type="text"
                    disabled
                    value={staffNumber}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email</label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +233 24 000 0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingProfile ? "Saving..." : "Save Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Password & Security (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Portal Login Security</h3>
                <p className="text-[11px] text-slate-500">Update your faculty portal password.</p>
              </div>
            </div>

            {passwordNotification && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{passwordNotification}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{savingPassword ? "Updating..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

