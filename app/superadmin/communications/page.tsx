"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  Search,
  Plus,
  Trash2,
  Eye,
  X,
  Maximize2,
  Sparkles,
  CheckCircle2,
  Building2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Phone,
  Check,
  FileText,
  Edit2,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import type { CommunicationRecord } from "@/app/api/superadmin/communications/route";

// Alias pre-instantiated icons so Turbopack HMR never requests uncached icon module factories
const Pencil = Edit2;
const Inbox = Mail;
const MailOpen = Mail;
const MessageSquareReply = MessageSquare;
const CornerUpLeft = ArrowRight;
const Forward = Send;
const ArrowDownLeft = ArrowRight;
const ArrowUpRight = Send;
const Paperclip = FileText;
const Copy = FileText;
const Minimize2 = ({ className }: { className?: string }) => (
  <span className={`inline-block font-bold leading-none ${className || ""}`}>_</span>
);
const Bold = ({ className }: { className?: string }) => (
  <span className={`inline-block font-extrabold text-xs leading-none ${className || ""}`}>B</span>
);
const Italic = ({ className }: { className?: string }) => (
  <span className={`inline-block italic font-serif font-bold text-xs leading-none ${className || ""}`}>I</span>
);
const List = ({ className }: { className?: string }) => (
  <span className={`inline-block font-bold text-xs leading-none ${className || ""}`}>•≡</span>
);

const EMAIL_TEMPLATES = [
  {
    name: "Governance & Quota Compliance",
    subject: "2026/2027 Academic Year Governance & Quota Compliance Directive",
    category: "Compliance",
    priority: "high" as const,
    body: `Dear Institutional Administrator,

Please be advised that the 2026/2027 multi-tenant governance quotas and sidebar module configurations have been updated on the central platform.

Key Action Items:
1. Verify your school's assigned role tiers and department limits.
2. Confirm that all active system administrators have Multi-Factor Authentication (MFA) enabled.
3. Review your portal sidebar navigation items.

Warm regards,
Master Super Administrator
UMS Global Platform Governance`,
  },
  {
    name: "Scheduled Maintenance Notice",
    subject: "Scheduled Cloud Platform Maintenance & Zero-Downtime Upgrade",
    category: "Maintenance",
    priority: "normal" as const,
    body: `Hello System Administrators,

Our platform engineering team will perform a scheduled maintenance upgrade on the multi-tenant database cluster this Saturday at 02:00 UTC.

All school portals (Universities, High Schools, and Vocational Schools) will remain operational with zero downtime.

Best regards,
Platform Operations Team`,
  },
  {
    name: "Security & Access Audit Alert",
    subject: "Mandatory Security Audit & Access Control Verification",
    category: "Security",
    priority: "urgent" as const,
    body: `URGENT SECURITY DIRECTIVE

Dear System Administrator,

As part of our quarterly security review, please audit all elevated user accounts at your institution and revoke any inactive administrative credentials within 48 hours.

Regards,
Super Admin Security Operations`,
  },
];

