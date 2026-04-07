"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Pixel } from "../../Domain/entities/Pixel.entity";

const PIXEL_SIZE = 10;
const BG_COLOR = "#0a0a1a";
const EMPTY_PIXEL_COLOR = "#16162e";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const HOVER_BORDER = "rgba(255,255,255,0.2)";

interface RendererParams {
  pixels: Map<string, Pixel>;
  offset: { x: number; y: number };
  zoom: number;
  hoverPos: { x: number; y: number } | null;
  selectedColor: string;
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

    const { pixels, offset, zoom, hoverPos, selectedColor } = params;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Viewport bounds in pixel coordinates
    const vpMinX = Math.floor(-offset.x / (PIXEL_SIZE * zoom)) - 1;
    const vpMinY = Math.floor(-offset.y / (PIXEL_SIZE * zoom)) - 1;
    const vpMaxX = Math.ceil((-offset.x + w) / (PIXEL_SIZE * zoom)) + 1;
    const vpMaxY = Math.ceil((-offset.y + h) / (PIXEL_SIZE * zoom)) + 1;

    // Infinite empty background for visible area
    ctx.fillStyle = EMPTY_PIXEL_COLOR;
    ctx.fillRect(
      vpMinX * PIXEL_SIZE,
      vpMinY * PIXEL_SIZE,
      (vpMaxX - vpMinX) * PIXEL_SIZE,
      (vpMaxY - vpMinY) * PIXEL_SIZE,
    );

    // Draw pixels
    for (const [, pixel] of pixels) {
      ctx.fillStyle = pixel.color.hex;
      ctx.fillRect(
        pixel.coordinate.x * PIXEL_SIZE,
        pixel.coordinate.y * PIXEL_SIZE,
        PIXEL_SIZE,
        PIXEL_SIZE,
      );
    }

    // Grid lines (only when zoomed in, dynamic range)
    if (zoom >= 3) {
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5 / zoom;
      for (let x = vpMinX; x <= vpMaxX; x++) {
        ctx.beginPath();
        ctx.moveTo(x * PIXEL_SIZE, vpMinY * PIXEL_SIZE);
        ctx.lineTo(x * PIXEL_SIZE, vpMaxY * PIXEL_SIZE);
        ctx.stroke();
      }
      for (let y = vpMinY; y <= vpMaxY; y++) {
        ctx.beginPath();
        ctx.moveTo(vpMinX * PIXEL_SIZE, y * PIXEL_SIZE);
        ctx.lineTo(vpMaxX * PIXEL_SIZE, y * PIXEL_SIZE);
        ctx.stroke();
      }
    }

    // Hover highlight
    if (hoverPos) {
      ctx.fillStyle = selectedColor;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(hoverPos.x * PIXEL_SIZE, hoverPos.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = HOVER_BORDER;
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(hoverPos.x * PIXEL_SIZE, hoverPos.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    }

    ctx.restore();
  }, [canvasRef]);

  // Resize observer
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
