"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Calendar,
  Trash2,
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "academic" | "system" | "deadline";
  isRead: boolean;
}

export default function LecturerNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "Mid-Semester Marks Submission Window Open",
      message: "Continuous assessment and midterm marks entry portal is now active. Please ensure verified mark sheets are submitted before the deadline.",
      time: "2 hours ago",
      type: "deadline",
      isRead: false,
    },
    {
      id: "2",
      title: "Course Enrolment Roster Updated",
      message: "3 new students have completed registration and been added to your CS101 Section A class list.",
      time: "Yesterday at 04:15 PM",
      type: "academic",
      isRead: false,
    },
    {
      id: "3",
      title: "Department Board Meeting Agenda Released",
      message: "The agenda for the upcoming Faculty Board of Examiners moderation meeting has been published to your email.",
      time: "24 Oct 2026",
      type: "system",
      isRead: true,
    },
    {
      id: "4",
      title: "Class Attendance Threshold Alert",
      message: "Attendance for CS204 Section B recorded a 94% presence rate for the recent lecture session.",
      time: "22 Oct 2026",
      type: "academic",
      isRead: true,
    },
  ]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Notifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Faculty Notifications & System Alerts
          </h1>
          <p className="text-xs text-slate-500">
            Real-time updates regarding student enrolments, assessment deadlines, moderation approvals, and calendar notices.
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
        >
          Mark All as Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
              n.isRead
                ? "bg-white border-slate-200/80"
                : "bg-emerald-50/30 border-emerald-200/80 shadow-2xs"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === "deadline"
                    ? "bg-amber-50 text-amber-600"
                    : n.type === "academic"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900">{n.title}</h3>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                <span className="text-[10px] text-slate-400 mt-2 block">{n.time}</span>
              </div>
            </div>

            <button
              onClick={() => clearNotification(n.id)}
              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              title="Dismiss"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

