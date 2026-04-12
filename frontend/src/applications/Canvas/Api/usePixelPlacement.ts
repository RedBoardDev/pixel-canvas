"use client";

import { useCallback, useEffect, useState } from "react";
import { getCanvasService } from "@/applications/Canvas/Application/Services/CanvasServiceProvider";
import type { CanvasPlacedPixelResult } from "@/applications/Canvas/Domain/types/canvas.types";
import { createAppConfig } from "@/lib/config/createAppConfig";

const { canvasCooldownMs } = createAppConfig();

export function usePixelPlacement() {
  const [lastPlacedAt, setLastPlacedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);

  const service = getCanvasService();

  useEffect(() => {
    if (!lastPlacedAt) return setIsCooldown(false);
    setIsCooldown(true);
    const remaining = canvasCooldownMs - (Date.now() - lastPlacedAt.getTime());
    if (remaining <= 0) return setIsCooldown(false);
    const timer = setTimeout(() => setIsCooldown(false), remaining);
    return () => clearTimeout(timer);
  }, [lastPlacedAt]);

  const placePixel = useCallback(
    async (x: number, y: number, color: string): Promise<CanvasPlacedPixelResult | null> => {
      setIsPlacing(true);
      setError(null);

      const result = await service.placePixel({ x, y, color, lastPlacedAt });

      setIsPlacing(false);

      if (result.isFailure) {
        setError(result.getError());
        return null;
      }

      setLastPlacedAt(new Date());
      return result.getValue();
    },
    [lastPlacedAt, service],
  );

  return { placePixel, isPlacing, error, lastPlacedAt, isCooldown };
}
