"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  FilePlus2,
  Loader2,
  Plus,
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

interface CourseItem {
  id: string;
  code: string;
  name: string;
  credits: number;
  contact_hours: number;
  course_type: string;
  semester_number: number;
  level: number;
  description: string | null;
  enrolledCount: number;
  isExplicitlyAssigned?: boolean;
}

interface CourseMaterial {
  id: string;
  course_id: string;
  title: string;
  material_type: string;
  description: string | null;
  file_url: string | null;
  created_at: string;
}

interface UniCoursesPayload {
  school: { id: string; name: string };
  assignmentScope: "assigned" | "department" | "school";
  courses: CourseItem[];
  materials: CourseMaterial[];
  missingTables: string[];
}

export default function LecturerCoursesPage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<UniCoursesPayload>("uni_courses");

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [title, setTitle] = useState("");
  const [materialType, setMaterialType] = useState("syllabus");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeCourseId = useMemo(() => {
    if (selectedCourseId && (data?.courses || []).some((c) => c.id === selectedCourseId)) {
      return selectedCourseId;
    }
    return data?.courses?.[0]?.id || "";
  }, [data?.courses, selectedCourseId]);

  const activeCourse = useMemo(
    () => (data?.courses || []).find((c) => c.id === activeCourseId) || null,
    [data?.courses, activeCourseId]
  );

  const activeMaterials = useMemo(
    () => (data?.materials || []).filter((m) => m.course_id === activeCourseId),
    [data?.materials, activeCourseId]
  );

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setBanner(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "course-materials");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        setBanner({ type: "error", text: json?.error || "File upload failed (image formats JPG/PNG up to 5 MB)." });
      } else {
        setFileUrl(json.url);
        setBanner({ type: "success", text: "Attachment uploaded." });
      }
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Upload failed." });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleCreateMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCourseId || !title.trim()) {
      setBanner({ type: "error", text: "Select a course and provide a material title." });
      return;
    }
    setSaving(true);
    setBanner(null);
    const res = await mutate("create_material", {
      courseId: activeCourseId,
      title: title.trim(),
      materialType,
      description: description.trim(),
      fileUrl: fileUrl.trim(),
    });
    setSaving(false);

    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Failed to publish material." });
      return;
    }
    setTitle("");
    setDescription("");
    setFileUrl("");
    setShowMaterialModal(false);
    setBanner({ type: "success", text: res.message || "Course material published." });
  }

  async function handleDeleteMaterial(materialId: string) {
    const res = await mutate("delete_material", { materialId });
    if (!res.ok) {
      setBanner({ type: "error", text: res.error || "Could not remove material." });
    } else {
      setBanner({ type: "success", text: "Material deleted." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading assigned university courses..." />;
  if (error) return <StaffPageError error={error} onRetry={reload} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Teaching Load &amp; Course Content</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            My Assigned Courses &amp; Materials
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View allocated university courses and publish syllabi, lecture notes, and lab guides to students.
          </p>
        </div>

        {activeCourse && (
          <button
            type="button"
            onClick={() => {
              setShowMaterialModal((v) => !v);
              setBanner(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer self-start"
          >
            {showMaterialModal ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{showMaterialModal ? "Close Form" : "Post Syllabus / Material"}</span>
          </button>
        )}
      </div>

      <MigrationNoticeBanner tables={data?.missingTables || []} />

      {banner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-medium ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          {banner.text}
        </div>
      )}

      {(data?.courses || []).length === 0 ? (
        <StaffEmptyState
          icon={BookOpen}
          title="No Courses Assigned"
          description="Ask your School Administrator to assign university courses to your lecturer profile under Admin -> Teachers / Lecturers."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Course List */}
          <div className="lg:col-span-5 space-y-3">
            {data!.courses.map((course) => {
              const selected = course.id === activeCourseId;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                    selected
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-600 shadow-xs"
                      : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-300">
                      {course.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {course.credits} Credits · Sem {course.semester_number || 1}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                    {course.name}
                  </h2>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-emerald-500" />
                      {course.enrolledCount} registered
                    </span>
                    <span className="capitalize">{course.course_type} · L{course.level || 100}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Course Materials Panel */}
          <div className="lg:col-span-7 space-y-4">
            {showMaterialModal && activeCourse && (
              <form
                onSubmit={handleCreateMaterial}
                className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <FilePlus2 className="h-4 w-4 text-blue-600" />
                  <span>
                    Publish Material for {activeCourse.code} — {activeCourse.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Material Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Week 1 Syllabus & Lecture Slides"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Material Type
                    </label>
                    <select
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="syllabus">Course Syllabus</option>
                      <option value="lecture_notes">Lecture Notes</option>
                      <option value="reading">Reading Resource</option>
                      <option value="lab_guide">Lab / Practical Guide</option>
                      <option value="past_paper">Past Exam Paper</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Description / Summary
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Key topics covered, required textbook chapters, or instructions..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Resource URL / Link
                    </label>
                    <input
                      type="url"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      placeholder="https://... or upload file preview"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0">
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-blue-500" />
                    )}
                    <span>{uploading ? "Uploading..." : "Upload Image"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMaterialModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Publish Material</span>
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              {activeCourse && (
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeCourse.code} — {activeCourse.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeCourse.description || "Published materials are immediately visible to registered students."}
                  </p>
                </div>
              )}

              {activeMaterials.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                  No syllabus or lecture notes uploaded for this course yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                            {mat.material_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(mat.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {mat.title}
                        </h4>
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
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-blue-600 dark:text-blue-400"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Open</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(mat.id)}
                          className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                          title="Delete material"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
