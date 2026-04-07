"use client";

import { useAuth } from "@/applications/Auth/Api/useAuth";
import { LoginButton } from "@/applications/Auth/Ui/LoginButton";
import { UserAvatar } from "@/applications/Auth/Ui/UserAvatar";
import { ConnectionBadge } from "@/applications/Canvas/Ui/ConnectionBadge";
import { PixelCanvasLogo } from "@/components/icons";

export function Header() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex h-12 items-center justify-between px-3 sm:px-5">
      <div className="pointer-events-auto flex items-center gap-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-border-subtle/40 bg-bg-overlay px-2.5 py-1.5 backdrop-blur-md">
          <PixelCanvasLogo size={16} />
          <span className="hidden text-[13px] font-bold tracking-tight sm:block">
            <span className="text-text-primary">PIXEL</span>
            <span className="text-accent"> CANVAS</span>
          </span>
        </div>
        <ConnectionBadge />
      </div>

      <div className="pointer-events-auto">
        {isLoading ? (
          <div className="h-7 w-20 animate-pulse rounded-xl bg-bg-elevated/30" />
        ) : isAuthenticated ? (
          <UserAvatar />
        ) : (
          <LoginButton size="sm" />
        )}
      </div>
    </header>
  );
}
