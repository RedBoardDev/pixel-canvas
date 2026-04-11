"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasServiceProvider } from "@/applications/Canvas/Application/Services/CanvasServiceProvider";
import { INITIAL_VIEWPORT } from "@/applications/Canvas/Domain/constants/canvas.constants";
import type { ConnectionStatus } from "@/applications/Canvas/Domain/repositories/canvas-gateway.port";
import type {
  CanvasChunkSnapshot,
  CanvasIdentity,
} from "@/applications/Canvas/Domain/types/canvas.types";
import type { ViewportBounds } from "@/applications/Canvas/Domain/value-objects/ChunkCoordinate.vo";
import { ChunkCoordinate } from "@/applications/Canvas/Domain/value-objects/ChunkCoordinate.vo";
import { useChunkCache } from "./useChunkCache";

interface CanvasIdentityState {
  sessionId: string | null;
  canvasVersion: number | null;
}

const EMPTY_IDENTITY: CanvasIdentityState = {
  sessionId: null,
  canvasVersion: null,
};

function isSameIdentity(
  left: CanvasIdentityState | CanvasIdentity,
  right: CanvasIdentityState | CanvasIdentity,
): boolean {
  return left.sessionId === right.sessionId && left.canvasVersion === right.canvasVersion;
}

function getSnapshotIdentity(snapshot: CanvasChunkSnapshot): CanvasIdentityState {
  return {
    sessionId: snapshot.sessionId,
    canvasVersion: snapshot.canvasVersion,
  };
}

function hasIdentity(identity: CanvasIdentityState): identity is CanvasIdentity {
  return identity.sessionId !== null && identity.canvasVersion !== null;
}

interface UseCanvasOptions {
  onSessionInitialized?: (sessionId: string | null, sessionStatus: "active" | null) => void;
}

export function useCanvas(options: UseCanvasOptions = {}) {
  const service = CanvasServiceProvider.getService();
  const { pixels, requestChunks, injectPixel, clear } = useChunkCache(service);
  const [isLoading, setIsLoading] = useState(true);
  const visibleChunkKeysRef = useRef<string[]>([]);
  const currentIdentityRef = useRef<CanvasIdentityState>(EMPTY_IDENTITY);
  const lastGatewayStatusRef = useRef<ConnectionStatus>(service.getGatewayStatus());
  const sessionInitializedRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const loadChunks = useCallback(
    async (chunkKeys: string[], force = false) => {
      const previousIdentity = currentIdentityRef.current;
      const result = await requestChunks(chunkKeys, {
        force,
        shouldStoreSnapshot: (snapshot) => {
          if (!hasIdentity(currentIdentityRef.current)) {
            return true;
          }

          return isSameIdentity(currentIdentityRef.current, getSnapshotIdentity(snapshot));
        },
      });

      if (result.snapshots.length === 0) {
        return;
      }

      const nextIdentity = getSnapshotIdentity(result.snapshots[0]);

      if (!hasIdentity(previousIdentity)) {
        currentIdentityRef.current = nextIdentity;

        if (!sessionInitializedRef.current) {
          sessionInitializedRef.current = true;
          const firstSnapshot = result.snapshots[0];
          optionsRef.current.onSessionInitialized?.(
            firstSnapshot.sessionId,
            firstSnapshot.sessionStatus,
          );
        }
        return;
      }

      if (isSameIdentity(previousIdentity, nextIdentity)) {
        return;
      }

      clear();
      currentIdentityRef.current = nextIdentity;

      if (hasIdentity(nextIdentity)) {
        await requestChunks(chunkKeys, {
          force: true,
          shouldStoreSnapshot: (snapshot) =>
            isSameIdentity(nextIdentity, getSnapshotIdentity(snapshot)),
        });
      }
    },
    [clear, requestChunks],
  );

  const loadVisibleChunks = useCallback(
    async (force = false) => {
      const chunkKeys = visibleChunkKeysRef.current;
      if (chunkKeys.length === 0) {
        return;
      }

      await loadChunks(chunkKeys, force);
    },
    [loadChunks],
  );

  useEffect(() => {
    const initialKeys = ChunkCoordinate.getVisibleChunkKeys(INITIAL_VIEWPORT);
    visibleChunkKeysRef.current = initialKeys;

    void loadChunks(initialKeys).finally(() => {
      setIsLoading(false);
    });
  }, [loadChunks]);

  useEffect(() => {
    service.connectGateway().catch(() => {});

    const unsubscribePixel = service.onPixelUpdate((event) => {
      if (!isSameIdentity(currentIdentityRef.current, event)) {
        return;
      }

      injectPixel(event.pixel);
    });

    const unsubscribeReset = service.onCanvasReset((event) => {
      clear();
      currentIdentityRef.current = {
        sessionId: event.sessionId,
        canvasVersion: event.canvasVersion,
      };
    });

    const unsubscribeStatus = service.onGatewayStatusChange((status) => {
      const previousStatus = lastGatewayStatusRef.current;
      lastGatewayStatusRef.current = status;

      if (status === "connected" && previousStatus !== "connected") {
        void loadVisibleChunks(true);
      }
    });

    return () => {
      unsubscribePixel();
      unsubscribeReset();
      unsubscribeStatus();
      service.disconnectGateway();
    };
  }, [clear, injectPixel, loadVisibleChunks, service]);

  const loadChunksForViewport = useCallback(
    (viewport: ViewportBounds) => {
      const chunkKeys = ChunkCoordinate.getVisibleChunkKeys(viewport);
      visibleChunkKeysRef.current = chunkKeys;
      void loadChunks(chunkKeys);
    },
    [loadChunks],
  );

  return { pixels, isLoading, loadChunksForViewport, injectPixel };
}
