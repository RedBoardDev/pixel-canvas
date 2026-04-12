import type { User } from "@/applications/Auth/Domain/entities/User.entity";
import type { AuthProvider } from "@/applications/Auth/Domain/repositories/auth-provider.port";
import type { TokenStorage } from "@/applications/Auth/Domain/repositories/token-storage.port";
import { Result } from "@/domain-driven-design";

export class AuthService {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly tokenStorage: TokenStorage,
  ) {}

  getAuthUrl(): string {
    return this.authProvider.getAuthUrl();
  }

  async login(code: string): Promise<Result<User>> {
    try {
      const { token, user } = await this.authProvider.exchangeCode(code);
      this.tokenStorage.setToken(token);
      return Result.ok(user);
    } catch (error) {
      return Result.fail("Login failed", error);
    }
  }

  logout(): void {
    this.tokenStorage.clearToken();
  }

  async getCurrentUser(): Promise<Result<User | null>> {
    const token = this.tokenStorage.getToken();
    if (!token) return Result.ok(null);

    if (token.isExpired()) {
      this.tokenStorage.clearToken();
      return Result.ok(null);
    }

    try {
      const user = await this.authProvider.getUser(token.accessToken);
      return Result.ok(user);
    } catch (error) {
      return Result.fail("Failed to fetch user", error);
    }
  }
}
