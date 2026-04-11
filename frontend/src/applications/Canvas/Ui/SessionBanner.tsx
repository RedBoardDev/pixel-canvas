"use client";

import type { SessionDisplayStatus } from "@/applications/Canvas/Api/useSessionState";

interface SessionBannerProps {
  status: SessionDisplayStatus;
}

const BANNER_CONFIG: Record<
  Exclude<SessionDisplayStatus, "active">,
  { bg: string; text: string }
> = {
  no_session: {
    bg: "bg-warning/90",
    text: "No active session — Spectator mode",
  },
  paused: {
    bg: "bg-warning/90",
    text: "Session paused — Spectator mode",
  },
};

export function SessionBanner({ status }: SessionBannerProps) {
  if (status === "active") return null;

  const config = BANNER_CONFIG[status];

  return (
    <div
      className={`animate-banner-enter pointer-events-none fixed inset-x-0 top-16 z-30 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium text-bg-void backdrop-blur-sm ${config.bg}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bg-void/60" />
      {config.text}
    </div>
  );
}
