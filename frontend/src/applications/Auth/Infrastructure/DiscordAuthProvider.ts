import type { ApiClient } from "@/lib/api/apiClient";
import { type UserDto, userMapper } from "../Application/mappers/user.mapper";
import type { User } from "../Domain/entities/User.entity";
import type { AuthProvider } from "../Domain/repositories/auth-provider.port";
import { AuthToken } from "../Domain/value-objects/AuthToken.vo";

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface UserResponse extends UserDto {}

export class DiscordAuthProvider implements AuthProvider {
  constructor(
    private readonly api: ApiClient,
    private readonly clientId: string,
    private readonly redirectUri: string,
  ) {}

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "identify",
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<AuthToken> {
    const { data } = await this.api.post<TokenResponse>("/auth/discord/callback", { code });
    return AuthToken.create(data.access_token, new Date(Date.now() + data.expires_in * 1000));
  }

  async getUser(token: string): Promise<User> {
    const { data } = await this.api.get<UserResponse>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return userMapper.toDomain(data);
  }

  async refreshToken(token: string): Promise<AuthToken> {
    const { data } = await this.api.post<TokenResponse>("/auth/refresh", { token });
    return AuthToken.create(data.access_token, new Date(Date.now() + data.expires_in * 1000));
  }
}
