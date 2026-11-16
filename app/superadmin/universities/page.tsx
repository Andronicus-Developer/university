"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import type { UniversityItem } from "@/lib/superadmin/service";

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [shortName, setShortName] = useState("");
  const [country, setCountry] = useState("Ghana");
  const [city, setCity] = useState("Accra");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [establishedYear, setEstablishedYear] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name || !code) {
      setErrorMsg("University name and code are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          status: "active",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create university");
      }

      setName("");
      setCode("");
      setShortName("");
      setAddress("");
      setEmail("");
      setPhone("");
      setWebsite("");
      setEstablishedYear("");
      setShowModal(false);
      await loadUniversities();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <GraduationCap className="h-6 w-6 text-purple-400" />
            Universities & Institutions Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure multi-tenant higher education institutions, accreditation records, and campus branches
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Register University
          </button>
          <button
            onClick={loadUniversities}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search university, code, country..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="suspended">Suspended</option>
          </select>
          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{filtered.length}</strong> of {universities.length}
          </span>
        </div>
      </div>

      {/* Universities Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <span className="text-xs">Fetching universities from database...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs bg-slate-800/30 rounded-2xl border border-slate-800">
          No matching universities found. Click &quot;Register University&quot; to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/60 shadow-sm flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-md shadow-purple-600/30">
                    {u.code.slice(0, 3)}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                      u.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white leading-tight">{u.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-bold text-purple-400">{u.code}</span>
                    {u.short_name && (
                      <span className="text-xs text-slate-400">• {u.short_name}</span>
                    )}
                  </div>
                </div>

                {u.motto && (
                  <p className="text-[11px] text-slate-400 italic border-l-2 border-purple-500/40 pl-2">
                    &ldquo;{u.motto}&rdquo;
                  </p>
                )}

                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
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

              <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-[11px] text-slate-300">
                  Currency: {u.default_currency}
                </span>
                {u.website && (
                  <a
                    href={u.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold text-[11px]"
                  >
                    Portal Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Register University */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
            <div className="h-14 px-6 border-b border-slate-800 bg-[#0B1120] flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <GraduationCap className="h-5 w-5 text-purple-400" />
                Register New Institution
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    University Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Accra Metropolitan University"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Short Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AMU"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Short / Brand Name
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="e.g. Accra Metro"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="registrar@institution.edu"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Default Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="GHS">GHS (GH₵)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Campus Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Main Campus Boulevard, Accra"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://amu.edu.gh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Save Institution"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

