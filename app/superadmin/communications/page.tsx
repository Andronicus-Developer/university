"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  Mail,
  Megaphone,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

interface SalesInquiry {
  id: string;
  reference_code: string | null;
  inquiry_type: "demo_request" | "sales_chat";
  full_name: string;
  email: string;
  phone: string | null;
  school_name: string;
  school_type: "university" | "high_school" | "vocational" | "other";
  estimated_students: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  topic: string | null;
  message: string | null;
  status: "unread" | "in_progress" | "contacted" | "closed";
  admin_notes: string | null;
  created_at: string;
}

interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: "normal" | "high" | "urgent";
  target_scope: "all" | "school_type" | "specific_school";
  target_school_type: "university" | "high_school" | "vocational" | null;
  target_school_id: string | null;
  target_school_name: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface SupportReplyEntry {
  id: string;
  sender_role: "school_admin" | "superadmin";
  sender_name: string;
  body: string;
  created_at: string;
}

interface SchoolSupportMessage {
  id: string;
  school_id: string;
  school_name: string;
  school_type: string | null;
  sender_name: string;
  sender_email: string;
  subject: string;
  category: string;
  priority: "normal" | "high" | "urgent";
  message: string;
  status: "open" | "in_progress" | "replied" | "resolved";
  is_read_by_superadmin: boolean;
  superadmin_reply: string | null;
  replied_at: string | null;
  replies: SupportReplyEntry[];
  created_at: string;
}

interface SchoolOption {
  id: string;
  name: string;
  school_type: string | null;
}

type HubTab = "inquiries" | "announcements" | "support";

const SCHOOL_TYPE_LABELS: Record<string, string> = {
  university: "University / Tertiary",
  high_school: "High School / Secondary",
  vocational: "Vocational / TVET",
  other: "Multi-Campus / Other",
};

const INQUIRY_STATUS_BADGES: Record<string, string> = {
  unread: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  in_progress: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  contacted: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  closed: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

const SUPPORT_STATUS_BADGES: Record<string, string> = {
  open: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  in_progress: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  replied: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  resolved: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

const PRIORITY_BADGES: Record<string, string> = {
  normal: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  high: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  urgent: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
};

function notifySidebarBadgeUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("communications_updated"));
  }
}

