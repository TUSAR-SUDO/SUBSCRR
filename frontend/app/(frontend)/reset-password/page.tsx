"use client";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenState, setTokenState] = useState<"checking" | "valid" | "invalid">(
    token ? "checking" : "invalid"
  );

  // Validate the token on mount so users get early feedback.
  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api")}/auth/verify-reset-token/${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (!cancelled) setTokenState(data.valid ? "valid" : "invalid");
      } catch {
        if (!cancelled) setTokenState("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api")}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.message || "Failed to reset password");
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#E2DED4] shadow-xl animate-in fade-in duration-300">
      <div className="flex flex-col items-center text-center mb-6">
        <Link href="/" className="inline-block mb-3 group">
          <div className="w-12 h-12 rounded-2xl bg-[#14141A] p-2 flex items-center justify-center transition-transform group-hover:scale-105">
            <Image src="/assets/Icon.png" alt="Subscrr" width={32} height={32} className="rounded-lg" />
          </div>
        </Link>
        <h1 className="text-2xl font-extrabold text-[#1A1712]">Choose a new password</h1>
        <p className="text-xs text-[#7C766C] mt-1">
          Pick something strong — at least 6 characters.
        </p>
      </div>

      {tokenState === "invalid" && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
          This reset link is invalid, already used, or expired.{" "}
          <Link href="/forgot-password" className="font-bold underline">
            Request a new one
          </Link>
          .
        </div>
      )}

      {tokenState === "checking" && (
        <p className="text-center text-xs text-[#7C766C] mb-4">Validating reset link…</p>
      )}

      {success ? (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed mb-4">
          Your password has been updated. Redirecting you to sign in…
        </div>
      ) : (
        tokenState === "valid" && (
          <>
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="new-password" className="block text-xs font-bold text-[#1A1712] mb-1.5">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-bold text-[#1A1712] mb-1.5">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-xs text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#FF2500] hover:bg-[#e02000] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 mt-1"
              >
                {isSubmitting ? "Updating..." : "Update Password"}
              </button>
            </form>
          </>
        )
      )}

      <div className="text-center mt-6 pt-4 border-t border-[#EAE6DC] text-xs text-[#7C766C]">
        <Link href="/login" className="font-bold text-[#FF2500] hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams requires a Suspense boundary during static prerender.
  return (
    <div className="min-h-screen bg-[#F4F2EC] flex flex-col justify-center items-center p-4 sm:p-6">
      <Suspense
        fallback={
          <div className="w-10 h-10 border-3 border-[#FF2500] border-t-transparent rounded-full animate-spin" />
        }
      >
        <ResetPasswordForm />
      </Suspense>
      <Link href="/" className="text-xs text-[#7C766C] hover:text-[#1A1712] mt-6 transition-colors">
        ← Back to Landing Page
      </Link>
    </div>
  );
}