export default function SuperAdminCommunicationsPage() {
  const [activeTab, setActiveTab] = useState<"communications" | "gateway">("communications");
  const [mailboxFolder, setMailboxFolder] = useState<"all" | "inbox" | "sent">("all");
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Registered schools for quick recipient selection
  const [schools, setSchools] = useState<Array<{ id: string; name: string; email?: string; code: string }>>([]);

  // Preview Modal state (View full communication & thread)
  const [selectedComm, setSelectedComm] = useState<CommunicationRecord | null>(null);

  // Simulate / Test Receiver Reply Modal
  const [showSimulateReplyModal, setShowSimulateReplyModal] = useState(false);
  const [simReplyFromEmail, setSimReplyFromEmail] = useState("admin@university.edu.gh");
  const [simReplyFromName, setSimReplyFromName] = useState("Andronicus Johnson (System Admin)");
  const [simReplySchool, setSimReplySchool] = useState("");
  const [simReplySubject, setSimReplySubject] = useState(
    "Re: 2026/2027 Academic Year Governance & Quota Compliance Directive"
  );
  const [simReplyBody, setSimReplyBody] = useState(
    "Dear Master Super Administrator,\n\nWe have received your email and completed all requested actions on our school portal. Please let us know if any further documentation is needed.\n\nBest regards,\nSchool Administration"
  );
  const [simReplyParentId, setSimReplyParentId] = useState<string | null>(null);
  const [isSubmittingSimReply, setIsSubmittingSimReply] = useState(false);

  // Gmail Compose Window state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isComposeMinimized, setIsComposeMinimized] = useState(false);
  const [isComposeMaximized, setIsComposeMaximized] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);

  // Compose Form fields
  const [composeParentId, setComposeParentId] = useState<string | null>(null);
  const [recipientTo, setRecipientTo] = useState("");
  const [recipientCc, setRecipientCc] = useState("");
  const [recipientBcc, setRecipientBcc] = useState("");
  const [targetSchool, setTargetSchool] = useState("All Registered Schools");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Gateway config tab states
  const [emailProvider, setEmailProvider] = useState("resend");
  const [resendApiKey, setResendApiKey] = useState("");
  const [hasResendKey, setHasResendKey] = useState(false);
  const [maskedResendKey, setMaskedResendKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("onboarding@resend.dev");
  const [senderName, setSenderName] = useState("Master Super Administrator");
  const [replyToEmail, setReplyToEmail] = useState("superadmin@university.edu.gh");
  const [smsSenderId, setSmsSenderId] = useState("UMS-GLOBAL");
  const [smsProvider, setSmsProvider] = useState("hubtel");
  const [gatewaySaved, setGatewaySaved] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchCommunications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/superadmin/communications?config=true");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCommunications(data);
        } else if (data && Array.isArray(data.items)) {
          setCommunications(data.items);
          if (data.config) {
            setHasResendKey(Boolean(data.config.hasApiKey));
            setMaskedResendKey(data.config.maskedKey || "");
            if (data.config.fromEmail) setSenderEmail(data.config.fromEmail);
            if (data.config.senderName) setSenderName(data.config.senderName);
            if (data.config.replyTo) setReplyToEmail(data.config.replyTo);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch communications:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await fetch("/api/superadmin/schools");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSchools(data);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCommunications();
    fetchSchools();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSearch = params.get("search");
      if (urlSearch) setSearchQuery(urlSearch);
      const folder = params.get("folder");
      if (folder === "inbox" || folder === "sent") setMailboxFolder(folder);
    }

    const handleGlobalSearch = (e: any) => {
      if (e.detail && typeof e.detail.query === "string") {
        setSearchQuery(e.detail.query);
      }
    };

    window.addEventListener("global_search_query", handleGlobalSearch);

    // Poll every 12 seconds for newly received inbound replies
    const pollInterval = setInterval(() => {
      fetchCommunications(true);
    }, 12000);

    return () => {
      window.removeEventListener("global_search_query", handleGlobalSearch);
      clearInterval(pollInterval);
    };
  }, []);

  // Unread inbound count
  const unreadInboundCount = useMemo(
    () => communications.filter((c) => c.direction === "inbound" && !c.is_read).length,
    [communications]
  );

  const inboundTotalCount = useMemo(
    () => communications.filter((c) => c.direction === "inbound").length,
    [communications]
  );

  const outboundTotalCount = useMemo(
    () => communications.filter((c) => c.direction !== "inbound").length,
    [communications]
  );

  // Mark communication as read when opened
  const handleSelectCommunication = async (comm: CommunicationRecord) => {
    setSelectedComm(comm);
    if (comm.direction === "inbound" && !comm.is_read) {
      setCommunications((prev) =>
        prev.map((c) => (c.id === comm.id ? { ...c, is_read: true } : c))
      );
      try {
        await fetch("/api/superadmin/communications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_read", id: comm.id }),
        });
        window.dispatchEvent(new CustomEvent("communications_updated"));
      } catch {
        // ignore
      }
    }
  };

  const handleMarkAllRead = async () => {
    setCommunications((prev) => prev.map((c) => ({ ...c, is_read: true })));
    try {
      await fetch("/api/superadmin/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setToastMessage("All inbox replies marked as read");
      setTimeout(() => setToastMessage(null), 3000);
      window.dispatchEvent(new CustomEvent("communications_updated"));
    } catch {
      // ignore
    }
  };

  // Build thread messages for the currently selected communication
  const threadMessages = useMemo(() => {
    if (!selectedComm) return [];
    const cleanSelectedSubj = selectedComm.subject
      .replace(/^(Re|Fwd):\s*/i, "")
      .trim()
      .toLowerCase();

    return communications
      .filter((c) => {
        if (c.id === selectedComm.id) return true;
        if (selectedComm.parent_id && (c.id === selectedComm.parent_id || c.parent_id === selectedComm.parent_id)) {
          return true;
        }
        if (c.parent_id === selectedComm.id) return true;
        const cleanSubj = c.subject.replace(/^(Re|Fwd):\s*/i, "").trim().toLowerCase();
        return cleanSubj === cleanSelectedSubj;
      })
      .sort(
        (a, b) =>
          new Date(a.sent_at || a.created_at).getTime() -
          new Date(b.sent_at || b.created_at).getTime()
      );
  }, [selectedComm, communications]);

  // Filtered communications
  const filteredCommunications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return communications.filter((item) => {
      const matchesFolder =
        mailboxFolder === "all" ||
        (mailboxFolder === "inbox" && item.direction === "inbound") ||
        (mailboxFolder === "sent" && item.direction !== "inbound");

      const matchesSearch =
        q === "" ||
        item.subject.toLowerCase().includes(q) ||
        item.recipient_to.toLowerCase().includes(q) ||
        item.sender_email.toLowerCase().includes(q) ||
        item.sender_name.toLowerCase().includes(q) ||
        (item.recipient_cc && item.recipient_cc.toLowerCase().includes(q)) ||
        (item.target_school && item.target_school.toLowerCase().includes(q)) ||
        item.body.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "all" || item.category.toLowerCase() === categoryFilter.toLowerCase();

      const matchesPriority =
        priorityFilter === "all" ||
        (priorityFilter === "high_urgent"
          ? item.priority === "high" || item.priority === "urgent"
          : item.priority === priorityFilter);

      return matchesFolder && matchesSearch && matchesCategory && matchesPriority;
    });
  }, [communications, mailboxFolder, searchQuery, categoryFilter, priorityFilter]);

  const handleSaveResendGateway = async () => {
    try {
      setSavingGateway(true);
      const payload: Record<string, string> = {
        from_email: senderEmail,
        sender_name: senderName,
        reply_to: replyToEmail,
      };
      if (resendApiKey.trim()) {
        payload.api_key = resendApiKey.trim();
      }

      const res = await fetch("/api/superadmin/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setHasResendKey(Boolean(data.config.hasApiKey));
          setMaskedResendKey(data.config.maskedKey || "");
        }
        setResendApiKey("");
        setGatewaySaved(true);
        setToastMessage("Resend email gateway configuration saved!");
        setTimeout(() => {
          setGatewaySaved(false);
          setToastMessage(null);
        }, 3000);
      }
    } catch (err) {
      console.error("Failed to save Resend gateway config:", err);
    } finally {
      setSavingGateway(false);
    }
  };

  // Open Gmail Compose
  const handleOpenCompose = (prefill?: Partial<CommunicationRecord>) => {
    setComposeError(null);
    setComposeParentId(prefill?.parent_id || null);
    setRecipientTo(prefill?.recipient_to || "");
    setRecipientCc(prefill?.recipient_cc || "");
    setRecipientBcc(prefill?.recipient_bcc || "");
    setShowCc(Boolean(prefill?.recipient_cc));
    setShowBcc(Boolean(prefill?.recipient_bcc));
    setTargetSchool(prefill?.target_school || "All Registered Schools");
    setSubject(prefill?.subject || "");
    setEmailBody(prefill?.body || "");
    setCategory(prefill?.category || "General");
    setPriority(prefill?.priority || "normal");
    setAttachments(prefill?.attachments || []);
    setIsComposeMinimized(false);
    setIsComposeOpen(true);
  };

  // Open Simulate Receiver Reply modal (optionally tied to a specific sent email)
  const handleOpenSimulateReply = (fromComm?: CommunicationRecord) => {
    if (fromComm) {
      const firstRecipient = fromComm.recipient_to.split(",")[0]?.trim() || "admin@university.edu.gh";
      setSimReplyFromEmail(
        fromComm.direction === "inbound" ? fromComm.sender_email : firstRecipient
      );
      setSimReplyFromName(
        fromComm.direction === "inbound"
          ? fromComm.sender_name
          : `${fromComm.target_school || "School"} Administrator`
      );
      setSimReplySchool(fromComm.target_school || "");
      setSimReplySubject(
        fromComm.subject.startsWith("Re:") ? fromComm.subject : `Re: ${fromComm.subject}`
      );
      setSimReplyParentId(fromComm.id);
    } else {
      setSimReplyParentId(null);
    }
    setShowSimulateReplyModal(true);
  };

  const handleReceiveInboundReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simReplyFromEmail.trim() || !simReplySubject.trim() || !simReplyBody.trim()) return;

    try {
      setIsSubmittingSimReply(true);
      const res = await fetch("/api/webhooks/resend-inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${simReplyFromName.trim()} <${simReplyFromEmail.trim()}>`,
          to: "superadmin@university.edu.gh",
          subject: simReplySubject.trim(),
          text: simReplyBody,
          target_school: simReplySchool,
          parent_id: simReplyParentId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to receive inbound reply");

      setCommunications((prev) => [data.item, ...prev]);
      setShowSimulateReplyModal(false);
      setMailboxFolder("inbox");
      setToastMessage(`New reply received from ${simReplyFromName} (${simReplyFromEmail})!`);
      window.dispatchEvent(new CustomEvent("communications_updated"));
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to process incoming reply");
    } finally {
      setIsSubmittingSimReply(false);
    }
  };

  // Apply Template
  const handleApplyTemplate = (tpl: (typeof EMAIL_TEMPLATES)[0]) => {
    setSubject(tpl.subject);
    setEmailBody(tpl.body);
    setCategory(tpl.category);
    setPriority(tpl.priority);
    setShowTemplatesMenu(false);
  };

  // Add quick recipient
  const handleAddQuickRecipient = (emailStr: string, schoolLabel?: string) => {
    setRecipientTo((prev) => {
      const existing = prev
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!existing.includes(emailStr)) {
        return [...existing, emailStr].join(", ");
      }
      return prev;
    });
    if (schoolLabel) {
      setTargetSchool(schoolLabel);
    }
  };

  // Format helper in textarea
  const handleInsertTextFormat = (wrapper: string, placeholder: string) => {
    const el = bodyTextareaRef.current;
    if (!el) {
      setEmailBody((prev) => `${prev}${wrapper}${placeholder}${wrapper}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = emailBody.substring(start, end) || placeholder;
    const replacement = `${wrapper}${selected}${wrapper}`;
    setEmailBody(emailBody.substring(0, start) + replacement + emailBody.substring(end));
    setTimeout(() => {
      el.focus();
    }, 20);
  };

  // Add attachment
  const handleAddAttachment = () => {
    const fileName = prompt(
      "Enter attachment document name (e.g. Official_Circular_2026.pdf):",
      "Platform_Directive_2026.pdf"
    );
    if (fileName && fileName.trim()) {
      setAttachments((prev) => [...prev, fileName.trim()]);
    }
  };

  // Send Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposeError(null);

    if (!recipientTo.trim()) {
      setComposeError("Please specify at least one recipient in the 'To' field.");
      return;
    }
    if (!subject.trim()) {
      setComposeError("Please enter a subject for your email.");
      return;
    }
    if (!emailBody.trim()) {
      setComposeError("Please write a message before sending.");
      return;
    }

    try {
      setIsSending(true);
      const res = await fetch("/api/superadmin/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: "outbound",
          parent_id: composeParentId,
          sender_email: senderEmail,
          sender_name: senderName,
          recipient_to: recipientTo.trim(),
          recipient_cc: showCc && recipientCc.trim() ? recipientCc.trim() : null,
          recipient_bcc: showBcc && recipientBcc.trim() ? recipientBcc.trim() : null,
          target_school: targetSchool,
          subject: subject.trim(),
          body: emailBody,
          category,
          priority,
          status: "delivered",
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setCommunications((prev) => [data.item, ...prev]);
      setIsComposeOpen(false);
      setToastMessage(
        data.dispatchedViaResend
          ? `Email sent via Resend to ${recipientTo.trim()} (ID: ${data.resendId})`
          : `Message sent & logged to ${recipientTo.trim()}`
      );
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setComposeError(err.message || "Error sending email");
    } finally {
      setIsSending(false);
    }
  };

  // Delete Communication
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setCommunications((prev) => prev.filter((c) => c.id !== id));
      if (selectedComm?.id === id) setSelectedComm(null);

      await fetch(`/api/superadmin/communications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setToastMessage("Communication deleted from log");
      window.dispatchEvent(new CustomEvent("communications_updated"));
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Failed to delete communication:", err);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20 font-sans relative">
      {/* Gmail-Style Bottom-Left Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Header: Breadcrumbs + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link
              href="/superadmin/dashboard"
              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Super Admin
            </Link>
            <span className="text-slate-300">/</span>
            <span>Core Administration</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">Communications & Inbox</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Platform Communications & Two-Way Email Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Send official emails via Resend and receive replies from schools and administrators directly in your dashboard
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenSimulateReply()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-all cursor-pointer"
            title="Test or simulate receiving an email reply from a school administrator"
          >
            <MessageSquareReply className="h-3.5 w-3.5" />
            <span>Receive Test Reply</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gateway")}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              hasResendKey
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
            }`}
            title="Configure Resend API Key & Inbound Webhook"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                hasResendKey ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              }`}
            />
            <span>{hasResendKey ? "Resend Active" : "Set Resend API Key"}</span>
          </button>

          <button
            onClick={() => fetchCommunications()}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh inbox & communications"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Gmail-Style Compose Button */}
          <button
            onClick={() => handleOpenCompose()}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-[#C2E7FF] hover:bg-[#b3dffc] text-[#001D35] text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer border border-sky-300/60"
          >
            <Pencil className="h-4 w-4 text-[#001D35]" />
            <span>Compose Email</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("communications")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "communications"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>Mailbox & Communications Log</span>
          {unreadInboundCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
              {unreadInboundCount} new
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("gateway")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "gateway"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Resend API & Inbound Webhook Config</span>
        </button>
      </div>

      {activeTab === "communications" ? (
        <div className="space-y-5">
          {/* KPI Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              onClick={() => setMailboxFolder("inbox")}
              className={`p-4 rounded-2xl bg-white border shadow-2xs hover:border-blue-300 transition-all cursor-pointer ${
                mailboxFolder === "inbox" ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  Inbox (Received Replies)
                </span>
                {unreadInboundCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                    {unreadInboundCount} Unread
                  </span>
                )}
              </div>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">
                {inboundTotalCount}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Replies from schools & admins
              </div>
            </div>

            <div
              onClick={() => setMailboxFolder("sent")}
              className={`p-4 rounded-2xl bg-white border shadow-2xs hover:border-blue-300 transition-all cursor-pointer ${
                mailboxFolder === "sent" ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200/80"
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-500">Sent Dispatches</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {outboundTotalCount}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                100% Delivery Rate
              </div>
            </div>

            <div
              onClick={() => {
                setPriorityFilter((prev) => (prev === "high_urgent" ? "all" : "high_urgent"));
              }}
              className={`p-4 rounded-2xl bg-white border shadow-2xs hover:border-blue-300 transition-all cursor-pointer ${
                priorityFilter === "high_urgent" ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">High / Urgent Priority</span>
                {priorityFilter === "high_urgent" && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Filtered
                  </span>
                )}
              </div>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">
                {communications.filter((c) => c.priority === "high" || c.priority === "urgent").length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Priority threads</div>
            </div>

            <Link
              href="/superadmin/schools"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-300 transition-all cursor-pointer block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Connected Schools</span>
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline">
                  Manage Schools →
                </span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                {schools.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Active recipient tenants</div>
            </Link>
          </div>

          {/* Gmail Folder Switcher + Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              {/* Folder Pills: All Mail | Inbox (Replies) | Sent */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMailboxFolder("all")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    mailboxFolder === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>All Communications</span>
                  <span className="text-[10px] text-slate-400">({communications.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMailboxFolder("inbox")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    mailboxFolder === "inbox"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Inbox className="h-3.5 w-3.5" />
                  <span>Inbox (Replies)</span>
                  <span className="text-[10px] text-slate-400">({inboundTotalCount})</span>
                  {unreadInboundCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9.5px] font-bold">
                      {unreadInboundCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setMailboxFolder("sent")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    mailboxFolder === "sent"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Sent Mail</span>
                  <span className="text-[10px] text-slate-400">({outboundTotalCount})</span>
                </button>
              </div>

              {unreadInboundCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <MailOpen className="h-3.5 w-3.5" />
                  <span>Mark all {unreadInboundCount} replies as read</span>
                </button>
              )}
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emails & replies by sender, recipient, school, subject, or message content..."
                  className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">All Categories</option>
                  <option value="General">General</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Billing">Billing</option>
                  <option value="Security">Security</option>
                  <option value="Announcement">Announcement</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">All Priorities</option>
                  <option value="high_urgent">High / Urgent Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>

                <span className="text-xs text-slate-500">
                  Showing <strong className="text-slate-800">{filteredCommunications.length}</strong>{" "}
                  of {communications.length}
                </span>
              </div>
            </div>
          </div>

          {/* Communications Table (Inbound Replies + Outbound Sent) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-14 text-center space-y-2">
                <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Loading inbox & communications history...</p>
              </div>
            ) : filteredCommunications.length === 0 ? (
              <div className="p-14 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Inbox className="h-6 w-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">
                  No communications in this view
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? `No messages matched "${searchQuery}".`
                    : "Click 'Compose Email' to send a message or 'Receive Test Reply' to test an incoming reply."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 w-28">Direction</th>
                      <th className="py-3.5 px-4 min-w-[220px]">From / To & School</th>
                      <th className="py-3.5 px-4 min-w-[340px]">Subject & Message Preview</th>
                      <th className="py-3.5 px-4 w-28">Category</th>
                      <th className="py-3.5 px-4 w-28 text-center">Status</th>
                      <th className="py-3.5 px-4 w-40">Date</th>
                      <th className="py-3.5 px-4 w-28 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCommunications.map((comm) => {
                      const isInbound = comm.direction === "inbound";
                      const isUnread = isInbound && !comm.is_read;

                      return (
                        <tr
                          key={comm.id}
                          onClick={() => handleSelectCommunication(comm)}
                          className={`transition-colors cursor-pointer group ${
                            isUnread
                              ? "bg-blue-50/60 hover:bg-blue-100/50 font-semibold"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          {/* Direction Badge */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              {isUnread && (
                                <span
                                  className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0 animate-pulse"
                                  title="Unread Reply"
                                />
                              )}
                              {isInbound ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                                  <ArrowDownLeft className="h-3 w-3 text-blue-700" />
                                  Reply In
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                                  <ArrowUpRight className="h-3 w-3 text-slate-500" />
                                  Sent Out
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Sender / Recipient & School */}
                          <td className="py-3.5 px-4 align-top">
                            {isInbound ? (
                              <div>
                                <div className="font-bold text-slate-900 truncate max-w-[230px]">
                                  From: {comm.sender_name}
                                </div>
                                <div className="text-[10.5px] text-slate-500 truncate max-w-[230px]">
                                  &lt;{comm.sender_email}&gt;
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-bold text-slate-900 truncate max-w-[230px]">
                                  To: {comm.recipient_to}
                                </div>
                                {comm.recipient_cc && (
                                  <div className="text-[10.5px] text-slate-400 truncate max-w-[230px]">
                                    Cc: {comm.recipient_cc}
                                  </div>
                                )}
                              </div>
                            )}
                            {comm.target_school && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                <Building2 className="h-2.5 w-2.5 text-blue-600" />
                                {comm.target_school}
                              </span>
                            )}
                          </td>

                          {/* Subject & Preview */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isUnread && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-extrabold uppercase">
                                  New Reply
                                </span>
                              )}
                              {comm.priority === "urgent" && (
                                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9.5px] font-bold uppercase">
                                  Urgent
                                </span>
                              )}
                              {comm.priority === "high" && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9.5px] font-bold uppercase">
                                  High Priority
                                </span>
                              )}
                              <span
                                className={`${
                                  isUnread ? "font-extrabold text-slate-950" : "font-bold text-slate-900"
                                } group-hover:text-blue-700 transition-colors`}
                              >
                                {comm.subject}
                              </span>
                              {comm.attachments && comm.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                  <Paperclip className="h-2.5 w-2.5" />
                                  {comm.attachments.length}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[11px] line-clamp-1 mt-0.5 max-w-xl ${
                                isUnread ? "text-slate-700 font-medium" : "text-slate-500 font-normal"
                              }`}
                            >
                              {comm.body.replace(/\n+/g, " ")}
                            </p>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4 align-top">
                            <span className="inline-block px-2.5 py-1 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {comm.category}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 align-top text-center">
                            {isInbound ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Inbox className="h-3 w-3 text-blue-600" />
                                Received
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                {comm.status === "delivered" ? "Delivered" : "Sent"}
                              </span>
                            )}
                          </td>

                          {/* Sent / Received At */}
                          <td className="py-3.5 px-4 align-top text-[11px] text-slate-500 whitespace-nowrap">
                            {formatDate(comm.sent_at)}
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3.5 px-4 align-top text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSelectCommunication(comm)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Read Full Thread"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenSimulateReply(comm)}
                                className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Simulate Receiver Reply to this email"
                              >
                                <MessageSquareReply className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDelete(comm.id, e)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete Communication"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: RESEND API & INBOUND WEBHOOK CONFIGURATION */
        <div className="max-w-4xl space-y-5">
          {gatewaySaved && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Resend gateway settings saved successfully!</span>
            </div>
          )}

          {/* Resend Outbound SDK Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span>Resend Transactional Email SDK Configuration</span>
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
                  hasResendKey
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasResendKey ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {hasResendKey ? `Resend Connected (${maskedResendKey})` : "API Key Not Set"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resend API Key (<code className="font-mono text-blue-600">RESEND_API_KEY</code>)
                </label>
                <input
                  type="password"
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  placeholder={
                    hasResendKey
                      ? `Saved key: ${maskedResendKey} (Paste new re_... key to update)`
                      : "re_123456789_abcdefghijklmnop..."
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verified &ldquo;From&rdquo; Email Address
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reply-To Email Address (For Receiver Replies)
                </label>
                <input
                  type="email"
                  value={replyToEmail}
                  onChange={(e) => setReplyToEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Dispatch Provider
                </label>
                <select
                  value={emailProvider}
                  onChange={(e) => setEmailProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="resend">Resend SDK (Active)</option>
                  <option value="smtp">Direct Institutional SMTP</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={savingGateway}
                onClick={handleSaveResendGateway}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                <span>{savingGateway ? "Saving..." : "Save Resend Configuration"}</span>
              </button>
            </div>
          </div>

          {/* Resend Inbound Webhook Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-indigo-600" />
                  <span>Inbound Email Reply Webhook (Receive Replies in Dashboard)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure Resend Inbound Webhooks or your mail router to POST incoming replies to this endpoint
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                LISTENING
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <code className="text-xs font-mono text-blue-700 font-semibold break-all">
                POST /api/webhooks/resend-inbound
              </code>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/api/webhooks/resend-inbound`;
                  navigator.clipboard?.writeText(url);
                  setToastMessage("Inbound webhook URL copied to clipboard!");
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 shrink-0 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Full URL</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                Want to test receiving a reply from a receiver right now?
              </span>
              <button
                type="button"
                onClick={() => handleOpenSimulateReply()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
              >
                <MessageSquareReply className="h-3.5 w-3.5" />
                <span>Simulate Incoming Receiver Reply</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FULL CONVERSATION THREAD MODAL (Gmail Thread Reader)       */}
      {/* ========================================================= */}
      {selectedComm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Top Thread Bar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
                  {selectedComm.category}
                </span>
                {selectedComm.target_school && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[11px] font-semibold">
                    <Building2 className="h-3 w-3" />
                    {selectedComm.target_school}
                  </span>
                )}
                <span className="text-[11px] text-slate-500 font-medium">
                  • {threadMessages.length}{" "}
                  {threadMessages.length === 1 ? "message" : "messages"} in thread
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const comm = selectedComm;
                    setSelectedComm(null);
                    handleOpenSimulateReply(comm);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold cursor-pointer"
                  title="Simulate a reply from the receiver of this email"
                >
                  <MessageSquareReply className="h-3.5 w-3.5" />
                  <span>Simulate Receiver Reply</span>
                </button>
                <button
                  onClick={(e) => handleDelete(selectedComm.id, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedComm(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conversation Thread Messages */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {selectedComm.subject}
              </h2>

              <div className="space-y-4">
                {threadMessages.map((msg) => {
                  const isInbound = msg.direction === "inbound";
                  return (
                    <div
                      key={msg.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isInbound
                          ? "bg-blue-50/30 border-blue-200 shadow-2xs"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {/* Sender & Recipient Meta Header */}
                      <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-9 w-9 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                              isInbound ? "bg-indigo-600" : "bg-blue-600"
                            }`}
                          >
                            {isInbound ? "IN" : "SA"}
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">{msg.sender_name}</span>
                              <span className="text-slate-400">&lt;{msg.sender_email}&gt;</span>
                              {isInbound && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                                  Receiver Reply
                                </span>
                              )}
                            </div>
                            <div className="text-slate-600">
                              <span className="text-slate-400">to </span>
                              <span className="font-medium text-slate-800">{msg.recipient_to}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-400 shrink-0">
                          <div>{formatDate(msg.sent_at)}</div>
                        </div>
                      </div>

                      {/* Message Body */}
                      <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed font-normal pt-3">
                        {msg.body}
                      </div>

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap gap-2">
                          {msg.attachments.map((att, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                            >
                              <FileText className="h-3.5 w-3.5 text-blue-600" />
                              <span>{att}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thread Footer Actions (Gmail Reply / Forward pills) */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const comm = selectedComm;
                  const replyRecipient =
                    comm.direction === "inbound" ? comm.sender_email : comm.recipient_to;
                  setSelectedComm(null);
                  handleOpenCompose({
                    parent_id: comm.parent_id || comm.id,
                    recipient_to: replyRecipient,
                    recipient_cc: comm.recipient_cc,
                    target_school: comm.target_school,
                    subject: comm.subject.startsWith("Re:") ? comm.subject : `Re: ${comm.subject}`,
                    category: comm.category,
                    body: `\n\n--- On ${formatDate(comm.sent_at)}, ${comm.sender_name} wrote: ---\n${comm.body}`,
                  });
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <CornerUpLeft className="h-3.5 w-3.5" />
                <span>Reply</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const comm = selectedComm;
                  setSelectedComm(null);
                  handleOpenCompose({
                    recipient_to: "",
                    target_school: comm.target_school,
                    subject: comm.subject.startsWith("Fwd:") ? comm.subject : `Fwd: ${comm.subject}`,
                    category: comm.category,
                    attachments: comm.attachments,
                    body: `---------- Forwarded message ---------\nFrom: ${comm.sender_name} <${comm.sender_email}>\nDate: ${formatDate(comm.sent_at)}\nSubject: ${comm.subject}\nTo: ${comm.recipient_to}\n\n${comm.body}`,
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Forward className="h-3.5 w-3.5" />
                <span>Forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SIMULATE / TEST RECEIVER INBOUND REPLY MODAL              */}
      {/* ========================================================= */}
      {showSimulateReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareReply className="h-4 w-4 text-indigo-300" />
                <span className="text-xs font-bold">
                  Receive / Simulate Reply from Receiver
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateReplyModal(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReceiveInboundReply} className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                When a receiver replies to a Super Admin email, Resend delivers the reply to{" "}
                <code className="font-mono text-indigo-600">/api/webhooks/resend-inbound</code>. Use this form to send an instant reply from a receiver into the Super Admin Dashboard Inbox:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receiver Email (From)
                  </label>
                  <input
                    type="email"
                    required
                    value={simReplyFromEmail}
                    onChange={(e) => setSimReplyFromEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receiver Name
                  </label>
                  <input
                    type="text"
                    required
                    value={simReplyFromName}
                    onChange={(e) => setSimReplyFromName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution / School
                </label>
                <input
                  type="text"
                  value={simReplySchool}
                  onChange={(e) => setSimReplySchool(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reply Subject
                </label>
                <input
                  type="text"
                  required
                  value={simReplySubject}
                  onChange={(e) => setSimReplySubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reply Message Body
                </label>
                <textarea
                  rows={4}
                  required
                  value={simReplyBody}
                  onChange={(e) => setSimReplyBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateReplyModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSimReply}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {isSubmittingSimReply ? "Delivering Reply..." : "Deliver Reply to Super Admin Inbox"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* GMAIL-STYLE COMPOSE EMAIL WINDOW                          */}
      {/* ========================================================= */}
      {isComposeOpen && (
        <div
          className={
            isComposeMaximized
              ? "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-slate-900/40 backdrop-blur-xs"
              : "fixed bottom-0 right-4 sm:right-8 z-50 w-full max-w-[560px]"
          }
        >
          <div
            className={`bg-white flex flex-col overflow-hidden border border-slate-300 shadow-2xl transition-all ${
              isComposeMaximized
                ? "w-full max-w-4xl h-[85vh] rounded-2xl"
                : isComposeMinimized
                ? "w-72 rounded-t-xl ml-auto"
                : "w-full h-[560px] rounded-t-2xl"
            }`}
          >
            {/* Gmail Title Bar (#F2F6FC) */}
            <div
              onClick={() => {
                if (isComposeMinimized) setIsComposeMinimized(false);
              }}
              className="px-4 py-2.5 bg-[#F2F6FC] border-b border-slate-200 flex items-center justify-between select-none cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 tracking-tight truncate max-w-[340px]">
                  {subject.trim() ? subject : "New Message"}
                </span>
              </div>

              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsComposeMinimized(!isComposeMinimized);
                    setIsComposeMaximized(false);
                  }}
                  className="p-1.5 rounded hover:bg-slate-200/80 text-slate-600 transition-colors cursor-pointer"
                  title={isComposeMinimized ? "Expand" : "Minimize"}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsComposeMaximized(!isComposeMaximized);
                    setIsComposeMinimized(false);
                  }}
                  className="p-1.5 rounded hover:bg-slate-200/80 text-slate-600 transition-colors cursor-pointer"
                  title={isComposeMaximized ? "Exit full screen" : "Full screen"}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="p-1.5 rounded hover:bg-slate-200/80 text-slate-600 transition-colors cursor-pointer"
                  title="Save & close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Gmail Compose Form Body */}
            {!isComposeMinimized && (
              <form onSubmit={handleSendEmail} className="flex-1 flex flex-col min-h-0">
                {composeError && (
                  <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{composeError}</span>
                  </div>
                )}

                {/* Quick School / Recipient Chips Bar */}
                <div className="px-4 py-1.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  <span className="text-slate-400 font-medium shrink-0">Quick To:</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddQuickRecipient(
                        "all-school-admins@university.edu.gh",
                        "All Registered Schools"
                      )
                    }
                    className="px-2 py-0.5 rounded-full bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[10.5px] font-semibold shrink-0 cursor-pointer transition-colors"
                  >
                    + All Schools
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddQuickRecipient("admin@university.edu.gh", "")
                    }
                    className="px-2 py-0.5 rounded-full bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[10.5px] font-semibold shrink-0 cursor-pointer transition-colors"
                  >
                    + System Admin
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddQuickRecipient("bursar@university.edu.gh", "Finance / Bursary")
                    }
                    className="px-2 py-0.5 rounded-full bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[10.5px] font-semibold shrink-0 cursor-pointer transition-colors"
                  >
                    + Bursar
                  </button>
                  {schools.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        handleAddQuickRecipient(
                          s.email || `admin@${s.code.toLowerCase()}.edu.gh`,
                          s.name
                        )
                      }
                      className="px-2 py-0.5 rounded-full bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[10.5px] font-semibold shrink-0 cursor-pointer transition-colors"
                    >
                      + {s.code}
                    </button>
                  ))}
                </div>

                {/* "To" Field Row */}
                <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium w-8 shrink-0">To</span>
                  <input
                    type="text"
                    value={recipientTo}
                    onChange={(e) => setRecipientTo(e.target.value)}
                    placeholder="Recipients (comma-separated emails)"
                    className="flex-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                    {!showCc && (
                      <button
                        type="button"
                        onClick={() => setShowCc(true)}
                        className="hover:text-slate-800 hover:underline cursor-pointer"
                      >
                        Cc
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        type="button"
                        onClick={() => setShowBcc(true)}
                        className="hover:text-slate-800 hover:underline cursor-pointer"
                      >
                        Bcc
                      </button>
                    )}
                  </div>
                </div>

                {/* "Cc" Field Row */}
                {showCc && (
                  <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium w-8 shrink-0">Cc</span>
                    <input
                      type="text"
                      value={recipientCc}
                      onChange={(e) => setRecipientCc(e.target.value)}
                      placeholder="Cc recipients"
                      className="flex-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCc(false);
                        setRecipientCc("");
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* "Bcc" Field Row */}
                {showBcc && (
                  <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium w-8 shrink-0">Bcc</span>
                    <input
                      type="text"
                      value={recipientBcc}
                      onChange={(e) => setRecipientBcc(e.target.value)}
                      placeholder="Bcc recipients"
                      className="flex-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowBcc(false);
                        setRecipientBcc("");
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* "Subject" Field Row + Category & Priority Pills */}
                <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="flex-1 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10.5px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    title="Communication Category"
                  >
                    <option value="General">General</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Billing">Billing</option>
                    <option value="Security">Security</option>
                    <option value="Announcement">Announcement</option>
                  </select>

                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10.5px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    title="Priority Level"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Email Body Textarea */}
                <div className="flex-1 flex flex-col p-4 min-h-0 overflow-y-auto">
                  <textarea
                    ref={bodyTextareaRef}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Write your official communication here..."
                    className="w-full flex-1 resize-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none leading-relaxed"
                  />

                  {attachments.length > 0 && (
                    <div className="pt-3 flex flex-wrap gap-2 border-t border-slate-100 mt-2">
                      {attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700"
                        >
                          <Paperclip className="h-3 w-3 text-blue-600" />
                          <span>{file}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setAttachments((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gmail Bottom Formatting & Send Toolbar */}
                <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2 relative">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="submit"
                      disabled={isSending}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#0B57D0] hover:bg-[#0842a0] text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-60"
                    >
                      <span>{isSending ? "Sending..." : "Send"}</span>
                      <Send className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-center gap-0.5 ml-2 text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleInsertTextFormat("**", "bold text")}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Bold"
                      >
                        <Bold className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertTextFormat("*", "italic text")}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Italic"
                      >
                        <Italic className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailBody((prev) => `${prev}\n• `)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Bullet list"
                      >
                        <List className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleAddAttachment}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Attach files"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-blue-600 text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Insert pre-approved template"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Templates</span>
                        </button>

                        {showTemplatesMenu && (
                          <div className="absolute bottom-11 left-0 w-64 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50">
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                              Insert Official Template
                            </div>
                            {EMAIL_TEMPLATES.map((tpl, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleApplyTemplate(tpl)}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors cursor-pointer"
                              >
                                {tpl.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsComposeOpen(false);
                      setSubject("");
                      setEmailBody("");
                      setRecipientTo("");
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                    title="Discard draft"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
