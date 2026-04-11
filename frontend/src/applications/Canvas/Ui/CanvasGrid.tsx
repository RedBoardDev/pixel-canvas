"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";
import type { ViewportBounds } from "@/applications/Canvas/Domain/value-objects/ChunkCoordinate.vo";
import { CanvasHUD } from "./CanvasHUD";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import type { CanvasMode } from "./hooks/useCanvasMode";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { useViewportTracking } from "./hooks/useViewportTracking";
import { PixelTooltip } from "./PixelTooltip";

interface CanvasGridProps {
  pixels: Map<string, Pixel>;
  selectedColor: string;
  mode: CanvasMode;
  isCooldown: boolean;
  onPixelClick: (x: number, y: number) => void;
  onViewportChange: (bounds: ViewportBounds) => void;
}

export function CanvasGrid({
  pixels,
  selectedColor,
  mode,
  isCooldown,
  onPixelClick,
  onViewportChange,
}: CanvasGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { render, pixelSize } = useCanvasRenderer(canvasRef, containerRef);
  const { offset, zoom, hoverPos, getViewportBounds, handlers, controls } = useCanvasInteraction({
    pixelSize,
    canvasRef,
  });

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const el = containerRef.current;
    if (el) controls.centerOnContainer(el.clientWidth, el.clientHeight);
  }, [controls]);

  useViewportTracking(getViewportBounds, onViewportChange);

  const isEditMode = mode === "edit";

  useEffect(() => {
    render({ pixels, offset, zoom, hoverPos, selectedColor, showEditCursor: isEditMode });
  }, [render, pixels, offset, zoom, hoverPos, selectedColor, isEditMode]);

  const onReset = useCallback(() => {
    const el = containerRef.current;
    if (el) controls.resetView(el.clientWidth, el.clientHeight);
  }, [controls]);

  const hoveredPixel =
    !isEditMode && hoverPos ? (pixels.get(`${hoverPos.x},${hoverPos.y}`) ?? null) : null;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-bg-void">
      <canvas
        ref={canvasRef}
        className={
          isCooldown ? "cursor-progress" : isEditMode ? "cursor-crosshair" : "cursor-default"
        }
        onMouseDown={handlers.handleMouseDown}
        onMouseMove={(e) => {
          mousePos.current = { x: e.clientX, y: e.clientY };
          handlers.handleMouseMove(e);
        }}
        onMouseUp={(e) => handlers.handleMouseUp(e, onPixelClick)}
        onMouseLeave={handlers.handleMouseLeave}
        onWheel={handlers.handleWheel}
      />
      <CanvasHUD
        zoom={zoom}
        onZoomIn={controls.zoomIn}
        onZoomOut={controls.zoomOut}
        onReset={onReset}
        hoverPos={hoverPos}
      />
      <PixelTooltip
        pixel={hoveredPixel}
        screenX={mousePos.current.x}
        screenY={mousePos.current.y}
        containerRect={containerRef.current?.getBoundingClientRect() ?? null}
      />
    </div>
  );
}
