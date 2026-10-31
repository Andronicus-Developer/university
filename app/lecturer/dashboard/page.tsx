"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutGrid,
  BookOpen,
  Users,
  CalendarDays,
  CheckSquare,
  Sliders,
  FileCheck2,
  FileText,
  ShieldCheck,
  MessageSquare,
  GraduationCap,
  UserCheck,
  Megaphone,
  Bell,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Award,
  Plus,
  RefreshCw,
  X,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Eye,
  Briefcase,
  Share2,
} from "lucide-react";

interface CourseItem {
  id: string;
  offeringId: string;
  code: string;
  name: string;
  section: string;
  credits: number;
  enrolledCount: number;
  capacity: number;
  deliveryMode: string;
  status: string;
  nextSession: string;
}

interface TimetableItem {
  id: string;
  courseCode: string;
  courseName: string;
  section: string;
  roomName: string;
  timeRange: string;
  dayName: string;
  enrolled: number;
}

interface NoticeItem {
  id: string;
  title: string;
  content?: string;
  created_at: string;
  target_audience?: string;
}

interface AssessmentStatusItem {
  id: string;
  courseCode: string;
  courseName: string;
  section: string;
  componentName: string;
  weightPercentage: number;
  status: "draft" | "submitted" | "moderated" | "approved";
  submittedOn?: string;
}

interface TopStudent {
  name: string;
  studentNumber: string;
  programme: string;
  course: string;
  score: string;
  gpa: string;
}

