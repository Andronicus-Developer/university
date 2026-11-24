"use client";

import React, { useMemo, useState } from "react";
import { Edit3, Loader2, Search, Users, X } from "lucide-react";
import { useRegistrarSection } from "@/lib/registrar/useRegistrarPortal";
import {
  ClassicEmpty,
  ClassicError,
  ClassicLoading,
  ClassicPageHeader,
  ClassicStatusBadge,
} from "@/components/portals/ClassicPortalPrimitives";
import { getPortalTerminology } from "@/lib/portals/school-type-labels";

interface StudentsDirectoryData {
  school: { id: string; name: string; school_type: string };
  students: Array<{
    id: string;
    student_number: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    status: string;
    current_level: number | null;
    programme_id: string | null;
    department_id: string | null;
    class_group_id: string | null;
    intake_id: string | null;
    programme_name: string | null;
    department_name: string | null;
    class_group_name: string | null;
    intake_name: string | null;
  }>;
  programmes: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  classGroups: Array<{ id: string; name: string }>;
  intakes: Array<{ id: string; name: string }>;
}

export default function RegistrarStudentsPage() {
  const { data, loading, error, reload, mutate } =
    useRegistrarSection<StudentsDirectoryData>("students");

  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<StudentsDirectoryData["students"][0] | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [programmeId, setProgrammeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [classGroupId, setClassGroupId] = useState("");
  const [intakeId, setIntakeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.students || []).filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.full_name.toLowerCase().includes(q) ||
        (s.student_number || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q)
      );
    });
  }, [data?.students, statusFilter, query]);

  if (loading) return <ClassicLoading label="Loading master registry..." />;
  if (error || !data) {
    return <ClassicError error={error || "Failed to load directory"} onRetry={reload} />;
  }

  const terms = getPortalTerminology(data.school.school_type);

  function openEdit(s: StudentsDirectoryData["students"][0]) {
    setEditing(s);
    setFirstName(s.first_name || "");
    setLastName(s.last_name || "");
    setStudentNumber(s.student_number || "");
    setEmail(s.email || "");
    setPhone(s.phone || "");
    setStatus(s.status || "active");
    setProgrammeId(s.programme_id || "");
    setDepartmentId(s.department_id || "");
    setClassGroupId(s.class_group_id || "");
    setIntakeId(s.intake_id || "");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setBanner(null);
    const res = await mutate("update_student_record", {
      studentId: editing.id,
      firstName,
      lastName,
      studentNumber,
      email,
      phone,
      status,
      programmeId: programmeId || null,
      departmentId: departmentId || null,
      classGroupId: classGroupId || null,
      intakeId: intakeId || null,
    });
    setSaving(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to update record." });
      return;
    }
    setBanner({ type: "success", text: `Updated registry record for ${firstName} ${lastName}.` });
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <ClassicPageHeader
        title={`${terms.learnerSingular} Records & Directory`}
        subtitle={`${data.school.name} • Master registry of ${data.students.length} ${terms.learnerPlural.toLowerCase()}`}
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

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["all", "active", "deferred", "suspended", "graduated", "withdrawn"].map((st) => (
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
              {st}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search name, ${terms.idLabel}, email...`}
            className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-full sm:w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <ClassicEmpty
          icon={Users}
          title={`No ${terms.learnerPlural} Matching Filter`}
          description="Adjust your search or status filter."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">{terms.idLabel}</th>
                  <th className="py-2.5 px-4">Full Name</th>
                  <th className="py-2.5 px-4">Placement ({terms.unitLabel})</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-4 font-mono">{s.student_number}</td>
                    <td className="py-2.5 px-4 font-medium">{s.full_name}</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {s.class_group_name ||
                        s.programme_name ||
                        s.intake_name ||
                        s.department_name ||
                        "—"}
                    </td>
                    <td className="py-2.5 px-4 text-[11px] text-slate-500">
                      <div>{s.email || "—"}</div>
                      <div>{s.phone || ""}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <ClassicStatusBadge status={s.status} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit / Transfer</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold">Edit {terms.learnerSingular} Registry Record</h3>
              <button type="button" onClick={() => setEditing(null)} className="cursor-pointer">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
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
                  <label className="block font-medium mb-1">{terms.idLabel} *</label>
                  <input
                    type="text"
                    required
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Academic Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="deferred">Deferred</option>
                    <option value="suspended">Suspended</option>
                    <option value="graduated">Graduated</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
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
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
