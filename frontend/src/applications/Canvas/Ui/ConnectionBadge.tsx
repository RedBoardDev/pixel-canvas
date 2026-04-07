"use client";

import { useConnectionStatus } from "../Api/useConnectionStatus";

const STATUS_CONFIG = {
  connected: { color: "bg-[var(--success)]", label: "Live" },
  connecting: { color: "bg-[var(--warning)]", label: "Connecting..." },
  reconnecting: { color: "bg-[var(--warning)]", label: "Reconnecting..." },
  disconnected: { color: "bg-[var(--danger)]", label: "Offline" },
} as const;

export function ConnectionBadge() {
  const status = useConnectionStatus();
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1">
      <span className="relative flex h-2 w-2">
        {status === "connected" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-40" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.color}`} />
      </span>
      <span className="text-[11px] font-medium text-[var(--muted)]">{config.label}</span>
    </div>
  );
}
