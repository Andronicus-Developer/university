"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Building2,
  GraduationCap,
  Palette,
  Save,
  CheckCircle,
  AlertCircle,
  Upload,
  Lock,
  Shield,
  KeyRound,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Sparkles,
  Check,
  RefreshCw,
  Loader2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Eye,
  EyeOff,
} from "lucide-react";

type SettingsTab = "account" | "school" | "academics" | "display";

interface ThemeOption {
  id: "premier_royal" | "emerald_campus" | "imperial_midnight";
  name: string;
  tagline: string;
  primaryColor: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  bgHex: string;
  cardBgHex: string;
  badgeBg: string;
  badgeText: string;
  previewHeaderBg: string;
  previewSidebarBg: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ============================================================================
  // 1. Account Settings State (Admin Profile)
  // ============================================================================
  const [userId, setUserId] = useState<string>("");
  const [accountForm, setAccountForm] = useState({
    fullName: "System Administrator",
    email: "admin@university.edu.gh",
    phone: "+233 24 123 4567",
    jobTitle: "Chief Technology & Information Officer",
    department: "Directorate of ICT Services",
    bio: "Super Administrator with full institutional management permissions across academic, finance, and system operations.",
    avatarUrl: "",
    isMfaEnabled: false,
    lastSignIn: "Active Now",
  });

  // Password Update State
  const [passwordState, setPasswordState] = useState({
    newPassword: "",
    confirmPassword: "",
    showPassword: false,
    updating: false,
  });

  // ============================================================================
  // 2. School / Institution Settings State
  // ============================================================================
  const [schoolForm, setSchoolForm] = useState({
    name: "Premier University of Technology",
    shortName: "Premier Tech",
    abbreviation: "PUT",
    motto: "Empowering Minds, Shaping Tomorrow",
    establishedYear: 1998,
    accreditationCode: "GTEC/NAB/UNI/2026-0482",
    affiliation: "Ghana Tertiary Education Commission & Ministry of Education",
    logoUrl: "",
    sealUrl: "",
    email: "registrar@university.edu.gh",
    supportEmail: "support@university.edu.gh",
    phone: "+233 30 212 8899",
    altPhone: "+233 30 212 8890",
    website: "https://premier.university.edu.gh",
    address: "Plot 44 University Heights, North Legon Boulevard",
    city: "Accra",
    region: "Greater Accra Region",
    postalCode: "GA-201-9483",
    country: "Ghana",
    currency: "GHS",
    currencySymbol: "GH₵",
    taxId: "C0028491823",
  });

  // ============================================================================
  // 3. Academic Policy Settings State
  // ============================================================================
  const [academicForm, setAcademicForm] = useState({
    passMarkThreshold: 50,
    minRegistrationCredits: 15,
    maxRegistrationCredits: 21,
    attendanceThresholdPct: 75,
    probationGpaThreshold: 1.5,
    firstClassGpaThreshold: 3.6,
    secondClassUpperGpa: 3.0,
    currentAcademicYear: "2026/2027",
    activeSemester: "Semester 1",
    addDropWindowDays: 14,
    gradeSubmissionDeadlineDays: 21,
    lateRegistrationFine: 150.0,
    enableSelfRegistration: true,
    requireAdvisorApproval: true,
    autoSenateBroadsheet: true,
    restrictTranscriptOnDebt: true,
  });

  // ============================================================================
  // 4. Display Settings & Themes State
  // ============================================================================
  const themeOptions: ThemeOption[] = [
    {
      id: "premier_royal",
      name: "Premier Royal",
      tagline: "Modern Executive & Academic Authority",
      primaryColor: "Blue & Sapphire",
      primaryHex: "#2563EB",
      secondaryHex: "#1E3A8A",
      accentHex: "#06B6D4",
      bgHex: "#F8FAFC",
      cardBgHex: "#FFFFFF",
      badgeBg: "#EFF6FF",
      badgeText: "#1D4ED8",
      previewHeaderBg: "#0F172A",
      previewSidebarBg: "#FFFFFF",
    },
    {
      id: "emerald_campus",
      name: "Emerald Campus",
      tagline: "Sustainability, Vitality & Growth",
      primaryColor: "Forest Emerald & Teal",
      primaryHex: "#059669",
      secondaryHex: "#065F46",
      accentHex: "#10B981",
      bgHex: "#F0FDF4",
      cardBgHex: "#FFFFFF",
      badgeBg: "#ECFDF5",
      badgeText: "#047857",
      previewHeaderBg: "#064E3B",
      previewSidebarBg: "#FFFFFF",
    },
    {
      id: "imperial_midnight",
      name: "Imperial Midnight",
      tagline: "High-Contrast Dark Executive Luxury",
      primaryColor: "Midnight Slate & Indigo",
      primaryHex: "#6366F1",
      secondaryHex: "#312E81",
      accentHex: "#F59E0B",
      bgHex: "#0F172A",
      cardBgHex: "#1E293B",
      badgeBg: "#EEF2FF",
      badgeText: "#4338CA",
      previewHeaderBg: "#020617",
      previewSidebarBg: "#0F172A",
    },
  ];

