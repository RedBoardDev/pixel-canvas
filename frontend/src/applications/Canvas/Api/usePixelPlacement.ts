"use client";

import { useCallback, useState } from "react";
import { CanvasServiceProvider } from "../Application/Services/CanvasServiceProvider";
import { CooldownNotExpiredError } from "../Domain/errors/canvas.errors";

export function usePixelPlacement() {
  const [lastPlacedAt, setLastPlacedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  const service = CanvasServiceProvider.getService();

  const placePixel = useCallback(
    async (x: number, y: number, color: string) => {
      setIsPlacing(true);
      setError(null);

      try {
        await service.placePixel({ x, y, color, lastPlacedAt });
        setLastPlacedAt(new Date());
      } catch (e) {
        if (e instanceof CooldownNotExpiredError) {
          setError(`Wait ${Math.ceil(e.remainingMs / 1000)}s before placing another pixel`);
        } else {
          setError(e instanceof Error ? e.message : "Failed to place pixel");
        }
      } finally {
        setIsPlacing(false);
      }
    },
    [lastPlacedAt, service],
  );

  return { placePixel, isPlacing, error, lastPlacedAt };
}
