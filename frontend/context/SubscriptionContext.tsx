"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "@/lib/api";
import { useAuth } from "./AuthContext";
import { Subscription, AnalyticsSummary, Notification } from "@/types";

interface SubscriptionFilters {
  search: string;
  category: string;
  status: string;
  billing_cycle: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface SubscriptionContextType {
  subscriptions: Subscription[];
  analytics: AnalyticsSummary | null;
  notifications: Notification[];
  unreadNotifCount: number;
  isLoading: boolean;
  filters: SubscriptionFilters;
  setFilters: React.Dispatch<React.SetStateAction<SubscriptionFilters>>;
  refreshData: () => Promise<void>;
  addSubscription: (sub: Omit<Subscription, "id">) => Promise<Subscription>;
  updateSubscription: (id: string, sub: Partial<Subscription>) => Promise<Subscription>;
  deleteSubscription: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  seedDemoData: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  /** Permanently dismiss (delete) one notification — animated removal in the UI. */
  dismissNotification: (id: string) => Promise<void>;
}

const defaultFilters: SubscriptionFilters = {
  search: "",
  category: "all",
  status: "all",
  billing_cycle: "all",
  sortBy: "next_renewal_date",
  sortOrder: "asc",
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<SubscriptionFilters>(defaultFilters);

  // Fetch subscriptions with current filters
  const fetchSubscriptions = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.category !== "all") params.append("category", filters.category);
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.billing_cycle !== "all") params.append("billing_cycle", filters.billing_cycle);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

      const res = await api.get<{ subscriptions: Subscription[] }>(`/subscriptions?${params.toString()}`);
      if (res.success && res.data) {
        setSubscriptions(res.data.subscriptions);
      }
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
    }
  }, [token, filters]);

  // Fetch analytics summary
  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<AnalyticsSummary>("/analytics/summary");
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  }, [token]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>("/notifications");
      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setUnreadNotifCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [token]);

  const refreshData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      await Promise.all([fetchSubscriptions(), fetchAnalytics(), fetchNotifications()]);
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchSubscriptions, fetchAnalytics, fetchNotifications]);

  useEffect(() => {
    if (token) {
      refreshData();
    } else {
      setSubscriptions([]);
      setAnalytics(null);
      setNotifications([]);
      setUnreadNotifCount(0);
    }
  }, [token, refreshData]);

  const addSubscription = async (sub: Omit<Subscription, "id">): Promise<Subscription> => {
    const res = await api.post<{ subscription: Subscription }>("/subscriptions", sub);
    if (res.success && res.data?.subscription) {
      await refreshData();
      return res.data.subscription;
    }
    throw new Error(res.message || "Failed to add subscription");
  };

  const updateSubscription = async (id: string, sub: Partial<Subscription>): Promise<Subscription> => {
    const res = await api.put<{ subscription: Subscription }>(`/subscriptions/${id}`, sub);
    if (res.success && res.data?.subscription) {
      await refreshData();
      return res.data.subscription;
    }
    throw new Error(res.message || "Failed to update subscription");
  };

  const deleteSubscription = async (id: string) => {
    const res = await api.delete(`/subscriptions/${id}`);
    if (res.success) {
      await refreshData();
    } else {
      throw new Error(res.message || "Failed to delete subscription");
    }
  };

  const toggleStatus = async (id: string) => {
    const res = await api.patch(`/subscriptions/${id}/toggle-status`);
    if (res.success) {
      await refreshData();
    } else {
      throw new Error(res.message || "Failed to toggle status");
    }
  };

  const seedDemoData = async () => {
    const res = await api.post("/subscriptions/seed-demo");
    if (res.success) {
      await refreshData();
    }
  };

  const markNotificationRead = async (id: string) => {
    const res = await api.patch(`/notifications/${id}/read`);
    if (res.success) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllNotificationsRead = async () => {
    const res = await api.post("/notifications/read-all");
    if (res.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadNotifCount(0);
    }
  };

  const dismissNotification = async (id: string) => {
    const res = await api.delete(`/notifications/${id}`);
    if (res.success) {
      // Remove locally (the exit animation runs in the component while the
      // request is in flight; by the time it resolves, the row disappears).
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        analytics,
        notifications,
        unreadNotifCount,
        isLoading,
        filters,
        setFilters,
        refreshData,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        toggleStatus,
        seedDemoData,
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscriptions must be used within a SubscriptionProvider");
  }
  return context;
}
