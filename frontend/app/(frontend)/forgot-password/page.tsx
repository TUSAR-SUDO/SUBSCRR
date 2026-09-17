"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const { isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Dev convenience: the backend returns the reset link outside production.
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api")}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.message || "Failed to send reset email");
      }
      setSent(true);
      if (data.devResetToken && data.resetUrl) {
        setDevResetUrl(data.resetUrl as string);
      }
      // Show the dev shortcut ONLY when the mail was genuinely mocked
      // (ethereal/json transports). With real SMTP/Resend the email is
      // in the user's inbox — no on-screen link, no confusing banner.
      const mocked =
        !data.emailDelivered ||
        data.emailTransport === 'ethereal' ||
        data.emailTransport === 'json';
      if (mocked && data.resetUrl) {
        setDevResetUrl(data.resetUrl as string);
      } else {
        setDevResetUrl(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#E2DED4] shadow-xl animate-in fade-in duration-300">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="inline-block mb-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#14141A] p-2 flex items-center justify-center transition-transform group-hover:scale-105">
              <Image src="/assets/Icon.png" alt="Subscrr" width={32} height={32} className="rounded-lg" />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1A1712]">Reset your password</h1>
          <p className="text-xs text-[#7C766C] mt-1">
            Enter your account email and we&apos;ll send you a secure reset link.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed">
              If an account exists for <strong>{email}</strong>, a password reset link is on its way.
              The link expires in <strong>1 hour</strong> and can only be used once.
            </div>

            {/* Development-only shortcut so the flow is testable without SMTP */}
            {devResetUrl && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>Dev mode:</strong> email sending is mocked. Continue directly:{" "}
                <Link href={devResetUrl} className="font-bold underline">
                  open reset link
                </Link>
              </div>
            )}

            <Link
              href="/login"
              className="w-full py-2.5 bg-[#14141A] hover:bg-[#202028] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center shadow-sm"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-bold text-[#1A1712] mb-1.5">
                Email Address
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-3 bg-[#FF2500] hover:bg-[#e02000] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 mt-1"
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-1 text-xs text-[#7C766C]">
              Remembered it?{" "}
              <Link href="/login" className="font-bold text-[#FF2500] hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        )}
      </div>

      <Link href="/" className="text-xs text-[#7C766C] hover:text-[#1A1712] mt-6 transition-colors">
        ← Back to Landing Page
      </Link>
    </div>
  );
}
