import { User } from "../Domain/entities/User.entity";
import type { AuthProvider } from "../Domain/repositories/auth-provider.port";
import { AuthToken } from "../Domain/value-objects/AuthToken.vo";

const MOCK_USER = User.create(
  { discordId: "123456789", username: "TestUser", avatar: null },
  "mock_1",
);

export class MockAuthProvider implements AuthProvider {
  getAuthUrl(): string {
    return "/auth/callback?code=mock_code";
  }

  async exchangeCode(_code: string): Promise<AuthToken> {
    await new Promise((r) => setTimeout(r, 500));
    return AuthToken.create("mock_token_abc123", new Date(Date.now() + 3600000));
  }

  async getUser(_token: string): Promise<User> {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_USER;
  }

  async refreshToken(_token: string): Promise<AuthToken> {
    return AuthToken.create("mock_refreshed_token", new Date(Date.now() + 3600000));
  }
}
