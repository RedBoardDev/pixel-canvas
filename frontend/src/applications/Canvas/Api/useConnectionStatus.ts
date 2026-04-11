"use client";

import { useEffect, useState } from "react";
import { CanvasServiceProvider } from "@/applications/Canvas/Application/Services/CanvasServiceProvider";
import type { ConnectionStatus } from "@/applications/Canvas/Domain/repositories/canvas-gateway.port";

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  const service = CanvasServiceProvider.getService();

  useEffect(() => {
    setStatus(service.getGatewayStatus());
    return service.onGatewayStatusChange(setStatus);
  }, [service]);

  return status;
}
