"use client";

import { useCallback, useEffect, useState } from "react";
import { CanvasServiceProvider } from "../Application/Services/CanvasServiceProvider";
import type { ViewportBounds } from "../Domain/value-objects/ChunkCoordinate.vo";
import { ChunkCoordinate } from "../Domain/value-objects/ChunkCoordinate.vo";
import { useChunkCache } from "../Ui/hooks/useChunkCache";

export function useCanvas() {
  const service = CanvasServiceProvider.getService();
  const { pixels, requestChunks, injectPixel } = useChunkCache(service);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialKeys = ChunkCoordinate.getVisibleChunkKeys({
      minX: -64,
      minY: -64,
      maxX: 128,
      maxY: 128,
    });
    requestChunks(initialKeys);
    setIsLoading(false);
  }, [requestChunks]);

  useEffect(() => {
    service.connectGateway().catch(() => {});
    const unsubscribe = service.onPixelUpdate(injectPixel);
    return () => {
      unsubscribe();
      service.disconnectGateway();
    };
  }, [service, injectPixel]);

  const loadChunksForViewport = useCallback(
    (viewport: ViewportBounds) => requestChunks(ChunkCoordinate.getVisibleChunkKeys(viewport)),
    [requestChunks],
  );

  return { pixels, isLoading, loadChunksForViewport };
}
