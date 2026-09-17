"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscriptions } from "@/context/SubscriptionContext";
import {
  Mail,
  Download,
  Check,
  AlertCircle,
  Shield,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import api from "@/lib/api";

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { seedDemoData, refreshData } = useSubscriptions();
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [currency, setCurrency] = useState(user?.default_currency || "USD");
  const [budget, setBudget] = useState(user?.monthly_budget?.toString() || "250");
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email notification preferences (per-channel switches)
  const [emailPrefs, setEmailPrefs] = useState({
    renewalAlerts: true,
    trialAlerts: true,
    budgetAlerts: true,
  });
  const [emailPrefsLoading, setEmailPrefsLoading] = useState(true);
  const [emailPrefsSaving, setEmailPrefsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ renewalAlerts: boolean; trialAlerts: boolean; budgetAlerts: boolean }>(
          "/notifications/email-preferences"
        );
        if (!cancelled && res.success && res.data) {
          setEmailPrefs({
            renewalAlerts: res.data.renewalAlerts,
            trialAlerts: res.data.trialAlerts,
            budgetAlerts: res.data.budgetAlerts,
          });
        }
      } catch {
        // Defaults are fine; the toggles just show the platform default state.
      } finally {
        if (!cancelled) setEmailPrefsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleEmailPref = async (key: keyof typeof emailPrefs) => {
    const next = { ...emailPrefs, [key]: !emailPrefs[key] };
    setEmailPrefs(next); // optimistic
    setEmailPrefsSaving(true);
    try {
      await api.patch("/notifications/email-preferences", { [key]: next[key] });
    } catch {
      setEmailPrefs(emailPrefs); // revert on failure
      setError("Could not update email preference. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setEmailPrefsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSavedSuccess(false);
    try {
      await updateProfile({
        name: name.trim(),
        default_currency: currency,
        monthly_budget: parseFloat(budget) || 0,
      });
      await refreshData();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const token = localStorage.getItem("subscrr_token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api");
      const res = await fetch(`${apiBase}/subscriptions/export/json`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed with HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscrr-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData();
      alert("Sample subscriptions successfully restored!");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF2500]">Preferences</span>
          <span className="text-xs text-[#7C766C]">• Account & Financial Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1712]">Settings</h1>
        <p className="text-xs sm:text-sm text-[#7C766C] mt-1">
          Manage your default currency, monthly budget thresholds, notification preferences, and data backups.
        </p>
      </div>

      {/* Success Alert */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-semibold animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Your settings have been saved successfully.</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile & Financial Settings Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DED4] shadow-sm">
        <h3 className="text-base font-extrabold text-[#1A1712] pb-4 border-b border-[#EAE6DC] mb-6">
          Profile & Financial Thresholds
        </h3>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              />
            </div>

            {/* Email (read only) */}
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full px-4 py-2.5 bg-gray-100 rounded-xl border border-[#E2DED4] text-sm text-[#7C766C] cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Default Currency */}
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="JPY">JPY (¥) - Japanese Yen</option>
                <option value="CAD">CAD ($) - Canadian Dollar</option>
                <option value="AUD">AUD ($) - Australian Dollar</option>
              </select>
            </div>

            {/* Monthly Budget Target */}
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Monthly Budget Limit ($)</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="250"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F5] rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              />
              <span className="text-[11px] text-[#7C766C] mt-1 block">
                Subscrr will trigger an alert when your monthly total approaches this threshold.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-[#EAE6DC]">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#14141A] hover:bg-[#202028] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>

      {/* Email Notifications */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DED4] shadow-sm">
        <h3 className="text-base font-extrabold text-[#1A1712] pb-4 border-b border-[#EAE6DC] mb-2 flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#FF2500]" />
          Email Notifications
        </h3>
        <p className="text-[11px] text-[#7C766C] mb-6">
          Choose which alerts also arrive in your inbox ({user?.email}). Password-reset emails are always sent.
        </p>

        <div className="flex flex-col gap-3">
          {([
            {
              key: "renewalAlerts" as const,
              title: "Renewal reminders",
              desc: "3 days and 1 day before a subscription renews.",
            },
            {
              key: "trialAlerts" as const,
              title: "Trial ending warnings",
              desc: "Before a free trial converts into a paid charge.",
            },
            {
              key: "budgetAlerts" as const,
              title: "Budget alerts",
              desc: "When monthly spend crosses 80% and 100% of your budget.",
            },
          ]).map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DC]"
            >
              <div>
                <h4 className="text-xs font-bold text-[#1A1712]">{item.title}</h4>
                <p className="text-[11px] text-[#7C766C] mt-0.5">{item.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailPrefs[item.key]}
                disabled={emailPrefsLoading || emailPrefsSaving}
                onClick={() => toggleEmailPref(item.key)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                  emailPrefs[item.key] ? "bg-[#FF2500]" : "bg-[#D8D3C8]"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    emailPrefs[item.key] ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management & Backups */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DED4] shadow-sm">
        <h3 className="text-base font-extrabold text-[#1A1712] pb-4 border-b border-[#EAE6DC] mb-6">
          Data Management & Backups
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DC] flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#1A1712] mb-1">Export Full JSON Backup</h4>
              <p className="text-[11px] text-[#7C766C] mb-4">
                Download all your subscriptions and settings in standard JSON format for offline backup.
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-white border border-[#E2DED4] hover:bg-[#EAE6DC] text-[#1A1712] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#7C766C]" />
              <span>Download JSON</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DC] flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#1A1712] mb-1">Restore Demo Subscriptions</h4>
              <p className="text-[11px] text-[#7C766C] mb-4">
                Instantly populate your account with sample services (Netflix, ChatGPT Plus, Figma, Spotify, etc.).
              </p>
            </div>
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-4 py-2 bg-[#14141A] hover:bg-[#202028] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
              <span>{isSeeding ? "Restoring..." : "Restore Demo Data"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Info & Logout */}
      <div className="bg-[#14141A] text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF2500] uppercase mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Account Session</span>
          </div>
          <h4 className="text-base font-bold text-white">{user?.name} ({user?.role === "admin" ? "Admin" : "Standard User"})</h4>
          <p className="text-xs text-[#A39E93] mt-0.5">{user?.email}</p>
        </div>

        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