  const [displayForm, setDisplayForm] = useState({
    theme: "premier_royal" as "premier_royal" | "emerald_campus" | "imperial_midnight",
    accentColor: "#2563EB",
    density: "comfortable" as "comfortable" | "compact",
    borderRadius: "rounded-2xl" as "rounded-lg" | "rounded-xl" | "rounded-2xl",
    darkMode: false,
  });

  // Upload state trackers
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSeal, setUploadingSeal] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Fetch All Settings from Database on Mount
  // ============================================================================
  const fetchAllSettings = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      // 1. Fetch current authenticated user & profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        const { data: profile } = await db
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          const meta = profile.metadata || {};
          setAccountForm((prev) => ({
            ...prev,
            fullName: profile.full_name || user.user_metadata?.full_name || prev.fullName,
            email: profile.email || user.email || prev.email,
            phone: profile.phone || prev.phone,
            avatarUrl: profile.avatar_url || prev.avatarUrl,
            isMfaEnabled: profile.is_mfa_enabled ?? prev.isMfaEnabled,
            jobTitle: meta.job_title || prev.jobTitle,
            department: meta.department || prev.department,
            bio: meta.bio || prev.bio,
            lastSignIn: profile.last_sign_in_at
              ? new Date(profile.last_sign_in_at).toLocaleString()
              : "Active Now",
          }));
        } else {
          setAccountForm((prev) => ({
            ...prev,
            fullName: user.user_metadata?.full_name || prev.fullName,
            email: user.email || prev.email,
          }));
        }
      }

      // 2. Fetch system_settings table rows
      const { data: systemSettings } = await db.from("system_settings").select("*");

      if (systemSettings && systemSettings.length > 0) {
        // School Info
        const infoRow = systemSettings.find((s: any) => s.setting_key === "institution_info");
        if (infoRow?.setting_value) {
          const v = infoRow.setting_value;
          setSchoolForm((prev) => ({
            ...prev,
            name: v.name || prev.name,
            shortName: v.short_name || prev.shortName,
            abbreviation: v.abbreviation || prev.abbreviation,
            motto: v.motto || prev.motto,
            establishedYear: v.established_year || prev.establishedYear,
            accreditationCode: v.accreditation_code || prev.accreditationCode,
            affiliation: v.affiliation || prev.affiliation,
            logoUrl: v.logo_url || prev.logoUrl,
            sealUrl: v.seal_url || prev.sealUrl,
            email: v.email || prev.email,
            supportEmail: v.support_email || prev.supportEmail,
            phone: v.phone || prev.phone,
            altPhone: v.alt_phone || prev.altPhone,
            website: v.website || prev.website,
            address: v.address || prev.address,
            city: v.city || prev.city,
            region: v.region || prev.region,
            postalCode: v.postal_code || prev.postalCode,
            country: v.country || prev.country,
            currency: v.currency || prev.currency,
            currencySymbol: v.currency_symbol || prev.currencySymbol,
            taxId: v.tax_id || prev.taxId,
          }));
        }

        // Academic Policy
        const academicRow = systemSettings.find((s: any) => s.setting_key === "academic_policy");
        if (academicRow?.setting_value) {
          const a = academicRow.setting_value;
          setAcademicForm((prev) => ({
            ...prev,
            passMarkThreshold: a.pass_mark_threshold ?? prev.passMarkThreshold,
            minRegistrationCredits: a.min_registration_credits ?? prev.minRegistrationCredits,
            maxRegistrationCredits: a.max_registration_credits ?? prev.maxRegistrationCredits,
            attendanceThresholdPct: a.attendance_warning_threshold_pct ?? prev.attendanceThresholdPct,
            probationGpaThreshold: a.probation_gpa_threshold ?? prev.probationGpaThreshold,
            firstClassGpaThreshold: a.first_class_gpa_threshold ?? prev.firstClassGpaThreshold,
            secondClassUpperGpa: a.second_class_upper_gpa ?? prev.secondClassUpperGpa,
            currentAcademicYear: a.current_academic_year ?? prev.currentAcademicYear,
            activeSemester: a.active_semester ?? prev.activeSemester,
            addDropWindowDays: a.add_drop_window_days ?? prev.addDropWindowDays,
            gradeSubmissionDeadlineDays: a.grade_submission_deadline_days ?? prev.gradeSubmissionDeadlineDays,
            lateRegistrationFine: a.late_registration_fine ?? prev.lateRegistrationFine,
            enableSelfRegistration: a.enable_self_registration ?? prev.enableSelfRegistration,
            requireAdvisorApproval: a.require_advisor_approval ?? prev.requireAdvisorApproval,
            autoSenateBroadsheet: a.auto_senate_broadsheet ?? prev.autoSenateBroadsheet,
            restrictTranscriptOnDebt: a.restrict_transcript_on_debt ?? prev.restrictTranscriptOnDebt,
          }));
        }

        // Display Theme
        const displayRow = systemSettings.find((s: any) => s.setting_key === "display_theme");
        if (displayRow?.setting_value) {
          const d = displayRow.setting_value;
          setDisplayForm((prev) => ({
            ...prev,
            theme: d.theme || prev.theme,
            accentColor: d.accent_color || prev.accentColor,
            density: d.density || prev.density,
            borderRadius: d.border_radius || prev.borderRadius,
            darkMode: d.dark_mode ?? prev.darkMode,
          }));
        }
      }
    } catch (err: any) {
      console.error("Error fetching system settings from database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  // ============================================================================
  // File Upload Helper to Supabase Storage (/api/upload -> public-assets)
  // ============================================================================
  const uploadFileToStorage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload file");
      }
      return data.url;
    } catch (err: any) {
      console.error("Upload error:", err);
      setStatusMessage({ type: "error", text: err.message || "Upload failed. Please try again." });
      return null;
    }
  };

  // Avatar Upload Handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const url = await uploadFileToStorage(file, "avatars");
    if (url) {
      setAccountForm((prev) => ({ ...prev, avatarUrl: url }));
      setStatusMessage({ type: "success", text: "Profile avatar uploaded to storage successfully!" });
    }
    setUploadingAvatar(false);
  };

  // Logo Upload Handler
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const url = await uploadFileToStorage(file, "institution");
    if (url) {
      setSchoolForm((prev) => ({ ...prev, logoUrl: url }));
      setStatusMessage({ type: "success", text: "Official University Logo uploaded to storage successfully!" });
    }
    setUploadingLogo(false);
  };

  // Seal Upload Handler
  const handleSealChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSeal(true);
    const url = await uploadFileToStorage(file, "institution");
    if (url) {
      setSchoolForm((prev) => ({ ...prev, sealUrl: url }));
      setStatusMessage({ type: "success", text: "Official University Seal uploaded to storage successfully!" });
    }
    setUploadingSeal(false);
  };

  // Password Update Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordState.newPassword) {
      setStatusMessage({ type: "error", text: "Please enter a new password." });
      return;
    }
    if (passwordState.newPassword.length < 8) {
      setStatusMessage({ type: "error", text: "Password must be at least 8 characters long." });
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setStatusMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    setPasswordState((prev) => ({ ...prev, updating: true }));
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: passwordState.newPassword,
      });

      if (error) throw error;

      setStatusMessage({ type: "success", text: "Security credentials updated! Your new password is now active." });
      setPasswordState({ newPassword: "", confirmPassword: "", showPassword: false, updating: false });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update password." });
      setPasswordState((prev) => ({ ...prev, updating: false }));
    }
  };

  // ============================================================================
  // Save Settings to Supabase Database
  // ============================================================================
  const handleSaveAll = async () => {
    setSaving(true);
    setStatusMessage(null);
    const supabase = createClient();
    const db = supabase as any;

    try {
      // 1. Save Admin Profile & Account Settings
      if (userId) {
        await db
          .from("profiles")
          .update({
            full_name: accountForm.fullName,
            phone: accountForm.phone,
            avatar_url: accountForm.avatarUrl || null,
            is_mfa_enabled: accountForm.isMfaEnabled,
            metadata: {
              job_title: accountForm.jobTitle,
              department: accountForm.department,
              bio: accountForm.bio,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        // Also update Auth user metadata
        await supabase.auth.updateUser({
          data: {
            full_name: accountForm.fullName,
            avatar_url: accountForm.avatarUrl,
          },
        });
      }

      // 2. Save School Settings to system_settings table
      await db.from("system_settings").upsert(
        {
          setting_key: "institution_info",
          setting_value: {
            name: schoolForm.name,
            short_name: schoolForm.shortName,
            abbreviation: schoolForm.abbreviation,
            motto: schoolForm.motto,
            established_year: Number(schoolForm.establishedYear),
            accreditation_code: schoolForm.accreditationCode,
            affiliation: schoolForm.affiliation,
            logo_url: schoolForm.logoUrl,
            seal_url: schoolForm.sealUrl,
            email: schoolForm.email,
            support_email: schoolForm.supportEmail,
            phone: schoolForm.phone,
            alt_phone: schoolForm.altPhone,
            website: schoolForm.website,
            address: schoolForm.address,
            city: schoolForm.city,
            region: schoolForm.region,
            postal_code: schoolForm.postalCode,
            country: schoolForm.country,
            currency: schoolForm.currency,
            currency_symbol: schoolForm.currencySymbol,
            tax_id: schoolForm.taxId,
          },
          category: "general",
          description: "Complete institution identity, logos, contact, and operational parameters",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      );

      // 3. Save Academic Policy Settings to system_settings table
      await db.from("system_settings").upsert(
        {
          setting_key: "academic_policy",
          setting_value: {
            pass_mark_threshold: Number(academicForm.passMarkThreshold),
            min_registration_credits: Number(academicForm.minRegistrationCredits),
            max_registration_credits: Number(academicForm.maxRegistrationCredits),
            attendance_warning_threshold_pct: Number(academicForm.attendanceThresholdPct),
            probation_gpa_threshold: Number(academicForm.probationGpaThreshold),
            first_class_gpa_threshold: Number(academicForm.firstClassGpaThreshold),
            second_class_upper_gpa: Number(academicForm.secondClassUpperGpa),
            current_academic_year: academicForm.currentAcademicYear,
            active_semester: academicForm.activeSemester,
            add_drop_window_days: Number(academicForm.addDropWindowDays),
            grade_submission_deadline_days: Number(academicForm.gradeSubmissionDeadlineDays),
            late_registration_fine: Number(academicForm.lateRegistrationFine),
            enable_self_registration: academicForm.enableSelfRegistration,
            require_advisor_approval: academicForm.requireAdvisorApproval,
            auto_senate_broadsheet: academicForm.autoSenateBroadsheet,
            restrict_transcript_on_debt: academicForm.restrictTranscriptOnDebt,
          },
          category: "academics",
          description: "Comprehensive university academic regulations, grading thresholds, and registration policies",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      );

      // 4. Save Display & Theme Settings to system_settings table
      await db.from("system_settings").upsert(
        {
          setting_key: "display_theme",
          setting_value: {
            theme: displayForm.theme,
            accent_color: displayForm.accentColor,
            density: displayForm.density,
            border_radius: displayForm.borderRadius,
            dark_mode: displayForm.darkMode,
          },
          category: "display",
          description: "Administrative console themes, brand color styling, and interface preferences",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      );

      setStatusMessage({
        type: "success",
        text: "All configuration settings and storage links successfully saved to Supabase database!",
      });

      // Clear alert after 5s
      setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save settings. Please verify database connectivity.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14 font-sans antialiased text-slate-800">
      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-blue-600 font-semibold">Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold">System Configuration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            System Administration & Environment Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage admin credentials, institutional identity, academic thresholds, and UI display themes saved live in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllSettings}
            disabled={loading}
            title="Reload from Database"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold shadow-sm shadow-blue-500/25 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 text-white" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Status Message Banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-2xl text-xs font-semibold transition-all shadow-2xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Modern Horizontal Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl overflow-x-auto select-none border border-slate-200/60">
        {[
          { id: "account", label: "Admin Account Settings", icon: User },
          { id: "school", label: "School & Institution Settings", icon: Building2 },
          { id: "academics", label: "Academic Policies & Thresholds", icon: GraduationCap },
          { id: "display", label: "Display, Colors & Themes", icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-blue-600 shadow-xs shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: FULL ACCOUNT SETTINGS (SYSTEM ADMIN) */}
      {/* ===================================================================== */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* Section 1: Profile & Identity */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Administrator Profile & Personal Info</h2>
                  <p className="text-[11px] text-slate-500">Official system administrator credentials and role assignments.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                Super Administrator
              </span>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="relative">
                {accountForm.avatarUrl ? (
                  <img
                    src={accountForm.avatarUrl}
                    alt="Admin Avatar"
                    className="h-20 w-20 rounded-2xl object-cover border-2 border-white shadow-xs"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                    {accountForm.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div className="flex-1 space-y-1 text-center sm:text-left">
                <div className="text-xs font-bold text-slate-900">Administrator Avatar Photo</div>
                <div className="text-[11px] text-slate-500">
                  Upload a high-resolution PNG, JPEG, or WebP. Stored securely in Supabase storage (`public-assets/avatars`).
                </div>
                <div className="flex items-center gap-2.5 pt-2 justify-center sm:justify-start">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" />
                        <span>Upload New Photo</span>
                      </>
                    )}
                  </button>

                  {accountForm.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAccountForm({ ...accountForm, avatarUrl: "" })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Legal Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={accountForm.fullName}
                    onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={accountForm.email}
                    disabled
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono cursor-not-allowed"
                    title="Email is locked to your authenticated login handle"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={accountForm.phone}
                    onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                    placeholder="+233..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Designation / Job Title</label>
                <input
                  type="text"
                  value={accountForm.jobTitle}
                  onChange={(e) => setAccountForm({ ...accountForm, jobTitle: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Department / Division</label>
                <input
                  type="text"
                  value={accountForm.department}
                  onChange={(e) => setAccountForm({ ...accountForm, department: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Administrator Bio & Notes</label>
                <textarea
                  rows={3}
                  value={accountForm.bio}
                  onChange={(e) => setAccountForm({ ...accountForm, bio: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  placeholder="Operational responsibilities and key notes..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Password & Security */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Change Password Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Change Admin Password</h3>
                  <p className="text-[10px] text-slate-500">Update your Supabase authentication password securely.</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={passwordState.showPassword ? "text" : "password"}
                      value={passwordState.newPassword}
                      onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                      placeholder="Min 8 characters"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordState({ ...passwordState, showPassword: !passwordState.showPassword })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {passwordState.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type={passwordState.showPassword ? "text" : "password"}
                    value={passwordState.confirmPassword}
                    onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordState.updating || !passwordState.newPassword}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  {passwordState.updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                  <span>{passwordState.updating ? "Updating..." : "Update Password"}</span>
                </button>
              </form>
            </div>

            {/* Two-Factor Authentication & Session Info */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Security & Authentication Factors</h3>
                  <p className="text-[10px] text-slate-500">Enhanced protection and session validation.</p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Two-Factor Authentication (MFA)</div>
                      <div className="text-[10px] text-slate-500">Require one-time passcode for critical actions</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountForm.isMfaEnabled}
                      onChange={(e) => setAccountForm({ ...accountForm, isMfaEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Last Login Recorded:</span>
                  <span className="font-bold text-slate-800">{accountForm.lastSignIn}</span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">RBAC Permission Matrix:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    System Full Access (Role: system_admin)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: COMPLETE SCHOOL & INSTITUTION SETTINGS */}
      {/* ===================================================================== */}
      {activeTab === "school" && (
        <div className="space-y-6">
          {/* Institution Identity & Assets Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Institution Identity & Official Branding</h2>
                  <p className="text-[11px] text-slate-500">Official names, accreditation, logos, and stamps stored in database & storage.</p>
                </div>
              </div>
            </div>

            {/* Logos & Assets Upload Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Official Logo Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-2xs">
                  {schoolForm.logoUrl ? (
                    <img src={schoolForm.logoUrl} alt="School Logo" className="h-full w-full object-contain" />
                  ) : (
                    <div className="h-full w-full rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm">
                      {schoolForm.abbreviation || "UMS"}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-slate-900">Official University Logo</div>
                  <div className="text-[10px] text-slate-500">Appears on transcripts, invoices, and letterheads.</div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {uploadingLogo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      <span>{uploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                    </button>
                    {schoolForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setSchoolForm({ ...schoolForm, logoUrl: "" })}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Remove Logo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Official University Seal Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-2xs">
                  {schoolForm.sealUrl ? (
                    <img src={schoolForm.sealUrl} alt="University Seal" className="h-full w-full object-contain" />
                  ) : (
                    <div className="h-full w-full rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold text-[10px] text-center p-1">
                      No Seal
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-slate-900">University Senate Seal / Stamp</div>
                  <div className="text-[10px] text-slate-500">Embossed on certified degree certificates & transcripts.</div>
                  <input
                    ref={sealInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSealChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => sealInputRef.current?.click()}
                      disabled={uploadingSeal}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {uploadingSeal ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      <span>{uploadingSeal ? "Uploading..." : "Upload Seal"}</span>
                    </button>
                    {schoolForm.sealUrl && (
                      <button
                        type="button"
                        onClick={() => setSchoolForm({ ...schoolForm, sealUrl: "" })}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Remove Seal"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* School Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Official University Name</label>
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Abbreviation / Code</label>
                <input
                  type="text"
                  value={schoolForm.abbreviation}
                  onChange={(e) => setSchoolForm({ ...schoolForm, abbreviation: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">University Motto / Slogan</label>
                <input
                  type="text"
                  value={schoolForm.motto}
                  onChange={(e) => setSchoolForm({ ...schoolForm, motto: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 italic"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Established Year</label>
                <input
                  type="number"
                  value={schoolForm.establishedYear}
                  onChange={(e) => setSchoolForm({ ...schoolForm, establishedYear: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">National Accreditation Number</label>
                <input
                  type="text"
                  value={schoolForm.accreditationCode}
                  onChange={(e) => setSchoolForm({ ...schoolForm, accreditationCode: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Affiliated Bodies / Regulators</label>
                <input
                  type="text"
                  value={schoolForm.affiliation}
                  onChange={(e) => setSchoolForm({ ...schoolForm, affiliation: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Location & Contact Information */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">Campus Location & Public Contacts</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Physical Campus Address</label>
                <input
                  type="text"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">City / Metro</label>
                <input
                  type="text"
                  value={schoolForm.city}
                  onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Region / Province</label>
                <input
                  type="text"
                  value={schoolForm.region}
                  onChange={(e) => setSchoolForm({ ...schoolForm, region: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Postal / Digital Code</label>
                <input
                  type="text"
                  value={schoolForm.postalCode}
                  onChange={(e) => setSchoolForm({ ...schoolForm, postalCode: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Country</label>
                <input
                  type="text"
                  value={schoolForm.country}
                  onChange={(e) => setSchoolForm({ ...schoolForm, country: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Registry Email</label>
                <input
                  type="email"
                  value={schoolForm.email}
                  onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Admissions & Support Phone</label>
                <input
                  type="text"
                  value={schoolForm.phone}
                  onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official University Website</label>
                <input
                  type="url"
                  value={schoolForm.website}
                  onChange={(e) => setSchoolForm({ ...schoolForm, website: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-blue-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Operational & Financial Parameters */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">Institutional Operational & Financial Parameters</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Operating Currency Code</label>
                <select
                  value={schoolForm.currency}
                  onChange={(e) => setSchoolForm({ ...schoolForm, currency: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
                >
                  <option value="GHS">GHS (Ghanaian Cedi)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Currency Symbol</label>
                <input
                  type="text"
                  value={schoolForm.currencySymbol}
                  onChange={(e) => setSchoolForm({ ...schoolForm, currencySymbol: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tax Identification Number (TIN)</label>
                <input
                  type="text"
                  value={schoolForm.taxId}
                  onChange={(e) => setSchoolForm({ ...schoolForm, taxId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: COMPLETE ACADEMIC POLICIES & THRESHOLDS */}
      {/* ===================================================================== */}
      {activeTab === "academics" && (
        <div className="space-y-6">
          {/* Credit & Grading Regulations */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Academic Regulations, Credit Limits & Degree Standards</h2>
                  <p className="text-[11px] text-slate-500">Grading scales, credit loads, and attendance requirements enforced system-wide.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1">Pass Mark Threshold</label>
                <div className="text-[11px] text-slate-500 mb-2">Minimum mark to achieve passing grade.</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={40}
                    max={70}
                    value={academicForm.passMarkThreshold}
                    onChange={(e) => setAcademicForm({ ...academicForm, passMarkThreshold: Number(e.target.value) })}
                    className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 text-center"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1">Attendance Threshold</label>
                <div className="text-[11px] text-slate-500 mb-2">Minimum attendance for exam eligibility.</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={academicForm.attendanceThresholdPct}
                    onChange={(e) => setAcademicForm({ ...academicForm, attendanceThresholdPct: Number(e.target.value) })}
                    className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 text-center"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1">Min Term Credits</label>
                <div className="text-[11px] text-slate-500 mb-2">Minimum allowable credits registered.</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={6}
                    max={18}
                    value={academicForm.minRegistrationCredits}
                    onChange={(e) => setAcademicForm({ ...academicForm, minRegistrationCredits: Number(e.target.value) })}
                    className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 text-center"
                  />
                  <span className="text-xs font-bold text-slate-500">Credits</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1">Max Term Credits</label>
                <div className="text-[11px] text-slate-500 mb-2">Maximum allowable credits registered.</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={18}
                    max={30}
                    value={academicForm.maxRegistrationCredits}
                    onChange={(e) => setAcademicForm({ ...academicForm, maxRegistrationCredits: Number(e.target.value) })}
                    className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 text-center"
                  />
                  <span className="text-xs font-bold text-slate-500">Credits</span>
                </div>
              </div>
            </div>

            {/* GPA Standards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Probation GPA Cut-off</label>
                <input
                  type="number"
                  step="0.05"
                  value={academicForm.probationGpaThreshold}
                  onChange={(e) => setAcademicForm({ ...academicForm, probationGpaThreshold: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Second Class Upper Min GPA</label>
                <input
                  type="number"
                  step="0.05"
                  value={academicForm.secondClassUpperGpa}
                  onChange={(e) => setAcademicForm({ ...academicForm, secondClassUpperGpa: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">First Class Honours Min GPA</label>
                <input
                  type="number"
                  step="0.05"
                  value={academicForm.firstClassGpaThreshold}
                  onChange={(e) => setAcademicForm({ ...academicForm, firstClassGpaThreshold: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Academic Calendar Windows & Registration Fees */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">Academic Calendar & Windows</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Active Academic Year</label>
                <input
                  type="text"
                  value={academicForm.currentAcademicYear}
                  onChange={(e) => setAcademicForm({ ...academicForm, currentAcademicYear: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Active Term / Semester</label>
                <select
                  value={academicForm.activeSemester}
                  onChange={(e) => setAcademicForm({ ...academicForm, activeSemester: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
                >
                  <option value="Semester 1">Semester 1 (Fall / Harmattan)</option>
                  <option value="Semester 2">Semester 2 (Spring / Rain)</option>
                  <option value="Trimester 3">Trimester / Summer Session</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Course Add/Drop Window (Days)</label>
                <input
                  type="number"
                  value={academicForm.addDropWindowDays}
                  onChange={(e) => setAcademicForm({ ...academicForm, addDropWindowDays: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Grade Submission Window (Days)</label>
                <input
                  type="number"
                  value={academicForm.gradeSubmissionDeadlineDays}
                  onChange={(e) => setAcademicForm({ ...academicForm, gradeSubmissionDeadlineDays: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Late Registration Penalty (GHS)</label>
                <input
                  type="number"
                  value={academicForm.lateRegistrationFine}
                  onChange={(e) => setAcademicForm({ ...academicForm, lateRegistrationFine: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 font-bold"
                />
              </div>
            </div>

            {/* Academic Policy Toggles */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Student Course Self-Registration</div>
                  <div className="text-[11px] text-slate-500">Allow enrolled students to select their course electives via student portal.</div>
                </div>
                <input
                  type="checkbox"
                  checked={academicForm.enableSelfRegistration}
                  onChange={(e) => setAcademicForm({ ...academicForm, enableSelfRegistration: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Require Academic Advisor Sign-off</div>
                  <div className="text-[11px] text-slate-500">Student registration must be approved by the designated faculty advisor.</div>
                </div>
                <input
                  type="checkbox"
                  checked={academicForm.requireAdvisorApproval}
                  onChange={(e) => setAcademicForm({ ...academicForm, requireAdvisorApproval: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-900">Block Transcript Generation for Unpaid Balances</div>
                  <div className="text-[11px] text-slate-500">Automatically restrict official transcript issuance when student invoices remain unsettled.</div>
                </div>
                <input
                  type="checkbox"
                  checked={academicForm.restrictTranscriptOnDebt}
                  onChange={(e) => setAcademicForm({ ...academicForm, restrictTranscriptOnDebt: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: COMPLETE DISPLAY SETTINGS, COLORS & THREE SELECTABLE THEMES */}
      {/* ===================================================================== */}
      {activeTab === "display" && (
        <div className="space-y-6">
          {/* Three Distinct Selectable Themes */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Three Signature System Admin Themes</h2>
                  <p className="text-[11px] text-slate-500">Choose between three carefully crafted institutional themes. Saved live to database.</p>
                </div>
              </div>
            </div>

            {/* Themes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {themeOptions.map((th) => {
                const isSelected = displayForm.theme === th.id;
                return (
                  <div
                    key={th.id}
                    onClick={() => setDisplayForm({ ...displayForm, theme: th.id, accentColor: th.primaryHex })}
                    className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/20 shadow-md ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    {/* Header with Radio & Title */}
                    <div>
                      <div className="flex items-center justify-between pb-3">
                        <span className="text-sm font-extrabold text-slate-900">{th.name}</span>
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-snug">{th.tagline}</p>

                      {/* Miniature Dashboard Preview Canvas */}
                      <div className="my-4 rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        {/* Fake Top Bar */}
                        <div
                          className="h-6 px-2 flex items-center justify-between"
                          style={{ backgroundColor: th.previewHeaderBg }}
                        >
                          <div className="h-2 w-8 rounded-full bg-white/40" />
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </div>

                        {/* Fake Body */}
                        <div className="p-2.5 flex gap-2" style={{ backgroundColor: th.bgHex }}>
                          {/* Mini Sidebar */}
                          <div
                            className="w-8 h-16 rounded-md p-1 space-y-1"
                            style={{ backgroundColor: th.previewSidebarBg }}
                          >
                            <div className="h-1.5 w-full rounded" style={{ backgroundColor: th.primaryHex }} />
                            <div className="h-1.5 w-3/4 rounded bg-slate-200" />
                            <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                          </div>

                          {/* Mini Cards */}
                          <div className="flex-1 space-y-1.5">
                            <div
                              className="h-8 rounded-md p-1 flex items-center justify-between"
                              style={{ backgroundColor: th.cardBgHex }}
                            >
                              <div className="h-2 w-6 rounded bg-slate-300" />
                              <div
                                className="h-3.5 px-1 rounded text-[7px] font-bold flex items-center"
                                style={{ backgroundColor: th.badgeBg, color: th.badgeText }}
                              >
                                Active
                              </div>
                            </div>
                            <div
                              className="h-4 rounded flex items-center justify-center text-[7px] text-white font-bold"
                              style={{ backgroundColor: th.primaryHex }}
                            >
                              Action Button
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Color Palette Indicators */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Palette:</span>
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: th.primaryHex }} />
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: th.secondaryHex }} />
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: th.accentHex }} />
                      </div>
                    </div>

                    {/* Active Indicator Banner */}
                    {isSelected && (
                      <div className="mt-4 pt-3 border-t border-blue-200 text-center">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">✓ Selected Theme</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interface Accents, Density & Border Radius */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">Theme Customization & Interface Preferences</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Primary Color Accent Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Primary Accent Color</label>
                <div className="flex items-center gap-2">
                  {[
                    { color: "#2563EB", label: "Sapphire Blue" },
                    { color: "#059669", label: "Emerald Green" },
                    { color: "#7C3AED", label: "Imperial Violet" },
                    { color: "#0891B2", label: "Cyan Ocean" },
                    { color: "#E11D48", label: "Rose Crimson" },
                    { color: "#D97706", label: "Amber Gold" },
                  ].map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setDisplayForm({ ...displayForm, accentColor: preset.color })}
                      title={preset.label}
                      className={`h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        displayForm.accentColor === preset.color
                          ? "ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-xs"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: preset.color }}
                    >
                      {displayForm.accentColor === preset.color && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Density */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Information Density</label>
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDisplayForm({ ...displayForm, density: "comfortable" })}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      displayForm.density === "comfortable"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Comfortable
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayForm({ ...displayForm, density: "compact" })}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      displayForm.density === "compact"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Compact (High Data)
                  </button>
                </div>
              </div>

              {/* Card Corner Radius */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Interface Border Radius</label>
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  {[
                    { id: "rounded-lg", label: "Subtle (8px)" },
                    { id: "rounded-xl", label: "Medium (12px)" },
                    { id: "rounded-2xl", label: "Rounded (16px)" },
                  ].map((rad) => (
                    <button
                      key={rad.id}
                      type="button"
                      onClick={() => setDisplayForm({ ...displayForm, borderRadius: rad.id as any })}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        displayForm.borderRadius === rad.id
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {rad.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
