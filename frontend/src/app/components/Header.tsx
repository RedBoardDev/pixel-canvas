"use client";

import { useAuth } from "@/applications/Auth/Api/useAuth";
import { LoginButton } from "@/applications/Auth/Ui/LoginButton";
import { UserAvatar } from "@/applications/Auth/Ui/UserAvatar";
import { ConnectionBadge } from "@/applications/Canvas/Ui/ConnectionBadge";
import { PixelCanvasLogo } from "@/components/icons";

export function Header() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
            <PixelCanvasLogo />
          </div>
          <h1 className="text-base font-semibold tracking-tight text-white">Pixel Canvas</h1>
        </div>
        <ConnectionBadge />
      </div>

      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded-lg bg-white/5" />
        ) : isAuthenticated ? (
          <UserAvatar />
        ) : (
          <LoginButton />
        )}
      </div>
    </header>
  );
}