export default function SuperAdminCommunicationsPage() {
  const [activeTab, setActiveTab] = useState<HubTab>("inquiries");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [resendConfigured, setResendConfigured] = useState(false);

  // Live datasets
  const [inquiries, setInquiries] = useState<SalesInquiry[]>([]);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [supportMessages, setSupportMessages] = useState<SchoolSupportMessage[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  // Tab 1 filters & inspector
  const [inqSearch, setInqSearch] = useState("");
  const [inqTypeFilter, setInqTypeFilter] = useState<"all" | "demo_request" | "sales_chat">("all");
  const [inqStatusFilter, setInqStatusFilter] = useState<string>("all");
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [emailReplySubject, setEmailReplySubject] = useState("");
  const [emailReplyBody, setEmailReplyBody] = useState("");
  const [showEmailReplyBox, setShowEmailReplyBox] = useState(false);
  const [sendingEmailReply, setSendingEmailReply] = useState(false);

  // Tab 2 announcement composer
  const [annTitle, setAnnTitle] = useState("");
  const [annCategory, setAnnCategory] = useState("Platform Update");
  const [annPriority, setAnnPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [annScope, setAnnScope] = useState<"all" | "school_type" | "specific_school">("all");
  const [annSchoolType, setAnnSchoolType] = useState<"university" | "high_school" | "vocational">("university");
  const [annSchoolId, setAnnSchoolId] = useState("");
  const [annExpiresAt, setAnnExpiresAt] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [publishingAnn, setPublishingAnn] = useState(false);

  // Tab 3 support filters & thread panel
  const [supSearch, setSupSearch] = useState("");
  const [supStatusFilter, setSupStatusFilter] = useState<string>("all");
  const [selectedSupportId, setSelectedSupportId] = useState<string | null>(null);
  const [supReplyDraft, setSupReplyDraft] = useState("");
  const [sendingSupReply, setSendingSupReply] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadHubData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setErrorMsg(null);

      const res = await fetch("/api/superadmin/communications?summary=true", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load communications hub.");
      }

      const inqList: SalesInquiry[] = json.inquiries || [];
      const annList: PlatformAnnouncement[] = json.announcements || [];
      const supList: SchoolSupportMessage[] = json.supportMessages || [];
      const schList: SchoolOption[] = json.schools || [];

      setInquiries(inqList);
      setAnnouncements(annList);
      setSupportMessages(supList);
      setSchools(schList);
      setMissingTables(json.missingTables || []);
      setResendConfigured(Boolean(json.resendConfigured));

      setSelectedInquiryId((prev) =>
        prev && inqList.some((i) => i.id === prev) ? prev : inqList[0]?.id || null
      );
      setSelectedSupportId((prev) =>
        prev && supList.some((m) => m.id === prev) ? prev : supList[0]?.id || null
      );
      if (!annSchoolId && schList[0]?.id) {
        setAnnSchoolId(schList[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to fetch live communications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [annSchoolId]);

  useEffect(() => {
    loadHubData(false);
    const interval = setInterval(() => {
      loadHubData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [loadHubData]);

  const unreadInquiriesCount = useMemo(
    () => inquiries.filter((i) => i.status === "unread").length,
    [inquiries]
  );
  const demoRequestsCount = useMemo(
    () => inquiries.filter((i) => i.inquiry_type === "demo_request").length,
    [inquiries]
  );
  const activeAnnouncementsCount = useMemo(
    () => announcements.filter((a) => a.is_active).length,
    [announcements]
  );
  const unreadSupportCount = useMemo(
    () => supportMessages.filter((m) => !m.is_read_by_superadmin && m.status !== "resolved").length,
    [supportMessages]
  );

  const filteredInquiries = useMemo(() => {
    const q = inqSearch.trim().toLowerCase();
    return inquiries.filter((item) => {
      if (inqTypeFilter !== "all" && item.inquiry_type !== inqTypeFilter) return false;
      if (inqStatusFilter !== "all" && item.status !== inqStatusFilter) return false;
      if (!q) return true;
      return (
        item.full_name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.school_name.toLowerCase().includes(q) ||
        (item.reference_code || "").toLowerCase().includes(q) ||
        (item.message || "").toLowerCase().includes(q)
      );
    });
  }, [inquiries, inqSearch, inqTypeFilter, inqStatusFilter]);

  const selectedInquiry = useMemo(
    () => inquiries.find((i) => i.id === selectedInquiryId) || null,
    [inquiries, selectedInquiryId]
  );

  useEffect(() => {
    if (selectedInquiry) {
      setNotesDraft(selectedInquiry.admin_notes || "");
      setShowEmailReplyBox(false);
      setEmailReplySubject(
        selectedInquiry.inquiry_type === "demo_request"
          ? `Re: Erudian360 Demo Request — ${selectedInquiry.school_name}`
          : `Re: Erudian360 Sales Inquiry — ${selectedInquiry.school_name}`
      );
      setEmailReplyBody(
        `Hello ${selectedInquiry.full_name},\n\nThank you for reaching out regarding ${selectedInquiry.school_name}.\n\nBest regards,\nErudian360 Platform Team`
      );
    }
  }, [selectedInquiry]);

  const filteredSupport = useMemo(() => {
    const q = supSearch.trim().toLowerCase();
    return supportMessages.filter((m) => {
      if (supStatusFilter !== "all" && m.status !== supStatusFilter) return false;
      if (!q) return true;
      return (
        m.school_name.toLowerCase().includes(q) ||
        m.sender_name.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    });
  }, [supportMessages, supSearch, supStatusFilter]);

  const selectedSupport = useMemo(
    () => supportMessages.find((m) => m.id === selectedSupportId) || null,
    [supportMessages, selectedSupportId]
  );

  // Handlers — Inquiries
  const handleSelectInquiry = async (inq: SalesInquiry) => {
    setSelectedInquiryId(inq.id);
    if (inq.status === "unread") {
      await handleUpdateInquiry(inq.id, { status: "in_progress" }, true);
    }
  };

  const handleUpdateInquiry = async (
    id: string,
    updates: { status?: string; admin_notes?: string },
    silentToast = false
  ) => {
    try {
      const res = await fetch("/api/superadmin/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "inquiries", id, ...updates }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Update failed");
      if (json.item) {
        setInquiries((prev) => prev.map((i) => (i.id === id ? json.item : i)));
      }
      notifySidebarBadgeUpdate();
      if (!silentToast) showToast("Lead record updated.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update lead.");
    }
  };

  const handleSaveInquiryNotes = async () => {
    if (!selectedInquiry) return;
    setSavingNotes(true);
    await handleUpdateInquiry(selectedInquiry.id, { admin_notes: notesDraft });
    setSavingNotes(false);
  };

  const handleSendResendEmailReply = async () => {
    if (!selectedInquiry) return;
    setSendingEmailReply(true);
    try {
      const res = await fetch("/api/superadmin/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "inquiries",
          id: selectedInquiry.id,
          action: "send_email_reply",
          to: selectedInquiry.email,
          subject: emailReplySubject,
          message: emailReplyBody,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to dispatch email.");
      if (json.item) {
        setInquiries((prev) => prev.map((i) => (i.id === selectedInquiry.id ? json.item : i)));
      }
      setShowEmailReplyBox(false);
      notifySidebarBadgeUpdate();
      showToast(`Email sent to ${selectedInquiry.email}.`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Email send error.");
    } finally {
      setSendingEmailReply(false);
    }
  };

  const handleDeleteRecord = async (
    resource: "inquiries" | "announcements" | "support",
    id: string
  ) => {
    try {
      const res = await fetch(
        `/api/superadmin/communications?resource=${resource}&id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Delete failed.");
      }
      if (resource === "inquiries") {
        setInquiries((prev) => prev.filter((i) => i.id !== id));
        if (selectedInquiryId === id) setSelectedInquiryId(null);
      } else if (resource === "announcements") {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      } else {
        setSupportMessages((prev) => prev.filter((m) => m.id !== id));
        if (selectedSupportId === id) setSelectedSupportId(null);
      }
      notifySidebarBadgeUpdate();
      showToast("Record deleted.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to delete record.");
    }
  };

  // Handlers — Announcements
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    setPublishingAnn(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/superadmin/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "announcements",
          title: annTitle.trim(),
          body: annBody.trim(),
          category: annCategory,
          priority: annPriority,
          target_scope: annScope,
          target_school_type: annScope === "school_type" ? annSchoolType : null,
          target_school_id: annScope === "specific_school" ? annSchoolId : null,
          expires_at: annExpiresAt || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to publish announcement.");
      if (json.item) {
        setAnnouncements((prev) => [json.item, ...prev]);
      }
      setAnnTitle("");
      setAnnBody("");
      setAnnExpiresAt("");
      showToast("Platform announcement published to targeted schools.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Publish failed.");
    } finally {
      setPublishingAnn(false);
    }
  };

  const handleToggleAnnouncementActive = async (ann: PlatformAnnouncement) => {
    try {
      const res = await fetch("/api/superadmin/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "announcements",
          id: ann.id,
          is_active: !ann.is_active,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Toggle failed.");
      if (json.item) {
        setAnnouncements((prev) => prev.map((a) => (a.id === ann.id ? json.item : a)));
      }
      showToast(ann.is_active ? "Announcement paused." : "Announcement activated.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to update announcement.");
    }
  };

  // Handlers — Direct School Support
  const handleSelectSupport = async (msg: SchoolSupportMessage) => {
    setSelectedSupportId(msg.id);
    if (!msg.is_read_by_superadmin) {
      try {
        const res = await fetch("/api/superadmin/communications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resource: "support",
            id: msg.id,
            is_read_by_superadmin: true,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.item) {
          setSupportMessages((prev) => prev.map((m) => (m.id === msg.id ? json.item : m)));
          notifySidebarBadgeUpdate();
        }
      } catch {
        // ignore
      }
    }
  };

  const handleUpdateSupportStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/superadmin/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "support", id, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Status update failed.");
      if (json.item) {
        setSupportMessages((prev) => prev.map((m) => (m.id === id ? json.item : m)));
      }
      notifySidebarBadgeUpdate();
      showToast("Support ticket status updated.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update support ticket.");
    }
  };

  const handleSendSupportReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupport || !supReplyDraft.trim()) return;
    setSendingSupReply(true);
    try {
      const res = await fetch("/api/superadmin/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "support",
          id: selectedSupport.id,
          reply_body: supReplyDraft.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Reply failed.");
      if (json.item) {
        setSupportMessages((prev) =>
          prev.map((m) => (m.id === selectedSupport.id ? json.item : m))
        );
      }
      setSupReplyDraft("");
      notifySidebarBadgeUpdate();
      showToast("Reply sent to School Admin portal.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to send reply.");
    } finally {
      setSendingSupReply(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1550px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Platform Communications Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Live public demo &amp; sales leads, targeted school broadcasts, and direct School Admin support tickets
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadHubData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* Banners */}
      {missingTables.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <div className="font-bold">Database Migration Pending</div>
            <p className="mt-0.5">
              Apply migration{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">
                20261124000011_sales_inquiries_announcements_and_support.sql
              </code>{" "}
              in Supabase to activate missing tables:{" "}
              <span className="font-semibold">{missingTables.join(", ")}</span>.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {toastMsg && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Unread Leads
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {unreadInquiriesCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Inbox className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Demo Requests
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {demoRequestsCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Active Broadcasts
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {activeAnnouncementsCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Megaphone className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Unread School Tickets
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {unreadSupportCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("inquiries")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "inquiries"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          <span>Leads &amp; Inquiries (Demo &amp; Sales)</span>
          {unreadInquiriesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {unreadInquiriesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("announcements")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "announcements"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Megaphone className="h-3.5 w-3.5" />
          <span>School Broadcasts &amp; Announcements</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
            {announcements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("support")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "support"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Direct School Messages / Support</span>
          {unreadSupportCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {unreadSupportCount}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Loading live Supabase communications...
          </span>
        </div>
      ) : activeTab === "inquiries" ? (
        /* TAB 1: LEADS & INQUIRIES */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={inqSearch}
                onChange={(e) => setInqSearch(e.target.value)}
                placeholder="Search by contact, email, school name, or reference..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={inqTypeFilter}
              onChange={(e) => setInqTypeFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Lead Types</option>
              <option value="demo_request">Demo Requests</option>
              <option value="sales_chat">Sales Chats</option>
            </select>

            <select
              value={inqStatusFilter}
              onChange={(e) => setInqStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="unread">Unread</option>
              <option value="in_progress">In Progress</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Lead List */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {filteredInquiries.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No Leads Match Your Filter
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Submissions from Request a Demo and Chat with Sales will appear here immediately.
                  </p>
                </div>
              ) : (
                filteredInquiries.map((inq) => {
                  const selected = selectedInquiry?.id === inq.id;
                  return (
                    <button
                      key={inq.id}
                      type="button"
                      onClick={() => handleSelectInquiry(inq)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        selected
                          ? "bg-blue-50/70 dark:bg-blue-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            inq.inquiry_type === "demo_request"
                              ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                              : "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                          }`}
                        >
                          {inq.inquiry_type === "demo_request" ? "Demo Request" : "Sales Chat"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                            INQUIRY_STATUS_BADGES[inq.status] || INQUIRY_STATUS_BADGES.unread
                          }`}
                        >
                          {inq.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {inq.status === "unread" && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {inq.school_name}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                        {inq.full_name} · {inq.email}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                        <span>{inq.reference_code || inq.id.slice(0, 8)}</span>
                        <span>{new Date(inq.created_at).toLocaleString()}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Lead Inspector */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
              {!selectedInquiry ? (
                <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
                  Select a demo request or sales inquiry from the list to review details and follow up.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                          {selectedInquiry.reference_code || selectedInquiry.id}
                        </span>
                        <span className="text-[11px] text-slate-400">•</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(selectedInquiry.created_at).toLocaleString()}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {selectedInquiry.school_name}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Submitted by <span className="font-semibold">{selectedInquiry.full_name}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedInquiry.status}
                        onChange={(e) =>
                          handleUpdateInquiry(selectedInquiry.id, { status: e.target.value })
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                      >
                        <option value="unread">Unread</option>
                        <option value="in_progress">In Progress</option>
                        <option value="contacted">Contacted</option>
                        <option value="closed">Closed</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord("inquiries", selectedInquiry.id)}
                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/70 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete inquiry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contact & Institution Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 flex items-center gap-2.5">
                      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Email</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {selectedInquiry.email}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 flex items-center gap-2.5">
                      <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Phone</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {selectedInquiry.phone || "Not provided"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          School Type
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {SCHOOL_TYPE_LABELS[selectedInquiry.school_type] || selectedInquiry.school_type}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Estimated Students
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {selectedInquiry.estimated_students || "Not specified"}
                        </div>
                      </div>
                    </div>

                    {(selectedInquiry.preferred_date || selectedInquiry.preferred_time) && (
                      <div className="sm:col-span-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 p-3 flex items-center gap-2.5">
                        <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold">
                            Preferred Demo Window
                          </div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {selectedInquiry.preferred_date || "Flexible"}
                            {selectedInquiry.preferred_time ? ` · ${selectedInquiry.preferred_time}` : ""}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedInquiry.topic && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Topic / Interests
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {selectedInquiry.topic}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                      Inquiry Message / Notes
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 p-4 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedInquiry.message || "No additional notes provided."}
                    </div>
                  </div>

                  {/* Internal Follow-up Notes */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Internal Follow-Up Notes
                    </label>
                    <textarea
                      rows={3}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Log call outcomes, scheduled onboarding calls, pricing quotes..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleSaveInquiryNotes}
                        disabled={savingNotes}
                        className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {savingNotes ? "Saving Notes..." : "Save Internal Notes"}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`mailto:${encodeURIComponent(selectedInquiry.email)}?subject=${encodeURIComponent(emailReplySubject)}&body=${encodeURIComponent(emailReplyBody)}`}
                          onClick={() =>
                            handleUpdateInquiry(selectedInquiry.id, { status: "contacted" }, true)
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Reply via Email</span>
                        </a>

                        {resendConfigured && (
                          <button
                            type="button"
                            onClick={() => setShowEmailReplyBox((v) => !v)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Send via Email API</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {showEmailReplyBox && resendConfigured && (
                    <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 p-4 space-y-3">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Send Email Reply via Configured Email Gateway
                      </div>
                      <input
                        type="text"
                        value={emailReplySubject}
                        onChange={(e) => setEmailReplySubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                      />
                      <textarea
                        rows={4}
                        value={emailReplyBody}
                        onChange={(e) => setEmailReplyBody(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowEmailReplyBox(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={sendingEmailReply}
                          onClick={handleSendResendEmailReply}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{sendingEmailReply ? "Sending..." : "Dispatch Reply"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "announcements" ? (
        /* TAB 2: SCHOOL BROADCASTS & ANNOUNCEMENTS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Compose Broadcast */}
          <form
            onSubmit={handlePublishAnnouncement}
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Compose School Broadcast
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Active announcements appear as live notices on targeted School Admin dashboards.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Announcement Title *
              </label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="e.g. Term Close Financial Reconciliation Reminder"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="Platform Update">Platform Update</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Billing">Billing</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Audience
              </label>
              <select
                value={annScope}
                onChange={(e) => setAnnScope(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Schools</option>
                <option value="school_type">Specific School Type</option>
                <option value="specific_school">Specific School</option>
              </select>
            </div>

            {annScope === "school_type" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target School Type
                </label>
                <select
                  value={annSchoolType}
                  onChange={(e) => setAnnSchoolType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="university">Universities</option>
                  <option value="high_school">High Schools</option>
                  <option value="vocational">Vocational Schools</option>
                </select>
              </div>
            )}

            {annScope === "specific_school" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select School
                </label>
                <select
                  value={annSchoolId}
                  onChange={(e) => setAnnSchoolId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.school_type || "university"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Optional Expiry Date
              </label>
              <input
                type="date"
                value={annExpiresAt}
                onChange={(e) => setAnnExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message Body *
              </label>
              <textarea
                rows={4}
                required
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                placeholder="Write the official notice to display on targeted School Admin dashboards..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={publishingAnn}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {publishingAnn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Megaphone className="h-4 w-4" />
                  <span>Publish Announcement</span>
                </>
              )}
            </button>
          </form>

          {/* Published Announcements */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {announcements.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Megaphone className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Broadcasts Published Yet
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Publish an announcement on the left to deliver it live to School Admin portals.
                </p>
              </div>
            ) : (
              announcements.map((ann) => {
                const targetLabel =
                  ann.target_scope === "all"
                    ? "All Schools"
                    : ann.target_scope === "school_type"
                    ? `Type: ${SCHOOL_TYPE_LABELS[ann.target_school_type || "university"]}`
                    : `School: ${ann.target_school_name || "Specific School"}`;
                return (
                  <div key={ann.id} className="p-5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            PRIORITY_BADGES[ann.priority] || PRIORITY_BADGES.normal
                          }`}
                        >
                          {ann.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                          {targetLabel}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                          {ann.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAnnouncementActive(ann)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            ann.is_active
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {ann.is_active ? "Active" : "Paused"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRecord("announcements", ann.id)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Delete announcement"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ann.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {ann.body}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                      <span>Published {new Date(ann.created_at).toLocaleString()}</span>
                      {ann.expires_at && (
                        <span>· Expires {new Date(ann.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* TAB 3: DIRECT SCHOOL MESSAGES / SUPPORT */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={supSearch}
                onChange={(e) => setSupSearch(e.target.value)}
                placeholder="Search by school, sender, or subject..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={supStatusFilter}
              onChange={(e) => setSupStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="replied">Replied</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {filteredSupport.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No School Support Messages
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Messages sent by School Admins from their dashboard support widget will appear here.
                  </p>
                </div>
              ) : (
                filteredSupport.map((msg) => {
                  const selected = selectedSupport?.id === msg.id;
                  return (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => handleSelectSupport(msg)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        selected
                          ? "bg-blue-50/70 dark:bg-blue-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                          {msg.school_name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                            SUPPORT_STATUS_BADGES[msg.status] || SUPPORT_STATUS_BADGES.open
                          }`}
                        >
                          {msg.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!msg.is_read_by_superadmin && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {msg.subject}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {msg.sender_name} · {msg.sender_email}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
              {!selectedSupport ? (
                <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
                  Select a School Admin ticket to read the conversation and reply live.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {selectedSupport.school_name}
                        </span>
                        {selectedSupport.school_type && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase">
                            {selectedSupport.school_type}
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {selectedSupport.subject}
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        From {selectedSupport.sender_name} ({selectedSupport.sender_email})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedSupport.status}
                        onChange={(e) =>
                          handleUpdateSupportStatus(selectedSupport.id, e.target.value)
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="replied">Replied</option>
                        <option value="resolved">Resolved</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord("support", selectedSupport.id)}
                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/70 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete ticket"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Conversation Thread */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 p-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedSupport.sender_name} (School Admin)
                        </span>
                        <span className="text-slate-400">
                          {new Date(selectedSupport.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {selectedSupport.message}
                      </p>
                    </div>

                    {(selectedSupport.replies || []).map((rep) => {
                      const isSuper = rep.sender_role === "superadmin";
                      return (
                        <div
                          key={rep.id}
                          className={`rounded-2xl p-4 space-y-1.5 border ${
                            isSuper
                              ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/70 ml-6"
                              : "bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {rep.sender_name}
                            </span>
                            <span className="text-slate-400">
                              {new Date(rep.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {rep.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendSupportReply} className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Reply to {selectedSupport.school_name}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={supReplyDraft}
                      onChange={(e) => setSupReplyDraft(e.target.value)}
                      placeholder="Write your response — it appears live inside the School Admin portal..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={sendingSupReply}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {sendingSupReply ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Sending Reply...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Send Reply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
