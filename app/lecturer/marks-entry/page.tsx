"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  FileCheck2,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Download,
  Users,
  Award,
  Loader2,
} from "lucide-react";

interface StudentScoreRow {
  studentId: string;
  enrolmentId: string;
  studentNumber: string;
  fullName: string;
  marksObtained: number | string;
  isAbsent: boolean;
  remarks: string;
}

export default function LecturerMarksEntryPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>("");
  const [components, setComponents] = useState<any[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [scores, setScores] = useState<StudentScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // 1. Load Course Offerings
  useEffect(() => {
    async function loadOfferings() {
      try {
        const res = await fetch("/api/lecturer/dashboard");
        const data = await res.json();
        if (data?.success && data.offerings && data.offerings.length > 0) {
          setOfferings(data.offerings);
          setSelectedOfferingId(data.offerings[0].id);
        } else {
          const supabase = createClient();
          const { data: offs } = await (supabase as any)
            .from("course_offerings")
            .select("id, section, course:course_id(code, name)")
            .limit(10);
          if (offs && offs.length > 0) {
            setOfferings(offs);
            setSelectedOfferingId(offs[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load offerings:", err);
      }
    }
    loadOfferings();
  }, []);

  // 2. Load Assessment Components for selected Course Offering
  useEffect(() => {
    if (!selectedOfferingId) return;

    async function loadComponents() {
      try {
        const supabase = createClient();
        const { data: comps } = await (supabase as any)
          .from("assessment_components")
          .select("*")
          .eq("course_offering_id", selectedOfferingId)
          .order("created_at", { ascending: true });

        if (comps && comps.length > 0) {
          setComponents(comps);
          setSelectedComponentId(comps[0].id);
          setMaxMarks(Number(comps[0].max_marks) || 100);
        } else {
          setComponents([]);
          setSelectedComponentId("");
        }
      } catch (err) {
        console.warn("Could not load components:", err);
      }
    }
    loadComponents();
  }, [selectedOfferingId]);

  // 3. Load Enrolled Students and existing Marks
  useEffect(() => {
    if (!selectedOfferingId) return;

    async function loadEnrolledStudentsAndMarks() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: enrolments } = await (supabase as any)
          .from("course_enrolments")
          .select(`
            id,
            student_id,
            enrolment_status,
            student:student_id(
              id,
              student_number,
              profile:profile_id(full_name, email)
            )
          `)
          .eq("course_offering_id", selectedOfferingId)
          .eq("enrolment_status", "enrolled");

        let existingMarksMap: Record<string, any> = {};
        if (selectedComponentId) {
          const { data: marks } = await (supabase as any)
            .from("assessment_marks")
            .select("*")
            .eq("assessment_component_id", selectedComponentId);

          if (marks) {
            marks.forEach((m: any) => {
              existingMarksMap[m.enrolment_id] = m;
            });
          }
        }

        if (enrolments && enrolments.length > 0) {
          setScores(
            enrolments.map((e: any) => {
              const existing = existingMarksMap[e.id];
              return {
                studentId: e.student_id,
                enrolmentId: e.id,
                studentNumber: e.student?.student_number || "STU20260001",
                fullName: e.student?.profile?.full_name || "Enrolled Student",
                marksObtained: existing ? existing.marks_obtained : "",
                isAbsent: Boolean(existing?.is_absent),
                remarks: existing?.remarks || "",
              };
            })
          );
        } else {
          setScores([]);
        }
      } catch (err) {
        console.warn("Could not load enrolled students:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEnrolledStudentsAndMarks();
  }, [selectedOfferingId, selectedComponentId]);

  const updateMark = (studentId: string, val: string) => {
    const num = val === "" ? "" : Math.min(maxMarks, Math.max(0, Number(val)));
    setScores((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, marksObtained: num } : s))
    );
  };

  const handleSaveDraft = async () => {
    if (!selectedComponentId) {
      alert("Please select or create an assessment component first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/lecturer/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseOfferingId: selectedOfferingId,
          assessmentComponentId: selectedComponentId,
          marks: scores,
          isSubmittedForModeration: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification("Marks saved directly to database as draft!");
      } else {
        alert(data.error || "Failed to save marks");
      }
    } catch (err: any) {
      alert(err.message || "Network error while saving marks");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForModeration = async () => {
    if (!selectedComponentId || !selectedOfferingId) {
      alert("Please select a course offering and assessment component.");
      return;
    }
    const confirmSubmit = window.confirm(
      "Are you sure you want to submit this mark sheet for departmental moderation? Once submitted, marks become locked pending board review."
    );
    if (!confirmSubmit) return;

    setSaving(true);
    try {
      const res = await fetch("/api/lecturer/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseOfferingId: selectedOfferingId,
          assessmentComponentId: selectedComponentId,
          marks: scores,
          isSubmittedForModeration: true,
          submissionNotes: "Mark sheet finalized and forwarded to HOD for departmental moderation.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification("Mark sheet successfully submitted to database for Departmental Moderation!");
      } else {
        alert(data.error || "Failed to submit mark sheet");
      }
    } catch (err: any) {
      alert(err.message || "Network error while submitting mark sheet");
    } finally {
      setSaving(false);
    }
  };

  const calculateGrade = (marks: number | string) => {
    const m = Number(marks);
    const pct = maxMarks > 0 ? (m / maxMarks) * 100 : m;
    if (pct >= 80) return { grade: "A", pts: "4.0" };
    if (pct >= 75) return { grade: "B+", pts: "3.5" };
    if (pct >= 70) return { grade: "B", pts: "3.0" };
    if (pct >= 65) return { grade: "C+", pts: "2.5" };
    if (pct >= 60) return { grade: "C", pts: "2.0" };
    if (pct >= 50) return { grade: "D", pts: "1.0" };
    return { grade: "F", pts: "0.0" };
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Marks Entry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Student Marks & Grading Entry
          </h1>
          <p className="text-xs text-slate-500">
            Enter coursework and examination marks, validate grade scale points, and submit mark sheets for moderation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSaveDraft}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Draft</span>
          </button>
          <button
            onClick={handleSubmitForModeration}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Send className="h-3.5 w-3.5" />}
            <span>Submit for Moderation</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Selectors Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Course Offering</label>
          <select
            value={selectedOfferingId}
            onChange={(e) => setSelectedOfferingId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
          >
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.course?.code || "COURSE"} - {o.course?.name || "Offering"} (Section {o.section || "A"})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Assessment Component</label>
          <select
            value={selectedComponentId}
            onChange={(e) => {
              const comp = components.find((c) => c.id === e.target.value);
              setSelectedComponentId(e.target.value);
              if (comp) setMaxMarks(Number(comp.max_marks) || 100);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
          >
            {components.length > 0 ? (
              components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.weight_percentage}%) - Max {c.max_marks} marks
                </option>
              ))
            ) : (
              <option value="">No components defined for this course</option>
            )}
          </select>
        </div>
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4 text-center">Marks (Max {maxMarks})</th>
                <th className="py-3 px-4 text-center">Calculated Grade</th>
                <th className="py-3 px-4 text-center">Absent</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    <span>Loading student marks roster from database...</span>
                  </td>
                </tr>
              ) : scores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No enrolled students found for this course offering.
                  </td>
                </tr>
              ) : (
                scores.map((s) => {
                  const { grade, pts } = calculateGrade(s.marksObtained);
                  return (
                    <tr key={s.studentId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{s.studentNumber}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min={0}
                          max={maxMarks}
                          disabled={s.isAbsent}
                          value={s.isAbsent ? "" : s.marksObtained}
                          onChange={(e) => updateMark(s.studentId, e.target.value)}
                          className="w-20 px-2 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white disabled:opacity-40"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.isAbsent ? (
                          <span className="font-bold text-red-600">ABS</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {grade} ({pts})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={s.isAbsent}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setScores((prev) =>
                              prev.map((item) =>
                                item.studentId === s.studentId ? { ...item, isAbsent: checked } : item
                              )
                            );
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Optional remarks..."
                          value={s.remarks}
                          onChange={(e) => {
                            const val = e.target.value;
                            setScores((prev) =>
                              prev.map((item) =>
                                item.studentId === s.studentId ? { ...item, remarks: val } : item
                              )
                            );
                          }}
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
