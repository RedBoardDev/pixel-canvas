import type { CanvasBounds } from "@/applications/Canvas/Domain/value-objects/CanvasBounds.vo";

interface CooldownResult {
  allowed: boolean;
  remainingMs: number;
}

export function canPlacePixel(
  lastPlacedAt: Date | null,
  cooldownMs: number,
  now: Date = new Date(),
): CooldownResult {
  if (!lastPlacedAt) {
    return { allowed: true, remainingMs: 0 };
  }
  const elapsed = now.getTime() - lastPlacedAt.getTime();
  const remaining = Math.max(0, cooldownMs - elapsed);
  return { allowed: remaining === 0, remainingMs: remaining };
}

export function isWithinBounds(x: number, y: number, bounds: CanvasBounds): boolean {
  return bounds.containsPixel(x, y);
}
