"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ClipboardList,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
  ShieldCheck,
  Check,
  RefreshCw,
} from "lucide-react";

export default function StudentRegistrationPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [enrolments, setEnrolments] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let stu = null;
      if (user) {
        const { data: s } = await db
          .from("students")
          .select("*, programme:programme_id(*)")
          .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();
        stu = s;
      }

      if (!stu) {
        const { data: firstStu } = await db
          .from("students")
          .select("*, programme:programme_id(*)")
          .limit(1)
          .maybeSingle();
        stu = firstStu;
      }

      if (stu) {
        setStudent(stu);

        // Fetch current enrolments
        const { data: enrs } = await db
          .from("course_enrolments")
          .select(`
            id,
            course_offering_id,
            enrolment_status,
            registered_at,
            course_offering:course_offering_id(
              id,
              section,
              delivery_mode,
              course:course_id(id, code, name, credits)
            )
          `)
          .eq("student_id", stu.id);

        setEnrolments(enrs || []);

        // Fetch all available course offerings
        const { data: offs } = await db
          .from("course_offerings")
          .select(`
            id,
            section,
            delivery_mode,
            capacity,
            enrolled_count,
            status,
            course:course_id(id, code, name, credits, description)
          `)
          .in("status", ["open", "published"]);

        setOfferings(offs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegister = async (offeringId: string) => {
    setRegistering(offeringId);
    setFeedback(null);

    try {
      const res = await fetch("/api/student/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to register");
      }

      setFeedback({ type: "success", message: "Course registered successfully!" });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to register" });
    } finally {
      setRegistering(null);
    }
  };

  const handleDrop = async (enrolmentId: string) => {
    if (!confirm("Are you sure you want to drop this registered course? It will be ready for enrollment immediately.")) return;
    setFeedback(null);

    try {
      const res = await fetch("/api/student/courses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrolmentId }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to drop course");
      }

      setFeedback({ type: "success", message: "Course dropped successfully! It is ready for enrollment immediately below." });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to drop course" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading course registration window...</p>
      </div>
    );
  }

  const enrolledOfferingIds = enrolments.map((e) => e.course_offering_id);
  const totalEnrolledCredits = enrolments.reduce((sum, e) => sum + (e.course_offering?.course?.credits || 3), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Course Registration Portal</h1>
          <p className="text-xs text-slate-500">Academic Year 2026/2027 • First Semester Regular Registration</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
            Total Registered: {totalEnrolledCredits} / 18 Credits
          </span>
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Enrolled Courses Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Currently Registered Courses ({enrolments.length})</h2>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {enrolments.length > 0 ? (
            enrolments.map((enr) => {
              const c = enr.course_offering?.course;
              return (
                <div key={enr.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                        {c?.code}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{c?.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        Enrolled
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Credits: {c?.credits || 3} • Section: {enr.course_offering?.section || "A"} • Mode: {enr.course_offering?.delivery_mode || "in-person"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDrop(enr.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition self-start sm:self-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Drop Course
                  </button>
                </div>
              );
            })
          ) : (
            <p className="p-6 text-center text-xs text-slate-400">No courses registered yet. Select from available offerings below.</p>
          )}
        </div>
      </div>

      {/* Available Offerings to Register */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Available Course Offerings</h2>
          </div>
          <span className="text-xs text-slate-400">Click register to enroll</span>
        </div>

        <div className="divide-y divide-slate-100">
          {offerings.map((off) => {
            const isEnrolled = enrolledOfferingIds.includes(off.id);
            return (
              <div key={off.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs">
                      {off.course?.code}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{off.course?.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                      Section {off.section}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xl">{off.course?.description}</p>
                  <p className="text-[11px] text-slate-400">
                    Credits: {off.course?.credits} • Mode: {off.delivery_mode} • Capacity: {off.capacity || 50}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isEnrolled ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs">
                      <Check className="h-3.5 w-3.5" /> Registered
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRegister(off.id)}
                      disabled={registering === off.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {registering === off.id ? "Registering..." : "Register"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

