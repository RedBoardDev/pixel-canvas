import { BrowserTokenStorage } from "@/applications/Auth/Infrastructure/BrowserTokenStorage";
import { DiscordAuthProvider } from "@/applications/Auth/Infrastructure/DiscordAuthProvider";
import { ApiClient } from "@/lib/api/apiClient";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { AuthService } from "./Auth.service";

export class AuthServiceProvider {
  private static instance: AuthService | null = null;

  static getService(): AuthService {
    if (!AuthServiceProvider.instance) {
      const config = createAppConfig();
      const authProvider = new DiscordAuthProvider(
        new ApiClient(config.apiBaseUrl),
        config.discordClientId,
        config.discordRedirectUri,
      );
      const tokenStorage = new BrowserTokenStorage();
      AuthServiceProvider.instance = new AuthService(authProvider, tokenStorage);
    }
    return AuthServiceProvider.instance;
  }
}
