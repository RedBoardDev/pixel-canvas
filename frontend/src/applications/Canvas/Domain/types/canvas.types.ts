import type { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";
import type { CanvasBounds } from "@/applications/Canvas/Domain/value-objects/CanvasBounds.vo";

export type SessionStatus = "active" | "paused";

export interface CanvasIdentity {
  sessionId: string;
  canvasVersion: number;
}

export interface CanvasRateLimit {
  limit: number;
  used: number;
  remaining: number;
  windowStartedAt: Date;
  resetAt: Date;
}

export interface CanvasChunkSnapshot {
  sessionId: string | null;
  canvasVersion: number | null;
  sessionStatus: "active" | null;
  canvasBounds: CanvasBounds;
  pixels: Pixel[];
}

export interface CanvasPlacedPixelResult extends CanvasIdentity {
  pixel: Pixel;
  rateLimit: CanvasRateLimit;
}

export interface CanvasPixelUpdateEvent extends CanvasIdentity {
  pixel: Pixel;
}

export interface CanvasResetEvent extends CanvasIdentity {
  resetAt: Date;
}

export interface SessionStateEvent extends CanvasIdentity {
  status: SessionStatus;
  changedAt: Date;
}
