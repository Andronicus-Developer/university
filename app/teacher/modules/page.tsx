"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  FilePlus2,
  Hammer,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  MigrationNoticeBanner,
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

interface VocModule {
  id: string;
  code: string;
  name: string;
  practical_hours: number;
  theory_hours: number;
  credit_units: number;
  description: string | null;
  is_active: boolean;
  department_id: string | null;
}

interface VocIntake {
  id: string;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface VocTrainee {
  id: string;
  full_name: string;
  student_number: string | null;
  email: string | null;
  phone: string | null;
  training_stage: string | null;
  sponsorship_type: string | null;
  intake_id: string | null;
}

interface VocMaterial {
  id: string;
  module_id: string;
  title: string;
  material_type: string;
  description: string | null;
  file_url: string | null;
  created_at: string;
}

interface VocModulesPayload {
  school: { id: string; name: string };
  staffProfile: { id: string; full_name?: string; staff_number?: string } | null;
  department: { id: string; name: string; code?: string } | null;
  activeTerm: { id: string; name: string } | null;
  modules: VocModule[];
  intakes: VocIntake[];
  trainees: VocTrainee[];
  materials: VocMaterial[];
  missingTables: string[];
}

const MATERIAL_TYPES = [
  { value: "workshop_manual", label: "Workshop Manual" },
  { value: "safety_guide", label: "PPE & Safety Guide" },
  { value: "lab_guide", label: "Practical Sheet / Checklist" },
  { value: "reading", label: "Trade Theory Handout" },
];

export default function InstructorModulesPage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<VocModulesPayload>("voc_modules");

  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"manuals" | "trainees">("manuals");
  const [selectedIntakeId, setSelectedIntakeId] = useState<string>("all");
  const [traineeQuery, setTraineeQuery] = useState("");

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [title, setTitle] = useState("");
  const [materialType, setMaterialType] = useState("workshop_manual");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const modules = data?.modules || [];
  const activeModuleId = useMemo(() => {
    if (selectedModuleId && modules.some((m) => m.id === selectedModuleId)) {
      return selectedModuleId;
    }
    return modules[0]?.id || "";
  }, [modules, selectedModuleId]);

  const activeModule = useMemo(
    () => modules.find((m) => m.id === activeModuleId) || null,
    [modules, activeModuleId]
  );

  const moduleMaterials = useMemo(
    () => (data?.materials || []).filter((m) => m.module_id === activeModuleId),
    [data?.materials, activeModuleId]
  );

  const intakeMap = useMemo(() => {
    const map = new Map<string, VocIntake>();
    for (const intake of data?.intakes || []) {
      map.set(intake.id, intake);
    }
    return map;
  }, [data?.intakes]);

