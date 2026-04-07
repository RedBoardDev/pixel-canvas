"use client";

import { CloseIcon } from "@/components/icons";
import type { Pixel } from "../Domain/entities/Pixel.entity";

interface PixelInfoProps {
  pixel: Pixel | null;
  onClose: () => void;
}

export function PixelInfo({ pixel, onClose }: PixelInfoProps) {
  if (!pixel) return null;

  return (
    <div className="animate-fade-in flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-light)] px-3 py-2">
      <span
        className="h-6 w-6 shrink-0 rounded border border-white/10"
        style={{ backgroundColor: pixel.color.hex }}
      />
      <div className="min-w-0 text-xs">
        <p className="truncate font-medium text-white">
          ({pixel.coordinate.x}, {pixel.coordinate.y})
        </p>
        <p className="truncate text-[var(--muted)]">
          {pixel.username} &middot; {pixel.updatedAt.toLocaleTimeString()}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 text-[var(--muted)] transition-colors hover:text-white"
        aria-label="Close"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
