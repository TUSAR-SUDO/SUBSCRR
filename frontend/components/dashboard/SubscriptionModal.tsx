"use client";
import React, { useState, useEffect } from "react";
import { useSubscriptions } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { Subscription, BillingCycle, SubscriptionStatus } from "@/types";
import { X, Sparkles, AlertCircle, Check, Calendar } from "lucide-react";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionToEdit?: Subscription | null;
}

const categories = [
  "AI Tools",
  "Entertainment",
  "Music",
  "Development",
  "Design",
  "Cloud Storage",
  "Productivity",
  "Health & Fitness",
  "Gaming",
  "Utilities",
  "Other",
];

const colorOptions = [
  "#FF2500", // Subscrr Red
  "#10A37F", // OpenAI Emerald
  "#E50914", // Netflix Crimson
  "#1DB954", // Spotify Green
  "#24292F", // GitHub Dark
  "#0071E3", // Apple Blue
  "#F24E1E", // Figma Orange
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
];

const iconOptions = [
  "Layers",
  "Bot",
  "Tv",
  "Music",
  "Code",
  "Figma",
  "Cloud",
  "Server",
  "Sparkles",
  "Cpu",
  "Activity",
  "Youtube",
  "FileText",
];

const paymentMethods = ["Apple Pay", "Credit Card", "PayPal", "Google Pay", "Bank Transfer"];

export default function SubscriptionModal({
  isOpen,
  onClose,
  subscriptionToEdit,
}: SubscriptionModalProps) {
  const { addSubscription, updateSubscription } = useSubscriptions();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [category, setCategory] = useState("AI Tools");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [nextRenewalDate, setNextRenewalDate] = useState("");
  const [trialEndDate, setTrialEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [color, setColor] = useState("#FF2500");
  const [icon, setIcon] = useState("Layers");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form if editing
  useEffect(() => {
    if (subscriptionToEdit) {
      setName(subscriptionToEdit.name);
      setDescription(subscriptionToEdit.description || "");
      setAmount(subscriptionToEdit.amount.toString());
      setCurrency(subscriptionToEdit.currency || user?.default_currency || "USD");
      setBillingCycle(subscriptionToEdit.billing_cycle);
      setCategory(subscriptionToEdit.category);
      setStatus(subscriptionToEdit.status);
      setNextRenewalDate(subscriptionToEdit.next_renewal_date);
      setTrialEndDate(subscriptionToEdit.trial_end_date || "");
      setPaymentMethod(subscriptionToEdit.payment_method || "Credit Card");
      setWebsiteUrl(subscriptionToEdit.website_url || "");
      setColor(subscriptionToEdit.color || "#FF2500");
      setIcon(subscriptionToEdit.icon || "Layers");
      setNotes(subscriptionToEdit.notes || "");
    } else {
      // Defaults for new subscription
      setName("");
      setDescription("");
      setAmount("");
      setCurrency(user?.default_currency || "USD");
      setBillingCycle("monthly");
      setCategory("AI Tools");
      setStatus("active");
      setColor("#FF2500");
      setIcon("Layers");
      setPaymentMethod("Apple Pay");
      setWebsiteUrl("");
      setNotes("");

      // Default next renewal date = 1 month from today
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 1);
      setNextRenewalDate(defaultDate.toISOString().split("T")[0]);
      setTrialEndDate("");
    }
    setError(null);
  }, [subscriptionToEdit, user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a subscription name.");
      return;
    }

    if (!nextRenewalDate) {
      setError("Please select the next renewal date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        amount: parsedAmount,
        currency,
        billing_cycle: billingCycle,
        category,
        status,
        next_renewal_date: nextRenewalDate,
        trial_end_date: status === "trial" && trialEndDate ? trialEndDate : null,
        payment_method: paymentMethod,
        website_url: websiteUrl.trim() || undefined,
        color,
        icon,
        notes: notes.trim() || undefined,
      };

      if (subscriptionToEdit) {
        await updateSubscription(subscriptionToEdit.id, payload);
      } else {
        await addSubscription(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#F4F2EC] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E2DED4] p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2DED4] mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <span className="font-bold text-base">{name ? name[0].toUpperCase() : "S"}</span>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#1A1712]">
                {subscriptionToEdit ? "Edit Subscription" : "Add Subscription"}
              </h3>
              <p className="text-xs text-[#7C766C]">
                {subscriptionToEdit
                  ? "Update subscription terms and pricing"
                  : "Track recurring payments, renewal schedules, and expenses"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7C766C] hover:text-[#1A1712] hover:bg-[#EAE6DC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Service Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">
                Service Name <span className="text-[#FF2500]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Netflix, ChatGPT Plus, Figma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount, Currency & Billing Cycle */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">
                Cost <span className="text-[#FF2500]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="19.99"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              >
                {["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Billing Cycle</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>

          {/* Status & Next Renewal Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              >
                <option value="active">Active (Renewing)</option>
                <option value="paused">Paused</option>
                <option value="trial">Free Trial</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">
                Next Renewal Date <span className="text-[#FF2500]">*</span>
              </label>
              <input
                type="date"
                required
                value={nextRenewalDate}
                onChange={(e) => setNextRenewalDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              />
            </div>
          </div>

          {/* Trial End Date if status is trial */}
          {status === "trial" && (
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Trial End Date</label>
              <input
                type="date"
                value={trialEndDate}
                onChange={(e) => setTrialEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              />
            </div>
          )}

          {/* Payment Method & Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              >
                {paymentMethods.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Website URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
              />
            </div>
          </div>

          {/* Color Tag */}
          <div>
            <label className="block text-xs font-bold text-[#1A1712] mb-2">Accent Brand Color</label>
            <div className="flex flex-wrap gap-2 items-center">
              {colorOptions.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-[#1A1712]" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#1A1712] mb-1.5">Notes / Reminders</label>
            <textarea
              rows={2}
              placeholder="e.g. Shared with team, cancel before trial ends, annual renewal discount"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-white rounded-xl border border-[#E2DED4] text-sm text-[#1A1712] focus:outline-none focus:border-[#FF2500]"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2DED4] mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#E2DED4] text-sm font-semibold text-[#7C766C] hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#14141A] hover:bg-[#202028] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : subscriptionToEdit
                ? "Save Changes"
                : "Add Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
