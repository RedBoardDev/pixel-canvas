"use client";

export function CanvasLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-bg-void">
      <div className="flex flex-col items-center gap-4">
        <div className="h-0.5 w-32 overflow-hidden rounded-full bg-border-subtle">
          <div className="animate-pulse-bar h-full w-full rounded-full bg-accent" />
        </div>
        <span className="text-sm text-text-muted">Loading canvas...</span>
      </div>
    </div>
  );
}
