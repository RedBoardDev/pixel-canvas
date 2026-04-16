import type { AppConfig } from "@/lib/config/AppConfig";

export function createAppConfig(): AppConfig {
  return {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
    wsBaseUrl: process.env.NEXT_PUBLIC_WS_BASE_URL ?? "",
    discordClientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? "",
    discordRedirectUri:
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ?? "http://localhost:3000/auth/callback",
  };
}
