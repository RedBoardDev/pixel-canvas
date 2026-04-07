"use client";

import { MinusIcon, PlusIcon } from "@/components/icons";

interface CanvasHUDProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  hoverPos: { x: number; y: number } | null;
}

function formatZoom(zoom: number): string {
  if (zoom >= 1) return `${Math.round(zoom)}x`;
  return `${zoom.toFixed(1)}x`;
}

export function CanvasHUD({ zoom, onZoomIn, onZoomOut, onReset, hoverPos }: CanvasHUDProps) {
  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-10 flex items-end gap-1.5">
      {hoverPos && (
        <div className="pointer-events-auto rounded-lg border border-border-subtle/30 bg-bg-overlay px-2 py-1 font-mono text-[11px] tabular-nums text-text-muted backdrop-blur-xl">
          {hoverPos.x}, {hoverPos.y}
        </div>
      )}
      <div className="pointer-events-auto flex items-center gap-px overflow-hidden rounded-lg border border-border-subtle/30 bg-bg-overlay backdrop-blur-xl">
        <button
          type="button"
          onClick={onZoomOut}
          className="flex h-7 w-7 items-center justify-center text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
          aria-label="Zoom out"
        >
          <MinusIcon />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex h-7 items-center justify-center border-x border-border-subtle/20 px-2 font-mono text-[10px] tabular-nums text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
          aria-label="Reset zoom"
        >
          {formatZoom(zoom)}
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className="flex h-7 w-7 items-center justify-center text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
          aria-label="Zoom in"
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}
