"use client";
import React, { useState } from "react";
import { useSubscriptions } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { formatMoney } from "@/lib/format";
import { Subscription } from "@/types";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  LayoutGrid,
  List,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
  Sparkles,
  Layers,
  MoreVertical,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import SubscriptionModal from "@/components/dashboard/SubscriptionModal";
import DeleteConfirmModal from "@/components/dashboard/DeleteConfirmModal";
import api from "@/lib/api";

const categories = [
  "all",
  "AI Tools",
  "Entertainment",
  "Music",
  "Development",
  "Design",
  "Cloud Storage",
  "Productivity",
  "Health & Fitness",
  "Gaming",
  "Utilities",
];

export default function SubscriptionsPage() {
  const {
    subscriptions,
    filters,
    setFilters,
    isLoading,
    toggleStatus,
    deleteSubscription,
    seedDemoData,
    refreshData,
  } = useSubscriptions();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [subToEdit, setSubToEdit] = useState<Subscription | null>(null);
  const [subToDelete, setSubToDelete] = useState<Subscription | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const currency = user?.default_currency || "USD";

  const handleEdit = (sub: Subscription) => {
    setSubToEdit(sub);
    setIsAddModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!subToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSubscription(subToDelete.id);
      setSubToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("subscrr_token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api");
      const res = await fetch(`${apiBase}/subscriptions/export/csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed with HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscrr-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF2500]">Management</span>
            <span className="text-xs text-[#7C766C]">• {subscriptions.length} Subscriptions Tracked</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1712]">All Subscriptions</h1>
          <p className="text-xs sm:text-sm text-[#7C766C] mt-1">
            Track, pause, organize, and edit your recurring expenses in one unified view.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={isExporting || subscriptions.length === 0}
            className="px-3.5 py-2.5 bg-white border border-[#E2DED4] rounded-xl text-xs font-semibold text-[#1A1712] hover:bg-[#EAE6DC] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#7C766C]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setSubToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#FF2500] hover:bg-[#e02000] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#E2DED4] shadow-sm flex flex-col gap-4">
        {/* Row 1: Search, Status Tabs, Sort, and View Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center bg-[#FAF8F5] p-1 rounded-2xl border border-[#EAE6DC] overflow-x-auto">
            {["all", "active", "trial", "paused", "cancelled"].map((st) => (
              <button
                key={st}
                onClick={() => setFilters((prev) => ({ ...prev, status: st }))}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                  filters.status === st
                    ? "bg-[#14141A] text-white shadow-sm"
                    : "text-[#7C766C] hover:text-[#1A1712]"
                }`}
              >
                {st === "all" ? "All Statuses" : st === "trial" ? "Free Trial" : st}
              </button>
            ))}
          </div>

          {/* Sort & View Mode */}
          <div className="flex items-center gap-3 self-end lg:self-auto">
            <div className="flex items-center bg-[#FAF8F5] border border-[#EAE6DC] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1A1712]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#7C766C] mr-2" />
              <span className="text-[#7C766C] mr-1.5">Sort:</span>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                className="bg-transparent font-bold focus:outline-none cursor-pointer"
              >
                <option value="next_renewal_date">Renewal Date</option>
                <option value="amount">Amount</option>
                <option value="name">Name (A-Z)</option>
                <option value="created_at">Date Added</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#FAF8F5] border border-[#EAE6DC] rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid" ? "bg-white text-[#1A1712] shadow-xs" : "text-[#7C766C] hover:text-[#1A1712]"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "list" ? "bg-white text-[#1A1712] shadow-xs" : "text-[#7C766C] hover:text-[#1A1712]"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Category Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-[#7C766C] shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilters((prev) => ({ ...prev, category: cat }))}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filters.category === cat
                  ? "bg-[#FF2500] text-white shadow-xs"
                  : "bg-[#FAF8F5] text-[#7C766C] border border-[#EAE6DC] hover:text-[#1A1712] hover:bg-[#EAE6DC]"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Grid / List */}
      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#E2DED4] text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#FAF8F5] border border-[#EAE6DC] flex items-center justify-center mx-auto mb-4 text-[#FF2500]">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-[#1A1712]">No Subscriptions Found</h3>
          <p className="text-xs sm:text-sm text-[#7C766C] mt-1.5 mb-6 leading-relaxed">
            {filters.search || filters.category !== "all" || filters.status !== "all"
              ? "No subscriptions match your active filters. Try clearing your search or category filter."
              : "You haven't tracked any subscriptions yet. Add your first service or load sample data to explore."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSubToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="px-5 py-2.5 bg-[#FF2500] hover:bg-[#e02000] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              + Add Subscription
            </button>
            <button
              onClick={() => seedDemoData()}
              className="px-5 py-2.5 bg-[#14141A] hover:bg-[#202028] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Load Demo Data
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subscriptions.map((sub) => {
            const isPaused = sub.status === "paused";
            const isTrial = sub.status === "trial";
            return (
              <div
                key={sub.id}
                className={`bg-white rounded-3xl p-6 border transition-all hover:shadow-md flex flex-col justify-between ${
                  isPaused
                    ? "border-[#E2DED4] opacity-70 bg-[#FAF8F5]"
                    : "border-[#E2DED4] hover:border-[#FF2500]/40"
                }`}
              >
                <div>
                  {/* Top: Icon, Name & Status Pill */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm"
                        style={{ backgroundColor: sub.color || "#FF2500" }}
                      >
                        {sub.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-[#1A1712] truncate max-w-[150px]">{sub.name}</h3>
                          {sub.website_url && (
                            <a
                              href={sub.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#7C766C] hover:text-[#FF2500] transition-colors"
                              title="Visit Website"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <span className="text-xs text-[#7C766C] block">{sub.category}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isPaused
                          ? "bg-amber-100 text-amber-800"
                          : isTrial
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>

                  {/* Price & Cycle */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#1A1712]">
                        {formatMoney(sub.amount, sub.currency || currency)}
                      </span>
                      <span className="text-xs font-semibold text-[#7C766C]">/{sub.billing_cycle}</span>
                    </div>
                    {sub.description && (
                      <p className="text-xs text-[#7C766C] mt-1 line-clamp-2">{sub.description}</p>
                    )}
                  </div>

                  {/* Renewal Details & Payment Method */}
                  <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DC] flex flex-col gap-1.5 mb-4 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#7C766C]">Next Renewal:</span>
                      <span className="font-bold text-[#1A1712]">{sub.next_renewal_date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#7C766C]">Payment Method:</span>
                      <span className="font-medium text-[#1A1712]">{sub.payment_method || "Credit Card"}</span>
                    </div>
                    {sub.notes && (
                      <div className="pt-1.5 border-t border-[#EAE6DC] text-[11px] text-[#7C766C] italic truncate">
                        "{sub.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#EAE6DC]">
                  <button
                    onClick={() => toggleStatus(sub.id)}
                    className="text-xs font-semibold text-[#7C766C] hover:text-[#1A1712] flex items-center gap-1.5 transition-colors"
                  >
                    {isPaused ? (
                      <>
                        <PlayCircle className="w-4 h-4 text-emerald-600" />
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="w-4 h-4 text-amber-600" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(sub)}
                      className="p-2 rounded-xl text-[#7C766C] hover:text-[#1A1712] hover:bg-[#FAF8F5] transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSubToDelete(sub)}
                      className="p-2 rounded-xl text-[#7C766C] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-3xl border border-[#E2DED4] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1A1712]">
              <thead className="bg-[#FAF8F5] border-b border-[#EAE6DC] text-[#7C766C] uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Subscription</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Cost</th>
                  <th className="px-4 py-4">Billing Cycle</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Next Renewal</th>
                  <th className="px-4 py-4">Payment</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DC]">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: sub.color || "#FF2500" }}
                        >
                          {sub.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#1A1712]">{sub.name}</div>
                          {sub.description && (
                            <span className="text-[11px] text-[#7C766C] block truncate max-w-xs">
                              {sub.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EAE6DC] font-medium text-[11px]">
                        {sub.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-black text-sm">
                      {formatMoney(sub.amount, sub.currency || currency)}
                    </td>
                    <td className="px-4 py-4 capitalize font-medium text-[#7C766C]">{sub.billing_cycle}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          sub.status === "paused"
                            ? "bg-amber-100 text-amber-800"
                            : sub.status === "trial"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold">{sub.next_renewal_date}</td>
                    <td className="px-4 py-4 text-[#7C766C]">{sub.payment_method || "Credit Card"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleStatus(sub.id)}
                          className="p-1.5 rounded-lg text-[#7C766C] hover:text-[#1A1712] hover:bg-white"
                          title={sub.status === "paused" ? "Resume" : "Pause"}
                        >
                          {sub.status === "paused" ? (
                            <PlayCircle className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <PauseCircle className="w-4 h-4 text-amber-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(sub)}
                          className="p-1.5 rounded-lg text-[#7C766C] hover:text-[#1A1712] hover:bg-white"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSubToDelete(sub)}
                          className="p-1.5 rounded-lg text-[#7C766C] hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <SubscriptionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSubToEdit(null);
        }}
        subscriptionToEdit={subToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!subToDelete}
        onClose={() => setSubToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete Subscription"
        message={`Are you sure you want to delete "${subToDelete?.name}"? All associated renewal alerts and analytics for this subscription will be removed.`}
      />
    </div>
  );
}
