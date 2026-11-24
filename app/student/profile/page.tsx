"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function StudentProfileAndSettingsPage() {
  const { data, loading, error, reload, mutate } =
    useStudentPortalSection("profile");

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactToast, setContactToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (data?.student) {
      setPhone(data.student.phone || "");
      setAddress(data.student.address || "");
      setEmergencyContactName(data.student.emergency_contact_name || "");
      setEmergencyContactPhone(data.student.emergency_contact_phone || "");
    }
  }, [data?.student]);

  if (loading) {
    return <StudentPageLoading label="Loading your profile & settings..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const schoolType = data.school?.schoolType || "university";
  const s = data.student;
  const meta = s.metadata || {};
  const guardians = data.guardians || [];

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    setContactToast(null);
    const res = await mutate("update_profile_contact", {
      phone,
      address,
      emergencyContactName,
      emergencyContactPhone,
    });
    setSavingContact(false);
    setContactToast({
      type: res.ok ? "success" : "error",
      text: res.ok
        ? res.message || "Contact details updated."
        : res.error || "Unable to update contact details.",
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setPwMsg({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }
    if (password !== confirmPassword) {
      setPwMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    setSavingPw(true);
    setPwMsg(null);
    try {
      const supabase = createClient();
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;
      setPwMsg({ type: "success", text: "Account password updated successfully." });
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwMsg({
        type: "error",
        text: err?.message || "Failed to update password.",
      });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {schoolType === "vocational"
            ? "Trainee Profile & Settings"
            : "Profile & Account Settings"}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {schoolType === "vocational"
            ? "View your Trainee ID, Trade Class, Intake Cohort, contact info, and security credentials."
            : schoolType === "high_school"
            ? "View your admission index, Class/Form, House/Dormitory, linked Parent/Guardian contacts, and password."
            : "View your matriculation details, department, program, level, emergency contact, and security credentials."}
        </p>
      </div>

      {/* Institutional Identity Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-base">
              {(s.full_name || "S").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {s.full_name}
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span>{s.email}</span>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold capitalize w-fit">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{s.status || "active"}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {schoolType === "university" && (
            <>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Matric / Index Number</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{s.student_number}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Faculty / Department</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{s.department_name || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Program</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{s.programme_name || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Academic Level &amp; Entry</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  Level {s.current_level || 100} · {meta.entry_mode || "Regular"}
                </div>
              </div>
            </>
          )}

          {schoolType === "high_school" && (
            <>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Admission / Index #</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{s.student_number}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Class / Form &amp; Stream</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {s.programme_name || "—"}{meta.stream ? ` · ${meta.stream}` : ""}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Boarding / Day Status</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {meta.boarding_status || meta.residential_status || "Day Student"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">House / Dormitory</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {meta.house_name || "Not Assigned"}
                </div>
              </div>
            </>
          )}

          {schoolType === "vocational" && (
            <>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Trainee ID</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{s.student_number}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Trade Class / Workshop</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{s.department_name || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Intake / Cohort</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{s.intake_name || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">NVTI / Trade Level</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {meta.trade_level || meta.training_stage || `Level ${s.current_level || 100}`}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* High School Linked Parent / Guardian Info */}
      {schoolType === "high_school" && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            <span>Linked Parent / Guardian Contacts</span>
          </h2>
          {guardians.length === 0 ? (
            <p className="text-xs text-slate-500">
              {meta.guardian_name
                ? `${meta.guardian_name} (${meta.guardian_relationship || "Guardian"}) · ${meta.guardian_phone || "No phone listed"}`
                : "No parent or guardian contact has been linked yet."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guardians.map((g: any) => (
                <div
                  key={g.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/70 text-xs space-y-1"
                >
                  <div className="font-bold text-slate-900 dark:text-white">
                    {g.full_name} ·{" "}
                    <span className="text-emerald-600">{g.relationship}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    <span>{g.phone || "—"}</span>
                  </div>
                  {g.email && (
                    <div className="text-slate-500 flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      <span>{g.email}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Forms: Update Contact & Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveContact}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User className="h-4 w-4 text-blue-600" />
            <span>Contact &amp; Emergency Details</span>
          </h2>

          {contactToast && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                contactToast.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {contactToast.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{contactToast.text}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+233 ..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Residential Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Current residential address"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="+233 ..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingContact}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
          >
            {savingContact ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{savingContact ? "Saving..." : "Save Contact Info"}</span>
          </button>
        </form>

        {/* Change Password */}
        <form
          onSubmit={handleUpdatePassword}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <KeyRound className="h-4 w-4 text-indigo-600" />
            <span>Change Account Password</span>
          </h2>

          {pwMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                pwMsg.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {pwMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{pwMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={savingPw}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
          >
            {savingPw ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            <span>{savingPw ? "Updating..." : "Update Password"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
