export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  default_currency: string;
  monthly_budget: number;
  email_preferences?: EmailPreferences | null;
  created_at?: string;
  updated_at?: string;
}

/** Which alert emails a user wants (backend stores as JSON). */
export interface EmailPreferences {
  renewalAlerts?: boolean;
  trialAlerts?: boolean;
  budgetAlerts?: boolean;
}

export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'trial';

export interface Subscription {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  category: string;
  status: SubscriptionStatus;
  next_renewal_date: string; // YYYY-MM-DD
  trial_end_date?: string | null;
  payment_method: string;
  website_url?: string | null;
  color?: string;
  icon?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'renewal' | 'trial_ending' | 'budget_alert' | 'price_change' | 'system';
  is_read: number;
  renewal_date?: string | null;
  subscription_id?: string | null;
  created_at: string;
}

export interface CategoryBreakdown {
  category: string;
  monthlyAmount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface UpcomingRenewal {
  id: string;
  name: string;
  amount: number;
  currency: string;
  next_renewal_date: string;
  daysUntil: number;
  category: string;
  icon?: string;
  color?: string;
}

export interface TopSpend {
  id: string;
  name: string;
  monthlyAmount: number;
  originalAmount: number;
  billing_cycle: string;
  category: string;
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
  categoryBreakdown: CategoryBreakdown[];
  upcomingRenewals: UpcomingRenewal[];
  topSpends: TopSpend[];
}

export interface AnalyticsProjection {
  month: string;
  shortMonth: string;
  year: number;
  estimatedSpend: number;
  cumulativeSpend: number;
}

export interface CalendarDayItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  /** Amount converted to the user's default currency. */
  convertedAmount?: number;
  category: string;
  icon?: string;
  color?: string;
  billing_cycle: string;
}

export interface CalendarDay {
  day: number;
  date: string;
  totalAmount: number;
  items: CalendarDayItem[];
}

export interface CalendarData {
  month: number;
  year: number;
  currency?: string;
  totalMonthSpend: number;
  days: CalendarDay[];
}

export interface ParsedReceiptData {
  name: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  category: string;
  status: SubscriptionStatus;
  next_renewal_date: string;
  payment_method: string;
  website_url?: string;
  color: string;
  icon?: string;
  notes?: string;
  confidence: number;
  extractedRaw?: string;
  /** Which engine produced the result: real AI vision or the local basic parser. */
  engine?: "ai" | "local";
}
