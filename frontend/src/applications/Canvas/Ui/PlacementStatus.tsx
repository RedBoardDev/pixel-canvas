"use client";

import type { CanvasMode } from "./hooks/useCanvasMode";

interface PlacementStatusProps {
  isPlacing: boolean;
  error: string | null;
  isAuthenticated: boolean;
  mode: CanvasMode;
}

export function PlacementStatus({ isPlacing, error, isAuthenticated, mode }: PlacementStatusProps) {
  if (!isAuthenticated) {
    return <span className="text-xs text-[var(--muted)]">Sign in to place pixels</span>;
  }

  if (mode === "view") {
    return (
      <span className="hidden text-xs text-[var(--muted)] sm:inline">
        Hover pixels to inspect them
      </span>
    );
  }

  if (isPlacing) {
    return <span className="text-xs text-[var(--accent)]">Placing pixel...</span>;
  }

  if (error) {
    return <span className="text-xs text-[var(--danger)]">{error}</span>;
  }

  return null;
}
