"use client";

interface CoordinateDisplayProps {
  x: number;
  y: number;
}

export function CoordinateDisplay({ x, y }: CoordinateDisplayProps) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-[var(--border)] bg-[var(--surface)]/90 px-2.5 py-1.5 font-mono text-xs text-white/60 backdrop-blur-sm">
      ({x}, {y})
    </div>
  );
}
