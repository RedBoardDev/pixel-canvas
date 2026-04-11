"use client";

import { useEffect, useRef } from "react";
import type { ViewportBounds } from "@/applications/Canvas/Domain/value-objects/ChunkCoordinate.vo";

const DEBOUNCE_MS = 100;

export function useViewportTracking(
  getViewportBounds: () => ViewportBounds,
  onViewportChange: (bounds: ViewportBounds) => void,
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onViewportChange(getViewportBounds());
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [getViewportBounds, onViewportChange]);
}
