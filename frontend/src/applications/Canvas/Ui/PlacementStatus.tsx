"use client";

interface PlacementStatusProps {
  isPlacing: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export function PlacementStatus({ isPlacing, error, isAuthenticated }: PlacementStatusProps) {
  if (!isAuthenticated) {
    return <span className="text-xs text-[var(--muted)]">Sign in to place pixels</span>;
  }

  if (isPlacing) {
    return <span className="text-xs text-[var(--accent)]">Placing pixel...</span>;
  }

  if (error) {
    return <span className="text-xs text-[var(--danger)]">{error}</span>;
  }

  return (
    <span className="hidden text-xs text-[var(--muted)] sm:inline">
      Click a pixel to place your color
    </span>
  );
}
