"use client";
import React, { useState } from "react";
import api from "@/lib/api";
import { Mail, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function WaitlistLeadSection() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await api.post("/leads", {
        email: email.trim(),
        source: "landing_page_waitlist",
      });

      if (res.success) {
        setMessage(res.message || "Thank you! You've been added to our early access priority list.");
        setEmail("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="px-6 py-16 max-w-4xl mx-auto text-center" aria-label="Early Access Waitlist">
      <div className="bg-white rounded-[36px] p-8 sm:p-12 border border-[#E2DED4] shadow-sm">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF2500] mb-2 block">
          Stay Ahead
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A1712] mb-2">
          Get notified when new features drop.
        </h2>
        <p className="text-xs sm:text-sm text-[#7C766C] max-w-md mx-auto mb-6">
          Be the first to test multi-bank auto-sync, Apple Watch complications, and predictive cost alerts.
        </p>

        {message && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-center gap-2 max-w-md mx-auto mb-4 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-center gap-2 max-w-md mx-auto mb-4">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
          <input
            type="email"
            required
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 bg-[#FAF8F5] rounded-2xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-[#14141A] hover:bg-[#202028] text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
          >
            <span>{isSubmitting ? "Submitting..." : "Join List"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#FF2500]" />
          </button>
        </form>
        <p className="text-[11px] text-[#7C766C] mt-3">Zero spam. Unsubscribe at any time.</p>
      </div>
    </section>
  );
}
