"use client";

import { useCallback, useEffect, useState } from "react";
import { getCanvasService } from "@/applications/Canvas/Application/Services/CanvasServiceProvider";
import { RateLimitExceededError } from "@/applications/Canvas/Domain/errors/canvas.errors";
import type {
  CanvasRateLimit,
  CanvasPlacedPixelResult,
} from "@/applications/Canvas/Domain/types/canvas.types";

export function usePixelPlacement() {
  const [error, setError] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [rateLimit, setRateLimit] = useState<CanvasRateLimit | null>(null);

  const service = getCanvasService();

  useEffect(() => {
    if (!rateLimit || rateLimit.remaining > 0) {
      setIsCooldown(false);
      return;
    }

    const remainingMs = rateLimit.resetAt.getTime() - Date.now();
    if (remainingMs <= 0) {
      setIsCooldown(false);
      setRateLimit(null);
      return;
    }

    setIsCooldown(true);
    const timer = setTimeout(() => {
      setIsCooldown(false);
      setRateLimit(null);
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [rateLimit]);

  const placePixel = useCallback(
    async (x: number, y: number, color: string): Promise<CanvasPlacedPixelResult | null> => {
      setIsPlacing(true);
      setError(null);

      try {
        const result = await service.placePixel({ x, y, color });

        if (result.isFailure) {
          const cause = result.getCause();
          if (cause instanceof RateLimitExceededError) {
            setRateLimit(cause.rateLimit);
          }

          setError(result.getError());
          return null;
        }

        const placedPixel = result.getValue();
        setRateLimit(placedPixel.rateLimit);
        return placedPixel;
      } finally {
        setIsPlacing(false);
      }
    },
    [service],
  );

  return { placePixel, isPlacing, error, isCooldown, rateLimit };
}
