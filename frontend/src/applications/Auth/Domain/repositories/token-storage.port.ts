import type { AuthToken } from "@/applications/Auth/Domain/value-objects/AuthToken.vo";

export interface TokenStorage {
  getToken(): AuthToken | null;
  setToken(token: AuthToken): void;
  clearToken(): void;
}
