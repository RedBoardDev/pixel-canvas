"use client";

import type { ReactNode } from "react";

const islandClass =
  "rounded-2xl border border-border-subtle/40 bg-bg-overlay shadow-2xl shadow-black/60 backdrop-blur-xl";

export function FloatingIsland({ children }: { children: ReactNode }) {
  return <div className={`flex items-center ${islandClass} px-1 py-1`}>{children}</div>;
}

export function PaletteIsland({ children }: { children: ReactNode }) {
  return (
    <div className={`flex items-center gap-2 ${islandClass} px-3 py-2.5 sm:gap-2.5 sm:px-4`}>
      {children}
    </div>
  );
}
