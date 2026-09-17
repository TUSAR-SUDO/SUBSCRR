"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSubscriptions } from "@/context/SubscriptionContext";
import {
  TrendingUp,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Flame,
  PieChart,
  ChevronRight,
  Zap,
} from "lucide-react";
import SubscriptionModal from "@/components/dashboard/SubscriptionModal";
import { formatMoney, currencySymbol } from "@/lib/format";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { analytics, subscriptions, isLoading, refreshData, seedDemoData } = useSubscriptions();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData();
    } finally {
      setIsSeeding(false);
    }
  };

  const currency = analytics?.currency || user?.default_currency || "USD";
  const symbol = currencySymbol(currency);
  const monthlyTotal = analytics?.monthlyTotal || 0;
  const yearlyTotal = analytics?.yearlyTotal || 0;
  const dailyBurn = analytics?.dailyBurn || 0;
  const activeCount = analytics?.activeCount || 0;
  const upcoming = analytics?.upcomingRenewals || [];
  const categories = analytics?.categoryBreakdown || [];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Top Banner: Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF2500]">Overview</span>
            <span className="text-xs text-[#7C766C]">• Live Financial Summary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1712]">
            Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#7C766C] mt-1">
            Here is what you really spend across all your active subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshData()}
            disabled={isLoading}
            className="p-2.5 bg-white border border-[#E2DED4] rounded-xl text-[#1A1712] hover:bg-[#EAE6DC] transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#FF2500]" : ""}`} />
          </button>
          <Link
            href="/dashboard/ai-scanner"
            className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Scanner</span>
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#FF2500] hover:bg-[#e02000] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Cost */}
        <div className="bg-[#14141A] text-white rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-[#A39E93] uppercase tracking-wider">Monthly Spend</span>
            <div className="w-8 h-8 rounded-xl bg-[#FF2500]/20 border border-[#FF2500]/30 flex items-center justify-center text-[#FF2500]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight text-white">
              {formatMoney(monthlyTotal, currency)}
            </div>
            <p className="text-xs text-[#A39E93] mt-1.5 flex items-center gap-1.5">
              <span>Per day:</span>
              <strong className="text-white">{formatMoney(dailyBurn, currency)}</strong>
            </p>
          </div>
        </div>

        {/* Card 2: Annualized Spend */}
        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-[#7C766C] uppercase tracking-wider">Annual Total</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight text-[#1A1712]">
              {formatMoney(yearlyTotal, currency)}
            </div>
            <p className="text-xs text-[#7C766C] mt-1.5">True 12-month commitment</p>
          </div>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-[#7C766C] uppercase tracking-wider">Active Services</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight text-[#1A1712]">{activeCount}</div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-[#7C766C]">
              {analytics?.trialCount ? (
                <span className="text-purple-600 font-semibold">{analytics.trialCount} trial</span>
              ) : null}
              {analytics?.pausedCount ? (
                <span className="text-amber-600 font-semibold">{analytics.pausedCount} paused</span>
              ) : null}
              <span>tracked</span>
            </div>
          </div>
        </div>

        {/* Card 4: Next Upcoming Charge */}
        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-[#7C766C] uppercase tracking-wider">Next Charge</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          {upcoming.length > 0 ? (
            <div>
              <div className="text-lg font-extrabold text-[#1A1712] truncate">{upcoming[0].name}</div>
              <p className="text-xs text-[#FF2500] font-bold mt-1">
                {upcoming[0].daysUntil === 0
                  ? "Due Today!"
                  : upcoming[0].daysUntil === 1
                  ? "Due Tomorrow!"
                  : `Due in ${upcoming[0].daysUntil} days`}
                <span className="text-[#7C766C] font-normal ml-1">
                  ({formatMoney(upcoming[0].amount, upcoming[0].currency || currency)})
                </span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[#7C766C]">No charges in next 30 days</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Renewals & Top Spends */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Upcoming Renewals Timeline */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2DED4] shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DC] mb-5">
              <div>
                <h3 className="text-base font-extrabold text-[#1A1712]">Upcoming Renewals</h3>
                <p className="text-xs text-[#7C766C]">Countdown to every scheduled charge nearest first</p>
              </div>
              <Link
                href="/dashboard/calendar"
                className="text-xs font-semibold text-[#FF2500] hover:underline flex items-center gap-1"
              >
                <span>View Calendar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="w-10 h-10 text-[#7C766C] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#1A1712]">No upcoming renewals</p>
                <p className="text-xs text-[#7C766C] mt-1 mb-4">Add your subscriptions to see renewal countdowns.</p>
                <button
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="px-4 py-2 bg-[#14141A] text-white rounded-xl text-xs font-semibold hover:bg-[#202028] transition-colors"
                >
                  {isSeeding ? "Seeding..." : "Load Sample Subscriptions"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcoming.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DC] hover:border-[#FF2500]/30 transition-all hover:bg-white"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
                        style={{ backgroundColor: sub.color || "#FF2500" }}
                      >
                        {sub.name[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1A1712]">{sub.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#7C766C]">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-[#E2DED4] text-[10px] font-medium">
                            {sub.category}
                          </span>
                          <span>• Renewing {sub.next_renewal_date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-[#1A1712]">
                        {formatMoney(sub.amount, sub.currency || currency)}
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          sub.daysUntil <= 1
                            ? "bg-red-100 text-red-700"
                            : sub.daysUntil <= 3
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {sub.daysUntil === 0 ? "Today" : sub.daysUntil === 1 ? "Tomorrow" : `In ${sub.daysUntil} days`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Highest Cost Services Table */}
          {analytics && analytics.topSpends.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2DED4] shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DC] mb-5">
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1712]">Top Expenses</h3>
                  <p className="text-xs text-[#7C766C]">Your highest monthly recurring commitments</p>
                </div>
                <Link
                  href="/dashboard/subscriptions"
                  className="text-xs font-semibold text-[#FF2500] hover:underline flex items-center gap-1"
                >
                  <span>All Subscriptions</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex flex-col gap-2.5">
                {analytics.topSpends.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-[#EAE6DC] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#7C766C] w-4">#{idx + 1}</span>
                      <div>
                        <span className="text-xs font-bold text-[#1A1712]">{item.name}</span>
                        <span className="text-[11px] text-[#7C766C] block">{item.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-[#1A1712]">
                        {formatMoney(item.monthlyAmount, currency)}
                        <span className="text-[10px] text-[#7C766C] font-normal">/mo</span>
                      </span>
                      <span className="text-[10px] text-[#7C766C] block capitalize">
                        {item.billing_cycle === "monthly" ? "Billed monthly" : `Billed ${item.billing_cycle}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Category Breakdown & Quick Actions */}
        <div className="flex flex-col gap-6">
          {/* Spend by Category */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2DED4] shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DC] mb-5">
              <h3 className="text-base font-extrabold text-[#1A1712]">Spend by Category</h3>
              <Link href="/dashboard/analytics" className="text-xs font-semibold text-[#FF2500] hover:underline">
                Details
              </Link>
            </div>

            {categories.length === 0 ? (
              <p className="text-xs text-[#7C766C] text-center py-6">No active subscriptions yet</p>
            ) : (
              <div className="flex flex-col gap-4">
                {categories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-[#1A1712]">{cat.category}</span>
                        <span className="text-[10px] text-[#7C766C] font-normal">({cat.count})</span>
                      </div>
                      <span className="text-[#1A1712]">
                        {formatMoney(cat.monthlyAmount, currency)}
                        <span className="text-[10px] text-[#7C766C] ml-1">({cat.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#EAE6DC]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Scanner Promotion Card */}
          <div className="bg-gradient-to-br from-[#14141A] to-[#202028] text-white rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Spend Scanner</span>
            </div>
            <h4 className="text-lg font-black text-white leading-tight">
              Snap a receipt. Let AI extract the price & renewal.
            </h4>
            <p className="text-xs text-[#A39E93] mt-2 mb-4 leading-relaxed">
              Upload any invoice image or paste bank statement text. Our AI parses service name, billing frequency, and amounts instantly.
            </p>
            <Link
              href="/dashboard/ai-scanner"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#14141A] rounded-xl text-xs font-bold hover:bg-[#F4F2EC] transition-all"
            >
              <span>Try AI Scanner</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Demo Re-seed Helper */}
          {subscriptions.length === 0 && (
            <div className="bg-[#FAF8F5] rounded-3xl p-6 border border-[#E2DED4] text-center">
              <Zap className="w-8 h-8 text-[#FF2500] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#1A1712]">Want to see realistic data?</h4>
              <p className="text-xs text-[#7C766C] mt-1 mb-4">
                Populate your account with sample subscriptions (ChatGPT Plus, Netflix, Spotify, GitHub, Figma, etc.)
              </p>
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="w-full py-2.5 bg-[#14141A] hover:bg-[#202028] text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
              >
                {isSeeding ? "Seeding..." : "Load Demo Subscriptions"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Local Add Subscription Modal */}
      <SubscriptionModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
