"use client";

import { useEffect } from "react";

/**
 * Dashboard-scoped error boundary. An error inside the authenticated app no
 * longer white-screens the shell — the sidebar layout context is replaced by
 * a focused recovery panel with retry.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2DED4] p-8 text-center shadow-[0_20px_60px_-30px_rgba(26,23,18,0.35)]">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF2500]/10 text-2xl">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-[#1A1712] mb-2">This section hit a snag</h2>
        <p className="text-sm text-[#7C766C] mb-6">
          We couldn&apos;t load part of your dashboard. Retry — if it persists, reload the page.
        </p>
        {error.digest ? (
          <p className="text-[11px] text-[#A8A29A] mb-5 font-mono">Error ID: {error.digest}</p>
        ) : null}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-full bg-[#FF2500] text-white text-sm font-bold hover:bg-[#E01F00] transition-colors"
          >
            Retry
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 rounded-full border border-[#E2DED4] text-sm font-bold text-[#1A1712] hover:border-[#FF2500] transition-colors"
          >
            Dashboard home
          </a>
        </div>
      </div>
    </div>
  );
}
