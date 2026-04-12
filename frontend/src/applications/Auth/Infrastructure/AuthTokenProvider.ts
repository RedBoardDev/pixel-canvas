import type { TokenStorage } from "@/applications/Auth/Domain/repositories/token-storage.port";
import type { TokenProvider } from "@/applications/Canvas/Domain/repositories/token-provider.port";

export class AuthTokenProvider implements TokenProvider {
  constructor(private readonly tokenStorage: TokenStorage) {}

  getAccessToken(): string | null {
    const token = this.tokenStorage.getToken();
    if (!token || token.isExpired()) return null;
    return token.accessToken;
  }
}
