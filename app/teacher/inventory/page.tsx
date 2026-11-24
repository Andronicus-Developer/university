"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useStaffPortalSection } from "@/lib/staff/useStaffPortalData";
import {
  MigrationNoticeBanner,
  StaffEmptyState,
  StaffPageError,
  StaffPageLoading,
} from "@/components/staff/StaffPortalPrimitives";

interface InventoryItem {
  id: string;
  item_code: string | null;
  item_name: string;
  category: string | null;
  quantity: number;
  min_stock_threshold: number;
  condition: string | null;
  unit_cost: number | null;
  notes: string | null;
}

interface EquipmentRequest {
  id: string;
  inventory_id: string | null;
  request_type: "tool_request" | "material_requisition" | "damage_report" | "maintenance";
  item_name: string;
  quantity: number;
  urgency: "low" | "normal" | "high" | "urgent";
  description: string | null;
  status: "pending" | "approved" | "fulfilled" | "rejected";
  admin_notes: string | null;
  created_at: string;
}

interface VocInventoryPayload {
  school: { id: string; name: string };
  department: { id: string; name: string } | null;
  inventory: InventoryItem[];
  requests: EquipmentRequest[];
  missingTables: string[];
}

export default function InstructorInventoryPage() {
  const { data, loading, error, reload, mutate } =
    useStaffPortalSection<VocInventoryPayload>("voc_inventory");

  const [activeTab, setActiveTab] = useState<"stock" | "requests">("stock");
  const [query, setQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [inventoryId, setInventoryId] = useState("");
  const [requestType, setRequestType] = useState<
    "tool_request" | "material_requisition" | "damage_report" | "maintenance"
  >("material_requisition");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [urgency, setUrgency] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const stats = useMemo(() => {
    const inv = data?.inventory || [];
    const reqs = data?.requests || [];
    return {
      totalItems: inv.length,
      lowStock: inv.filter((i) => i.quantity <= i.min_stock_threshold).length,
      pendingReqs: reqs.filter((r) => r.status === "pending").length,
      fulfilledReqs: reqs.filter((r) => r.status === "fulfilled").length,
    };
  }, [data?.inventory, data?.requests]);

  const filteredStock = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.inventory || []).filter((item) => {
      if (lowStockOnly && item.quantity > item.min_stock_threshold) return false;
      if (!q) return true;
      return (
        item.item_name.toLowerCase().includes(q) ||
        (item.item_code || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q)
      );
    });
  }, [data?.inventory, query, lowStockOnly]);

  function openNewRequestModal(linkedItem?: InventoryItem) {
    if (linkedItem) {
      setInventoryId(linkedItem.id);
      setItemName(linkedItem.item_name);
      setRequestType(
        linkedItem.quantity <= linkedItem.min_stock_threshold
          ? "material_requisition"
          : "tool_request"
      );
    } else {
      setInventoryId("");
      setItemName("");
      setRequestType("material_requisition");
    }
    setQuantity("1");
    setUrgency("normal");
    setDescription("");
    setShowModal(true);
  }

  function handleInventorySelect(id: string) {
    setInventoryId(id);
    const match = (data?.inventory || []).find((i) => i.id === id);
    if (match) setItemName(match.item_name);
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    setSaving(true);
    setBanner(null);
    const result = await mutate("create_equipment_request", {
      inventoryId: inventoryId || null,
      requestType,
      itemName: itemName.trim(),
      quantity: Math.max(1, Number(quantity) || 1),
      urgency,
      description: description.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setBanner({ type: "error", text: result.error || "Failed to submit workshop request." });
      return;
    }
    setBanner({
      type: "success",
      text: "Workshop requisition / maintenance ticket submitted to School Admin.",
    });
    setShowModal(false);
    setActiveTab("requests");
  }

  async function handleDeleteRequest(requestId: string) {
    setDeletingId(requestId);
    setBanner(null);
    const result = await mutate("delete_equipment_request", { requestId });
    setDeletingId(null);
    if (!result.ok) {
      setBanner({ type: "error", text: result.error || "Failed to cancel request." });
    } else {
      setBanner({ type: "success", text: "Workshop request removed." });
    }
  }

  if (loading) return <StaffPageLoading label="Loading workshop inventory & requisitions..." />;
  if (error || !data) {
    return <StaffPageError error={error || "Failed to load inventory"} onRetry={reload} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Workshop Equipment & Requisitions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.school.name}
            {data.department ? ` • ${data.department.name}` : ""}
            {" • "}Inspect live stock levels and request tools, materials, or repairs
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNewRequestModal()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Requisition / Fault Report</span>
        </button>
      </div>

      <MigrationNoticeBanner tables={data.missingTables} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Workshop Stock Items", val: stats.totalItems, tone: "text-slate-900 dark:text-slate-100" },
          { label: "Low Stock Alerts", val: stats.lowStock, tone: "text-amber-600 dark:text-amber-400" },
          { label: "Pending Requisitions", val: stats.pendingReqs, tone: "text-blue-600 dark:text-blue-400" },
          { label: "Fulfilled Requests", val: stats.fulfilledReqs, tone: "text-emerald-600 dark:text-emerald-400" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {kpi.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${kpi.tone}`}>{kpi.val}</p>
          </div>
        ))}
      </div>

      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 ${
            banner.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === "stock"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Workshop Inventory ({data.inventory.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === "requests"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>My Requisitions ({data.requests.length})</span>
          </button>
        </div>

        {activeTab === "stock" && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Low Stock Only</span>
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tool or SKU..."
                className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 w-52"
              />
            </div>
          </div>
        )}
      </div>

      {activeTab === "stock" ? (
        filteredStock.length === 0 ? (
          <StaffEmptyState
            icon={Package}
            title="No Workshop Equipment Matching Filter"
            description="Once your Vocational Admin adds workshop inventory items, you can check quantities and file tool or consumable requisitions directly here."
          />
        ) : (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Stock Level</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredStock.map((item) => {
                    const isLow = item.quantity <= item.min_stock_threshold;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.item_name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {item.item_code || "No Code"}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {item.category || "General"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isLow
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {isLow && <AlertTriangle className="h-3 w-3" />}
                            <span>
                              {item.quantity} (min {item.min_stock_threshold})
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize text-slate-600 dark:text-slate-300">
                          {item.condition || "Good"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openNewRequestModal(item)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Request Restock / Repair
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : data.requests.length === 0 ? (
        <StaffEmptyState
          icon={Wrench}
          title="No Equipment Requests Yet"
          description="Submit a tool request, material requisition, or fault report to alert your School Administrator."
        />
      ) : (
        <div className="space-y-3">
          {data.requests.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {req.item_name} (Qty: {req.quantity})
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
                    {req.request_type.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      req.urgency === "urgent" || req.urgency === "high"
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {req.urgency} priority
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      req.status === "fulfilled" || req.status === "approved"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : req.status === "rejected"
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                {req.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">{req.description}</p>
                )}
                {req.admin_notes && (
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                    Admin Note: {req.admin_notes}
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  Submitted {(req.created_at || "").slice(0, 10)}
                </p>
              </div>

              {req.status === "pending" && (
                <button
                  type="button"
                  disabled={deletingId === req.id}
                  onClick={() => handleDeleteRequest(req.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {deletingId === req.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span>Withdraw</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Submit Workshop Requisition / Report
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitRequest} className="p-5 space-y-4">
              {data.inventory.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Linked Inventory Item (Optional)
                  </label>
                  <select
                    value={inventoryId}
                    onChange={(e) => handleInventorySelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="">New / Custom Item (Not Listed)</option>
                    {data.inventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.item_name} ({i.quantity} in stock)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item / Machine Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Digital Multimeters / Welding Electrodes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Request Type
                  </label>
                  <select
                    value={requestType}
                    onChange={(e) =>
                      setRequestType(
                        e.target.value as
                          | "tool_request"
                          | "material_requisition"
                          | "damage_report"
                          | "maintenance"
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="material_requisition">Consumable Requisition</option>
                    <option value="tool_request">Tool Request</option>
                    <option value="maintenance">Machine Maintenance</option>
                    <option value="damage_report">Damage / Fault Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) =>
                      setUrgency(e.target.value as "low" | "normal" | "high" | "urgent")
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justification / Technical Details
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe upcoming practical assessment, fault symptoms, or safety concern..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
