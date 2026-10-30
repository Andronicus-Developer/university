"use client";

import React, { useEffect, useState } from "react";
import {
  UserPlus,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  FileText,
  UserCheck,
  Mail,
  Phone,
  GraduationCap,
} from "lucide-react";

interface ApplicationItem {
  id: string;
  cycle_id: string;
  applicant_id: string;
  application_number: string;
  status: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  programme_id: string | null;
  programme_name: string;
  programme_code: string;
  notes: string;
  submitted_at: string;
  created_at: string;
}

interface ProgrammeItem {
  id: string;
  name: string;
  code: string;
  degree_level: string;
}

interface AdmissionStats {
  totalApplications: number;
  approved: number;
  underReview: number;
  enrolled: number;
}

export default function AdmissionsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [stats, setStats] = useState<AdmissionStats>({
    totalApplications: 0,
    approved: 0,
    underReview: 0,
    enrolled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Notifications
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Selected item
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    programmeId: "",
    applicationNumber: "",
    status: "submitted",
    notes: "",
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admissions");
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to load admissions");
        return;
      }

      setApplications(data.applications || []);
      setProgrammes(data.programmes || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to fetch admissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const openAddModal = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setFormData({
      candidateName: "",
      candidateEmail: "",
      candidatePhone: "+233 24 555 " + String(randomNum).slice(0, 4),
      programmeId: programmes[0]?.id || "",
      applicationNumber: `ADM-${new Date().getFullYear()}-${randomNum}`,
      status: "submitted",
      notes: "",
    });
    setShowAddModal(true);
  };

  const openEditModal = (app: ApplicationItem) => {
    setSelectedApp(app);
    setFormData({
      candidateName: app.candidate_name,
      candidateEmail: app.candidate_email,
      candidatePhone: app.candidate_phone,
      programmeId: app.programme_id || programmes[0]?.id || "",
      applicationNumber: app.application_number,
      status: app.status,
      notes: app.notes || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (app: ApplicationItem) => {
    setSelectedApp(app);
    setShowDeleteModal(true);
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.candidateName.trim() || !formData.candidateEmail.trim()) {
      showNotification("error", "Candidate name and email are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: formData.candidateName,
          candidate_email: formData.candidateEmail,
          candidate_phone: formData.candidatePhone,
          programme_id: formData.programmeId || programmes[0]?.id,
          application_number: formData.applicationNumber,
          status: formData.status,
          notes: formData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Failed to register admission application");
        return;
      }

      showNotification("success", `Application ${formData.applicationNumber} registered successfully!`);
      setShowAddModal(false);
      fetchApplications();
    } catch (err: any) {
      showNotification("error", err.message || "Could not register application");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/admissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedApp.id,
          candidate_name: formData.candidateName,
          candidate_email: formData.candidateEmail,
          candidate_phone: formData.candidatePhone,
          programme_id: formData.programmeId,
          status: formData.status,
          notes: formData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Failed to update application");
        return;
      }

      showNotification("success", `Application ${selectedApp.application_number} updated.`);
      setShowEditModal(false);
      fetchApplications();
    } catch (err: any) {
      showNotification("error", err.message || "Could not update application");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!selectedApp) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/admissions?id=${encodeURIComponent(selectedApp.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Failed to delete application");
        return;
      }

      showNotification("success", `Application ${selectedApp.application_number} deleted.`);
      setShowDeleteModal(false);
      setSelectedApp(null);
      fetchApplications();
    } catch (err: any) {
      showNotification("error", err.message || "Could not delete application");
    } finally {
      setDeleting(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.application_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.candidate_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.programme_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "converted_to_student":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <UserCheck className="h-3 w-3" />
            Enrolled Student
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-3 w-3" />
            Approved / Offered
          </span>
        );
      case "under_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" />
            Under Review
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <FileText className="h-3 w-3" />
            Submitted
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold transition-all ${
            toast.type === "success"
              ? "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]"
              : "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Admissions & Registry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Student Admissions & Enrollment
          </h1>
          <p className="text-xs text-[#64748B]">
            Process admissions candidates, verify applicant details, grant offers, and enroll admitted students in the database.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Applications
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">{stats.totalApplications}</h3>
            <span className="text-[11px] text-blue-600 font-medium">Candidate dossiers</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Under Review
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.underReview}</h3>
            <span className="text-[11px] text-[#64748B] font-medium">Awaiting evaluation</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Approved Offers
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.approved}</h3>
            <span className="text-[11px] text-[#64748B] font-medium">Admission letters granted</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Converted Students
            </p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{stats.enrolled}</h3>
            <span className="text-[11px] text-[#64748B] font-medium">Enrolled in student roll</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by candidate name, application ref (ADM-...), email, or programme..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "all" ? "bg-white text-[#1E293B] shadow-2xs" : "hover:text-[#1E293B]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("submitted")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "submitted" ? "bg-white text-blue-600 shadow-2xs" : "hover:text-blue-600"
              }`}
            >
              Submitted
            </button>
            <button
              onClick={() => setStatusFilter("under_review")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "under_review" ? "bg-white text-amber-600 shadow-2xs" : "hover:text-amber-600"
              }`}
            >
              Review
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "approved" ? "bg-white text-emerald-600 shadow-2xs" : "hover:text-emerald-600"
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter("converted_to_student")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "converted_to_student" ? "bg-white text-purple-600 shadow-2xs" : "hover:text-purple-600"
              }`}
            >
              Enrolled
            </button>
          </div>

          <button
            onClick={fetchApplications}
            title="Refresh applications"
            className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">Application Ref</th>
                <th className="py-3 px-4">Candidate Information</th>
                <th className="py-3 px-4">Chosen Programme</th>
                <th className="py-3 px-4">Date Submitted</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {filteredApps.length > 0 ? (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                      {app.application_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1E293B]">{app.candidate_name}</div>
                      <div className="flex items-center gap-3 text-[11px] text-[#64748B] mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {app.candidate_email}
                        </span>
                        {app.candidate_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {app.candidate_phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#475569]">
                      <div className="flex items-center gap-1.5 font-medium text-[#1E293B]">
                        <GraduationCap className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>{app.programme_name}</span>
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono">
                        {app.programme_code}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#64748B]">
                      {new Date(app.submitted_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(app.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(app)}
                          title="Edit Application & Status"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(app)}
                          title="Delete Application"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#94A3B8]">
                    {loading
                      ? "Fetching admissions dossiers from Supabase..."
                      : "No applications found. Click 'New Application' to record one in the database."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">Register Admission Application</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Candidate Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ama Osei Boateng"
                    value={formData.candidateName}
                    onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Application Ref Number</label>
                  <input
                    type="text"
                    required
                    value={formData.applicationNumber}
                    onChange={(e) => setFormData({ ...formData, applicationNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Candidate Email</label>
                  <input
                    type="email"
                    required
                    placeholder="ama.osei@gmail.com"
                    value={formData.candidateEmail}
                    onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.candidatePhone}
                    onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Degree Programme Choice</label>
                  <select
                    value={formData.programmeId}
                    onChange={(e) => setFormData({ ...formData, programmeId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Admission Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="submitted">Submitted (Pending Review)</option>
                    <option value="under_review">Under Academic Review</option>
                    <option value="approved">Approved / Offer Issued</option>
                    <option value="converted_to_student">Admitted & Enrolled as Student</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Registry Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Review comments or WASSCE aggregate notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Registering Candidate..." : "Submit to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Application Modal */}
      {showEditModal && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Update Application: {selectedApp.application_number}
                </h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateApplication} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Candidate Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.candidateName}
                    onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Candidate Email</label>
                  <input
                    type="email"
                    required
                    value={formData.candidateEmail}
                    onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.candidatePhone}
                    onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Degree Programme Choice</label>
                  <select
                    value={formData.programmeId}
                    onChange={(e) => setFormData({ ...formData, programmeId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Admission Decision / Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="submitted">Submitted (Pending Review)</option>
                  <option value="under_review">Under Academic Review</option>
                  <option value="approved">Approved / Offer Issued</option>
                  <option value="converted_to_student">Convert to Enrolled Student (Assign Student ID)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Registry Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Application Modal */}
      {showDeleteModal && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">Delete Application Dossier?</h3>
                <p className="text-xs text-[#64748B]">This removes the candidate's application from the database.</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] p-3 rounded-xl border border-[#FECACA] text-xs text-[#991B1B]">
              <p>
                Are you sure you want to delete application <span className="font-bold">{selectedApp.application_number}</span> for candidate{" "}
                <span className="font-bold">{selectedApp.candidate_name}</span>?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedApp(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteApplication}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleting ? "Deleting..." : "Delete Application"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
