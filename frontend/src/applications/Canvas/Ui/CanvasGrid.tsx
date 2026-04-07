"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Pixel } from "../Domain/entities/Pixel.entity";
import type { ViewportBounds } from "../Domain/value-objects/ChunkCoordinate.vo";
import { CoordinateDisplay } from "./CoordinateDisplay";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useCanvasRenderer } from "./hooks/useCanvasRenderer";
import { useViewportTracking } from "./hooks/useViewportTracking";
import { ZoomControls } from "./ZoomControls";

interface CanvasGridProps {
  pixels: Map<string, Pixel>;
  selectedColor: string;
  onPixelClick: (x: number, y: number) => void;
  onPixelHover?: (x: number, y: number) => void;
  onHoverLeave?: () => void;
  onViewportChange: (bounds: ViewportBounds) => void;
}

export function CanvasGrid({
  pixels,
  selectedColor,
  onPixelClick,
  onPixelHover,
  onHoverLeave,
  onViewportChange,
}: CanvasGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    render({ pixels, offset, zoom, hoverPos, selectedColor });
  }, [render, pixels, offset, zoom, hoverPos, selectedColor]);

  const onReset = useCallback(() => {
    const el = containerRef.current;
    if (el) controls.resetView(el.clientWidth, el.clientHeight);
  }, [controls]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#060612]">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair"
        onMouseDown={handlers.handleMouseDown}
        onMouseMove={(e) => handlers.handleMouseMove(e, onPixelHover)}
        onMouseUp={(e) => handlers.handleMouseUp(e, onPixelClick)}
        onMouseLeave={() => {
          handlers.handleMouseLeave();
          onHoverLeave?.();
        }}
        onWheel={handlers.handleWheel}
      />
      <ZoomControls
        zoom={zoom}
        onZoomIn={controls.zoomIn}
        onZoomOut={controls.zoomOut}
        onReset={onReset}
      />
      {hoverPos && <CoordinateDisplay x={hoverPos.x} y={hoverPos.y} />}
    </div>
  );
}
