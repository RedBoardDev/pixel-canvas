import type { User } from "@/applications/Auth/Domain/entities/User.entity";
import type { AuthToken } from "@/applications/Auth/Domain/value-objects/AuthToken.vo";

export interface AuthProvider {
  getAuthUrl(): string;
  exchangeCode(code: string): Promise<{ token: AuthToken; user: User }>;
  getUser(token: string): Promise<User>;
}
