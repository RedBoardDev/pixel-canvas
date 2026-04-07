import type { AppConfig } from "@/lib/config/AppConfig";

export function createAppConfig(): AppConfig {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return {
    apiBaseUrl,
    wsBaseUrl: process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:3001",
    discordClientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? "",
    discordRedirectUri:
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ?? "http://localhost:3000/auth/callback",
    canvasCooldownMs: Number(process.env.NEXT_PUBLIC_CANVAS_COOLDOWN_MS ?? "3000"),
    isMockMode: !apiBaseUrl,
  };
}
