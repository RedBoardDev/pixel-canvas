import type { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";

export type SessionStatus = "active" | "paused";

export interface CanvasIdentity {
  sessionId: string;
  canvasVersion: number;
}

export interface CanvasChunkSnapshot {
  sessionId: string | null;
  canvasVersion: number | null;
  sessionStatus: "active" | null;
  pixels: Pixel[];
}

export interface CanvasPlacedPixelResult extends CanvasIdentity {
  pixel: Pixel;
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
