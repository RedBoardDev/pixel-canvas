"use client";

import { useCallback, useEffect, useState } from "react";

export type CanvasMode = "view" | "edit";

interface UseCanvasModeOptions {
  isAuthenticated: boolean;
  isSessionActive: boolean;
}

export function useCanvasMode({ isAuthenticated, isSessionActive }: UseCanvasModeOptions) {
  const [mode, setMode] = useState<CanvasMode>("view");

  useEffect(() => {
    if (!isSessionActive) {
      setMode("view");
    }
  }, [isSessionActive]);

  const canDraw = isAuthenticated && isSessionActive;

  const toggleMode = useCallback(() => {
    if (!canDraw) return;
    setMode((prev) => (prev === "view" ? "edit" : "view"));
  }, [canDraw]);

  const effectiveMode: CanvasMode = canDraw ? mode : "view";
  const canToggle = canDraw;

  return { mode: effectiveMode, toggleMode, canToggle };
}
