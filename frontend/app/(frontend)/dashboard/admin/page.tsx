"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { formatMoney } from "@/lib/format";
import {
  ShieldCheck,
  Users,
  Layers,
  Flame,
  Mail,
  Activity,
  AlertCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalLeads: number;
  totalPlatformMRC: number;
  topCategories: { category: string; count: number; total: number }[];
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  default_currency: string;
  monthly_budget: number;
  created_at: string;
  subscription_count: number;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, usersRes] = await Promise.all([
          api.get<AdminStats>("/admin/stats"),
          api.get<{ users: AdminUser[] }>("/admin/users"),
        ]);

        if (statsRes.success && statsRes.data) setStats(statsRes.data);
        if (usersRes.success && usersRes.data?.users) setUsers(usersRes.data.users);
      } catch (err: any) {
        setError(err.message || "Failed to load admin statistics. Make sure you are logged in as admin.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className="bg-white rounded-3xl p-12 border border-[#E2DED4] text-center max-w-lg mx-auto shadow-sm">
        <ShieldCheck className="w-12 h-12 text-[#FF2500] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#1A1712]">Admin Access Restricted</h3>
        <p className="text-xs text-[#7C766C] mt-1 mb-6">
          This dashboard requires Administrator privileges. You can log in using the admin demo account (<code>admin@subscrr.app</code> / <code>admin123</code>).
        </p>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-[#14141A] text-white rounded-xl text-xs font-bold transition-all"
        >
          Return to Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Administration
          </span>
          <span className="text-xs text-[#7C766C]">• Platform Statistics & User Management</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1712]">Platform Admin Portal</h1>
        <p className="text-xs sm:text-sm text-[#7C766C] mt-1">
          Live visibility into user accounts, total platform subscriptions, and waitlist leads.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
          <span className="text-xs font-bold text-[#7C766C] uppercase">Registered Users</span>
          <div className="text-3xl font-black text-[#1A1712] mt-2">{stats?.totalUsers || 0}</div>
          <p className="text-xs text-[#7C766C] mt-1">Total platform accounts</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
          <span className="text-xs font-bold text-[#7C766C] uppercase">Tracked Subscriptions</span>
          <div className="text-3xl font-black text-[#1A1712] mt-2">{stats?.totalSubscriptions || 0}</div>
          <p className="text-xs text-[#7C766C] mt-1">{stats?.activeSubscriptions || 0} currently active</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
          <span className="text-xs font-bold text-[#7C766C] uppercase">Platform MRC</span>
          <div className="text-3xl font-black text-[#FF2500] mt-2">
            {formatMoney(stats?.totalPlatformMRC || 0, "USD")}
          </div>
          <p className="text-xs text-[#7C766C] mt-1">Total recurring monthly volume</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
          <span className="text-xs font-bold text-[#7C766C] uppercase">Waitlist Leads</span>
          <div className="text-3xl font-black text-[#1A1712] mt-2">{stats?.totalLeads || 0}</div>
          <p className="text-xs text-[#7C766C] mt-1">Landing page submissions</p>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-white rounded-3xl border border-[#E2DED4] p-6 sm:p-8 shadow-sm">
        <h3 className="text-base font-extrabold text-[#1A1712] pb-4 border-b border-[#EAE6DC] mb-5">
          User Directory ({users.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1A1712]">
            <thead className="bg-[#FAF8F5] border-b border-[#EAE6DC] text-[#7C766C] uppercase font-bold text-[10px]">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Subscriptions</th>
                <th className="px-4 py-3">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DC]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-sm text-[#1A1712]">{u.name}</div>
                    <span className="text-[11px] text-[#7C766C]">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        u.role === "admin" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{u.default_currency}</td>
                  <td className="px-4 py-3 font-bold">{u.subscription_count} subscriptions</td>
                  <td className="px-4 py-3 text-[#7C766C]">{u.created_at?.split("T")[0] || u.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
