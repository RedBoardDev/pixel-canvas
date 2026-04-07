"use client";

import { useCallback, useState } from "react";
import { CanvasServiceProvider } from "../Application/Services/CanvasServiceProvider";
import type { Pixel } from "../Domain/entities/Pixel.entity";

export function usePixelInfo() {
  const [selectedPixel, setSelectedPixel] = useState<Pixel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const service = CanvasServiceProvider.getService();

  const selectPixel = useCallback(
    async (x: number, y: number) => {
      setIsLoading(true);
      try {
        const pixel = await service.getPixelAt(x, y);
        setSelectedPixel(pixel);
      } catch {
        setSelectedPixel(null);
      } finally {
        setIsLoading(false);
      }
    },
    [service],
  );

  const clearSelection = useCallback(() => setSelectedPixel(null), []);

  return { selectedPixel, isLoading, selectPixel, clearSelection };
}
