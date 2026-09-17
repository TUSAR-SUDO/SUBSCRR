"use client";

import { useEffect } from "react";

/**
 * Root error boundary. Any unhandled render/data error in any route falls
 * here instead of white-screening the whole app. Shows a branded recovery
 * panel with a retry action and keeps the user oriented.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook point for Sentry/Datadog once wired in production.
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2DED4] p-8 text-center shadow-[0_20px_60px_-30px_rgba(26,23,18,0.35)]">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF2500]/10 text-2xl">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-[#1A1712] mb-2">Something went wrong</h1>
        <p className="text-sm text-[#7C766C] mb-6">
          An unexpected error occurred while loading this page. Your data is safe — try again.
        </p>
        {error.digest ? (
          <p className="text-[11px] text-[#A8A29A] mb-5 font-mono">
            Error ID: {error.digest}
          </p>
        ) : null}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-full bg-[#FF2500] text-white text-sm font-bold hover:bg-[#E01F00] transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-full border border-[#E2DED4] text-sm font-bold text-[#1A1712] hover:border-[#FF2500] transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
