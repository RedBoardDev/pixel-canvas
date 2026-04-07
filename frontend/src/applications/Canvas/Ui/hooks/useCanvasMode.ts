"use client";

import { useCallback, useState } from "react";

export type CanvasMode = "view" | "edit";

interface UseCanvasModeOptions {
  isAuthenticated: boolean;
}

export function useCanvasMode({ isAuthenticated }: UseCanvasModeOptions) {
  const [mode, setMode] = useState<CanvasMode>("view");

  const toggleMode = useCallback(() => {
    if (!isAuthenticated) return;
    setMode((prev) => (prev === "view" ? "edit" : "view"));
  }, [isAuthenticated]);

  const effectiveMode: CanvasMode = isAuthenticated ? mode : "view";
  const canToggle = isAuthenticated;

  return { mode: effectiveMode, toggleMode, canToggle };
}
