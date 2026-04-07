"use client";

import { useCallback, useRef, useState } from "react";
import type { Pixel } from "../../Domain/entities/Pixel.entity";
import { ChunkCoordinate } from "../../Domain/value-objects/ChunkCoordinate.vo";

interface ChunkProvider {
  getChunk(cx: number, cy: number): Promise<Pixel[]>;
}

const MAX_CHUNKS = 50;

interface CachedChunk {
  pixels: Map<string, Pixel>;
  lastAccessed: number;
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
    const c = cache.current;
    if (c.size <= MAX_CHUNKS) return;

    const entries = [...c.entries()].sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    const toRemove = entries.slice(0, c.size - MAX_CHUNKS);
    for (const [key] of toRemove) {
      c.delete(key);
    }
  }, []);

  const requestChunks = useCallback(
    (chunkKeys: string[]) => {
      const toFetch = chunkKeys.filter(
        (key) => !cache.current.has(key) && !loading.current.has(key),
      );

      // Touch existing chunks
      const now = Date.now();
      for (const key of chunkKeys) {
        const existing = cache.current.get(key);
        if (existing) existing.lastAccessed = now;
      }

      if (toFetch.length === 0) return;

      for (const key of toFetch) {
        loading.current.add(key);
        const [cxStr, cyStr] = key.split(",");
        const cx = Number(cxStr);
        const cy = Number(cyStr);

        provider
          .getChunk(cx, cy)
          .then((pixels) => {
            const pixelMap = new Map<string, Pixel>();
            for (const pixel of pixels) {
              pixelMap.set(`${pixel.coordinate.x},${pixel.coordinate.y}`, pixel);
            }
            cache.current.set(key, { pixels: pixelMap, lastAccessed: Date.now() });
            loading.current.delete(key);
            evict();
            rebuildPixelMap();
          })
          .catch(() => {
            loading.current.delete(key);
          });
      }
    },
    [provider, evict, rebuildPixelMap],
  );

  const injectPixel = useCallback((pixel: Pixel) => {
    const chunkKey = ChunkCoordinate.fromPixel(pixel.coordinate.x, pixel.coordinate.y).toKey();
    const pixelKey = `${pixel.coordinate.x},${pixel.coordinate.y}`;

    const chunk = cache.current.get(chunkKey);
    if (chunk) {
      chunk.pixels.set(pixelKey, pixel);
      chunk.lastAccessed = Date.now();
    }

    // Always update the merged view for immediate feedback
    setAllPixels((prev) => {
      const next = new Map(prev);
      next.set(pixelKey, pixel);
      return next;
    });
  }, []);

  return { pixels: allPixels, requestChunks, injectPixel };
}
