"use client";

import type { ConnectionStatus } from "../Domain/repositories/canvas-gateway.port";

interface ConnectionBannerProps {
  status: Exclude<ConnectionStatus, "connected">;
}

const BANNER_CONFIG = {
  connecting: {
    bg: "bg-warning/90",
    text: "Connecting to server...",
  },
  reconnecting: {
    bg: "bg-warning/90",
    text: "Connection lost — Reconnecting...",
  },
  disconnected: {
    bg: "bg-danger/90",
    text: "Connection lost — Updates paused",
  },
} as const;

export function ConnectionBanner({ status }: ConnectionBannerProps) {
  const config = BANNER_CONFIG[status];

  return (
    <div
      className={`animate-banner-enter pointer-events-auto fixed inset-x-0 top-10 z-30 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium text-bg-void backdrop-blur-sm ${config.bg}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bg-void/60" />
      {config.text}
    </div>
  );
}
