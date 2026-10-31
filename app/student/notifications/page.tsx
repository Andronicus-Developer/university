"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  CheckCircle2,
  Clock,
  BookOpen,
  CreditCard,
  Building,
  Check,
} from "lucide-react";

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: list } = await db
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      setNotifications(list || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    const supabase = createClient();
    const db = supabase as any;

    try {
      await db.from("notifications").update({ is_read: true }).eq("is_read", false);
      await loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading notifications...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Notifications</h1>
          <p className="text-xs text-slate-500">Alerts, grade publications, fee payments, and campus notices</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition self-start"
          >
            <Check className="h-3.5 w-3.5 text-blue-600" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">All Notifications ({notifications.length})</h2>
          </div>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
              {unreadCount} Unread
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 flex items-start gap-4 transition ${
                  !n.is_read ? "bg-blue-50/20" : "hover:bg-slate-50/50"
                }`}
              >
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                  <Bell className="h-4 w-4" />
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900">{n.title}</h3>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(n.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">No notifications to display.</p>
          )}
        </div>
      </div>
    </div>
  );
}

