import { type UserDto, userMapper } from "@/applications/Auth/Application/mappers/user.mapper";
import type { User } from "@/applications/Auth/Domain/entities/User.entity";
import type { AuthProvider } from "@/applications/Auth/Domain/repositories/auth-provider.port";
import { AuthToken } from "@/applications/Auth/Domain/value-objects/AuthToken.vo";
import type { ApiClient } from "@/lib/api/apiClient";

interface CallbackResponse {
  access_token: string;
  expires_in: number;
  user: UserDto;
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

  async exchangeCode(code: string): Promise<{ token: AuthToken; user: User }> {
    const { data } = await this.api.post<CallbackResponse>("/auth/callback", { code });
    const token = AuthToken.create(
      data.access_token,
      new Date(Date.now() + data.expires_in * 1000),
    );
    const user = userMapper.toDomain(data.user);
    return { token, user };
  }

  async getUser(token: string): Promise<User> {
    const { data } = await this.api.get<UserResponse>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return userMapper.toDomain(data);
  }
}
