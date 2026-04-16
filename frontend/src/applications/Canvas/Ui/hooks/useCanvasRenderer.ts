"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  BG_COLOR,
  CANVAS_BORDER_COLOR,
  EMPTY_PIXEL_COLOR,
  GRID_COLOR,
  HOVER_BORDER,
  PIXEL_SIZE,
} from "@/applications/Canvas/Domain/constants/canvas.constants";
import type { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";
import type { CanvasBounds } from "@/applications/Canvas/Domain/value-objects/CanvasBounds.vo";

interface RendererParams {
  pixels: Map<string, Pixel>;
  offset: { x: number; y: number };
  zoom: number;
  hoverPos: { x: number; y: number } | null;
  selectedColor: string;
  showEditCursor: boolean;
  canvasBounds: CanvasBounds | null;
}

export function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const paramsRef = useRef<RendererParams | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const params = paramsRef.current;
    if (!canvas || !params) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { pixels, offset, zoom, hoverPos, selectedColor, showEditCursor, canvasBounds } = params;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const hasFiniteWidth = canvasBounds?.hasFiniteWidth() ?? false;
    const hasFiniteHeight = canvasBounds?.hasFiniteHeight() ?? false;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const vpMinX = Math.floor(-offset.x / (PIXEL_SIZE * zoom)) - 1;
    const vpMinY = Math.floor(-offset.y / (PIXEL_SIZE * zoom)) - 1;
    const vpMaxX = Math.ceil((-offset.x + w) / (PIXEL_SIZE * zoom)) + 1;
    const vpMaxY = Math.ceil((-offset.y + h) / (PIXEL_SIZE * zoom)) + 1;

    const fillX = hasFiniteWidth ? 0 : vpMinX * PIXEL_SIZE;
    const fillY = hasFiniteHeight ? 0 : vpMinY * PIXEL_SIZE;
    const fillWidth =
      hasFiniteWidth && canvasBounds
        ? canvasBounds.width * PIXEL_SIZE
        : (vpMaxX - vpMinX) * PIXEL_SIZE;
    const fillHeight =
      hasFiniteHeight && canvasBounds
        ? canvasBounds.height * PIXEL_SIZE
        : (vpMaxY - vpMinY) * PIXEL_SIZE;

    ctx.fillStyle = EMPTY_PIXEL_COLOR;
    ctx.fillRect(fillX, fillY, fillWidth, fillHeight);

    for (const [, pixel] of pixels) {
      if (canvasBounds && !canvasBounds.containsPixel(pixel.coordinate.x, pixel.coordinate.y)) {
        continue;
      }

      ctx.fillStyle = pixel.color.hex;
      ctx.fillRect(
        pixel.coordinate.x * PIXEL_SIZE,
        pixel.coordinate.y * PIXEL_SIZE,
        PIXEL_SIZE,
        PIXEL_SIZE,
      );
    }

    if (zoom >= 3) {
      const gridMinX = hasFiniteWidth ? Math.max(vpMinX, 0) : vpMinX;
      const gridMinY = hasFiniteHeight ? Math.max(vpMinY, 0) : vpMinY;
      const gridMaxX = hasFiniteWidth ? Math.min(vpMaxX, canvasBounds?.width ?? vpMaxX) : vpMaxX;
      const gridMaxY = hasFiniteHeight ? Math.min(vpMaxY, canvasBounds?.height ?? vpMaxY) : vpMaxY;

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5 / zoom;
      for (let x = gridMinX; x <= gridMaxX; x++) {
        ctx.beginPath();
        ctx.moveTo(x * PIXEL_SIZE, gridMinY * PIXEL_SIZE);
        ctx.lineTo(x * PIXEL_SIZE, gridMaxY * PIXEL_SIZE);
        ctx.stroke();
      }
      for (let y = gridMinY; y <= gridMaxY; y++) {
        ctx.beginPath();
        ctx.moveTo(gridMinX * PIXEL_SIZE, y * PIXEL_SIZE);
        ctx.lineTo(gridMaxX * PIXEL_SIZE, y * PIXEL_SIZE);
        ctx.stroke();
      }
    }

    if (canvasBounds && (hasFiniteWidth || hasFiniteHeight)) {
      ctx.strokeStyle = CANVAS_BORDER_COLOR;
      ctx.lineWidth = 2 / zoom;

      if (hasFiniteWidth && hasFiniteHeight) {
        ctx.strokeRect(0, 0, canvasBounds.width * PIXEL_SIZE, canvasBounds.height * PIXEL_SIZE);
      } else if (hasFiniteWidth) {
        const minY = vpMinY * PIXEL_SIZE;
        const maxY = vpMaxY * PIXEL_SIZE;
        const maxX = canvasBounds.width * PIXEL_SIZE;

        ctx.beginPath();
        ctx.moveTo(0, minY);
        ctx.lineTo(0, maxY);
        ctx.moveTo(maxX, minY);
        ctx.lineTo(maxX, maxY);
        ctx.stroke();
      } else if (hasFiniteHeight) {
        const minX = vpMinX * PIXEL_SIZE;
        const maxX = vpMaxX * PIXEL_SIZE;
        const maxY = canvasBounds.height * PIXEL_SIZE;

        ctx.beginPath();
        ctx.moveTo(minX, 0);
        ctx.lineTo(maxX, 0);
        ctx.moveTo(minX, maxY);
        ctx.lineTo(maxX, maxY);
        ctx.stroke();
      }
    }

    if (hoverPos && showEditCursor) {
      const withinBounds = !canvasBounds || canvasBounds.containsPixel(hoverPos.x, hoverPos.y);
      if (withinBounds) {
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(hoverPos.x * PIXEL_SIZE, hoverPos.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = HOVER_BORDER;
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(hoverPos.x * PIXEL_SIZE, hoverPos.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      }
    }

    ctx.restore();
  }, [canvasRef]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      draw();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, canvasRef, draw]);

  const render = useCallback(
    (params: RendererParams) => {
      paramsRef.current = params;
      draw();
    },
    [draw],
  );

  return { render, pixelSize: PIXEL_SIZE };
}
