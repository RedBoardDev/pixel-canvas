"use client";

import { DiscordIcon } from "@/components/icons";
import { useAuth } from "../Api/useAuth";

interface LoginButtonProps {
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "px-4 py-2 text-sm gap-2",
  md: "px-6 py-3 text-base gap-2.5",
  lg: "px-8 py-4 text-lg gap-3",
} as const;

const ICON_SIZES = { sm: 18, md: 20, lg: 24 } as const;

export function LoginButton({ size = "sm" }: LoginButtonProps) {
  const { login, isLoading } = useAuth();

  return (
    <button
      type="button"
      onClick={login}
      disabled={isLoading}
      className={`group flex items-center rounded-lg bg-[var(--accent)] font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${SIZE_CLASSES[size]}`}
    >
      <DiscordIcon size={ICON_SIZES[size]} className="transition-transform group-hover:scale-110" />
      {isLoading ? "Connecting..." : "Sign in with Discord"}
    </button>
  );
}
