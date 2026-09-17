"use client";
import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSubscriptions } from "@/context/SubscriptionContext";
import api from "@/lib/api";
import { ParsedReceiptData } from "@/types";
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ScanLine,
  Image as ImageIcon,
  Type,
  X,
} from "lucide-react";

type Mode = "upload" | "text";

export default function AIScannerPage() {
  const router = useRouter();
  const { addSubscription } = useSubscriptions();

  const [mode, setMode] = useState<Mode>("upload");
  const [statementText, setStatementText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedReceiptData | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const acceptFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      const ok = ["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type);
      if (!ok) {
        setError("Unsupported file — use PNG, JPG, WebP or a PDF receipt.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File is larger than 10 MB.");
        return;
      }
      setError(null);
      setParsedResult(null);
      setSuccessMessage(null);
      setSelectedFile(file);
      setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    },
    []
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleScan = async () => {
    if (mode === "upload" && !selectedFile) {
      setError("Choose a receipt image first.");
      return;
    }
    if (mode === "text" && !statementText.trim()) {
      setError("Paste your receipt or statement text first.");
      return;
    }
    setIsScanning(true);
    setError(null);
    setSuccessMessage(null);
    setParsedResult(null);
    try {
      let res;
      if (mode === "upload") {
        const formData = new FormData();
        formData.append("receiptImage", selectedFile!);
        res = await api.post<ParsedReceiptData>("/ai/scan-receipt", formData);
      } else {
        res = await api.post<ParsedReceiptData>("/ai/scan-receipt", { statementText });
      }
      if (res.success && res.data) {
        setParsedResult(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed — try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddToSubscriptions = async () => {
    if (!parsedResult) return;
    setIsAdding(true);
    setError(null);
    try {
      await addSubscription({
        name: parsedResult.name,
        amount: parsedResult.amount,
        currency: parsedResult.currency,
        billing_cycle: parsedResult.billing_cycle,
        category: parsedResult.category,
        status: parsedResult.status,
        next_renewal_date: parsedResult.next_renewal_date,
        payment_method: parsedResult.payment_method,
        website_url: parsedResult.website_url,
        color: parsedResult.color,
        icon: parsedResult.icon || "Layers",
        notes: parsedResult.notes,
      });

      setSuccessMessage(`"${parsedResult.name}" added to your subscriptions.`);
      setTimeout(() => router.push("/dashboard/subscriptions"), 1100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add subscription");
    } finally {
      setIsAdding(false);
    }
  };

  const amountOk = parsedResult && parsedResult.amount > 0;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Spend Engine
          </span>
          <span className="text-xs text-[#7C766C]">• Vision-powered receipt & statement parser</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1712]">AI Receipt Scanner</h1>
        <p className="text-xs sm:text-sm text-[#7C766C] mt-1">
          Drop in a real receipt, invoice screenshot, or paste billing text — the AI reads the merchant, price, cycle and next renewal date. No demo data, ever.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Input ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Mode tabs */}
          <div className="flex items-center bg-white p-1.5 rounded-2xl border border-[#E2DED4] shadow-xs">
            {([
              ["upload", "Scan Image", ImageIcon],
              ["text", "Paste Text", Type],
            ] as const).map(([m, label, Icon]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === m ? "bg-[#14141A] text-white shadow-xs" : "text-[#7C766C] hover:text-[#1A1712]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {mode === "upload" ? (
            /* ── Dropzone / preview ── */
            <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`relative rounded-2xl p-10 text-center cursor-pointer border-2 border-dashed transition-all duration-200 ${
                    isDragging
                      ? "border-[#FF2500] bg-[#FF2500]/5 scale-[1.01]"
                      : "border-[#E2DED4] hover:border-[#FF2500]/60 hover:bg-[#FAF8F5]"
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => acceptFile(e.target.files?.[0])}
                  />
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#FF2500]/10 flex items-center justify-center transition-transform ${isDragging ? "scale-110" : ""}`}>
                    <UploadCloud className="w-8 h-8 text-[#FF2500]" />
                  </div>
                  <h4 className="text-sm font-extrabold text-[#1A1712]">
                    {isDragging ? "Drop it here" : "Drag a receipt here, or click to browse"}
                  </h4>
                  <p className="text-xs text-[#7C766C] mt-1.5">
                    Invoice screenshots, billing emails as images, receipt photos — PNG · JPG · WebP · PDF, up to 10 MB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="relative rounded-2xl overflow-hidden border border-[#EAE6DC] bg-[#14141A] min-h-[220px] flex items-center justify-center">
                    {previewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={previewUrl} alt="Receipt preview" className="max-h-[320px] w-auto object-contain" />
                    ) : (
                      <div className="py-16 text-center text-white/70 text-xs flex flex-col items-center gap-2">
                        <FileTextPlaceholder />
                        {selectedFile.name}
                      </div>
                    )}
                    {isScanning && (
                      <div className="scan-overlay absolute inset-0" aria-hidden="true">
                        <div className="scan-line" />
                      </div>
                    )}
                    <button
                      onClick={clearFile}
                      disabled={isScanning}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors disabled:opacity-40"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1A1712] truncate flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#FF2500]" />
                      {selectedFile.name}
                    </span>
                    <span className="text-[#7C766C] shrink-0">{(selectedFile.size / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Text paste ── */
            <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1A1712] mb-1">Paste billing text</h3>
                <p className="text-xs text-[#7C766C]">
                  Copy the confirmation email, invoice text, or your bank&apos;s transaction line.
                </p>
              </div>
              <textarea
                rows={7}
                placeholder={"e.g.\nChatGPT Plus — Monthly Subscription\nAmount: $20.00 USD\nPaid with Apple Pay on Sep 14, 2026\nNext billing date: Oct 14, 2026"}
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
                className="w-full p-4 bg-[#FAF8F5] rounded-2xl border border-[#E2DED4] text-xs text-[#1A1712] leading-relaxed focus:outline-none focus:border-[#FF2500] resize-y"
              />
            </div>
          )}

          {/* Scan button */}
          <button
            onClick={handleScan}
            disabled={isScanning || (mode === "upload" ? !selectedFile : !statementText.trim())}
            className="w-full py-3.5 bg-[#14141A] hover:bg-[#202028] text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI is reading your receipt…</span>
              </>
            ) : (
              <>
                <ScanLine className="w-4 h-4 text-[#FF2500]" />
                <span>Scan with AI</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Right: Result ───────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DED4] shadow-sm flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DC] mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1712]">Extraction Result</h3>
                  <p className="text-xs text-[#7C766C]">Review before adding — every field is what the AI read, not a guess from us.</p>
                </div>
                {parsedResult && (
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold ${
                      parsedResult.engine === "ai"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {parsedResult.engine === "ai" ? "AI vision" : "Basic local parse"}
                  </span>
                )}
              </div>

              {isScanning ? (
                <div className="flex flex-col items-center justify-center py-16 gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#FF2500]/10 flex items-center justify-center">
                    <ScanLine className="w-7 h-7 text-[#FF2500] animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-extrabold text-[#1A1712]">Reading your receipt</p>
                    <p className="text-xs text-[#7C766C] mt-1">Extracting merchant, price, cycle and renewal date…</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-[#FF2500]/70"
                        style={{ animation: `notif-pulse 1s ease-in-out ${i * 0.18}s infinite` }}
                      />
                    ))}
                  </div>
                </div>
              ) : parsedResult ? (
                <div className="flex flex-col gap-4">
                  {/* Service preview */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DC]">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm"
                      style={{ backgroundColor: parsedResult.color }}
                    >
                      {parsedResult.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-[#1A1712] truncate">{parsedResult.name}</h4>
                      <span className="text-xs text-[#7C766C]">
                        {parsedResult.category} • {parsedResult.payment_method}
                      </span>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-lg font-black text-[#1A1712] leading-none">
                        {parsedResult.currency} {parsedResult.amount > 0 ? parsedResult.amount.toLocaleString() : "—"}
                      </p>
                      <span className="text-[10px] text-[#7C766C] capitalize">{parsedResult.billing_cycle}</span>
                    </div>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <DetailCell label="Next renewal" value={parsedResult.next_renewal_date} />
                    <DetailCell label="Status" value={parsedResult.status} />
                    <DetailCell label="Payment method" value={parsedResult.payment_method} />
                    <DetailCell label="AI confidence" value={`${parsedResult.confidence}%`} accent />
                  </div>

                  {!amountOk && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        The amount couldn&apos;t be read reliably. Fix it on the subscriptions page after adding —
                        we never invent prices.
                      </span>
                    </div>
                  )}

                  {parsedResult.confidence < 60 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                      Low confidence ({parsedResult.confidence}%) — double-check the fields before saving.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DC] flex items-center justify-center">
                    <ScanLine className="w-7 h-7 text-[#A39E93]" />
                  </div>
                  <p className="text-sm font-bold text-[#1A1712]">Nothing scanned yet</p>
                  <p className="text-xs text-[#7C766C] max-w-[260px]">
                    Your extracted subscription will appear here — structured and ready to save.
                  </p>
                </div>
              )}
            </div>

            {/* Action */}
            {parsedResult && !isScanning && (
              <div className="flex flex-col gap-3 mt-6">
                {successMessage ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {successMessage}
                  </div>
                ) : (
                  <button
                    onClick={handleAddToSubscriptions}
                    disabled={isAdding}
                    className="w-full py-3 bg-[#FF2500] hover:bg-[#e02000] text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
                  >
                    {isAdding ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Adding…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Add to Subscriptions
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DC]">
      <p className="text-[10px] uppercase tracking-wide font-bold text-[#7C766C]">{label}</p>
      <p className={`text-xs font-bold mt-0.5 ${accent ? "text-[#FF2500]" : "text-[#1A1712]"} capitalize`}>{value}</p>
    </div>
  );
}

function FileTextPlaceholder() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-50">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
