"use client";

import React, { useEffect, useState } from "react";
import {
  BusFront,
  Plus,
  Search,
  Filter,
  CheckCircle,
  MapPin,
  Clock,
  RefreshCw,
  X,
  Phone,
  User,
  Edit2,
  Trash2,
  AlertTriangle,
  Users,
  Route as RouteIcon,
  ShieldCheck,
  Compass,
} from "lucide-react";

interface TransportRouteItem {
  id: string;
  route_name: string;
  route_code: string;
  departure_location: string;
  arrival_location: string;
  departure_time: string;
  fare_amount: number;
  stops?: string[];
  is_active: boolean;
  vehicle_id?: string;
  bus_number?: string;
  model?: string;
  driver_name?: string;
  driver_phone?: string;
  capacity?: number;
  vehicle_status?: string;
}

interface FleetStats {
  totalRoutes: number;
  activeRoutes: number;
  totalVehicles: number;
  totalCapacity: number;
}

export default function TransportManagementPage() {
  const [routes, setRoutes] = useState<TransportRouteItem[]>([]);
  const [stats, setStats] = useState<FleetStats>({
    totalRoutes: 0,
    activeRoutes: 0,
    totalVehicles: 0,
    totalCapacity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "OFFLINE">("ALL");

  // Notifications
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Current selected route for editing or deletion
  const [selectedRoute, setSelectedRoute] = useState<TransportRouteItem | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    routeName: "",
    routeCode: "",
    departureLocation: "",
    arrivalLocation: "",
    departureTime: "07:30",
    fareAmount: 0,
    busNumber: "",
    model: "Mercedes-Benz Sprinter",
    driverName: "",
    driverPhone: "+233 24 555 0100",
    capacity: 40,
    isActive: true,
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchTransportData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transport");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load transport data");
      }

      setRoutes(data.routes || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error("Error fetching transport routes:", err);
      showNotification("error", err.message || "Failed to load transport fleet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportData();
  }, []);

  const openAddModal = () => {
    // Generate next route code suggestion
    const nextNum = routes.length + 1;
    const code = `TR-${String(nextNum).padStart(3, "0")}`;

    setFormData({
      routeName: "",
      routeCode: code,
      departureLocation: "Main Campus Terminal",
      arrivalLocation: "North City Quad",
      departureTime: "07:30",
      fareAmount: 0.0,
      busNumber: `UMS-BUS-0${nextNum}`,
      model: "Mercedes-Benz Sprinter 516",
      driverName: "",
      driverPhone: "+233 24 555 0100",
      capacity: 35,
      isActive: true,
    });
    setShowAddModal(true);
  };

  const openEditModal = (route: TransportRouteItem) => {
    setSelectedRoute(route);
    setFormData({
      routeName: route.route_name,
      routeCode: route.route_code,
      departureLocation: route.departure_location,
      arrivalLocation: route.arrival_location,
      departureTime: route.departure_time || "07:30",
      fareAmount: route.fare_amount || 0,
      busNumber: route.bus_number || "",
      model: route.model || "Mercedes-Benz Sprinter",
      driverName: route.driver_name || "",
      driverPhone: route.driver_phone || "+233 24 555 0100",
      capacity: route.capacity || 40,
      isActive: route.is_active,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (route: TransportRouteItem) => {
    setSelectedRoute(route);
    setShowDeleteModal(true);
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.routeName.trim() || !formData.routeCode.trim()) {
      showNotification("error", "Route name and route code are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_name: formData.routeName,
          route_code: formData.routeCode,
          departure_location: formData.departureLocation,
          arrival_location: formData.arrivalLocation,
          departure_time: formData.departureTime,
          fare_amount: formData.fareAmount,
          is_active: formData.isActive,
          bus_number: formData.busNumber,
          model: formData.model,
          capacity: formData.capacity,
          driver_name: formData.driverName,
          driver_phone: formData.driverPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create route");
      }

      showNotification("success", `Route ${formData.routeCode} added successfully!`);
      setShowAddModal(false);
      fetchTransportData();
    } catch (err: any) {
      console.error("Create route error:", err);
      showNotification("error", err.message || "Could not save route to database");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/transport", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRoute.id,
          vehicle_id: selectedRoute.vehicle_id,
          route_name: formData.routeName,
          route_code: formData.routeCode,
          departure_location: formData.departureLocation,
          arrival_location: formData.arrivalLocation,
          departure_time: formData.departureTime,
          fare_amount: formData.fareAmount,
          is_active: formData.isActive,
          bus_number: formData.busNumber,
          model: formData.model,
          capacity: formData.capacity,
          driver_name: formData.driverName,
          driver_phone: formData.driverPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update route");
      }

      showNotification("success", `Route ${formData.routeCode} updated in database.`);
      setShowEditModal(false);
      fetchTransportData();
    } catch (err: any) {
      console.error("Update route error:", err);
      showNotification("error", err.message || "Could not update route in database");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async () => {
    if (!selectedRoute) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/transport?id=${encodeURIComponent(selectedRoute.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete route");
      }

      showNotification("success", `Route ${selectedRoute.route_code} removed from database.`);
      setShowDeleteModal(false);
      setSelectedRoute(null);
      fetchTransportData();
    } catch (err: any) {
      console.error("Delete route error:", err);
      showNotification("error", err.message || "Could not delete route from database");
    } finally {
      setDeleting(false);
    }
  };

  // Filtering
  const filtered = routes.filter((r) => {
    const matchesSearch =
      r.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.route_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bus_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.departure_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.arrival_location?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ACTIVE") return r.is_active;
    if (statusFilter === "OFFLINE") return !r.is_active;
    return true;
  });

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
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
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
            <span className="text-[#1E293B] font-semibold">Campus Transport & Fleet</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Transport & Fleet Management
          </h1>
          <p className="text-xs text-[#64748B]">
            Configure campus shuttle routes, assign fleet vehicles, schedule drivers, and manage live transit databases.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Shuttle Route</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Transit Routes
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">
              {stats.totalRoutes}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">Mapped campus corridors</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <RouteIcon className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Active Shuttles
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {stats.activeRoutes}
            </h3>
            <span className="text-[11px] text-[#64748B] font-medium">Currently in service</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BusFront className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Fleet Capacity
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">
              {stats.totalCapacity}
            </h3>
            <span className="text-[11px] text-[#64748B] font-medium">Total passenger seats</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Vehicles Registered
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">
              {stats.totalVehicles}
            </h3>
            <span className="text-[11px] text-[#64748B] font-medium">Fleet units assigned</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
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
            placeholder="Search by route name, code (e.g. TR-001), bus plate, station, or driver..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status filter tabs */}
          <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "ALL" ? "bg-white text-[#1E293B] shadow-2xs" : "hover:text-[#1E293B]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "ACTIVE" ? "bg-white text-emerald-600 shadow-2xs" : "hover:text-emerald-600"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("OFFLINE")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "OFFLINE" ? "bg-white text-red-600 shadow-2xs" : "hover:text-red-600"
              }`}
            >
              Offline
            </button>
          </div>

          <button
            onClick={fetchTransportData}
            title="Refresh fleet routes"
            className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Routes & Fleet Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">Route Name & Stations</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Bus Identifier & Model</th>
                <th className="py-3 px-4">Driver & Contact</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Departure Time</th>
                <th className="py-3 px-4">Fare</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {filtered.length > 0 ? (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1E293B]">
                      <div className="flex items-center gap-1.5">
                        <Compass className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                        <span>{r.route_name}</span>
                      </div>
                      <div className="text-[11px] text-[#64748B] font-normal mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{r.departure_location}</span>
                        <span className="text-slate-400">→</span>
                        <span>{r.arrival_location}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                      {r.route_code}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-[#334155]">{r.bus_number}</div>
                      <div className="text-[11px] text-[#64748B] truncate max-w-[160px]">
                        {r.model || "Shuttle Bus"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#475569]">
                      <div className="flex items-center gap-1.5 font-medium text-[#1E293B]">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{r.driver_name}</span>
                      </div>
                      <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{r.driver_phone}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#64748B] font-semibold">
                      {r.capacity} Seats
                    </td>

                    <td className="py-3.5 px-4 text-[#64748B]">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{r.departure_time}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#334155] font-semibold">
                      {r.fare_amount > 0 ? `GHS ${r.fare_amount.toFixed(2)}` : "Free (Subsidized)"}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.is_active
                            ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                            : "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            r.is_active ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                          }`}
                        />
                        {r.is_active ? "ACTIVE" : "OFFLINE"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(r)}
                          title="Edit Route & Vehicle"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(r)}
                          title="Delete Route"
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
                      ? "Fetching transit fleet routes from Supabase database..."
                      : "No matching transport routes found. Click 'Add Shuttle Route' to provision one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shuttle Route Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <BusFront className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">Provision Shuttle Route & Vehicle</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Campus Terminal → Downtown Station"
                  value={formData.routeName}
                  onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Route Code</label>
                  <input
                    type="text"
                    required
                    placeholder="TR-004"
                    value={formData.routeCode}
                    onChange={(e) => setFormData({ ...formData, routeCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono uppercase focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Departure Time</label>
                  <input
                    type="time"
                    required
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Departure Station</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Campus Terminal"
                    value={formData.departureLocation}
                    onChange={(e) => setFormData({ ...formData, departureLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Arrival Terminal</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Downtown Central Station"
                    value={formData.arrivalLocation}
                    onChange={(e) => setFormData({ ...formData, arrivalLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-[#F1F5F9] pt-3">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  Vehicle & Driver Assignment
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Bus Number</label>
                  <input
                    type="text"
                    required
                    placeholder="UMS-BUS-04"
                    value={formData.busNumber}
                    onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Capacity (Seats)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Fare (GHS)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={formData.fareAmount}
                    onChange={(e) => setFormData({ ...formData, fareAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Mercedes-Benz Sprinter 516"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Service Status</label>
                  <select
                    value={formData.isActive ? "true" : "false"}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="true">Active in Service</option>
                    <option value="false">Offline / Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Assigned Driver</label>
                  <input
                    type="text"
                    required
                    placeholder="Driver full name"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Driver Phone Number</label>
                  <input
                    type="text"
                    placeholder="+233 24 555 0100"
                    value={formData.driverPhone}
                    onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
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
                  {saving ? "Saving to Database..." : "Save Route to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shuttle Route Modal */}
      {showEditModal && selectedRoute && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#2563EB]" />
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">
                    Edit Route: {selectedRoute.route_code}
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Updating route details and linked fleet vehicle in database.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoute} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  value={formData.routeName}
                  onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Route Code</label>
                  <input
                    type="text"
                    required
                    value={formData.routeCode}
                    onChange={(e) => setFormData({ ...formData, routeCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono uppercase focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Departure Time</label>
                  <input
                    type="time"
                    required
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Departure Station</label>
                  <input
                    type="text"
                    required
                    value={formData.departureLocation}
                    onChange={(e) => setFormData({ ...formData, departureLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Arrival Terminal</label>
                  <input
                    type="text"
                    required
                    value={formData.arrivalLocation}
                    onChange={(e) => setFormData({ ...formData, arrivalLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-[#F1F5F9] pt-3">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  Vehicle & Driver Assignment
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Bus Number</label>
                  <input
                    type="text"
                    required
                    value={formData.busNumber}
                    onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Capacity (Seats)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Fare (GHS)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={formData.fareAmount}
                    onChange={(e) => setFormData({ ...formData, fareAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Service Status</label>
                  <select
                    value={formData.isActive ? "true" : "false"}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="true">Active in Service</option>
                    <option value="false">Offline / Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Assigned Driver</label>
                  <input
                    type="text"
                    required
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Driver Phone Number</label>
                  <input
                    type="text"
                    value={formData.driverPhone}
                    onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
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
                  {saving ? "Updating Database..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRoute && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">Delete Transport Route?</h3>
                <p className="text-xs text-[#64748B]">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] p-3 rounded-xl border border-[#FECACA] text-xs text-[#991B1B] space-y-1">
              <p>
                You are about to remove route <span className="font-bold">{selectedRoute.route_code}</span> (
                {selectedRoute.route_name}) and its assigned vehicle ({selectedRoute.bus_number}) from the database.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRoute(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRoute}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleting ? "Deleting from Database..." : "Delete Route"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
