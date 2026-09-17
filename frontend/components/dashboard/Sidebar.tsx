"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSubscriptions } from "@/context/SubscriptionContext";
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  CalendarDays,
  Sparkles,
  Settings,
  ShieldCheck,
  LogOut,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface SidebarProps {
  onOpenAddModal: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ onOpenAddModal, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { analytics } = useSubscriptions();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Subscriptions", href: "/dashboard/subscriptions", icon: Layers },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
    {
      label: "AI Scanner",
      href: "/dashboard/ai-scanner",
      icon: Sparkles,
      badge: "AI",
    },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  if (user?.role === "admin") {
    navItems.push({ label: "Admin Portal", href: "/dashboard/admin", icon: ShieldCheck, badge: "Admin" });
  }

  const budgetPct = analytics?.budgetUtilizationPct || 0;
  const isBudgetWarning = budgetPct > 80;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 bg-[#14141A] text-[#F4F2EC] z-50 flex flex-col justify-between p-6 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top brand header */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-[#FF2500]/10 border border-[#FF2500]/30 p-1.5 flex items-center justify-center transition-transform group-hover:scale-105">
                <Image src="/assets/Icon.png" alt="Subscrr" width={28} height={28} className="rounded-lg" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-white block">Subscrr</span>
                <span className="text-xs text-[#7C766C] tracking-wide uppercase font-semibold">Web App</span>
              </div>
            </Link>
          </div>

          {/* Quick Add CTA */}
          <button
            onClick={() => {
              onOpenAddModal();
              if (isOpen) onClose();
            }}
            className="w-full bg-[#FF2500] hover:bg-[#e02000] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#FF2500]/20 transition-all hover:shadow-[#FF2500]/30 active:scale-[0.98]"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Add Subscription</span>
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5" aria-label="Dashboard navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (isOpen) onClose();
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#202028] text-white shadow-sm font-semibold border border-white/10"
                      : "text-[#A39E93] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#FF2500]" : "text-[#7C766C]"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.badge === "AI"
                          ? "bg-gradient-to-r from-[#FF2500] to-purple-600 text-white"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Budget & Profile */}
        <div className="flex flex-col gap-4 pt-4 border-t border-white/10">
          {/* Monthly Budget Pill */}
          {analytics && analytics.monthlyBudget > 0 && (
            <div className="bg-[#1C1C24] p-3.5 rounded-xl border border-white/5">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-[#A39E93]">Monthly Budget</span>
                <span className={`font-semibold ${isBudgetWarning ? "text-[#FF2500]" : "text-emerald-400"}`}>
                  {budgetPct}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isBudgetWarning ? "bg-[#FF2500]" : "bg-emerald-400"
                  }`}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#7C766C] mt-2">
                <span>
                  {analytics.currency} {analytics.monthlyTotal.toFixed(0)}
                </span>
                <span>
                  Limit: {analytics.currency} {analytics.monthlyBudget.toFixed(0)}
                </span>
              </div>
            </div>
          )}

          {/* User Profile & Logout */}
          <div className="flex items-center justify-between bg-[#1C1C24] p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF2500] to-orange-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "US"}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.name || "User"}</p>
                <p className="text-[11px] text-[#7C766C] truncate">{user?.email || "demo@subscrr.app"}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-[#7C766C] hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 text-xs text-[#7C766C] hover:text-[#A39E93] transition-colors py-1"
          >
            <span>Back to Landing Page</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </aside>
    </>
  );
}
