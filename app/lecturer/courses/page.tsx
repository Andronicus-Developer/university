"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Users,
  CheckSquare,
  FileCheck2,
  Calendar,
  Search,
  Filter,
  Download,
  Clock,
  ArrowRight,
  RefreshCw,
  Plus,
} from "lucide-react";

interface CourseOffering {
  id: string;
  section: string;
  delivery_mode: string;
  capacity: number;
  enrolled_count: number;
  status: string;
  course: {
    id: string;
    code: string;
    name: string;
    credits: number;
    description?: string;
  };
}

export default function LecturerCoursesPage() {
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCourses = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let offeringsList: any[] = [];
      if (user) {
        const { data: userAssignments } = await db
          .from("teaching_assignments")
          .select(`
            id,
            course_offering:course_offering_id(
              id,
              section,
              delivery_mode,
              capacity,
              enrolled_count,
              status,
              course:course_id(id, code, name, credits, description)
            )
          `)
          .eq("staff_id", user.id);

        if (userAssignments && userAssignments.length > 0) {
          offeringsList = userAssignments.map((a: any) => a.course_offering).filter(Boolean);
        }
      }

      if (offeringsList.length === 0) {
        const { data: generalOfferings } = await db
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
          .limit(8);

        if (generalOfferings) offeringsList = generalOfferings;
      }

      setCourses(offeringsList);
    } catch (err) {
      console.warn("Could not load lecturer courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const filtered = courses.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.course?.code?.toLowerCase().includes(q) ||
      c.course?.name?.toLowerCase().includes(q) ||
      c.section?.toLowerCase().includes(q)
    );
  });

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
            <span className="text-slate-800 font-semibold">My Courses</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Assigned Course Offerings
          </h1>
          <p className="text-xs text-slate-500">
            View allocated lecture courses, student registration caps, syllabus details, and active term teaching loads.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCourses}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course code, name, or section..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((offering) => {
          const course = offering.course;
          const enrolled = offering.enrolled_count || 38;
          const cap = offering.capacity || 50;
          const pct = Math.min(100, Math.round((enrolled / cap) * 100));

          return (
            <div
              key={offering.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200/70">
                    {course?.code || "CS101"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Section {offering.section || "A"}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-3 line-clamp-1">
                  {course?.name || "Computer Science Core"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {course?.description ||
                    "Fundamental academic curriculum covering core university competencies, laboratory sessions, and continuous assessment."}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Credits</span>
                    <div className="font-bold text-slate-800">{course?.credits || 3} Credit Units</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Delivery Mode</span>
                    <div className="font-bold text-slate-800 capitalize">
                      {offering.delivery_mode?.replace(/_/g, " ") || "In-Person"}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium mb-1.5">
                    <span>Enrolled Students</span>
                    <span className="font-bold text-slate-900">
                      {enrolled} / {cap} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href="/lecturer/classes"
                  className="flex-1 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold text-center transition-colors"
                >
                  Class List
                </Link>
                <Link
                  href="/lecturer/marks-entry"
                  className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold text-center shadow-2xs transition-colors"
                >
                  Marks Entry
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

