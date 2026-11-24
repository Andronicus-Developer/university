"use client";

import React, { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import { MigrationNoticeBanner } from "@/components/staff/StaffPortalPrimitives";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
} from "@/components/student/StudentPortalPrimitives";

interface NotificationsPayload {
  school: { name: string };
  notifications: Array<{
    id: string;
    title: string;
    body: string | null;
    category: string | null;
    is_read: boolean;
    created_at: string;
  }>;
  missingTables?: string[];
}

export default function StudentNotificationsPage() {
  const { data, loading, error, reload, mutate } =
    useStudentPortalSection<NotificationsPayload>("notifications");
  const [marking, setMarking] = useState(false);

  if (loading) return <StudentPageLoading label="Loading notifications..." />;
  if (error || !data) {
    return <StudentPageError error={error || "Failed to load notifications"} onRetry={reload} />;
  }

  const notifications = data.notifications || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleMarkAllRead() {
    setMarking(true);
    await mutate("mark_notifications_read", {});
    setMarking(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Student Notifications
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Alerts, grade publications, and fee updates at {data.school.name}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={marking}
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Check className="h-3.5 w-3.5 text-blue-600" />
            <span>{marking ? "Updating..." : "Mark All as Read"}</span>
          </button>
        )}
      </div>

      <MigrationNoticeBanner tables={data.missingTables || []} />

      {notifications.length === 0 ? (
        <StudentEmptyState
          icon={Bell}
          title="You Are All Caught Up"
          description="Notifications about assignments, grades, and billing updates will appear here."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.map((n) => (
            <div key={n.id} className="p-4 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                </div>
                {n.body && <p className="text-slate-600 dark:text-slate-300">{n.body}</p>}
              </div>
              <span className="text-[11px] text-slate-500 shrink-0">
                {(n.created_at || "").slice(0, 10)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
