"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Container */}
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#E2DED4] shadow-xl animate-in fade-in duration-300">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="inline-block mb-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#14141A] p-2 flex items-center justify-center transition-transform group-hover:scale-105">
              <Image src="/assets/Icon.png" alt="Subscrr" width={32} height={32} className="rounded-lg" />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1A1712]">Sign in to Subscrr</h1>
          <p className="text-xs text-[#7C766C] mt-1">
            Access your subscriptions, live analytics, and AI scanner
          </p>
        </div>

        <div className="relative flex items-center justify-center mb-6">
          <div className="w-full border-t border-[#EAE6DC]" />
          <span className="bg-white px-3 text-[11px] font-bold text-[#7C766C] uppercase tracking-wider absolute">
            Or sign in with email
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Password</label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-semibold text-[#FF2500] hover:underline mb-1.5"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
          />

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-3 bg-[#FF2500] hover:bg-[#e02000] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 mt-2"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-6 pt-4 border-t border-[#EAE6DC] text-xs text-[#7C766C]">
          Don't have an account?{" "}
          <Link href="/register" className="font-bold text-[#FF2500] hover:underline">
            Create an account
          </Link>
        </div>
      </div>

      <Link href="/" className="text-xs text-[#7C766C] hover:text-[#1A1712] mt-6 transition-colors">
        ← Back to Landing Page
      </Link>
    </div>
  );
}
