import type { User } from "../entities/User.entity";
import type { AuthToken } from "../value-objects/AuthToken.vo";

export interface AuthProvider {
  getAuthUrl(): string;
  exchangeCode(code: string): Promise<AuthToken>;
  getUser(token: string): Promise<User>;
  refreshToken(token: string): Promise<AuthToken>;
}
