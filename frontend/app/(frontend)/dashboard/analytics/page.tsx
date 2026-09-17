"use client";
import React, { useState, useEffect } from "react";
import { useSubscriptions } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { formatMoney, currencySymbol } from "@/lib/format";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Lightbulb,
  ShieldAlert,
  ArrowUpRight,
  Flame,
  Calendar,
  CreditCard,
  DollarSign,
} from "lucide-react";

interface Projection {
  month: string;
  shortMonth: string;
  year: number;
  estimatedSpend: number;
  cumulativeSpend: number;
}

export default function AnalyticsPage() {
  const { analytics, subscriptions } = useSubscriptions();
  const { user } = useAuth();
  const [projections, setProjections] = useState<Projection[]>([]);
  const [isLoadingProjections, setIsLoadingProjections] = useState(false);

  useEffect(() => {
    const fetchProjections = async () => {
      setIsLoadingProjections(true);
      try {
        const res = await api.get<{ projections: Projection[] }>("/analytics/projections");
        if (res.success && res.data?.projections) {
          setProjections(res.data.projections);
        }
      } catch (err) {
        console.error("Failed to fetch projections:", err);
      } finally {
        setIsLoadingProjections(false);
      }
    };

    fetchProjections();
  }, []);

  const currency = analytics?.currency || user?.default_currency || "USD";
  const symbol = currencySymbol(currency);

  const monthlyTotal = analytics?.monthlyTotal || 0;
  const yearlyTotal = analytics?.yearlyTotal || 0;
  const categories = analytics?.categoryBreakdown || [];

  // Find max projected spend for relative bar height scaling
  const maxSpend = projections.reduce((max, p) => Math.max(max, p.estimatedSpend), 1);

  // Calculate payment method breakdown
  const paymentMap: Record<string, number> = {};
  for (const s of subscriptions) {
    if (s.status === "active" || s.status === "trial") {
      const pm = s.payment_method || "Credit Card";
      paymentMap[pm] = (paymentMap[pm] || 0) + s.amount;
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF2500]">Intelligence</span>
          <span className="text-xs text-[#7C766C]">• Financial Breakdown & Forecast</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1712]">Spending Analytics</h1>
        <p className="text-xs sm:text-sm text-[#7C766C] mt-1">
          Deep-dive analysis into where your money goes and 12-month projections.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
          <span className="text-xs font-bold text-[#7C766C] uppercase tracking-wider">Monthly Recurring Spend</span>
          <div className="text-3xl font-black text-[#1A1712] mt-2">
            {formatMoney(monthlyTotal, currency)}
          </div>
          <p className="text-xs text-[#7C766C] mt-1">Normalized cost across all active services</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
          <span className="text-xs font-bold text-[#7C766C] uppercase tracking-wider">Annual Run-Rate</span>
          <div className="text-3xl font-black text-[#1A1712] mt-2">
            {formatMoney(yearlyTotal, currency)}
          </div>
          <p className="text-xs text-[#7C766C] mt-1">Expected 12-month cumulative payout</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
          <span className="text-xs font-bold text-[#7C766C] uppercase tracking-wider">Daily Burn Rate</span>
          <div className="text-3xl font-black text-[#FF2500] mt-2">
            {formatMoney(analytics?.dailyBurn || monthlyTotal / 30.416, currency)}
          </div>
          <p className="text-xs text-[#7C766C] mt-1">Cost leaving your account each day</p>
        </div>
      </div>

      {/* 12-Month Projection Forecast Chart */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DED4] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-[#EAE6DC] mb-6">
          <div>
            <h3 className="text-base font-extrabold text-[#1A1712]">12-Month Spend Projection</h3>
            <p className="text-xs text-[#7C766C]">Estimated renewal charges plotted by month</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7C766C]">
            <span className="w-3 h-3 rounded-md bg-[#FF2500]" /> Estimated Monthly Cost
          </div>
        </div>

        {/* Bar chart container */}
        <div className="h-64 flex items-end justify-between gap-2 pt-6">
          {projections.map((proj) => {
            const heightPct = Math.max(12, Math.round((proj.estimatedSpend / maxSpend) * 100));
            return (
              <div key={proj.month} className="flex-1 min-w-0 flex flex-col items-center gap-2 group h-full justify-end">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#14141A] text-white text-[10px] font-bold py-1 px-2 rounded-md shadow-lg pointer-events-none whitespace-nowrap mb-1 max-w-full overflow-hidden text-ellipsis">
                  {formatMoney(proj.estimatedSpend, currency)}
                </div>
                {/* Bar */}
                <div
                  className="w-full max-w-[40px] rounded-t-xl bg-[#FAF8F5] border border-[#EAE6DC] group-hover:bg-[#FF2500] transition-all relative overflow-hidden flex items-end justify-center"
                  style={{ height: `${heightPct}%` }}
                >
                  <div className="w-full h-full bg-[#FF2500]/80 group-hover:bg-[#FF2500] transition-colors rounded-t-xl" />
                </div>
                {/* Month label */}
                <span className="text-[11px] font-bold text-[#7C766C] group-hover:text-[#1A1712] transition-colors">
                  {proj.shortMonth}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown Table & Optimization Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Category Details */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-[#E2DED4] shadow-sm">
          <div className="pb-4 border-b border-[#EAE6DC] mb-5">
            <h3 className="text-base font-extrabold text-[#1A1712]">Category Breakdown</h3>
            <p className="text-xs text-[#7C766C]">Spending distribution and annualized totals per sector</p>
          </div>

          <div className="flex flex-col gap-4">
            {categories.map((cat) => (
              <div key={cat.category} className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DC]">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3.5 h-3.5 rounded-md shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-bold text-[#1A1712] truncate">{cat.category}</span>
                    <span className="text-xs text-[#7C766C] shrink-0">({cat.count} services)</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-[#1A1712]">
                      {formatMoney(cat.monthlyAmount, currency)}/mo
                    </span>
                    <span className="text-xs text-[#7C766C] ml-2 font-semibold">({cat.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#EAE6DC]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-[#7C766C] mt-2">
                  <span>Yearly Impact: {formatMoney(cat.monthlyAmount * 12, currency)}/yr</span>
                  <span>Share of Total: {cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Smart Optimization Insights */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#14141A] text-white rounded-3xl p-6 border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-3">
              <Lightbulb className="w-4 h-4" />
              <span>Smart Optimization Insights</span>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-xs font-bold text-white mb-1">💡 Consolidate AI Tools</h4>
                <p className="text-[11px] text-[#A39E93] leading-relaxed">
                  You are tracking multiple AI subscriptions. Review if you need both ChatGPT Plus and Midjourney simultaneously.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-xs font-bold text-white mb-1">📅 Switch to Annual Billing</h4>
                <p className="text-[11px] text-[#A39E93] leading-relaxed">
                  Switching monthly tools like Figma and GitHub to annual billing can save an average of 15-20% per year.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-xs font-bold text-white mb-1">⏱️ Free Trial Expiration</h4>
                <p className="text-[11px] text-[#A39E93] leading-relaxed">
                  Subscrr automatically nudges you 24 hours before free trials convert into recurring paid charges.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
            <h3 className="text-base font-extrabold text-[#1A1712] mb-1">Payment Methods</h3>
            <p className="text-xs text-[#7C766C] mb-4">How your subscriptions are billed</p>

            <div className="flex flex-col gap-2.5">
              {Object.entries(paymentMap).map(([method, amt]) => (
                <div key={method} className="flex justify-between items-center py-2 border-b border-[#EAE6DC] last:border-0 text-xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-[#7C766C]" />
                    <span className="font-semibold text-[#1A1712]">{method}</span>
                  </div>
                  <span className="font-bold text-[#1A1712]">{formatMoney(amt, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
