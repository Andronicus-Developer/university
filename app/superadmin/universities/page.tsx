"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Plus,
  Search,
  Building2,
  Globe,
  Mail,
  Phone,
  ExternalLink,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import type { UniversityItem } from "@/lib/superadmin/service";

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [shortName, setShortName] = useState("");
  const [country, setCountry] = useState("Ghana");
  const [city, setCity] = useState("Accra");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [establishedYear, setEstablishedYear] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "maintenance" | "suspended">("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Delete Confirmation Modal state
  const [deletingUniv, setDeletingUniv] = useState<UniversityItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUniversities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/superadmin/universities");
      if (res.ok) {
        setUniversities(await res.json());
      }
    } catch (err) {
      console.error("Failed to load universities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUniversities();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setShortName("");
    setCountry("Ghana");
    setCity("Accra");
    setAddress("");
    setEmail("");
    setPhone("");
    setWebsite("");
    setCurrency("GHS");
    setEstablishedYear("");
    setStatus("active");
    setErrorMsg("");
    setShowModal(true);
  };

  const openEditModal = (u: UniversityItem) => {
    setEditingId(u.id);
    setName(u.name);
    setCode(u.code);
    setShortName(u.short_name || "");
    setCountry(u.country || "Ghana");
    setCity(u.city || "Accra");
    setAddress(u.address || "");
    setEmail(u.email || "");
    setPhone(u.phone || "");
    setWebsite(u.website || "");
    setCurrency(u.default_currency || "GHS");
    setEstablishedYear(u.established_year ? String(u.established_year) : "");
    setStatus(u.status || "active");
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name || !code) {
      setErrorMsg("University name and code are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingId || undefined,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        short_name: shortName.trim(),
        country: country.trim(),
        city: city.trim(),
        address: address.trim(),
        email: email.trim(),
        phone: phone.trim(),
        website: website.trim(),
        default_currency: currency,
        currency_symbol: currency === "GHS" ? "GH₵" : "$",
        established_year: establishedYear ? Number(establishedYear) : undefined,
        status,
      };

      const res = await fetch("/api/superadmin/universities", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save university");
      }

      setSuccessMsg(editingId ? `Updated ${name} successfully!` : `Registered ${name} successfully!`);
      setShowModal(false);
      await loadUniversities();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUniversity = async () => {
    if (!deletingUniv) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/universities?id=${encodeURIComponent(deletingUniv.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete university");
      }

      setSuccessMsg(
        `University ${deletingUniv.name} has been deleted. All ${data.affectedUsersCount ?? "associated"} users have had their access revoked.`
      );
      setDeletingUniv(null);
      await loadUniversities();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to delete university");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = universities.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || u.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Sub-Header: Breadcrumbs + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          <span className="text-slate-800 font-semibold">Universities & Campuses</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Register University</span>
          </button>
          <button
            onClick={loadUniversities}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search university, code, country..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="suspended">Suspended</option>
          </select>
          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filtered.length}</strong> of {universities.length}
          </span>
        </div>
      </div>

      {/* Universities Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-xs">Fetching universities from database...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          No matching universities found. Click &quot;Register University&quot; to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-xs">
                    {u.code.slice(0, 3)}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                      u.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : "Active"}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{u.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-bold text-blue-600">{u.code}</span>
                    {u.short_name && (
                      <span className="text-xs text-slate-500">• {u.short_name}</span>
                    )}
                  </div>
                </div>

                {u.motto && (
                  <p className="text-[11px] text-slate-500 italic border-l-2 border-blue-400 pl-2">
                    &ldquo;{u.motto}&rdquo;
                  </p>
                )}

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      {u.city}, {u.country}
                    </span>
                  </div>
                  {u.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>
                  )}
                  {u.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{u.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700 font-semibold">
                  {u.default_currency}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors cursor-pointer"
                    title="Edit University"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingUniv(u)}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                    title="Delete University (Blocks all users)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    href="/admin/dashboard"
                    target="_blank"
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add / Edit University */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>{editingId ? "Edit University Details" : "Register New Institution"}</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    University Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Accra Metropolitan University"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Short Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AMU"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs uppercase focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Operating Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  >
                    <option value="active">Active (Full Access)</option>
                    <option value="maintenance">Maintenance Mode</option>
                    <option value="suspended">Suspended (Blocked)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="registrar@institution.edu"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Default Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  >
                    <option value="GHS">GHS (GH₵)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Campus Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Main Campus Boulevard, Accra"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://amu.edu.gh"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingId ? "Save Changes" : "Register Institution"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation (Highlights that all users will be blocked) */}
      {deletingUniv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-red-200 shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Delete {deletingUniv.name}?
            </h3>

            <div className="mt-3 p-3.5 rounded-xl bg-red-50/80 border border-red-200 text-xs text-red-800 leading-relaxed">
              <strong>CRITICAL WARNING:</strong> When this university is deleted, all of its system administrators, faculty members, and students will <strong>immediately lose access and be blocked</strong> from accessing the system.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingUniv(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUniversity}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Decommissioning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Delete & Revoke Access</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
