"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthServiceProvider } from "../Application/Services/AuthServiceProvider";
import type { User } from "../Domain/entities/User.entity";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true, error: null });

  const service = AuthServiceProvider.getService();

  useEffect(() => {
    service
      .getCurrentUser()
      .then((user) => setState({ user, isLoading: false, error: null }))
      .catch(() => setState({ user: null, isLoading: false, error: null }));
  }, [service]);

  const login = useCallback(() => {
    window.location.href = service.getAuthUrl();
  }, [service]);

  const handleCallback = useCallback(
    async (code: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const user = await service.login(code);
        setState({ user, isLoading: false, error: null });
        return user;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Login failed";
        setState({ user: null, isLoading: false, error: message });
        return null;
      }
    },
    [service],
  );

  const logout = useCallback(() => {
    service.logout();
    setState({ user: null, isLoading: false, error: null });
  }, [service]);

  return { ...state, isAuthenticated: state.user !== null, login, logout, handleCallback };
}
