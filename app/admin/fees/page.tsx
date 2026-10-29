"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  DollarSign,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  FileText,
  User,
  Layers,
  TrendingUp,
} from "lucide-react";

interface InvoiceItem {
  id: string;
  invoice_number: string;
  student_id: string;
  student_number: string;
  student_name: string;
  student_email: string;
  term_name: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string;
  created_at: string;
}

interface FeeItem {
  id: string;
  code: string;
  name: string;
  description: string;
  default_amount: number;
  is_mandatory: boolean;
  is_active: boolean;
}

interface StudentOption {
  id: string;
  student_number: string;
  name: string;
  email: string;
}

interface FinanceStats {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  totalInvoices: number;
}

export default function FeesManagementPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [stats, setStats] = useState<FinanceStats>({
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    collectionRate: 0,
    totalInvoices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"invoices" | "fee_items">("invoices");

  // Notifications
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false);
  const [showAddFeeItemModal, setShowAddFeeItemModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Selected item
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    studentId: "",
    studentName: "",
    studentEmail: "",
    totalAmount: 3850,
    paidAmount: 0,
    dueDate: "2026-11-30",
    status: "posted",
  });

  // Fee Item Form State
  const [feeItemForm, setFeeItemForm] = useState({
    code: "",
    name: "",
    description: "",
    defaultAmount: 250,
    isMandatory: true,
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchFinance = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fees");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load finance data");
      }

      setInvoices(data.invoices || []);
      setFeeItems(data.feeItems || []);
      setStudents(data.students || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      console.error("Error fetching finance:", err);
      showNotification("error", err.message || "Failed to fetch student bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  const openAddInvoiceModal = () => {
    setInvoiceForm({
      studentId: students[0]?.id || "",
      studentName: "Kwame Boateng Mensah",
      studentEmail: "kwame.boateng@university.edu.gh",
      totalAmount: 3850,
      paidAmount: 0,
      dueDate: "2026-11-30",
      status: "posted",
    });
    setShowAddInvoiceModal(true);
  };

  const openEditInvoiceModal = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setInvoiceForm({
      studentId: inv.student_id,
      studentName: inv.student_name,
      studentEmail: inv.student_email,
      totalAmount: inv.total_amount,
      paidAmount: inv.paid_amount,
      dueDate: inv.due_date || "2026-11-30",
      status: inv.status,
    });
    setShowEditInvoiceModal(true);
  };

  const openDeleteInvoiceModal = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setShowDeleteInvoiceModal(true);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invoice",
          student_id: invoiceForm.studentId || undefined,
          student_name: invoiceForm.studentName,
          student_email: invoiceForm.studentEmail,
          total_amount: invoiceForm.totalAmount,
          paid_amount: invoiceForm.paidAmount,
          due_date: invoiceForm.dueDate,
          status: invoiceForm.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate student invoice");
      }

      showNotification("success", `Invoice ${data.invoice?.invoice_number} created in database!`);
      setShowAddInvoiceModal(false);
      fetchFinance();
    } catch (err: any) {
      console.error("Create invoice error:", err);
      showNotification("error", err.message || "Could not save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/fees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedInvoice.id,
          total_amount: invoiceForm.totalAmount,
          paid_amount: invoiceForm.paidAmount,
          due_date: invoiceForm.dueDate,
          status: invoiceForm.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update invoice");
      }

      showNotification("success", `Invoice ${selectedInvoice.invoice_number} updated.`);
      setShowEditInvoiceModal(false);
      fetchFinance();
    } catch (err: any) {
      console.error("Update invoice error:", err);
      showNotification("error", err.message || "Could not update invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/fees?id=${encodeURIComponent(selectedInvoice.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete invoice");
      }

      showNotification("success", `Invoice ${selectedInvoice.invoice_number} deleted.`);
      setShowDeleteInvoiceModal(false);
      setSelectedInvoice(null);
      fetchFinance();
    } catch (err: any) {
      console.error("Delete invoice error:", err);
      showNotification("error", err.message || "Could not delete invoice");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFeeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeItemForm.code.trim() || !feeItemForm.name.trim()) {
      showNotification("error", "Fee code and name are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fee_item",
          code: feeItemForm.code,
          name: feeItemForm.name,
          description: feeItemForm.description,
          default_amount: feeItemForm.defaultAmount,
          is_mandatory: feeItemForm.isMandatory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create fee item");
      }

      showNotification("success", `Fee item ${feeItemForm.code} created!`);
      setShowAddFeeItemModal(false);
      fetchFinance();
    } catch (err: any) {
      console.error("Create fee item error:", err);
      showNotification("error", err.message || "Could not save fee item");
    } finally {
      setSaving(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.student_number.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    return true;
  });

  const getInvoiceBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
            <CheckCircle className="h-3 w-3" />
            Paid in Full
          </span>
        );
      case "partially_paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" />
            Partially Paid
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <FileText className="h-3 w-3" />
            Posted
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
            <span className="text-[#1E293B] font-semibold">Bursary & Finance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Student Fees, Billing & Collections
          </h1>
          <p className="text-xs text-[#64748B]">
            Issue student fee invoices, reconcile collections, manage approved tuition schedules, and track university receivables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddFeeItemModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1E293B] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Fee Item</span>
          </button>
          <button
            onClick={openAddInvoiceModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Billed
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">
              GHS {stats.totalBilled.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-blue-600 font-medium">{stats.totalInvoices} Invoices Issued</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Collected
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              GHS {stats.totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">Reconciled in bank</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Outstanding
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              GHS {stats.totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-amber-600 font-medium">Due receivables</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Collection Efficiency
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">
              {stats.collectionRate.toFixed(1)}%
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Settlement ratio</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === "invoices"
              ? "text-[#2563EB] border-b-2 border-[#2563EB]"
              : "text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          Student Invoices & Receivables
        </button>
        <button
          onClick={() => setActiveTab("fee_items")}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === "fee_items"
              ? "text-[#2563EB] border-b-2 border-[#2563EB]"
              : "text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          Institutional Fee Schedule Catalog
        </button>
      </div>

      {activeTab === "invoices" && (
        <>
          {/* Search & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice number (INV-...), student name, or ID..."
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
                  onClick={() => setStatusFilter("paid")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "paid" ? "bg-white text-emerald-600 shadow-2xs" : "hover:text-emerald-600"
                  }`}
                >
                  Paid
                </button>
                <button
                  onClick={() => setStatusFilter("partially_paid")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "partially_paid" ? "bg-white text-amber-600 shadow-2xs" : "hover:text-amber-600"
                  }`}
                >
                  Partial
                </button>
                <button
                  onClick={() => setStatusFilter("posted")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === "posted" ? "bg-white text-blue-600 shadow-2xs" : "hover:text-blue-600"
                  }`}
                >
                  Pending
                </button>
              </div>

              <button
                onClick={fetchFinance}
                title="Refresh financial data"
                className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Term</th>
                    <th className="py-3 px-4">Total Billed</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Outstanding</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                          {inv.invoice_number}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#1E293B]">{inv.student_name}</div>
                          <div className="text-[11px] text-[#64748B] font-mono">{inv.student_number}</div>
                        </td>

                        <td className="py-3.5 px-4 text-[#475569]">
                          {inv.term_name}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-[#1E293B]">
                          GHS {inv.total_amount.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          GHS {inv.paid_amount.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-amber-600">
                          GHS {inv.balance_amount.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4">
                          {getInvoiceBadge(inv.status)}
                        </td>

                        <td className="py-3.5 px-4 text-[#64748B]">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditInvoiceModal(inv)}
                              title="Edit / Record Payment"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openDeleteInvoiceModal(inv)}
                              title="Delete Invoice"
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
                      <td colSpan={9} className="py-12 text-center text-xs text-[#94A3B8]">
                        {loading
                          ? "Fetching financial records from Supabase database..."
                          : "No student invoices found. Click 'Generate Invoice' to issue a bill."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Fee Items Catalog Tab */}
      {activeTab === "fee_items" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1E293B]">Standard Approved Fee Charges</h3>
              <p className="text-xs text-[#64748B]">Institutional tariffs and statutory student levies</p>
            </div>
            <button
              onClick={() => setShowAddFeeItemModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Fee Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Fee Code</th>
                  <th className="py-3 px-4">Fee Item Name</th>
                  <th className="py-3 px-4">Default Amount</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {feeItems.length > 0 ? (
                  feeItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-mono font-bold text-[#2563EB]">{item.code}</td>
                      <td className="py-3 px-4 font-bold text-[#1E293B]">
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-[#64748B] font-normal">{item.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1E293B]">
                        GHS {Number(item.default_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.is_mandatory ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.is_mandatory ? "Mandatory" : "Optional"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#94A3B8]">
                      No fee items configured in catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {showAddInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">Generate Student Fee Invoice</h3>
              </div>
              <button onClick={() => setShowAddInvoiceModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Student Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kwame Boateng Mensah"
                    value={invoiceForm.studentName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, studentName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Student University Email</label>
                  <input
                    type="email"
                    required
                    placeholder="kwame.boateng@university.edu.gh"
                    value={invoiceForm.studentEmail}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, studentEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Total Fee Amount (GHS)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    required
                    value={invoiceForm.totalAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, totalAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Initial Paid Amount (GHS)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={invoiceForm.paidAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Invoice Status</label>
                  <select
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="posted">Posted (Pending Settlement)</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid in Full</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddInvoiceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Generating..." : "Generate & Post Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Update Invoice: {selectedInvoice.invoice_number}
                </h3>
              </div>
              <button onClick={() => setShowEditInvoiceModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateInvoice} className="p-6 space-y-4">
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs">
                <span className="font-bold text-[#1E293B]">{selectedInvoice.student_name}</span>
                <span className="text-[#64748B] ml-2">({selectedInvoice.student_number})</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Total Fee Amount (GHS)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    required
                    value={invoiceForm.totalAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, totalAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Paid Amount (GHS)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={invoiceForm.paidAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Settlement Status</label>
                  <select
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="posted">Posted (Pending Settlement)</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid in Full</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditInvoiceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Updating..." : "Save Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Modal */}
      {showDeleteInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">Delete Student Invoice?</h3>
                <p className="text-xs text-[#64748B]">This removes the invoice record from the bursary ledger.</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] p-3 rounded-xl border border-[#FECACA] text-xs text-[#991B1B]">
              <p>
                Are you sure you want to delete invoice <span className="font-bold">{selectedInvoice.invoice_number}</span> (GHS {selectedInvoice.total_amount.toFixed(2)}) for student{" "}
                <span className="font-bold">{selectedInvoice.student_name}</span>?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInvoice}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleting ? "Deleting..." : "Delete Invoice"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Fee Item Modal */}
      {showAddFeeItemModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="text-sm font-bold text-[#1E293B]">Add New Fee Item</h3>
              <button onClick={() => setShowAddFeeItemModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFeeItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Fee Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LAB_FEE"
                  value={feeItemForm.code}
                  onChange={(e) => setFeeItemForm({ ...feeItemForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono uppercase focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Fee Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Laboratory Levy"
                  value={feeItemForm.name}
                  onChange={(e) => setFeeItemForm({ ...feeItemForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Default Amount (GHS)</label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  required
                  value={feeItemForm.defaultAmount}
                  onChange={(e) => setFeeItemForm({ ...feeItemForm, defaultAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={feeItemForm.description}
                  onChange={(e) => setFeeItemForm({ ...feeItemForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFeeItemModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Fee Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
