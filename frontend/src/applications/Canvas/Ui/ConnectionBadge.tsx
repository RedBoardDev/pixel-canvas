"use client";

import { useConnectionStatus } from "../Api/useConnectionStatus";
import { ConnectionBanner } from "./ConnectionBanner";

export function ConnectionBadge() {
  const status = useConnectionStatus();

  return (
    <>
      {status === "connected" && (
        <div className="flex items-center gap-1.5" title="Connected — Live updates">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
        </div>
      )}
      {(status === "disconnected" || status === "reconnecting" || status === "connecting") && (
        <ConnectionBanner status={status} />
      )}
    </>
  );
}
