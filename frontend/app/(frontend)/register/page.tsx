"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [budget, setBudget] = useState("250");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, name, currency, parseFloat(budget) || 0);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account. Email may already be in use.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#E2DED4] shadow-xl animate-in fade-in duration-300">
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="inline-block mb-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#14141A] p-2 flex items-center justify-center transition-transform group-hover:scale-105">
              <Image src="/assets/Icon.png" alt="Subscrr" width={32} height={32} className="rounded-lg" />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1A1712]">Create Subscrr Account</h1>
          <p className="text-xs text-[#7C766C] mt-1">
            Start tracking subscriptions, scanning receipts, and optimizing costs
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Email Address</label>
            <input
              type="email"
              required
              placeholder="alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Password (min. 6 characters)</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Monthly Budget ($)</label>
              <input
                type="number"
                min="0"
                placeholder="250"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-3 bg-[#FF2500] hover:bg-[#e02000] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 mt-2"
          >
            {isSubmitting ? "Creating Account..." : "Create Free Account"}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-[#EAE6DC] text-xs text-[#7C766C]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#FF2500] hover:underline">
            Sign in
          </Link>
        </div>
      </div>

      <Link href="/" className="text-xs text-[#7C766C] hover:text-[#1A1712] mt-6 transition-colors">
        ← Back to Landing Page
      </Link>
    </div>
  );
}
