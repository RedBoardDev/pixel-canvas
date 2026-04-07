"use client";

import type { Pixel } from "../Domain/entities/Pixel.entity";

interface PixelTooltipProps {
  pixel: Pixel | null;
  screenX: number;
  screenY: number;
  containerRect: DOMRect | null;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PixelTooltip({ pixel, screenX, screenY, containerRect }: PixelTooltipProps) {
  if (!pixel || !containerRect) return null;

  const x = screenX - containerRect.left + 16;
  const y = screenY - containerRect.top - 8;

  return (
    <div className="pointer-events-none absolute z-50 animate-fade-in" style={{ left: x, top: y }}>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-2.5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span
            className="h-5 w-5 shrink-0 rounded border border-white/10"
            style={{ backgroundColor: pixel.color.hex }}
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-white">{pixel.username}</p>
            <p className="text-[10px] text-[var(--muted)]">
              {formatTimeAgo(pixel.updatedAt)} &middot;{" "}
              <span className="font-mono">{pixel.color.hex.toUpperCase()}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
