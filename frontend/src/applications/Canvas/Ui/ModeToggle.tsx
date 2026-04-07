"use client";

import { EyeIcon, PencilIcon } from "@/components/icons";
import type { CanvasMode } from "./hooks/useCanvasMode";

interface ModeToggleProps {
  mode: CanvasMode;
  onToggle: () => void;
  canToggle: boolean;
}

export function ModeToggle({ mode, onToggle, canToggle }: ModeToggleProps) {
  return (
    <>
      <button
        type="button"
        onClick={mode !== "view" ? onToggle : undefined}
        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all ${
          mode === "view"
            ? "bg-bg-elevated text-text-primary"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <EyeIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Explore</span>
      </button>
      <button
        type="button"
        onClick={mode !== "edit" ? onToggle : undefined}
        disabled={!canToggle}
        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all ${
          mode === "edit"
            ? "bg-accent text-bg-void"
            : canToggle
              ? "text-text-muted hover:text-text-secondary"
              : "cursor-not-allowed text-text-muted/40"
        }`}
        title={!canToggle ? "Sign in to draw" : undefined}
      >
        <PencilIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Draw</span>
      </button>
    </>
  );
}
