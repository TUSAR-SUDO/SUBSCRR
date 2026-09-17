export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  default_currency: string;
  monthly_budget: number;
  /** Authoritative integer-cent budget storage. */
  monthly_budget_cents?: number;
  /** Per-channel email switches; null/absent = platform defaults. */
  email_preferences?: EmailPreferences | null;
  created_at: string;
  updated_at: string;
}

/** Which alert emails a user wants. Stored as JSON in users.email_preferences. */
export interface EmailPreferences {
  renewalAlerts?: boolean;
  trialAlerts?: boolean;
  budgetAlerts?: boolean;
}

export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'trial';

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  amount: number;
  /** Authoritative integer-cent storage for the amount. */
  amount_cents?: number;
  currency: string;
  billing_cycle: BillingCycle;
  category: string;
  status: SubscriptionStatus;
  next_renewal_date: string; // ISO date YYYY-MM-DD
  trial_end_date?: string | null;
  payment_method: string;
  website_url?: string | null;
  color?: string;
  icon?: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'renewal' | 'trial_ending' | 'budget_alert' | 'price_change' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: number; // 0 or 1
  renewal_date?: string | null;
  subscription_id?: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  email: string;
  source: string;
  notes?: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  monthlyTotal: number;
  yearlyTotal: number;
  dailyBurn: number;
  activeCount: number;
  pausedCount: number;
  trialCount: number;
  currency: string;
  monthlyBudget: number;
  budgetUtilizationPct: number;
  categoryBreakdown: {
    category: string;
    monthlyAmount: number;
    percentage: number;
    count: number;
    color: string;
  }[];
  upcomingRenewals: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    next_renewal_date: string;
    daysUntil: number;
    category: string;
    icon?: string;
    color?: string;
  }[];
  topSpends: {
    id: string;
    name: string;
    monthlyAmount: number;
    originalAmount: number;
    billing_cycle: string;
    category: string;
  }[];
}
