"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Search, UserCheck, X, XCircle } from "lucide-react";
import { useRegistrarSection } from "@/lib/registrar/useRegistrarPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicMigrationNotice,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface AdmissionsData {
  school: { id: string; name: string; school_type: string };
  missingTables: string[];
  nextStudentIdPreview?: string | null;
  applications: Array<{
    id: string;
    application_number: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    programme_id: string | null;
    department_id: string | null;
    class_group_id: string | null;
    intake_id: string | null;
    unit_name: string;
    status: string;
    created_at: string;
  }>;
  programmes: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  classGroups: Array<{ id: string; name: string }>;
  intakes: Array<{ id: string; name: string }>;
}

export default function RegistrarAdmissionsPage() {
  const { data, loading, error, reload, mutate } =
    useRegistrarSection<AdmissionsData>("admissions");

  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  // New Application Modal
  const [showAppModal, setShowAppModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("female");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [classGroupId, setClassGroupId] = useState("");
  const [intakeId, setIntakeId] = useState("");

  // Enroll Modal (from application OR direct)
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollAppId, setEnrollAppId] = useState<string | null>(null);
  const [studentNumber, setStudentNumber] = useState("");
  const [createLoginAccount, setCreateLoginAccount] = useState(true);
  const [loginPassword, setLoginPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.applications || []).filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.full_name.toLowerCase().includes(q) ||
        a.application_number.toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q)
      );
    });
  }, [data?.applications, statusFilter, query]);

  if (loading) return <ClassicLoading label="Loading admissions & onboarding..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load admissions"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  function openEnrollModal(app?: AdmissionsData["applications"][0]) {
    if (app) {
      setEnrollAppId(app.id);
      setFirstName(app.first_name);
      setLastName(app.last_name);
      setEmail(app.email || "");
      setPhone(app.phone || "");
      setGender(app.gender || "female");
      setProgrammeId(app.programme_id || "");
      setDepartmentId(app.department_id || "");
      setClassGroupId(app.class_group_id || "");
      setIntakeId(app.intake_id || "");
    } else {
      setEnrollAppId(null);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setGender("female");
      setProgrammeId(data?.programmes[0]?.id || "");
      setDepartmentId(data?.departments[0]?.id || "");
      setClassGroupId(data?.classGroups[0]?.id || "");
      setIntakeId(data?.intakes[0]?.id || "");
    }
    setStudentNumber("");
    setLoginPassword("");
    setEnrollModalOpen(true);
  }

  async function handleCreateApplication(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("create_application", {
      firstName,
      lastName,
      email,
      phone,
      gender,
      guardianName,
      guardianPhone,
      programmeId: programmeId || null,
      departmentId: departmentId || null,
      classGroupId: classGroupId || null,
      intakeId: intakeId || null,
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to log application." });
      return;
    }
    setBanner({ type: "success", text: "Application registered." });
    setShowAppModal(false);
  }

  async function handleApproveAndEnroll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    const res = await mutate("approve_and_enroll", {
      applicationId: enrollAppId,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      gender,
      studentNumber: studentNumber.trim() || undefined,
      programmeId: programmeId || null,
      departmentId: departmentId || null,
      classGroupId: classGroupId || null,
      intakeId: intakeId || null,
      createLoginAccount: Boolean(email && createLoginAccount),
      loginPassword: loginPassword.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to enroll learner." });
      return;
    }
    setBanner({
      type: "success",
      text: `${firstName} ${lastName} enrolled (${terms.idLabel}: ${res.data?.student?.student_number}).`,
    });
    setEnrollModalOpen(false);
  }

  async function handleReject(id: string) {
    const res = await mutate("update_application_status", {
      applicationId: id,
      status: "rejected",
    });
    if (!res.ok) setBanner({ type: "error", text: res.error || "Failed to update status." });
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title="Admissions & Enrollment"
        subtitle={`${data.school.name} • Review applications, assign ${terms.idLabel}s, and enroll ${terms.learnerPlural.toLowerCase()}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowAppModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Application</span>
            </button>
            <button
              type="button"
              onClick={() => openEnrollModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 text-xs font-medium cursor-pointer"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Direct Enroll {terms.learnerSingular}</span>
            </button>
          </>
        }
      />

      <ClassicMigrationNotice tables={data.missingTables} />

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

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["all", "submitted", "under_review", "approved", "enrolled", "rejected"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applicant or App No..."
            className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-full sm:w-56"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <ClassicEmpty
          icon={UserCheck}
          title="No Admissions Applications"
          description="Log a new application or use Direct Enroll to register a student or trainee immediately."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">App No.</th>
                  <th className="py-2.5 px-4">Applicant</th>
                  <th className="py-2.5 px-4">{terms.unitLabel}</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-4 font-mono">{a.application_number}</td>
                    <td className="py-2.5 px-4 font-medium">{a.full_name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{a.unit_name}</td>
                    <td className="py-2.5 px-4 text-[11px] text-slate-500">
                      <div>{a.email || "—"}</div>
                      <div>{a.phone || ""}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <ClassicStatusBadge status={a.status} />
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      {a.status !== "enrolled" && a.status !== "rejected" && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEnrollModal(a)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approve & Enroll</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(a.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-200 dark:border-rose-800 text-rose-600 text-[11px] cursor-pointer"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Application Modal */}
      {showAppModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold">Log New Admission Application</h3>
              <button type="button" onClick={() => setShowAppModal(false)} className="cursor-pointer">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateApplication} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Guardian Phone</label>
                  <input
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve & Enroll Modal */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold">
                {enrollAppId ? "Approve & Enroll Applicant" : `Enroll New ${terms.learnerSingular}`}
              </h3>
              <button type="button" onClick={() => setEnrollModalOpen(false)} className="cursor-pointer">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleApproveAndEnroll} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">{terms.idLabel} (Auto if blank)</label>
                  <input
                    type="text"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value.toUpperCase())}
                    placeholder={data.nextStudentIdPreview || "Auto-generated ID"}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                  {!studentNumber.trim() && data.nextStudentIdPreview && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Next auto ID:{" "}
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {data.nextStudentIdPreview}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-medium mb-1">Email (for portal login)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.programmes.length > 0 && (
                  <div>
                    <label className="block font-medium mb-1">{terms.programLabel}</label>
                    <select
                      value={programmeId}
                      onChange={(e) => setProgrammeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="">None</option>
                      {data.programmes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {data.classGroups.length > 0 && (
                  <div>
                    <label className="block font-medium mb-1">Class Group</label>
                    <select
                      value={classGroupId}
                      onChange={(e) => setClassGroupId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="">None</option>
                      {data.classGroups.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {data.departments.length > 0 && (
                  <div>
                    <label className="block font-medium mb-1">{terms.unitLabel}</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="">None</option>
                      {data.departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {data.intakes.length > 0 && (
                  <div>
                    <label className="block font-medium mb-1">Intake Cohort</label>
                    <select
                      value={intakeId}
                      onChange={(e) => setIntakeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="">None</option>
                      {data.intakes.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {email && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={createLoginAccount}
                      onChange={(e) => setCreateLoginAccount(e.target.checked)}
                    />
                    <span>Provision Student Portal login account</span>
                  </label>
                  {createLoginAccount && (
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Initial password (min 8 chars, or auto-generated)"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEnrollModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 font-medium cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Enrollment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
