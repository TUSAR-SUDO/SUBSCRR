"use client";
import React, { useState, useRef, useEffect } from "react";
import { useSubscriptions } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  Bell,
  CheckCheck,
  Check,
  Calendar,
  AlertCircle,
  Menu,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenAddModal: () => void;
}

export default function Header({ onToggleSidebar, onOpenAddModal }: HeaderProps) {
  const { filters, setFilters, notifications, unreadNotifCount, markNotificationRead, markAllNotificationsRead, dismissNotification, refreshData } =
    useSubscriptions();
  const { user, updateProfile } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  // Items currently animating out (dismissed) or just marked read — keyed by id.
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [justReadIds, setJustReadIds] = useState<Set<string>>(new Set());

  const dismiss = (id: string) => {
    if (exitingIds.has(id)) return;
    setExitingIds((prev) => new Set(prev).add(id));
    // Fire the DELETE immediately — the exit animation (0.38s) runs while
    // the request is in flight; context removal drops the row when it lands.
    dismissNotification(id).finally(() => {
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  };

  const markSingleRead = (id: string) => {
    setJustReadIds((prev) => new Set(prev).add(id));
    markNotificationRead(id);
    setTimeout(() => {
      setJustReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 500);
  };

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currencies = ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD"];

  const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCurrency = e.target.value;
    try {
      await updateProfile({ default_currency: nextCurrency });
      // Re-aggregate analytics in the new display currency.
      await refreshData();
    } catch (err) {
      console.error("Failed to update currency:", err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F4F2EC]/90 backdrop-blur-md border-b border-[#E2DED4] px-6 py-4 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl bg-white border border-[#E2DED4] text-[#1A1712] hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#7C766C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subscriptions, categories, notes..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] placeholder-[#7C766C] focus:outline-none focus:border-[#FF2500] focus:ring-1 focus:ring-[#FF2500] transition-all"
          />
        </div>
      </div>

      {/* Right: Currency switcher, Notifications, Action */}
      <div className="flex items-center gap-3">
        {/* Currency Switcher */}
        <div className="hidden sm:flex items-center bg-white border border-[#E2DED4] rounded-xl px-2.5 py-1 text-xs font-semibold text-[#1A1712]">
          <span className="text-[#7C766C] mr-1.5">Currency:</span>
          <select
            value={user?.default_currency || "USD"}
            onChange={handleCurrencyChange}
            className="bg-transparent font-bold focus:outline-none cursor-pointer"
          >
            {currencies.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2.5 bg-white border border-[#E2DED4] rounded-xl text-[#1A1712] hover:bg-[#EAE6DC] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-[#1A1712]" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF2500] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-[#E2DED4] p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DC] mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#1A1712]">Notifications</h4>
                  {unreadNotifCount > 0 && (
                    <span className="text-xs bg-[#FF2500]/10 text-[#FF2500] px-2 py-0.5 rounded-full font-semibold">
                      {unreadNotifCount} unread
                    </span>
                  )}
                </div>
                {unreadNotifCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-xs text-[#FF2500] hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#7C766C]">
                    No notifications at this time. All renewals are up to date!
                  </div>
                ) : (
                  notifications.map((n) => {
                    const exiting = exitingIds.has(n.id);
                    const justRead = justReadIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (exiting) return;
                          if (!n.is_read) markSingleRead(n.id);
                          else dismiss(n.id);
                        }}
                        className={`group p-3 rounded-xl border text-left transition-colors relative ${
                          exiting
                            ? "notif-exiting"
                            : justRead
                            ? "notif-just-read"
                            : ""
                        } ${
                          n.is_read
                            ? "bg-[#FAF8F5] border-[#EAE6DC] opacity-75"
                            : "bg-white border-[#FF2500]/20 shadow-sm cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              justRead
                                ? "notif-check-pop bg-emerald-100 text-emerald-600"
                                : n.type === "renewal"
                                ? "bg-amber-100 text-amber-600"
                                : n.type === "trial_ending"
                                ? "bg-purple-100 text-purple-600"
                                : n.type === "budget_alert"
                                ? "bg-red-100 text-[#FF2500]"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {justRead ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : n.type === "renewal" ? (
                              <Calendar className="w-3.5 h-3.5" />
                            ) : n.type === "trial_ending" ? (
                              <Sparkles className="w-3.5 h-3.5" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#1A1712]">{n.title}</span>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-[#FF2500] shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-[#7C766C] mt-1 leading-snug">{n.message}</p>
                            <span className="text-[10px] text-[#A39E93] mt-1.5 block">
                              {new Date(n.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {/* Dismiss (X) button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismiss(n.id);
                            }}
                            disabled={exiting}
                            aria-label="Dismiss notification"
                            className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center text-[#A39E93] hover:text-[#1A1712] hover:bg-[#EAE6DC] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-30"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Subscription Quick Button */}
        <button
          onClick={onOpenAddModal}
          className="bg-[#14141A] hover:bg-[#202028] text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#FF2500]" />
          <span className="hidden sm:inline">New Subscription</span>
        </button>
      </div>
    </header>
  );
}
