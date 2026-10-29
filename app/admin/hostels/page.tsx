"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  Bed,
  RefreshCw,
  X,
  MapPin,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  Building,
  Users,
  ShieldCheck,
} from "lucide-react";

interface CampusItem {
  id: string;
  name: string;
  location?: string;
}

interface HostelItem {
  id: string;
  name: string;
  campus_id: string;
  campus_name: string;
  gender_allocation: "male" | "female" | "mixed" | string;
  total_capacity: number;
  address: string;
  created_at?: string;
}

export default function HostelsManagementPage() {
  const [hostels, setHostels] = useState<HostelItem[]>([]);
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");

  // Notifications
  const [statusAlert, setStatusAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Target hostel for Edit/Delete
  const [selectedHostel, setSelectedHostel] = useState<HostelItem | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    campusId: "",
    genderAllocation: "mixed",
    totalCapacity: 120,
    address: "North Campus Quad",
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    campusId: "",
    genderAllocation: "mixed",
    totalCapacity: 120,
    address: "",
  });

  // ============================================================================
  // Fetch Hostels & Campuses from API
  // ============================================================================
  const fetchHostels = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hostels");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load residential halls.");
      }

      setCampuses(data.campuses || []);

      const formatted: HostelItem[] = (data.residences || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        campus_id: h.campus_id,
        campus_name: h.campus?.name || "Main Campus",
        gender_allocation: h.gender_allocation || "mixed",
        total_capacity: Number(h.total_capacity) || 0,
        address: h.address || "Campus Residential Area",
        created_at: h.created_at
          ? new Date(h.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Registered",
      }));

      setHostels(formatted);

      if (data.campuses && data.campuses.length > 0 && !createForm.campusId) {
        setCreateForm((prev) => ({ ...prev, campusId: data.campuses[0].id }));
      }
    } catch (err: any) {
      console.error("Error fetching hostels:", err);
      setStatusAlert({ type: "error", text: err.message || "Failed to load hostels from database." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  // Filtered List
  const filteredHostels = useMemo(() => {
    return hostels.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.campus_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGender = genderFilter === "all" || h.gender_allocation === genderFilter;

      return matchesSearch && matchesGender;
    });
  }, [hostels, searchQuery, genderFilter]);

  // Total capacity metric
  const totalBeds = useMemo(() => {
    return hostels.reduce((acc, curr) => acc + (curr.total_capacity || 0), 0);
  }, [hostels]);

  // ============================================================================
  // Handle Add Hostel
  // ============================================================================
  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.totalCapacity) {
      setStatusAlert({ type: "error", text: "Please enter a residence name and capacity." });
      return;
    }

    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch("/api/admin/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          campus_id: createForm.campusId || campuses[0]?.id,
          gender_allocation: createForm.genderAllocation,
          total_capacity: createForm.totalCapacity,
          address: createForm.address,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add residence hall.");
      }

      setStatusAlert({
        type: "success",
        text: `Residence hall "${createForm.name}" created and saved to database successfully!`,
      });

      setShowAddModal(false);
      setCreateForm({
        name: "",
        campusId: campuses[0]?.id || "",
        genderAllocation: "mixed",
        totalCapacity: 120,
        address: "North Campus Quad",
      });

      await fetchHostels();
    } catch (err: any) {
      setStatusAlert({ type: "error", text: err.message || "Could not save residence hall." });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // Open & Handle Edit Hostel
  // ============================================================================
  const openEditModal = (hostel: HostelItem) => {
    setSelectedHostel(hostel);
    setEditForm({
      id: hostel.id,
      name: hostel.name,
      campusId: hostel.campus_id,
      genderAllocation: hostel.gender_allocation,
      totalCapacity: hostel.total_capacity,
      address: hostel.address,
    });
    setShowEditModal(true);
  };

  const handleEditHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.totalCapacity) {
      setStatusAlert({ type: "error", text: "Please provide a valid name and capacity." });
      return;
    }

    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch("/api/admin/hostels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editForm.id,
          name: editForm.name,
          campus_id: editForm.campusId,
          gender_allocation: editForm.genderAllocation,
          total_capacity: editForm.totalCapacity,
          address: editForm.address,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update residence hall.");
      }

      setStatusAlert({
        type: "success",
        text: `Residence hall "${editForm.name}" updated successfully in database!`,
      });

      setShowEditModal(false);
      setSelectedHostel(null);
      await fetchHostels();
    } catch (err: any) {
      setStatusAlert({ type: "error", text: err.message || "Failed to update residence hall." });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // Open & Handle Delete Hostel
  // ============================================================================
  const openDeleteModal = (hostel: HostelItem) => {
    setSelectedHostel(hostel);
    setShowDeleteModal(true);
  };

  const handleDeleteHostel = async () => {
    if (!selectedHostel) return;

    setSubmitting(true);
    setStatusAlert(null);

    try {
      const res = await fetch(`/api/admin/hostels?id=${selectedHostel.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete residence hall.");
      }

      setStatusAlert({
        type: "success",
        text: `Residence hall "${selectedHostel.name}" was permanently deleted from database.`,
      });

      setShowDeleteModal(false);
      setSelectedHostel(null);
      await fetchHostels();
    } catch (err: any) {
      setStatusAlert({ type: "error", text: err.message || "Could not delete residence hall." });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper badge style
  const getGenderBadge = (allocation: string) => {
    switch (allocation) {
      case "male":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "female":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "mixed":
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14 font-sans text-slate-800">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-blue-600 font-semibold">Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold">Residential Life</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Hostels & Student Accommodations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Add new residential halls, edit block allocations, manage bed capacities, and delete records directly in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHostels}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Hostel Block</span>
          </button>
        </div>
      </div>

      {/* Global Status Message Banner */}
      {statusAlert && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold shadow-2xs ${
            statusAlert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusAlert.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{statusAlert.text}</span>
          </div>
          <button
            onClick={() => setStatusAlert(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-current cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 leading-tight">{hostels.length}</div>
              <div className="text-[11px] font-semibold text-slate-500">Residence Halls</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bed className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600 leading-tight">{totalBeds}</div>
              <div className="text-[11px] font-semibold text-slate-500">Total Bed Capacity</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-purple-600 leading-tight">
                {hostels.filter((h) => h.gender_allocation === "mixed").length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">Co-ed / Mixed Blocks</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-600 leading-tight">
                {hostels.filter((h) => h.gender_allocation !== "mixed").length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">Single Gender Halls</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search hostels by name, campus, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Gender Policy:</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="all">All Allocations</option>
              <option value="mixed">Mixed / Co-ed</option>
              <option value="male">Male Only</option>
              <option value="female">Female Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hostels Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Hall / Residence Name</th>
                <th className="py-3.5 px-4">Campus Location</th>
                <th className="py-3.5 px-4">Gender Policy</th>
                <th className="py-3.5 px-4">Total Capacity</th>
                <th className="py-3.5 px-4">Physical Address</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredHostels.length > 0 ? (
                filteredHostels.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">{h.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{h.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>

                    {/* Campus */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{h.campus_name}</td>

                    {/* Gender Allocation */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getGenderBadge(
                          h.gender_allocation
                        )}`}
                      >
                        {h.gender_allocation === "mixed"
                          ? "Co-ed / Mixed"
                          : `${h.gender_allocation} only`}
                      </span>
                    </td>

                    {/* Capacity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                        <Bed className="h-3.5 w-3.5" />
                        <span>{h.total_capacity} Beds</span>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{h.address}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(h)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all cursor-pointer"
                          title="Edit Residence Hall"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => openDeleteModal(h)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                          title="Delete Residence Hall"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Loading residential halls from database...</span>
                      </div>
                    ) : (
                      "No residential halls found in database. Click 'Add Hostel Block' to register one."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: ADD HOSTEL BLOCK */}
      {/* ===================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Register New Residence Hall</h3>
                  <p className="text-[11px] text-slate-500">Creates a new residential block in Supabase residences table.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHostel} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Residence Hall Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hall of Excellence (Block C & D)"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campus Association *</label>
                <select
                  value={createForm.campusId}
                  onChange={(e) => setCreateForm({ ...createForm, campusId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none cursor-pointer"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender Policy *</label>
                  <select
                    value={createForm.genderAllocation}
                    onChange={(e) => setCreateForm({ ...createForm, genderAllocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="mixed">Mixed / Co-ed</option>
                    <option value="male">Male Only</option>
                    <option value="female">Female Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Bed Capacity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={createForm.totalCapacity}
                    onChange={(e) => setCreateForm({ ...createForm, totalCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Physical Campus Location / Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Campus Quad, Adjacent to Sports Complex"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Saving..." : "Save Residence Hall"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: EDIT HOSTEL BLOCK */}
      {/* ===================================================================== */}
      {showEditModal && selectedHostel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Residence Hall</h3>
                  <p className="text-[11px] text-slate-500">Update hall details, capacity, and allocation policy.</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditHostel} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Residence Hall Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campus Association *</label>
                <select
                  value={editForm.campusId}
                  onChange={(e) => setEditForm({ ...editForm, campusId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none cursor-pointer"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender Policy *</label>
                  <select
                    value={editForm.genderAllocation}
                    onChange={(e) => setEditForm({ ...editForm, genderAllocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="mixed">Mixed / Co-ed</option>
                    <option value="male">Male Only</option>
                    <option value="female">Female Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Bed Capacity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editForm.totalCapacity}
                    onChange={(e) => setEditForm({ ...editForm, totalCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Physical Campus Location / Address</label>
                <input
                  type="text"
                  required
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ===================================================================== */}
      {showDeleteModal && selectedHostel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Deletion</h3>
                <p className="text-[11px] text-slate-500">Remove residence hall from database.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900">{selectedHostel.name}</strong> ({selectedHostel.campus_name})?
              This will remove the block and associated room inventory from the Supabase database.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHostel}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{submitting ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
