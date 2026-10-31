"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Download,
  MapPin,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";

interface SlotItem {
  id: string;
  courseCode: string;
  courseName: string;
  section: string;
  roomName: string;
  timeSlot: string;
  type: string;
}

export default function LecturerTimetablePage() {
  const [selectedDay, setSelectedDay] = useState<string>("Monday");

  const timetableSchedule: Record<string, SlotItem[]> = {
    Monday: [
      {
        id: "m-1",
        courseCode: "CS101",
        courseName: "Programming Foundations",
        section: "A",
        roomName: "Lecture Theatre 2 (Science Complex)",
        timeSlot: "08:30 AM - 10:00 AM",
        type: "Lecture",
      },
      {
        id: "m-2",
        courseCode: "CS204",
        courseName: "Database Systems",
        section: "B",
        roomName: "Computer Lab 4 (IT Center)",
        timeSlot: "11:30 AM - 01:00 PM",
        type: "Practical",
      },
    ],
    Tuesday: [
      {
        id: "t-1",
        courseCode: "CS308",
        courseName: "Software Engineering",
        section: "A",
        roomName: "LH-104 (Engineering Wing)",
        timeSlot: "09:00 AM - 10:30 AM",
        type: "Lecture",
      },
      {
        id: "t-2",
        courseCode: "CS101",
        courseName: "Programming Foundations",
        section: "A",
        roomName: "Computer Lab 2",
        timeSlot: "02:00 PM - 04:00 PM",
        type: "Laboratory Session",
      },
    ],
    Wednesday: [
      {
        id: "w-1",
        courseCode: "CS204",
        courseName: "Database Systems",
        section: "B",
        roomName: "Lecture Theatre 1",
        timeSlot: "10:30 AM - 12:00 PM",
        type: "Lecture",
      },
      {
        id: "w-2",
        courseCode: "FAC-ADVISING",
        courseName: "Academic Advising & Office Hours",
        section: "Open",
        roomName: "Faculty Office 204",
        timeSlot: "02:00 PM - 04:00 PM",
        type: "Student Consultation",
      },
    ],
    Thursday: [
      {
        id: "th-1",
        courseCode: "CS308",
        courseName: "Software Engineering",
        section: "A",
        roomName: "LH-104 (Engineering Wing)",
        timeSlot: "08:30 AM - 10:00 AM",
        type: "Tutorial / Project",
      },
      {
        id: "th-2",
        courseCode: "CS101",
        courseName: "Programming Foundations",
        section: "A",
        roomName: "Lecture Theatre 2",
        timeSlot: "11:00 AM - 12:30 PM",
        type: "Lecture",
      },
    ],
    Friday: [
      {
        id: "f-1",
        courseCode: "CS204",
        courseName: "Database Systems",
        section: "B",
        roomName: "Computer Lab 4",
        timeSlot: "09:00 AM - 11:00 AM",
        type: "SQL Lab Practical",
      },
      {
        id: "f-2",
        courseCode: "DEPT-BOARD",
        courseName: "Department Board of Examiners",
        section: "Staff",
        roomName: "Conference Hall B",
        timeSlot: "02:00 PM - 03:30 PM",
        type: "Faculty Meeting",
      },
    ],
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const handleExport = () => {
    let content = "Premier University - Faculty Teaching Timetable\n";
    content += "Academic Term: 2026 / 2027\n\n";
    days.forEach((d) => {
      content += `=== ${d.toUpperCase()} ===\n`;
      (timetableSchedule[d] || []).forEach((slot) => {
        content += `${slot.timeSlot} | ${slot.courseCode} (${slot.section}) - ${slot.courseName} | ${slot.roomName} | ${slot.type}\n`;
      });
      content += "\n";
    });
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teaching_timetable_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
            <span className="text-slate-800 font-semibold">Timetable</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Faculty Teaching Timetable
          </h1>
          <p className="text-xs text-slate-500">
            Weekly scheduled lectures, laboratory sessions, room venues, and student consultation office hours.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Timetable</span>
          </button>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-x-auto">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedDay === d
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Day Schedule Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span>{selectedDay} Schedule</span>
          <span className="text-xs font-normal text-slate-400">
            ({(timetableSchedule[selectedDay] || []).length} Sessions)
          </span>
        </h2>

        {(timetableSchedule[selectedDay] || []).map((slot) => (
          <div
            key={slot.id}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex flex-col items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {slot.courseCode}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {slot.type}
                  </span>
                  <span className="text-xs text-slate-400">· Section {slot.section}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{slot.courseName}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{slot.roomName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">{slot.timeSlot}</div>
                <div className="text-[11px] text-emerald-600 font-semibold">Weekly Lecture</div>
              </div>
              <Link
                href="/lecturer/attendance"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                Attendance
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

