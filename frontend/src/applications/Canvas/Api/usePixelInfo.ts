"use client";

import { useCallback, useState } from "react";
import { getCanvasService } from "@/applications/Canvas/Application/Services/CanvasServiceProvider";
import type { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";

export function usePixelInfo() {
  const [selectedPixel, setSelectedPixel] = useState<Pixel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const service = getCanvasService();

  const selectPixel = useCallback(
    async (x: number, y: number) => {
      setIsLoading(true);
      const result = await service.getPixelAt(x, y);
      setSelectedPixel(result.isSuccess ? result.getValue() : null);
      setIsLoading(false);
    },
    [service],
  );

  const clearSelection = useCallback(() => setSelectedPixel(null), []);

  return { selectedPixel, isLoading, selectPixel, clearSelection };
}
