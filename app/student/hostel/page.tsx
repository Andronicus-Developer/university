"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  BedDouble,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Send,
  Trash2,
} from "lucide-react";
import { useStudentPortalSection } from "@/lib/student/useStudentPortalData";
import {
  StudentEmptyState,
  StudentPageError,
  StudentPageLoading,
  UnlinkedStudentProfileCard,
} from "@/components/student/StudentPortalPrimitives";

export default function UniversityHostelPage() {
  const { data, loading, error, reload, mutate } =
    useStudentPortalSection("hostel");

  const [hostelId, setHostelId] = useState<string>("");
  const [roomPreference, setRoomPreference] = useState<string>("Standard Shared Room");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (loading) {
    return <StudentPageLoading label="Loading hostel & accommodation details..." />;
  }
  if (error) {
    return <StudentPageError error={error} onRetry={reload} />;
  }
  if (!data || data.unlinkedStudent) {
    return <UnlinkedStudentProfileCard schoolName={data?.school?.name} />;
  }

  const allocation = data.allocation;
  const hostels = data.hostels || [];
  const requests = data.requests || [];

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setToast(null);
    const res = await mutate("request_hostel", {
      hostelId: hostelId || null,
      roomPreference,
      notes,
    });
    setSubmitting(false);
    if (res.ok) {
      setNotes("");
      setToast({
        type: "success",
        text: res.message || "Accommodation request submitted.",
      });
    } else {
      setToast({
        type: "error",
        text: res.error || "Unable to submit accommodation request.",
      });
    }
  };

  const handleCancel = async (requestId: string) => {
    setCancellingId(requestId);
    setToast(null);
    const res = await mutate("cancel_hostel_request", { requestId });
    setCancellingId(null);
    setToast({
      type: res.ok ? "success" : "error",
      text: res.ok ? "Request cancelled." : res.error || "Unable to cancel.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Hostel &amp; Accommodation
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          View your assigned residence hall and room, browse open hostels, or submit an accommodation request.
        </p>
      </div>

      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Current Allocation Card */}
      {allocation ? (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
              Active Residence Allocation
            </span>
            <h2 className="text-xl font-extrabold">
              {allocation.hostel?.name || "Campus Residence Hall"}
            </h2>
            <p className="text-xs text-blue-100">
              Room <strong>{allocation.room_number}</strong>
              {allocation.bed_number ? ` · Bed ${allocation.bed_number}` : ""}
              {allocation.hostel?.warden_name
                ? ` · Warden: ${allocation.hostel.warden_name}`
                : ""}
            </p>
          </div>
          <span className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-white text-indigo-700 text-xs font-extrabold capitalize">
            {String(allocation.status || "occupied").replace(/_/g, " ")}
          </span>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              No Room Allocated Yet
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an open hall below and submit a hostel accommodation request for hall warden approval.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Request Form */}
        <form
          onSubmit={handleSubmitRequest}
          className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span>Submit Hostel Accommodation Request</span>
          </h2>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Preferred Residence Hall
            </label>
            <select
              value={hostelId}
              onChange={(e) => setHostelId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            >
              <option value="">Any Available Residence Hall</option>
              {hostels.map((h: any) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code}) · {h.gender_policy || "mixed"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Room Preference
            </label>
            <select
              value={roomPreference}
              onChange={(e) => setRoomPreference(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            >
              <option value="Standard Shared Room">Standard Shared Room (4-in-1)</option>
              <option value="Double Room">Double Occupancy (2-in-1)</option>
              <option value="Single Study Room">Single Study Room</option>
              <option value="Ground Floor / Accessible">Ground Floor / Accessible</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Notes / Medical or Special Requests
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional preference, roommate request, or accessibility requirement..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>{submitting ? "Submitting..." : "Submit Hostel Request"}</span>
          </button>
        </form>

        {/* Available Halls & My Requests */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Campus Residence Halls ({hostels.length})
            </h2>
            {hostels.length === 0 ? (
              <StudentEmptyState
                title="No Open Hostels Listed"
                description="Residence halls will appear here once configured by the Campus Administration."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hostels.map((h: any) => (
                  <div
                    key={h.id}
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {h.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold capitalize">
                        {h.gender_policy || "mixed"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {h.total_rooms ?? 0} Rooms · {h.total_beds ?? 0} Total Beds
                    </div>
                    {h.address && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{h.address}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setHostelId(h.id)}
                      className="mt-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Select {h.code} for Request →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              My Accommodation Requests ({requests.length})
            </h2>
            {requests.length === 0 ? (
              <p className="text-xs text-slate-500">No accommodation requests submitted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {requests.map((r: any) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {r.hostel?.name || "Any Open Hall"} · {r.room_preference}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()} {r.notes ? `· ${r.notes}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize bg-amber-50 text-amber-800 border border-amber-200">
                        {r.status}
                      </span>
                      {r.status === "pending" && (
                        <button
                          type="button"
                          disabled={cancellingId === r.id}
                          onClick={() => handleCancel(r.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                          title="Cancel Request"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
