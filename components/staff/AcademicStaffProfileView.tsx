"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAcademicStaffPortalConfig } from "@/config/academicStaffPortalConfig";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  StaffPageError,
  StaffPageLoading,
  UnlinkedStaffProfileCard,
} from "@/components/staff/StaffPortalPrimitives";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { UserAvatar, useCurrentUserAvatar } from "@/components/profile/UserAvatar";
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";

interface StaffProfilePayload {
  school: { id: string; name: string; schoolType: string };
  staffProfile: any | null;
  department: { id: string; name: string; code: string } | null;
  activeYear: { id: string; name: string; code: string } | null;
  activeTerm: { id: string; name: string; code: string } | null;
  assignedCourses: Array<{ id: string; code: string; name: string; credits?: number }>;
  assignedSubjects: Array<{ id: string; code: string; name: string }>;
  assignedClass: { id: string; name: string; code: string } | null;
  isClassTeacher: boolean;
  assignedModules: Array<{ id: string; code: string; name: string }>;
  userEmail: string;
}

export default function AcademicStaffProfileView() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<StaffProfilePayload>("profile");
  const liveAvatarUrl = useCurrentUserAvatar();

  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    if (data?.staffProfile) {
      setPhone(data.staffProfile.phone || "");
      setBio(data.staffProfile.bio || data.staffProfile.metadata?.bio || "");
    }
  }, [data?.staffProfile]);

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setBanner(null);
    const res = await mutate("update_profile", { phone, bio });
    setSavingProfile(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Unable to update staff profile." });
    } else {
      setBanner({ type: "success", text: res.message || "Contact and bio saved." });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setBanner({ type: "error", text: "Password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setBanner({ type: "error", text: "Password confirmation does not match." });
      return;
    }
    setSavingPassword(true);
    setBanner(null);
    try {
      const supabase = createClient();
      const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
      if (authErr) {
        setBanner({ type: "error", text: authErr.message || "Could not update password." });
      } else {
        setNewPassword("");
        setConfirmPassword("");
        setBanner({ type: "success", text: "Portal login password updated successfully." });
      }
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Password update error." });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <StaffPageLoading label="Loading staff profile and credentials..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;
  if (!data?.staffProfile) return <UnlinkedStaffProfileCard schoolName={data?.school?.name} />;

  const sp = data.staffProfile;
  const meta = sp.metadata || {};
  const cfg = getAcademicStaffPortalConfig(data.school.schoolType);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.badgeClasses}`}
        >
          {cfg.portalBadge}
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1.5">
          {cfg.staffSingular} Profile &amp; Security Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Review your institutional appointment, assigned teaching allocations, and update your contact info or password.
        </p>
      </div>

      {banner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      <AvatarUpload name={sp.full_name} initialUrl={sp.avatar_url} />

      {/* Credential Summary Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <UserAvatar
              src={liveAvatarUrl || sp.avatar_url}
              name={sp.full_name}
              size="lg"
              shape="rounded"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {sp.full_name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {sp.email || data.userEmail}
                </span>
                <span>·</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {cfg.idLabel}: {sp.staff_number || "Unassigned"}
                </span>
              </div>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 capitalize self-start">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{sp.employment_status || "active"}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {cfg.unitLabel}
            </span>
            <p className="font-bold text-slate-900 dark:text-white mt-1">
              {cfg.schoolType === "high_school"
                ? data.assignedClass?.name ||
                  meta.assigned_class_name ||
                  "Subject Faculty"
                : data.department?.name || sp.department || "General Faculty"}
            </p>
            {cfg.schoolType === "high_school" && data.isClassTeacher && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                Designated Class Teacher
              </span>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              {cfg.schoolType === "university"
                ? "Academic Rank & Qualification"
                : cfg.schoolType === "vocational"
                ? "Trade Certification & License"
                : "Teaching Designation & Qualification"}
            </span>
            <p className="font-bold text-slate-900 dark:text-white mt-1">
              {sp.designation || cfg.staffSingular}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              {cfg.schoolType === "university"
                ? [meta.highest_qualification, meta.specialization].filter(Boolean).join(" · ") ||
                  "Faculty Member"
                : cfg.schoolType === "vocational"
                ? [
                    meta.teaching_qualification,
                    meta.trade_certification_no ? `License: ${meta.trade_certification_no}` : null,
                    meta.industry_experience_years != null
                      ? `${meta.industry_experience_years} yrs industry exp.`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Certified Trade Instructor"
                : meta.teaching_qualification || "Certified Subject Teacher"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Assigned {cfg.curriculumLabel}
            </span>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {cfg.schoolType === "university" &&
                (data.assignedCourses.length > 0 ? (
                  data.assignedCourses.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[11px]"
                    >
                      {c.code}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Department courses</span>
                ))}
              {cfg.schoolType === "high_school" &&
                (data.assignedSubjects.length > 0 ? (
                  data.assignedSubjects.map((s) => (
                    <span
                      key={s.id}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]"
                    >
                      {s.code} — {s.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Assigned via Class Timetable</span>
                ))}
              {cfg.schoolType === "vocational" &&
                (data.assignedModules.length > 0 ? (
                  data.assignedModules.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold text-[11px]"
                    >
                      {m.code} — {m.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Trade Workshop Modules</span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Forms: Contact & Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveContact}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Contact &amp; Academic Bio
            </h3>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233 ..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Office Hours / Professional Bio
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Office hours, consultation location, or teaching focus..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
          >
            {savingProfile ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save Profile Details</span>
          </button>
        </form>

        <form
          onSubmit={handleChangePassword}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Account Password Security
            </h3>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              New Password (min. 8 characters)
            </label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
          >
            {savingPassword ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            <span>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  );
}