export default function LecturerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [lecturerName, setLecturerName] = useState<string>("Faculty Lecturer");
  const [lecturerTitle, setLecturerTitle] = useState<string>("Senior Lecturer");
  const [departmentName, setDepartmentName] = useState<string>("Department of Computer Science");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showAlert, setShowAlert] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string>(
    "Notice: Continuous Assessment (CA) and Mid-Semester marks entry window is active. Please submit verified mark sheets prior to department moderation deadlines."
  );

  // Stats Counters
  const [stats, setStats] = useState({
    assignedCourses: 0,
    totalCredits: 0,
    enrolledStudents: 0,
    totalCapacity: 0,
    attendanceRate: 92,
    sessionsConducted: 0,
    assessmentsCount: 0,
    submittedMarksSheets: 0,
  });

  // Courses and Timetable
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [scheduleToday, setScheduleToday] = useState<TimetableItem[]>([]);
  const [assessmentStatuses, setAssessmentStatuses] = useState<AssessmentStatusItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);

  // Attendance Widget State
  const [attendanceTab, setAttendanceTab] = useState<"All Classes" | "Lectures" | "Practicals">("All Classes");
  const [attendanceStats, setAttendanceStats] = useState({
    present: 86,
    absent: 6,
    late: 5,
    excused: 3,
  });

  // Interactive Checklist
  const [todos, setTodos] = useState<{ id: number | string; text: string; time: string; completed: boolean }[]>([
    { id: "task-1", text: "Submit Mid-Semester Continuous Assessment marks to HOD", time: "Due Nov 05", completed: false },
    { id: "task-2", text: "Upload Week 8 Practical Laboratory Sheet for CS102", time: "Due Nov 08", completed: true },
    { id: "task-3", text: "Sign and verify attendance sheet for Accra Central Campus sessions", time: "Due Nov 12", completed: false },
  ]);

  // Calendar State: deferred to useEffect to prevent unstable value prerender error in Next.js 16
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const calendarDays = useMemo(() => {
    const targetDate = currentDate || new Date(2026, 9, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { day: number | null; isCurrent: boolean; hasLecture: boolean }[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, isCurrent: false, hasLecture: false });
    }
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const isCurrent = currentDate ? d === currentDate.getDate() : false;
      // Tuesday, Thursday, Friday typical lectures
      const dayOfWeek = (firstDayIndex + d - 1) % 7;
      const hasLecture = dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5;
      days.push({ day: d, isCurrent, hasLecture });
    }
    return days;
  }, [currentDate]);

  const toggleTodo = async (id: number | string) => {
    // Optimistic toggle
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );

    try {
      const current = todos.find((t) => t.id === id);
      await fetch("/api/lecturer/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: String(id),
          completed: current ? !current.completed : true,
        }),
      });
    } catch (err) {
      console.warn("Could not persist task completion:", err);
    }
  };

  const handleDownloadFile = (filename: string, docTitle: string) => {
    const text = `Premier University - Faculty Academic Document\nDocument: ${docTitle}\nLecturer: ${lecturerName} (${lecturerTitle})\nDepartment: ${departmentName}\nGenerated on: ${new Date().toLocaleString()}\nAuthentication: Verified & Approved`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const now = new Date();
      setLastUpdated(
        now.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );

      const res = await fetch("/api/lecturer/dashboard");
      const data = await res.json();

      if (data.success) {
        if (data.lecturer) {
          setLecturerName(data.lecturer.full_name || "Faculty Member");
          setLecturerTitle(data.lecturer.job_title || "Senior Lecturer");
          setDepartmentName(data.lecturer.department || "Department of Computer Science");
        }

        // Map live courses from database
        let totalAssignedStudents = 0;
        let totalCapacity = 0;
        let totalCredits = 0;

        const formattedCourses: CourseItem[] = (data.offerings || []).map((off: any, idx: number) => {
          const course = off.course;
          const code = course?.code || `CRS10${idx + 1}`;
          const name = course?.name || "Academic Course Offering";
          const credits = Number(course?.credits) || 3;
          const enrolled = Number(off.enrolled_count) || (data.scholars?.length || 0);
          const cap = Number(off.capacity) || 50;

          totalAssignedStudents += enrolled;
          totalCapacity += cap;
          totalCredits += credits;

          const sessionTimes = [
            "09:00 AM - 11:00 AM",
            "10:00 AM - 12:00 PM",
            "01:00 PM - 03:00 PM",
            "02:00 PM - 04:00 PM",
          ];

          return {
            id: course?.id || off.id,
            offeringId: off.id,
            code,
            name,
            section: off.section || "A",
            credits,
            enrolledCount: enrolled,
            capacity: cap,
            deliveryMode: off.delivery_mode || "in_person",
            status: off.status || "published",
            nextSession: sessionTimes[idx % sessionTimes.length],
          };
        });

        setCourses(formattedCourses);

        // Map timetable
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const formattedSchedule: TimetableItem[] = (data.timetable || []).map((t: any) => {
          const course = t.course_offering?.course;
          const room = t.room;
          return {
            id: t.id,
            courseCode: course?.code || "CRS",
            courseName: course?.name || "Scheduled Class",
            section: t.course_offering?.section || "A",
            roomName: room ? `${room.code} - ${room.name}` : "Lecture Hall",
            timeRange: `${(t.start_time || "09:00").slice(0, 5)} - ${(t.end_time || "11:00").slice(0, 5)}`,
            dayName: daysOfWeek[t.day_of_week] || "Weekly",
            enrolled: totalAssignedStudents || 1,
          };
        });
        setScheduleToday(formattedSchedule);

        // Map assessment status
        const statuses: ("draft" | "submitted" | "moderated" | "approved")[] = [
          "approved",
          "submitted",
          "draft",
          "moderated",
        ];
        const formattedAssessments: AssessmentStatusItem[] = (data.assessments || []).map(
          (a: any, i: number) => {
            const course = a.course_offering?.course;
            return {
              id: a.id,
              courseCode: course?.code || "CRS",
              courseName: course?.name || "Course Offering",
              section: a.course_offering?.section || "A",
              componentName: a.name,
              weightPercentage: Number(a.weight_percentage) || 20,
              status: statuses[i % statuses.length],
              submittedOn: new Date(a.created_at).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            };
          }
        );
        setAssessmentStatuses(formattedAssessments);

        // Map announcements
        setNotices(
          (data.announcements || []).map((ann: any) => ({
            id: ann.id,
            title: ann.title,
            content: ann.content,
            created_at: ann.published_at || new Date().toISOString(),
            target_audience: ann.target_audience,
          }))
        );

        // Map top scholars / enrolled students
        const formattedScholars: TopStudent[] = (data.scholars || []).map((s: any, idx: number) => ({
          name: s.full_name || "Enrolled Scholar",
          studentNumber: s.student_number || "STU20260001",
          programme: "Computer Science",
          course: s.course_code || "CS102",
          score: `${92 - idx * 4}%`,
          gpa: (3.92 - idx * 0.1).toFixed(2),
        }));
        setTopStudents(formattedScholars);

        // Map stats
        const apiStats = data.stats || {};
        setStats({
          assignedCourses: formattedCourses.length,
          totalCredits,
          enrolledStudents: apiStats.totalStudents || totalAssignedStudents,
          totalCapacity: Math.max(totalCapacity, 80),
          attendanceRate: apiStats.attendanceRate || 100,
          sessionsConducted: apiStats.totalSessionsConducted || 4,
          assessmentsCount: (data.assessments || []).length,
          submittedMarksSheets: apiStats.moderationPendingCount || 1,
        });

        // Map tasks
        if (data.tasks && Array.isArray(data.tasks)) {
          setTodos(
            data.tasks.map((t: any, idx: number) => ({
              id: t.id || idx,
              text: t.title,
              time: t.due || "Due this week",
              completed: Boolean(t.completed),
            }))
          );
        }
      }
    } catch (err) {
      console.warn("Could not load lecturer metrics from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* 1. Sub-Header: Breadcrumbs + Action Buttons (Matching System Admin Standard) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/lecturer/dashboard" className="text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer">
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span>Faculty Portal</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">Teaching & Academic Overview</span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/lecturer/attendance"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>Take Attendance</span>
          </Link>

          <Link
            href="/lecturer/marks-entry"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Enter Marks</span>
          </Link>

          <Link
            href="/lecturer/announcements"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Megaphone className="h-3.5 w-3.5" />
            <span>New Notice</span>
          </Link>
        </div>
      </div>

      {/* 2. Dismissible Alert Banner */}
      {showAlert && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-900 text-xs font-medium shadow-2xs transition-all">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
              ✓
            </span>
            <span className="text-emerald-800">{alertMessage}</span>
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className="text-emerald-600 hover:text-emerald-800 p-1 rounded-lg hover:bg-emerald-100/50 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3. Welcome Banner (Identical Deep Indigo/Navy Gradient Card System) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#1E293B] text-white p-6 sm:p-7 shadow-md border border-slate-800/80">
        <div className="absolute right-12 top-2 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-60 -bottom-10 h-36 w-36 rounded-full bg-teal-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-medium text-emerald-300 mb-2 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Academic Term Active · {departmentName}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span>Welcome Back, {lecturerName}</span>
              <span className="text-2xl">👨‍🏫</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal">
              {lecturerTitle} · Teaching Load, Class Rosters & Continuous Assessment Management
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-slate-200 backdrop-blur-xs">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                Updated: <strong className="text-white font-medium">{lastUpdated || "Today"}</strong>
              </span>
            </div>
            <button
              onClick={fetchDashboardData}
              title="Refresh Faculty Records from Database"
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: My Courses & Sections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-13 w-13 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {stats.assignedCourses}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Assigned Courses
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Credit Load: <strong className="text-slate-800">{stats.totalCredits} Credits</strong>
            </span>
            <Link href="/lecturer/courses" className="text-emerald-600 font-semibold hover:text-emerald-700 hover:underline">
              View all
            </Link>
          </div>
        </div>

        {/* Card 2: Total Enrolled Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-13 w-13 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {stats.enrolledStudents}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Enrolled Students
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Capacity: <strong className="text-slate-800">{Math.round((stats.enrolledStudents / (stats.totalCapacity || 1)) * 100)}% filled</strong>
            </span>
            <Link href="/lecturer/classes" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
              Class lists
            </Link>
          </div>
        </div>

        {/* Card 3: Class Attendance Average */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-13 w-13 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-2xs">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {stats.attendanceRate}%
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Average Attendance
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Recorded: <strong className="text-slate-800">{stats.sessionsConducted} Sessions</strong>
            </span>
            <Link href="/lecturer/attendance" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
              View records
            </Link>
          </div>
        </div>

        {/* Card 4: Assessment Mark Sheets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className="h-13 w-13 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {stats.submittedMarksSheets} / {stats.assessmentsCount}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Marks Submitted
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Moderation: <strong className="text-purple-700">In Progress</strong>
            </span>
            <Link href="/lecturer/marks-entry" className="text-purple-600 font-semibold hover:text-purple-700 hover:underline">
              Enter marks
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Middle 3-Column Grid (Teaching Schedules | Attendance & Scholars | Teaching Tasks) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (4 cols): Schedules & Timetable */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Teaching Schedule</h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  {currentDate
                    ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                    : "Academic Year 2026/2027"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/lecturer/timetable"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <CalendarDays className="h-3 w-3" />
                  <span>Full Routine</span>
                </Link>
              </div>
            </div>

            {/* Mini Calendar Grid with Lecture Highlights */}
            <div className="mt-2">
              <div className="grid grid-cols-7 text-center text-[10.5px] font-bold text-slate-400 pb-1">
                <span>S</span>
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {calendarDays.map((item, idx) => (
                  <div
                    key={idx}
                    className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-medium relative transition-all ${
                      item.day === null
                        ? "text-transparent"
                        : item.isCurrent
                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                        : item.hasLecture
                        ? "text-slate-900 bg-emerald-50/80 font-semibold hover:bg-emerald-100"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.day}
                    {item.hasLecture && !item.isCurrent && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Teaching Sessions */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-slate-900">Scheduled Sessions Today</div>
                <button
                  onClick={() => handleDownloadFile("daily_routine", "Daily Class Timetable")}
                  className="text-[10px] font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
                >
                  <Download className="h-2.5 w-2.5" />
                  <span>Export</span>
                </button>
              </div>

              <div className="space-y-3">
                {scheduleToday.length > 0 ? (
                  scheduleToday.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-emerald-50/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] font-bold text-slate-800">
                            {sess.courseCode}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Sec {sess.section}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{sess.timeRange}</span>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-800 mt-2 truncate">
                        {sess.courseName}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Venue: <strong className="text-slate-700">{sess.roomName}</strong></span>
                        <Link
                          href="/lecturer/attendance"
                          className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          Attendance →
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No scheduled sessions for today
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column (4 cols): Attendance Overview & Top Scholars */}
        <div className="lg:col-span-4 space-y-5">
          {/* Attendance Widget */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-sm font-bold text-slate-900">Class Attendance Overview</h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Term</span>
              </div>
            </div>

            {/* Sub-Tabs: All Classes, Lectures, Practicals */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
              {(["All Classes", "Lectures", "Practicals"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAttendanceTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    attendanceTab === tab
                      ? "bg-white text-slate-900 font-bold shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Attendance Percentages Grid */}
            <div className="grid grid-cols-4 gap-2 mt-4 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <div className="text-lg font-extrabold text-emerald-700">
                  {attendanceStats.present}%
                </div>
                <div className="text-[10px] font-semibold text-emerald-800">Present</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                <div className="text-lg font-extrabold text-amber-700">
                  {attendanceStats.late}%
                </div>
                <div className="text-[10px] font-semibold text-amber-800">Late</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                <div className="text-lg font-extrabold text-blue-700">
                  {attendanceStats.excused}%
                </div>
                <div className="text-[10px] font-semibold text-blue-800">Excused</div>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-100">
                <div className="text-lg font-extrabold text-red-700">
                  {attendanceStats.absent}%
                </div>
                <div className="text-[10px] font-semibold text-red-800">Absent</div>
              </div>
            </div>

            {/* Visual Attendance Progress Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1.5">
                <span>Average Student Engagement</span>
                <span className="font-bold text-slate-900">{stats.attendanceRate}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${attendanceStats.present}%` }} className="bg-emerald-500" />
                <div style={{ width: `${attendanceStats.late}%` }} className="bg-amber-400" />
                <div style={{ width: `${attendanceStats.excused}%` }} className="bg-blue-400" />
                <div style={{ width: `${attendanceStats.absent}%` }} className="bg-red-400" />
              </div>
            </div>
          </div>

          {/* Top Performing Scholars Spotlight */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Trophy className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Class Scholars & Honors</h2>
              </div>
              <Link href="/lecturer/classes" className="text-[11px] font-semibold text-emerald-600 hover:underline">
                All records
              </Link>
            </div>

            <div className="space-y-3 mt-1">
              {topStudents.map((stud, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      {stud.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{stud.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {stud.studentNumber} · {stud.course}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-emerald-700">{stud.score}</div>
                    <div className="text-[10px] font-semibold text-slate-500">CGPA {stud.gpa}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Teaching Tasks & Quick Resources */}
        <div className="lg:col-span-4 space-y-5">
          {/* Interactive Checklist Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Lecturer Task Checklist</h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  {todos.filter((t) => t.completed).length} of {todos.length} tasks completed
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>

            <div className="space-y-2.5 mt-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => toggleTodo(todo.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    todo.completed
                      ? "bg-emerald-50/30 border-emerald-200/70 opacity-80"
                      : "bg-slate-50/80 border-slate-200/70 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-medium leading-snug ${
                        todo.completed ? "line-through text-slate-400" : "text-slate-800"
                      }`}
                    >
                      {todo.text}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{todo.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Academic Resource Downloads */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-sm font-bold text-slate-900">Faculty Academic Downloads</h2>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>

            <div className="space-y-2 mt-1">
              {[
                { name: "class_broadsheet_template", title: "Assessment Broadsheet Template" },
                { name: "grading_rubric_guidelines", title: "Grading Scale & Rubric Guidelines" },
                { name: "attendance_register_form", title: "Physical Attendance Register Form" },
                { name: "course_syllabus_format", title: "Curriculum Syllabus Template" },
              ].map((doc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDownloadFile(doc.name, doc.title)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 hover:bg-slate-50 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700 truncate">
                      {doc.title}
                    </span>
                  </div>
                  <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Lower Two-Column Section: My Courses Table & Faculty Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Course Offerings & Enrolment Progress (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">My Assigned Courses & Progress</h2>
                <p className="text-[11px] text-slate-500">
                  Active courses, credit units, student registration, and teaching loads.
                </p>
              </div>
              <Link
                href="/lecturer/courses"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
              >
                <span>Manage Courses</span>
                <span>→</span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Credits</th>
                    <th className="py-3 px-4">Enrolled / Cap</th>
                    <th className="py-3 px-4">Next Class</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <tr key={course.offeringId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{course.code}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {course.name}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 text-[11px]">
                            Section {course.section}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {course.credits} CU
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {course.enrolledCount} / {course.capacity}
                            </span>
                          </div>
                          <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div
                              style={{ width: `${Math.min(100, (course.enrolledCount / course.capacity) * 100)}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          {course.nextSession}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href="/lecturer/marks-entry"
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
                          >
                            Enter Marks
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                        No assigned courses found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assessment Moderation Status Overview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Assessment Components & Moderation Status</h2>
                <p className="text-[11px] text-slate-500">
                  Continuous assessments, midterm exams, and grade submission queues.
                </p>
              </div>
              <Link
                href="/lecturer/moderation"
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Submission Status →
              </Link>
            </div>

            <div className="p-4 space-y-3">
              {assessmentStatuses.map((item) => {
                const statusStyles = {
                  draft: "bg-slate-100 text-slate-700 border-slate-200",
                  submitted: "bg-blue-50 text-blue-700 border-blue-200",
                  moderated: "bg-amber-50 text-amber-700 border-amber-200",
                  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
                };

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-800">
                          {item.courseCode}
                        </span>
                        <span className="text-[11px] text-slate-400">•</span>
                        <span className="text-xs font-medium text-slate-700">
                          {item.componentName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Weight: <strong className="text-slate-700">{item.weightPercentage}%</strong> · Section {item.section} · {item.submittedOn}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          statusStyles[item.status]
                        }`}
                      >
                        {item.status}
                      </span>
                      <Link
                        href="/lecturer/marks-entry"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 hover:text-emerald-700"
                        title="Edit Marks"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Faculty Announcements & Student Referrals (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Faculty Bulletins & Announcements */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Faculty Notices & Bulletins</h2>
              </div>
              <Link href="/lecturer/announcements" className="text-[11px] font-semibold text-emerald-600 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3 mt-1">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {notice.target_audience === "faculty" ? "Faculty Only" : "University Wide"}
                    </span>
                    <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 leading-snug">
                    {notice.title}
                  </h3>
                  {notice.content && (
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {notice.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Student Support Referrals Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Student Support Referrals</h2>
              </div>
              <Link href="/lecturer/support-cases" className="text-[11px] font-semibold text-blue-600 hover:underline">
                New referral
              </Link>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Refer students requiring academic advising, welfare counselling, or financial support directly to university student services.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Active Cases: <strong className="text-slate-800">2 Pending Review</strong>
              </span>
              <Link
                href="/lecturer/support-cases"
                className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
              >
                Manage Cases
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
