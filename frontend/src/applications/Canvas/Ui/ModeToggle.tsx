"use client";

import { EyeIcon, PencilIcon } from "@/components/icons";
import type { CanvasMode } from "./hooks/useCanvasMode";

interface ModeToggleProps {
  mode: CanvasMode;
  onToggle: () => void;
  canToggle: boolean;
}

export function ModeToggle({ mode, onToggle, canToggle }: ModeToggleProps) {
  if (!canToggle) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-light)] px-3 py-1.5 text-xs font-medium text-white/80 transition-all hover:border-[var(--border-hover)] hover:text-white"
    >
      {mode === "view" ? (
        <>
          <EyeIcon className="h-3.5 w-3.5" />
          <span>View</span>
        </>
      ) : (
        <>
          <PencilIcon className="h-3.5 w-3.5" />
          <span>Edit</span>
        </>
      )}
    </button>
  );
}
