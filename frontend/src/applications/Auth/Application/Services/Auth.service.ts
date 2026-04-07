import type { User } from "../../Domain/entities/User.entity";
import type { AuthProvider } from "../../Domain/repositories/auth-provider.port";
import type { TokenStorage } from "../../Domain/repositories/token-storage.port";

export class AuthService {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly tokenStorage: TokenStorage,
  ) {}

  getAuthUrl(): string {
    return this.authProvider.getAuthUrl();
  }

  async login(code: string): Promise<User> {
    const token = await this.authProvider.exchangeCode(code);
    this.tokenStorage.setToken(token);
    return this.authProvider.getUser(token.accessToken);
  }

  logout(): void {
    this.tokenStorage.clearToken();
  }

  async getCurrentUser(): Promise<User | null> {
    const token = this.tokenStorage.getToken();
    if (!token) return null;

    if (token.isExpired()) {
      try {
        const newToken = await this.authProvider.refreshToken(token.accessToken);
        this.tokenStorage.setToken(newToken);
        return this.authProvider.getUser(newToken.accessToken);
      } catch {
        this.tokenStorage.clearToken();
        return null;
      }
    }

    return this.authProvider.getUser(token.accessToken);
  }
}
