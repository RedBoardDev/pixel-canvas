import type { Pixel } from "../entities/Pixel.entity";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface CanvasGateway {
  connect(): Promise<void>;
  disconnect(): void;
  onPixelUpdate(callback: (pixel: Pixel) => void): () => void;
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void;
  getStatus(): ConnectionStatus;
}
