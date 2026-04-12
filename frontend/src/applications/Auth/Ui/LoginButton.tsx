"use client";

import { useAuth } from "@/applications/Auth/Api/useAuth";
import { DiscordIcon } from "@/components/icons";

interface LoginButtonProps {
  size?: "sm" | "lg";
}

export function LoginButton({ size = "sm" }: LoginButtonProps) {
  const { login, isLoading } = useAuth();

  const isSmall = size === "sm";

  return (
    <button
      type="button"
      onClick={login}
      disabled={isLoading}
      className={`group inline-flex items-center font-medium text-white transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${
        isSmall
          ? "gap-1.5 rounded-xl border border-discord/30 bg-discord/20 px-3 py-1.5 text-xs backdrop-blur-md hover:bg-discord/30"
          : "gap-2.5 rounded-2xl bg-discord px-8 py-3.5 text-base shadow-lg shadow-discord/20 hover:bg-discord-hover hover:shadow-xl hover:shadow-discord/30"
      }`}
    >
      <DiscordIcon
        size={isSmall ? 14 : 20}
        className="shrink-0 transition-transform group-hover:scale-110"
      />
      <span>{isLoading ? "Connecting..." : isSmall ? "Discord" : "Sign in with Discord"}</span>
    </button>
  );
}
