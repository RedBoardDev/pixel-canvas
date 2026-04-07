"use client";

import { useCallback, useRef, useState } from "react";
import type { ViewportBounds } from "../../Domain/value-objects/ChunkCoordinate.vo";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 30;
const DEFAULT_ZOOM = 4;

interface InteractionConfig {
  pixelSize: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useCanvasInteraction(config: InteractionConfig) {
  const { pixelSize, canvasRef } = config;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);

  const screenToGrid = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.floor((screenX - rect.left - offset.x) / (pixelSize * zoom)),
        y: Math.floor((screenY - rect.top - offset.y) / (pixelSize * zoom)),
      };
    },
    [offset, zoom, pixelSize, canvasRef],
  );

  const getViewportBounds = useCallback((): ViewportBounds => {
    const canvas = canvasRef.current;
    if (!canvas) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      minX: Math.floor(-offset.x / (pixelSize * zoom)),
      minY: Math.floor(-offset.y / (pixelSize * zoom)),
      maxX: Math.ceil((-offset.x + rect.width) / (pixelSize * zoom)),
      maxY: Math.ceil((-offset.y + rect.height) / (pixelSize * zoom)),
    };
  }, [offset, zoom, pixelSize, canvasRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, onHover?: (x: number, y: number) => void) => {
      const { x, y } = screenToGrid(e.clientX, e.clientY);

      if (isDragging.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }

      setHoverPos({ x, y });
      onHover?.(x, y);
    },
    [screenToGrid],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent, onClick: (x: number, y: number) => void) => {
      isDragging.current = false;
      if (dragMoved.current) return;
      const { x, y } = screenToGrid(e.clientX, e.clientY);
      onClick(x, y);
    },
    [screenToGrid],
  );

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    setHoverPos(null);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * factor, MIN_ZOOM), MAX_ZOOM);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      setOffset((prev) => ({
        x: mx - (mx - prev.x) * (newZoom / zoom),
        y: my - (my - prev.y) * (newZoom / zoom),
      }));
      setZoom(newZoom);
    },
    [zoom, canvasRef],
  );

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z * 1.4, MAX_ZOOM)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z / 1.4, MIN_ZOOM)), []);

  const resetView = useCallback((containerWidth: number, containerHeight: number) => {
    setZoom(DEFAULT_ZOOM);
    setOffset({ x: containerWidth / 2, y: containerHeight / 2 });
  }, []);

  const centerOnContainer = useCallback((containerWidth: number, containerHeight: number) => {
    setOffset({ x: containerWidth / 2, y: containerHeight / 2 });
  }, []);

  return {
    offset,
    zoom,
    hoverPos,
    getViewportBounds,
    handlers: { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleWheel },
    controls: { zoomIn, zoomOut, resetView, centerOnContainer },
  };
}
