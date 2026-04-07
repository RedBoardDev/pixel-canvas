"use client";

import { MinusIcon, PlusIcon } from "@/components/icons";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const btnBase =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm transition-all hover:border-[var(--border-hover)] hover:bg-[var(--surface-light)]";

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1">
      <button
        type="button"
        onClick={onZoomIn}
        className={`${btnBase} text-white/70 hover:text-white`}
        aria-label="Zoom in"
      >
        <PlusIcon />
      </button>
      <button
        type="button"
        onClick={onReset}
        className={`${btnBase} text-[11px] font-medium text-white/50 hover:text-white`}
        aria-label="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className={`${btnBase} text-white/70 hover:text-white`}
        aria-label="Zoom out"
      >
        <MinusIcon />
      </button>
    </div>
  );
}
