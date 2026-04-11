import type { TokenStorage } from "@/applications/Auth/Domain/repositories/token-storage.port";
import { AuthToken } from "@/applications/Auth/Domain/value-objects/AuthToken.vo";

const STORAGE_KEY = "auth_token";

interface StoredToken {
  accessToken: string;
  expiresAt: string;
}

export class BrowserTokenStorage implements TokenStorage {
  getToken(): AuthToken | null {
    if (typeof window === "undefined") return null;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const stored: StoredToken = JSON.parse(raw);
      return AuthToken.create(stored.accessToken, new Date(stored.expiresAt));
    } catch {
      this.clearToken();
      return null;
    }
  }

  setToken(token: AuthToken): void {
    if (typeof window === "undefined") return;

    const stored: StoredToken = {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt.toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }

  clearToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}
