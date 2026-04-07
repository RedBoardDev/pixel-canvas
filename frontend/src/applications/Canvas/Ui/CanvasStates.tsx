"use client";

export function CanvasLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[var(--accent)]" />
        <span className="text-sm text-[var(--muted)]">Loading canvas...</span>
      </div>
    </div>
  );
}

export function CanvasError({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-lg text-[var(--danger)]">Connection failed</span>
        <span className="max-w-xs text-sm text-[var(--muted)]">{message}</span>
      </div>
    </div>
  );
}
