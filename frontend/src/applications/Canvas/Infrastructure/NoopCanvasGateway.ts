import type {
  CanvasGateway,
  ConnectionStatus,
} from "@/applications/Canvas/Domain/repositories/canvas-gateway.port";
import type {
  CanvasPixelUpdateEvent,
  CanvasResetEvent,
  SessionStateEvent,
} from "@/applications/Canvas/Domain/types/canvas.types";

export class NoopCanvasGateway implements CanvasGateway {
  async connect(): Promise<void> {}

  disconnect(): void {}

  onPixelUpdate(_callback: (event: CanvasPixelUpdateEvent) => void): () => void {
    return () => {};
  }

  onCanvasReset(_callback: (event: CanvasResetEvent) => void): () => void {
    return () => {};
  }

  onSessionStateChange(_callback: (event: SessionStateEvent) => void): () => void {
    return () => {};
  }

  onStatusChange(_callback: (status: ConnectionStatus) => void): () => void {
    return () => {};
  }

  getStatus(): ConnectionStatus {
    return "disconnected";
  }
}
