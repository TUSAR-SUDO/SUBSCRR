"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function LiveCalculator() {
  const [subCount, setSubCount] = useState(7);
  const [avgCost, setAvgCost] = useState(22);

  const monthlyTotal = subCount * avgCost;
  const yearlyTotal = monthlyTotal * 12;
  const dailyBurn = monthlyTotal / 30.416;
  const estimatedSavings = Math.round(yearlyTotal * 0.18); // ~18% saved from catching forgotten subscriptions

  return (
    <section className="px-6 py-20 max-w-5xl mx-auto" id="calculator" aria-label="Interactive Cost Calculator">
      <div className="bg-[#14141A] text-white rounded-[40px] p-8 sm:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow background accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF2500]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF2500] mb-2 block">
            Interactive Calculator
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Calculate your honest subscription leak.
          </h2>
          <p className="text-sm text-[#A39E93] leading-relaxed">
            Adjust the sliders below to see what you really spend per day, month, and year across forgotten tools and recurring fees.
          </p>
        </div>

        {/* Sliders and Metrics Grid — min-w-0 on children lets long numbers
            ($5,808, ~$1,0xx) shrink inside their grid tracks instead of
            widening them past the card on narrow viewports. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Controls */}
          <div className="flex flex-col gap-6 bg-white/5 p-6 sm:p-8 rounded-3xl border border-white/10 min-w-0">
            {/* Slider 1: Number of subscriptions */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#A39E93] uppercase">Number of Subscriptions</span>
                <span className="text-base font-extrabold text-[#FF2500]">{subCount} services</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={subCount}
                onChange={(e) => setSubCount(parseInt(e.target.value, 10))}
                className="w-full accent-[#FF2500] cursor-pointer h-2 bg-white/20 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-[#7C766C] mt-1">
                <span>1 sub</span>
                <span>12 average</span>
                <span>25+ subs</span>
              </div>
            </div>

            {/* Slider 2: Average monthly cost */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#A39E93] uppercase">Average Monthly Cost</span>
                <span className="text-base font-extrabold text-[#FF2500]">${avgCost}/mo</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={avgCost}
                onChange={(e) => setAvgCost(parseInt(e.target.value, 10))}
                className="w-full accent-[#FF2500] cursor-pointer h-2 bg-white/20 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-[#7C766C] mt-1">
                <span>$5/mo (basic)</span>
                <span>$50/mo</span>
                <span>$100/mo (pro tools)</span>
              </div>
            </div>
          </div>

          {/* Results Box */}
          <div className="flex flex-col gap-4 min-w-0">
            <div className="grid grid-cols-2 gap-3 min-w-0">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 min-w-0">
                <span className="text-xs font-semibold text-[#A39E93] block mb-1">Monthly Cost</span>
                <span className="text-2xl sm:text-3xl font-black text-white tabular-nums block truncate">${monthlyTotal.toFixed(0)}</span>
                <span className="text-[11px] text-[#A39E93] block mt-1">~${dailyBurn.toFixed(2)}/day</span>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 min-w-0">
                <span className="text-xs font-semibold text-[#A39E93] block mb-1">Annual Commitment</span>
                <span className="text-2xl sm:text-3xl font-black text-white tabular-nums block truncate">${yearlyTotal.toLocaleString()}</span>
                <span className="text-[11px] text-[#A39E93] block mt-1">Total run-rate</span>
              </div>
            </div>

            {/* Savings Callout */}
            <div className="p-4 rounded-2xl bg-[#FF2500]/15 border border-[#FF2500]/30 flex items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block">Est. Annual Savings with Subscrr</span>
                <span className="text-[11px] text-[#A39E93]">By catching unwanted auto-renewals & trial expirations</span>
              </div>
              <span className="text-xl font-black text-[#FF2500] shrink-0 whitespace-nowrap">~${estimatedSavings.toLocaleString()}/yr</span>
            </div>

            <Link
              href="/dashboard"
              className="w-full py-3.5 bg-[#FF2500] hover:bg-[#e02000] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FF2500]/25 transition-all hover:shadow-[#FF2500]/40 active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>Track Your Subscriptions Live in Web App</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
