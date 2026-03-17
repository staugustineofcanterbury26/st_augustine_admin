import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, type AdminUser } from "@/lib/api";

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("admin_token"),
    isLoading: true,
    isAuthenticated: false,
  });

  // Validate existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    authApi
      .me()
      .then((res) => {
        setState({ user: res.data, token, isLoading: false, isAuthenticated: true });
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token, user } = res.data;
    localStorage.setItem("admin_token", token);
    setState({ user, token, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem("admin_token");
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
