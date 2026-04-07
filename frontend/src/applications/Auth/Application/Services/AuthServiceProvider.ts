import { ApiClient } from "@/lib/api/apiClient";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { BrowserTokenStorage } from "../../Infrastructure/BrowserTokenStorage";
import { DiscordAuthProvider } from "../../Infrastructure/DiscordAuthProvider";
import { MockAuthProvider } from "../../Infrastructure/MockAuthProvider";
import { AuthService } from "./Auth.service";

export class AuthServiceProvider {
  private static instance: AuthService | null = null;

  static getService(): AuthService {
    if (!AuthServiceProvider.instance) {
      const config = createAppConfig();
      const authProvider = config.isMockMode
        ? new MockAuthProvider()
        : new DiscordAuthProvider(
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
