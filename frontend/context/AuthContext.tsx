"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/lib/api";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, currency?: string, budget?: number) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; default_currency?: string; monthly_budget?: number }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from localStorage and fetch fresh profile
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem("subscrr_token");
        const storedUser = localStorage.getItem("subscrr_user");

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }

          // Fetch fresh user profile from backend
          const res = await api.get<{ user: User }>("/auth/me");
          if (res.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem("subscrr_user", JSON.stringify(res.data.user));
          }
        }
      } catch (err: any) {
        if (err?.status === 401) {
          // Stored token is expired or revoked — clear it silently so the
          // next render is a clean signed-out state (no error UI on boot).
          api.clearToken();
          setToken(null);
          setUser(null);
        } else {
          // Transient (network, rate limit): keep the stored session and
          // let the next boot re-validate.
          console.warn("Session check warning:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ user: User; token: string }>("/auth/login", { email, password });
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        api.setToken(res.data.token);
        localStorage.setItem("subscrr_user", JSON.stringify(res.data.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, currency = "USD", budget = 0) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ user: User; token: string }>("/auth/register", {
        email,
        password,
        name,
        default_currency: currency,
        monthly_budget: budget,
      });
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        api.setToken(res.data.token);
        localStorage.setItem("subscrr_user", JSON.stringify(res.data.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    api.clearToken();
  };

  const updateProfile = async (data: { name?: string; default_currency?: string; monthly_budget?: number }) => {
    const res = await api.put<{ user: User }>("/auth/profile", data);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      localStorage.setItem("subscrr_user", JSON.stringify(res.data.user));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