  const filteredTrainees = useMemo(() => {
    const q = traineeQuery.trim().toLowerCase();
    return (data?.trainees || []).filter((t) => {
      if (selectedIntakeId !== "all" && t.intake_id !== selectedIntakeId) return false;
      if (!q) return true;
      return (
        t.full_name.toLowerCase().includes(q) ||
        (t.student_number || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q)
      );
    });
  }, [data?.trainees, selectedIntakeId, traineeQuery]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setBanner(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "workshop-manuals");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        setBanner({
          type: "error",
          text: json?.error || "Upload failed (supported images: JPG/PNG/WEBP/GIF up to 5 MB).",
        });
      } else {
        setFileUrl(json.url);
        setBanner({ type: "success", text: "File uploaded and attached to manual form." });
      }
    } catch {
      setBanner({ type: "error", text: "Network error while uploading file." });
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!activeModuleId || !title.trim()) return;
    setSaving(true);
    setBanner(null);
    const result = await mutate("create_material", {
      moduleId: activeModuleId,
      title: title.trim(),
      materialType,
      description: description.trim() || null,
      fileUrl: fileUrl.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setBanner({ type: "error", text: result.error || "Failed to publish manual." });
      return;
    }
    setBanner({ type: "success", text: "Workshop material published for trainees." });
    setTitle("");
    setDescription("");
    setFileUrl("");
    setMaterialType("workshop_manual");
    setShowMaterialModal(false);
  }

  async function handleDeleteMaterial(materialId: string) {
    setDeletingId(materialId);
    setBanner(null);
    const result = await mutate("delete_material", { materialId });
    setDeletingId(null);
    if (!result.ok) {
      setBanner({ type: "error", text: result.error || "Failed to delete material." });
    } else {
      setBanner({ type: "success", text: "Material removed." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading trade modules & cohorts..." />;
  if (error || !data) {
    return <StaffPageError error={error || "Failed to load trade modules"} onRetry={reload} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Trade Modules & Workshop Manuals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.school.name}
            {data.department ? ` • ${data.department.name}` : ""}
            {data.activeTerm ? ` • ${data.activeTerm.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300">
            {modules.length} Module{modules.length === 1 ? "" : "s"}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {data.trainees.length} Trainee{data.trainees.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <MigrationNoticeBanner tables={data.missingTables} />

      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 ${
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

      {modules.length === 0 ? (
        <StaffEmptyState
          icon={Hammer}
          title="No Trade Modules Assigned Yet"
          description="Once your Vocational Admin creates trade modules in the curriculum setup and assigns you as instructor, your modules, manuals, and cohorts will appear here."
          actionHref="/teacher/dashboard"
          actionLabel="Back to Instructor Hub"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Module Selector */}
          <div className="lg:col-span-4 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              Assigned Trade Units
            </p>
            {modules.map((mod) => {
              const selected = mod.id === activeModuleId;
              const matCount = (data.materials || []).filter((m) => m.module_id === mod.id).length;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setSelectedModuleId(mod.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    selected
                      ? "border-amber-500 dark:border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 shadow-sm"
                      : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {mod.code}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {matCount} guide{matCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {mod.name}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    <span>{mod.practical_hours}h practical</span>
                    <span>•</span>
                    <span>{mod.theory_hours}h theory</span>
                    <span>•</span>
                    <span>{mod.credit_units} CU</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Workspace */}
          <div className="lg:col-span-8 space-y-4">
            {activeModule && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                        {activeModule.code}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          activeModule.is_active
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {activeModule.is_active ? "Active Unit" : "Archived"}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {activeModule.name}
                    </h2>
                    {activeModule.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {activeModule.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMaterialModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm cursor-pointer shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Workshop Manual</span>
                  </button>
                </div>

                {/* Tab Toggle */}
                <div className="flex items-center gap-2 mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("manuals")}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      activeTab === "manuals"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Workshop & Safety Manuals ({moduleMaterials.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("trainees")}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      activeTab === "trainees"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Cohort Trainees ({filteredTrainees.length})</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "manuals" ? (
              moduleMaterials.length === 0 ? (
                <StaffEmptyState
                  icon={ShieldCheck}
                  title="No Manuals Uploaded for This Module"
                  description="Upload safety guides, practical job sheets, or external curriculum PDFs so trainees can read them before workshop sessions."
                />
              ) : (
                <div className="space-y-3">
                  {moduleMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                            {MATERIAL_TYPES.find((t) => t.value === mat.material_type)?.label ||
                              mat.material_type}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            Added {(mat.created_at || "").slice(0, 10)}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {mat.title}
                        </h3>
                        {mat.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {mat.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {mat.file_url && (
                          <a
                            href={mat.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Open</span>
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={deletingId === mat.id}
                          onClick={() => handleDeleteMaterial(mat.id)}
                          className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50"
                          title="Remove manual"
                        >
                          {deletingId === mat.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={traineeQuery}
                      onChange={(e) => setTraineeQuery(e.target.value)}
                      placeholder="Search trainee name, ID, or email..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <select
                    value={selectedIntakeId}
                    onChange={(e) => setSelectedIntakeId(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Intake Cohorts ({data.intakes.length})</option>
                    {data.intakes.map((intake) => (
                      <option key={intake.id} value={intake.id}>
                        {intake.code} — {intake.name}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredTrainees.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                    No trainees match the current intake or search filter.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                          <th className="py-2.5 pr-4">Trainee</th>
                          <th className="py-2.5 pr-4">Intake</th>
                          <th className="py-2.5 pr-4">Stage</th>
                          <th className="py-2.5">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {filteredTrainees.map((trainee) => {
                          const intake = trainee.intake_id
                            ? intakeMap.get(trainee.intake_id)
                            : null;
                          return (
                            <tr key={trainee.id}>
                              <td className="py-3 pr-4">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  {trainee.full_name}
                                </p>
                                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  {trainee.student_number || "No Trainee ID"}
                                </p>
                              </td>
                              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                                {intake ? `${intake.code} (${intake.name})` : "Unassigned"}
                              </td>
                              <td className="py-3 pr-4">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                  {trainee.training_stage || "Workshop"}
                                </span>
                              </td>
                              <td className="py-3 text-[11px] text-slate-500 dark:text-slate-400">
                                <div>{trainee.email || "—"}</div>
                                <div>{trainee.phone || ""}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Material Modal */}
      {showMaterialModal && activeModule && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilePlus2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Publish Manual — {activeModule.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMaterialModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveMaterial} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lathe Chuck Safety & Calibration Sheet"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Type
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                >
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Instructions / Summary
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key PPE requirements, tolerances, or step checklist..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Attachment URL or Schematic Image
                </label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://... (PDF, Drive link, or uploaded image)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {uploading
                      ? "Uploading image..."
                      : "Upload diagram image (JPG/PNG/WEBP, max 5 MB)"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Publish Manual</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
