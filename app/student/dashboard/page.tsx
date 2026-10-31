"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Award,
  CreditCard,
  Building2,
  Library,
  Megaphone,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Receipt,
  FileCheck2,
  Calendar,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Loader2,
  HelpCircle,
  LifeBuoy,
  Phone,
  MapPin,
  Edit3,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function StudentDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Form states
  const [serviceType, setServiceType] = useState("enrollment_letter");
  const [servicePurpose, setServicePurpose] = useState("");

  const [supportCategory, setSupportCategory] = useState("academic");
  const [supportPriority, setSupportPriority] = useState("normal");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDesc, setSupportDesc] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payChannel, setPayChannel] = useState("mtn_momo");

  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/dashboard");
      if (!res.ok) {
        throw new Error(`Failed to load student dashboard: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);

      if (json.student) {
        setContactPhone(json.student.phone || "");
        setContactAddress(json.student.address || "");
        setPayAmount(String(json.finance?.balanceDue || "450.00"));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 5000);
  };

  // --------------------------------------------------------------------------
  // CRUD 1: DROP COURSE (Immediate availability for re-enrollment)
  // --------------------------------------------------------------------------
  const handleDropCourse = async (enrolmentId: string, courseCode: string, offeringId?: string) => {
    if (!confirm(`Are you sure you want to drop course ${courseCode}? It will be ready for enrollment immediately.`)) {
      return;
    }

    setActionLoading(`drop-${enrolmentId}`);
    try {
      const res = await fetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "drop_course",
          enrolmentId,
          offeringId,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to drop course");

      showToast(`Course ${courseCode} dropped successfully! It is now available for registration below.`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || "Error dropping course", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------------------------------
  // CRUD 2: ENROLL COURSE
  // --------------------------------------------------------------------------
  const handleEnrollCourse = async (offeringId: string, courseCode: string) => {
    setActionLoading(`enroll-${offeringId}`);
    try {
      const res = await fetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enroll_course",
          offeringId,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to enroll course");

      showToast(`Successfully enrolled in ${courseCode}! Added to your active courses and timetable.`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || "Error enrolling course", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------------------------------
  // CRUD 3: SERVICE REQUEST (Create & Delete)
  // --------------------------------------------------------------------------
  const handleCreateServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("service-request");
    try {
      const res = await fetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_service_request",
          requestType: serviceType,
          purpose: servicePurpose,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to submit service request");

      showToast("Service request submitted to University Registry!");
      setServiceModalOpen(false);
      setServicePurpose("");
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteServiceRequest = async (requestId: string) => {
    if (!confirm("Cancel this service request?")) return;
    try {
      const res = await fetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_service_request",
          requestId,
        }),
      });

      if (!res.ok) throw new Error("Failed to cancel request");
      showToast("Service request cancelled.");
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // --------------------------------------------------------------------------
  // CRUD 4: SUPPORT TICKET (Create & Delete)
  // --------------------------------------------------------------------------
  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("support-ticket");
    try {
      const res = await fetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_support_ticket",
          category: supportCategory,
          priority: supportPriority,
          subject: supportSubject,
          description: supportDesc,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to submit ticket");

      showToast("Support inquiry ticket created successfully!");
      setSupportModalOpen(false);
      setSupportSubject("");
      setSupportDesc("");
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSupportTicket = async (ticketId: string) => {
    if (!confirm("Withdraw this support ticket?")) return;
    try {
      const res = await fetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_support_ticket",
          ticketId,
        }),
      });

      if (!res.ok) throw new Error("Failed to remove ticket");
      showToast("Support ticket withdrawn.");
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // --------------------------------------------------------------------------
  // CRUD 5: CONTACT INFORMATION UPDATE
  // --------------------------------------------------------------------------
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("update-contact");
    try {
      const res = await fetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contact",
          phone: contactPhone,
          address: contactAddress,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to update contact info");

      showToast("Contact information updated successfully!");
      setContactModalOpen(false);
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------------------------------
  // CRUD 6: PAY FEES ONLINE (Create Payment & Receipt)
  // --------------------------------------------------------------------------
  const handlePayFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("pay-fee");
    try {
      const activeInvoice = data?.finance?.invoices?.[0];
      const res = await fetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay_fee",
          invoiceId: activeInvoice?.id,
          amount: payAmount,
          paymentMethod: payChannel === "mtn_momo" ? "MTN Mobile Money" : "Visa / Mastercard",
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Payment transaction failed");

      showToast(resJson.message || "Payment recorded and official receipt issued!");
      setPayModalOpen(false);
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------------------------------
  // CRUD 7: RENEW LIBRARY LOAN
  // --------------------------------------------------------------------------
  const handleRenewLoan = async (loanId: string, bookTitle: string) => {
    setActionLoading(`renew-${loanId}`);
    try {
      const res = await fetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "renew_loan",
          loanId,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Loan renewal failed");

      showToast(`Loan for "${bookTitle}" renewed until ${resJson.newDueDate}!`);
      await fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">Loading student profile and dynamic database records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-red-900">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>Unable to Load Student Records</span>
        </div>
        <p className="text-xs text-red-700">{error || "No data received from student database."}</p>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry Loading
        </button>
      </div>
    );
  }

  const {
    student,
    enrolments,
    availableOfferings,
    timetableEvents,
    attendance,
    finance,
    recentMarks,
    serviceRequests,
    supportCases,
    announcements,
    accommodation,
    activeLoans,
  } = data;

  const totalRegisteredCredits = enrolments.reduce((sum: number, e: any) => sum + (e.course_offering?.course?.credits || 3), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Dynamic Toast Feedback */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 max-w-md animate-in slide-in-from-bottom-5 duration-200 ${
            toastMsg.type === "success"
              ? "bg-slate-900 text-white border-slate-800 shadow-slate-900/20"
              : "bg-red-600 text-white border-red-700 shadow-red-900/20"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-white shrink-0" />
          )}
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="ml-auto text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white p-6 sm:p-8 shadow-lg shadow-blue-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-blue-100 border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Academic Year 2026 / 2027 • First Semester</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {student.fullName}
            </h1>
            <p className="text-sm text-blue-100 max-w-xl">
              {student.programme} ({student.programmeCode}) • Student ID: <span className="font-semibold text-white">{student.studentNumber}</span> • Level {student.level}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-blue-200">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {student.phone}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {student.address}
              </span>
              <button
                onClick={() => setContactModalOpen(true)}
                className="underline hover:text-white font-semibold flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" /> Edit Contact
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setServiceModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-xs shadow-md hover:bg-blue-50 transition flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Service Request
            </button>
            <button
              onClick={() => setSupportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600/60 hover:bg-blue-600 text-white border border-white/30 font-semibold text-xs backdrop-blur-md transition flex items-center gap-1.5"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Open Support Ticket
            </button>
            <button
              onClick={() => setPayModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay Fees
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cumulative GPA */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cumulative GPA</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{student.cgpa.toFixed(2)}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                Term GPA: {student.gpa.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Scale: 4.00 • First Class Division</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
        </div>

        {/* Registered Courses & Credits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Courses</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{enrolments.length}</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                {totalRegisteredCredits} Credits
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Cumulative Earned: {student.creditsEarned} Cr</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{attendance.percentage}%</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                Good Standing
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{attendance.attendedSessions} of {attendance.totalSessions} sessions attended</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckSquare className="h-6 w-6" />
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Balance</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                GHS {finance.balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-amber-600 font-medium">Due: 30 Nov 2026</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column 2/3, Right Column 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Courses Enrolled, Available Courses to Register, Timetable, Marks) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Courses (with instant Drop CRUD) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">My Registered Courses ({enrolments.length})</h2>
                  <p className="text-[11px] text-slate-500">Active First Semester modules • Drop or re-enroll dynamically</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                {totalRegisteredCredits} / 18 Credits
              </span>
            </div>

            <div className="p-6 divide-y divide-slate-100">
              {enrolments.length > 0 ? (
                enrolments.map((e: any) => {
                  const course = e.course_offering?.course;
                  const off = e.course_offering;
                  const isDropping = actionLoading === `drop-${e.id}`;
                  return (
                    <div key={e.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                            {course?.code || "COURSE"}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{course?.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold capitalize">
                            {e.enrolment_status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Credits: <span className="font-semibold text-slate-700">{course?.credits || 3} Cr</span> • Section: {off?.section || "A"} • Mode: {off?.delivery_mode || "in-person"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Link
                          href="/student/assessments"
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Marks
                        </Link>
                        <button
                          onClick={() => handleDropCourse(e.id, course?.code, off?.id)}
                          disabled={isDropping}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition"
                          title="Drop course - ready for enrollment immediately"
                        >
                          {isDropping ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Drop
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <p>No courses currently enrolled.</p>
                  <p className="text-blue-600 font-semibold">Select a course below to enroll immediately.</p>
                </div>
              )}
            </div>
          </div>

          {/* Available Courses for Registration (Immediate re-enrollment when a course is dropped) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Available Courses for Enrollment ({availableOfferings.length})</h2>
                  <p className="text-[11px] text-slate-500">Dropped courses appear here immediately ready for single-click enrollment</p>
                </div>
              </div>
            </div>

            <div className="p-6 divide-y divide-slate-100">
              {availableOfferings.length > 0 ? (
                availableOfferings.map((off: any) => {
                  const course = off.course;
                  const isEnrolling = actionLoading === `enroll-${off.id}`;
                  return (
                    <div key={off.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-xs">
                            {course?.code}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{course?.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                            Section {off.section || "A"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 max-w-xl">{course?.description || "Approved university curriculum module."}</p>
                        <p className="text-[11px] text-slate-400">
                          Credits: {course?.credits || 3} Cr • Capacity: {off.capacity || 60} • Enrolled: {off.enrolled_count || 0}
                        </p>
                      </div>

                      <div className="shrink-0 self-start sm:self-center">
                        <button
                          onClick={() => handleEnrollCourse(off.id, course?.code)}
                          disabled={isEnrolling}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs"
                        >
                          {isEnrolling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          Enroll Now
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-xs text-slate-400">
                  You are registered for all currently available term course offerings.
                </p>
              )}
            </div>
          </div>

          {/* Timetable Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Lecture Timetable</h2>
                  <p className="text-[11px] text-slate-500">Weekly schedule and lecture room locations</p>
                </div>
              </div>
              <Link
                href="/student/timetable"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Full Calendar <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-6 space-y-3">
              {timetableEvents && timetableEvents.length > 0 ? (
                timetableEvents.map((ev: any) => {
                  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  const dayName = days[ev.day_of_week] || "Monday";
                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-200/80 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{dayName.slice(0, 3)}</span>
                          <Clock className="h-3.5 w-3.5 text-blue-600 mt-1" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {ev.course_offering?.course?.code}: {ev.course_offering?.course?.name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {ev.start_time?.slice(0, 5)} - {ev.end_time?.slice(0, 5)} • Room: <span className="font-semibold text-slate-700">{ev.room?.name || "Main Science Complex"}</span> ({ev.room?.building?.name || "Campus North"})
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-blue-100/70 text-blue-700 text-[10px] font-bold self-start sm:self-center">
                        Every {dayName}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">No timetable events scheduled.</p>
              )}
            </div>
          </div>

          {/* Assessment Scores */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Recent Assessment Scores</h2>
                  <p className="text-[11px] text-slate-500">Continuous assessments and midterm test marks</p>
                </div>
              </div>
              <Link
                href="/student/assessments"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                All Marks <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                      <th className="pb-3">Course</th>
                      <th className="pb-3">Component</th>
                      <th className="pb-3">Weight</th>
                      <th className="pb-3">Score</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentMarks && recentMarks.length > 0 ? (
                      recentMarks.map((m: any) => {
                        const comp = m.assessment_component;
                        const courseCode = comp?.course_offering?.course?.code || "CS102";
                        const percentage = comp?.max_marks ? Math.round((m.marks_obtained / comp.max_marks) * 100) : 0;
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/50">
                            <td className="py-3 font-bold text-slate-800">{courseCode}</td>
                            <td className="py-3 text-slate-600">{comp?.name}</td>
                            <td className="py-3 text-slate-500">{comp?.weight_percentage}%</td>
                            <td className="py-3 font-extrabold text-slate-900">
                              {m.marks_obtained} / {comp?.max_marks} ({percentage}%)
                            </td>
                            <td className="py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                <CheckCircle2 className="h-3 w-3" /> Recorded
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">No marks entered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Finance, Service Requests, Support Tickets, Hostel, Library) */}
        <div className="space-y-6">
          {/* Financial Account Card & Pay Action */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Fee Statement Summary</h3>
              </div>
              <Link href="/student/fee-statement" className="text-xs font-semibold text-blue-600 hover:underline">
                Statement
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Billed:</span>
                <span className="font-bold text-slate-800">GHS {finance.totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Paid to Date:</span>
                <span className="font-bold text-emerald-600">GHS {finance.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex justify-between text-xs">
                <span className="font-bold text-slate-700">Outstanding:</span>
                <span className="font-black text-slate-900">GHS {finance.balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPayModalOpen(true)}
                className="flex-1 py-2 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
              >
                Pay Fees Now
              </button>
              <Link
                href="/student/receipts"
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition text-center"
              >
                Receipts
              </Link>
            </div>
          </div>

          {/* Service Requests CRUD Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Registry Requests</h3>
              </div>
              <button
                onClick={() => setServiceModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> New
              </button>
            </div>

            <div className="space-y-2">
              {serviceRequests && serviceRequests.length > 0 ? (
                serviceRequests.slice(0, 3).map((req: any) => (
                  <div key={req.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800 capitalize">{req.request_type?.replace(/_/g, " ")}</p>
                      <span className="text-[10px] text-slate-400 capitalize">{req.status} • GHS {Number(req.fee_amount).toFixed(2)}</span>
                    </div>
                    {req.status === "pending" && (
                      <button
                        onClick={() => handleDeleteServiceRequest(req.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Cancel Request"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-2">No active service requests.</p>
              )}
            </div>
          </div>

          {/* Support Tickets CRUD Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <LifeBuoy className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Support Inquiries</h3>
              </div>
              <button
                onClick={() => setSupportModalOpen(true)}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Open
              </button>
            </div>

            <div className="space-y-2">
              {supportCases && supportCases.length > 0 ? (
                supportCases.slice(0, 3).map((t: any) => (
                  <div key={t.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-800 truncate">{t.subject}</p>
                      <span className="text-[10px] text-slate-400 capitalize">{t.category} • {t.status}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSupportTicket(t.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition shrink-0"
                      title="Withdraw Ticket"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-2">No open support tickets.</p>
              )}
            </div>
          </div>

          {/* Hostel Allocation Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Hostel Allocation</h3>
              </div>
              <Link href="/student/hostel" className="text-xs font-semibold text-amber-600 hover:underline">
                Manage
              </Link>
            </div>

            {accommodation ? (
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 text-xs space-y-1">
                <p className="font-bold text-slate-900">
                  {accommodation.bed?.room?.residence?.name || "Jean Nelson Hall"}
                </p>
                <p className="text-slate-600">
                  Room: <span className="font-semibold text-slate-800">{accommodation.bed?.room?.room_number || "B-204"}</span> • Bed: <span className="font-semibold text-slate-800">{accommodation.bed?.bed_number || "Bed 1"}</span>
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Check-in: 01 Sep 2026</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">Active</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">No active hostel allocation found.</p>
            )}
          </div>

          {/* Library Loans & Instant Renewal */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Library className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Library Loans</h3>
              </div>
              <Link href="/student/library" className="text-xs font-semibold text-teal-600 hover:underline">
                Library
              </Link>
            </div>

            {activeLoans && activeLoans.length > 0 ? (
              activeLoans.map((loan: any) => {
                const isRenewing = actionLoading === `renew-${loan.id}`;
                return (
                  <div key={loan.id} className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-100 text-xs space-y-2">
                    <div>
                      <p className="font-bold text-slate-900 truncate">
                        {loan.copy?.item?.title || "Introduction to Algorithms"}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Call No: {loan.copy?.item?.call_number || "QA76.6"} • Due: <span className="font-bold text-teal-700">{loan.due_date}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleRenewLoan(loan.id, loan.copy?.item?.title || "Book")}
                      disabled={isRenewing}
                      className="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] transition flex items-center justify-center gap-1"
                    >
                      {isRenewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Renew Loan (+14 Days)
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 py-2">No borrowed library books currently.</p>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: Service Request Modal                       */}
      {/* ---------------------------------------------------- */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Submit Registry Service Request</h3>
              <button onClick={() => setServiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateServiceRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Type</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  <option value="enrollment_letter">Enrollment Verification Letter (GHS 25.00)</option>
                  <option value="transcript">Official Academic Transcript (GHS 50.00)</option>
                  <option value="completion_letter">Letter of Programme Completion (GHS 30.00)</option>
                  <option value="id_replacement">Student ID Card Replacement (GHS 40.00)</option>
                  <option value="deferral">Academic Deferral Application (Free)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purpose / Details</label>
                <textarea
                  rows={3}
                  value={servicePurpose}
                  onChange={(e) => setServicePurpose(e.target.value)}
                  placeholder="e.g. For visa embassy verification, scholarship application, employer check..."
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "service-request"}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {actionLoading === "service-request" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: Support Ticket Modal                        */}
      {/* ---------------------------------------------------- */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Create Support Inquiry</h3>
              <button onClick={() => setSupportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupportTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inquiry Category</label>
                <select
                  value={supportCategory}
                  onChange={(e) => setSupportCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  <option value="academic">Academic Advising / Course Issues</option>
                  <option value="finance">Finance / Tuition & Receipt Queries</option>
                  <option value="hostel">Hostel & Accommodation</option>
                  <option value="technical">IT & Portal Access</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority Level</label>
                <select
                  value={supportPriority}
                  onChange={(e) => setSupportPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Summary of issue..."
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Explain the inquiry..."
                  value={supportDesc}
                  onChange={(e) => setSupportDesc(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "support-ticket"}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {actionLoading === "support-ticket" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: Pay Fees Modal                             */}
      {/* ---------------------------------------------------- */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Pay Academic Fees Online</h3>
              <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePayFee} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Pay (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payChannel}
                  onChange={(e) => setPayChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  <option value="mtn_momo">MTN Mobile Money</option>
                  <option value="card">Visa / Mastercard (Paystack)</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-800 text-[11px] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Instant automated payment reconciliation and certified receipt issuance.</span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "pay-fee"}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {actionLoading === "pay-fee" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: Edit Contact Modal                          */}
      {/* ---------------------------------------------------- */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Update Contact & Address</h3>
              <button onClick={() => setContactModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateContact} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Residential Campus Address / Room</label>
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "update-contact"}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {actionLoading === "update-contact" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
