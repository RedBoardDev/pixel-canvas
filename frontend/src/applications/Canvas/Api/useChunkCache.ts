"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_CACHED_CHUNKS } from "@/applications/Canvas/Domain/constants/canvas.constants";
import type { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";
import type { CanvasChunkSnapshot } from "@/applications/Canvas/Domain/types/canvas.types";
import { ChunkCoordinate } from "@/applications/Canvas/Domain/value-objects/ChunkCoordinate.vo";
import type { Result } from "@/domain-driven-design";

interface ChunkProvider {
  getChunk(cx: number, cy: number): Promise<Result<CanvasChunkSnapshot>>;
}

interface CachedChunk {
  pixels: Map<string, Pixel>;
  lastAccessed: number;
}

interface RequestChunksOptions {
  force?: boolean;
  shouldStoreSnapshot?: (snapshot: CanvasChunkSnapshot) => boolean;
}

interface SuccessfulChunkResult {
  ok: true;
  stored: boolean;
  snapshot: CanvasChunkSnapshot;
}

interface FailedChunkResult {
  ok: false;
}

type ChunkRequestResult = SuccessfulChunkResult | FailedChunkResult;

interface RequestChunksResult {
  fetched: number;
  failed: number;
  skipped: number;
  snapshots: CanvasChunkSnapshot[];
}

export function useChunkCache(provider: ChunkProvider) {
  const cache = useRef(new Map<string, CachedChunk>());
  const loading = useRef(new Set<string>());
  const [allPixels, setAllPixels] = useState<Map<string, Pixel>>(new Map());

  const rebuildPixelMap = useCallback(() => {
    const merged = new Map<string, Pixel>();
    for (const [, chunk] of cache.current) {
      for (const [key, pixel] of chunk.pixels) {
        merged.set(key, pixel);
      }
    }
    setAllPixels(merged);
  }, []);

  const evict = useCallback(() => {
    const currentCache = cache.current;
    if (currentCache.size <= MAX_CACHED_CHUNKS) return;

    const entries = [...currentCache.entries()].sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed,
    );
    const toRemove = entries.slice(0, currentCache.size - MAX_CACHED_CHUNKS);
    for (const [key] of toRemove) {
      currentCache.delete(key);
    }
  }, []);

  const requestChunks = useCallback(
    async (
      chunkKeys: string[],
      options: RequestChunksOptions = {},
    ): Promise<RequestChunksResult> => {
      const { force = false, shouldStoreSnapshot } = options;
      const now = Date.now();

      for (const key of chunkKeys) {
        const existing = cache.current.get(key);
        if (existing) existing.lastAccessed = now;
      }

      const toFetch = chunkKeys.filter((key) => {
        if (loading.current.has(key)) return false;
        if (force) return true;
        return !cache.current.has(key);
      });

      if (toFetch.length === 0) {
        return {
          fetched: 0,
          failed: 0,
          skipped: chunkKeys.length,
          snapshots: [],
        };
      }

      const results = await Promise.all(
        toFetch.map(async (key): Promise<ChunkRequestResult> => {
          loading.current.add(key);

          try {
            const [cxStr, cyStr] = key.split(",");
            const result = await provider.getChunk(Number(cxStr), Number(cyStr));

            if (result.isFailure) {
              return { ok: false };
            }

            const snapshot = result.getValue();
            const shouldStore = shouldStoreSnapshot?.(snapshot) ?? true;

            if (shouldStore) {
              const pixelMap = new Map<string, Pixel>();
              for (const pixel of snapshot.pixels) {
                pixelMap.set(pixel.key, pixel);
              }

              cache.current.set(key, {
                pixels: pixelMap,
                lastAccessed: Date.now(),
              });
            }

            return {
              ok: true,
              stored: shouldStore,
              snapshot,
            };
          } catch {
            return { ok: false };
          } finally {
            loading.current.delete(key);
          }
        }),
      );

      evict();

      if (results.some((result) => result.ok && result.stored)) {
        rebuildPixelMap();
      }

      const successfulResults = results.filter(
        (result): result is SuccessfulChunkResult => result.ok,
      );

      return {
        fetched: successfulResults.length,
        failed: results.length - successfulResults.length,
        skipped:
          chunkKeys.length -
          toFetch.length +
          successfulResults.filter((result) => !result.stored).length,
        snapshots: successfulResults.map((result) => result.snapshot),
      };
    },
    [provider, evict, rebuildPixelMap],
  );

  const injectPixel = useCallback((pixel: Pixel) => {
    const chunkKey = ChunkCoordinate.fromPixel(pixel.coordinate.x, pixel.coordinate.y).toKey();
    const pixelKey = pixel.key;

    const chunk = cache.current.get(chunkKey);
    if (chunk) {
      chunk.pixels.set(pixelKey, pixel);
      chunk.lastAccessed = Date.now();
    }

    setAllPixels((prev) => {
      const next = new Map(prev);
      next.set(pixelKey, pixel);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    cache.current.clear();
    loading.current.clear();
    setAllPixels(new Map());
  }, []);

  return { pixels: allPixels, requestChunks, injectPixel, clear };
}
