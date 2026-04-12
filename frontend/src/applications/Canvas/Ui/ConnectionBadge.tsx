"use client";

import { useConnectionStatus } from "@/applications/Canvas/Api/useConnectionStatus";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { ConnectionBanner } from "./ConnectionBanner";

const hasWebSocket = Boolean(createAppConfig().wsBaseUrl);

export function ConnectionBadge() {
  const status = useConnectionStatus();

  if (!hasWebSocket) {
    return null;
  }

  if (status !== "connected") {
    return <ConnectionBanner status={status} />;
  }

  return (
    <div className="flex items-center gap-1.5" title="Connected — Live updates">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
    </div>
  );
}
