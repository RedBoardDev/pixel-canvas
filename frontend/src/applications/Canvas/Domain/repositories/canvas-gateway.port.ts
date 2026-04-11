import type {
  CanvasPixelUpdateEvent,
  CanvasResetEvent,
  SessionStateEvent,
} from "@/applications/Canvas/Domain/types/canvas.types";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface CanvasGateway {
  connect(): Promise<void>;
  disconnect(): void;
  onPixelUpdate(callback: (event: CanvasPixelUpdateEvent) => void): () => void;
  onCanvasReset(callback: (event: CanvasResetEvent) => void): () => void;
  onSessionStateChange(callback: (event: SessionStateEvent) => void): () => void;
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void;
  getStatus(): ConnectionStatus;
}
