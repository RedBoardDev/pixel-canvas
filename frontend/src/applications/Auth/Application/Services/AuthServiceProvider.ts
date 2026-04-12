import { BrowserTokenStorage } from "@/applications/Auth/Infrastructure/BrowserTokenStorage";
import { DiscordAuthProvider } from "@/applications/Auth/Infrastructure/DiscordAuthProvider";
import { ApiClient } from "@/lib/api/apiClient";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { AuthService } from "./Auth.service";

let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    const config = createAppConfig();
    const authProvider = new DiscordAuthProvider(
      new ApiClient(config.apiBaseUrl),
      config.discordClientId,
      config.discordRedirectUri,
    );
    const tokenStorage = new BrowserTokenStorage();
    authServiceInstance = new AuthService(authProvider, tokenStorage);
  }
  return authServiceInstance;
}
