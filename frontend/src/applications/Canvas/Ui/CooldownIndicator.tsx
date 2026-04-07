"use client";

import { useEffect, useState } from "react";

interface CooldownIndicatorProps {
  lastPlacedAt: Date | null;
  cooldownMs: number;
}

export function CooldownIndicator({ lastPlacedAt, cooldownMs }: CooldownIndicatorProps) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!lastPlacedAt) return setRemainingMs(0);

    const update = () => {
      const remaining = Math.max(0, cooldownMs - (Date.now() - lastPlacedAt.getTime()));
      setRemainingMs(remaining);
    };

    update();
    const id = setInterval(update, 50);
    return () => clearInterval(id);
  }, [lastPlacedAt, cooldownMs]);

  if (remainingMs === 0) return null;

  const progress = 1 - remainingMs / cooldownMs;
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="min-w-[2ch] text-right font-mono text-xs text-[var(--muted)]">
        {seconds}s
      </span>
    </div>
  );
}
