"use client";

import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { getAuthService } from "@/applications/Auth/Application/Services/AuthServiceProvider";
import type { User } from "@/applications/Auth/Domain/entities/User.entity";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  handleCallback: (code: string) => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => getAuthService(), []);

  useEffect(() => {
    service.getCurrentUser().then((result) => {
      if (result.isSuccess) {
        setUser(result.getValue());
      }
      setIsLoading(false);
    });
  }, [service]);

  const login = useCallback(() => {
    window.location.href = service.getAuthUrl();
  }, [service]);

  const handleCallback = useCallback(
    async (code: string) => {
      setIsLoading(true);
      setError(null);

      const result = await service.login(code);

      if (result.isSuccess) {
        const loggedInUser = result.getValue();
        setUser(loggedInUser);
        setIsLoading(false);
        return loggedInUser;
      }

      setError(result.getError());
      setIsLoading(false);
      return null;
    },
    [service],
  );

  const logout = useCallback(() => {
    service.logout();
    setUser(null);
    setError(null);
  }, [service]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      error,
      isAuthenticated: user !== null,
      login,
      logout,
      handleCallback,
    }),
    [user, isLoading, error, login, logout, handleCallback],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
