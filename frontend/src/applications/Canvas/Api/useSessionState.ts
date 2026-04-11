"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasServiceProvider } from "@/applications/Canvas/Application/Services/CanvasServiceProvider";
import type { SessionStatus } from "@/applications/Canvas/Domain/types/canvas.types";

export type SessionDisplayStatus = SessionStatus | "no_session";

export function useSessionState() {
  const service = CanvasServiceProvider.getService();
  const [status, setStatus] = useState<SessionDisplayStatus>("no_session");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const unsubscribeState = service.onSessionStateChange((event) => {
      setStatus(event.status);
      setSessionId(event.sessionId);
    });

    const unsubscribeReset = service.onCanvasReset((event) => {
      setStatus("active");
      setSessionId(event.sessionId);
    });

    return () => {
      unsubscribeState();
      unsubscribeReset();
    };
  }, [service]);

  const initializeFromChunk = useCallback(
    (chunkSessionId: string | null, sessionStatus: "active" | null) => {
      if (sessionStatus === "active" && chunkSessionId) {
        setStatus("active");
        setSessionId(chunkSessionId);
      } else if (statusRef.current === "no_session") {
        setStatus("no_session");
        setSessionId(null);
      }
    },
    [],
  );

  const isActive = status === "active";

  return { status, sessionId, isActive, initializeFromChunk };
}
