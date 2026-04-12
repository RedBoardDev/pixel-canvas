import type { CanvasRealtimeEventDto } from "@/applications/Canvas/Application/mappers/pixel.mapper";
import { realtimeMapper } from "@/applications/Canvas/Application/mappers/realtime.mapper";
import type {
  CanvasGateway,
  ConnectionStatus,
} from "@/applications/Canvas/Domain/repositories/canvas-gateway.port";
import type {
  CanvasPixelUpdateEvent,
  CanvasResetEvent,
  SessionStateEvent,
} from "@/applications/Canvas/Domain/types/canvas.types";

export class WebSocketCanvasGateway implements CanvasGateway {
  private static readonly BASE_DELAY_MS = 1000;
  private static readonly MAX_DELAY_MS = 30000;

  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  private pixelListeners = new Set<(event: CanvasPixelUpdateEvent) => void>();
  private resetListeners = new Set<(event: CanvasResetEvent) => void>();
  private sessionStateListeners = new Set<(event: SessionStateEvent) => void>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();

  constructor(private readonly wsUrl: string) {}

  async connect(): Promise<void> {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.setStatus("connecting");

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(this.wsUrl);

      ws.onopen = () => {
        settled = true;
        this.reconnectAttempts = 0;
        this.setStatus("connected");
        resolve();
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error("WebSocket connection failed"));
        }
      };

      ws.onclose = () => {
        if (!settled) {
          settled = true;
          reject(new Error("WebSocket closed before connecting"));
          return;
        }
        this.setStatus("reconnecting");
        this.scheduleReconnect();
      };

      ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event);
      };

      this.ws = ws;
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.setStatus("disconnected");
  }

  onPixelUpdate(callback: (event: CanvasPixelUpdateEvent) => void): () => void {
    this.pixelListeners.add(callback);
    return () => {
      this.pixelListeners.delete(callback);
    };
  }

  onCanvasReset(callback: (event: CanvasResetEvent) => void): () => void {
    this.resetListeners.add(callback);
    return () => {
      this.resetListeners.delete(callback);
    };
  }

  onSessionStateChange(callback: (event: SessionStateEvent) => void): () => void {
    this.sessionStateListeners.add(callback);
    return () => {
      this.sessionStateListeners.delete(callback);
    };
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const dto = JSON.parse(event.data as string) as CanvasRealtimeEventDto;

      if (realtimeMapper.isPixelUpdatedEvent(dto)) {
        const pixelEvent = realtimeMapper.toPixelUpdatedEvent(dto);
        for (const listener of this.pixelListeners) {
          listener(pixelEvent);
        }
        return;
      }

      if (realtimeMapper.isSessionStateEvent(dto)) {
        const stateEvent = realtimeMapper.toSessionStateEvent(dto);
        for (const listener of this.sessionStateListeners) {
          listener(stateEvent);
        }
        return;
      }

      if (dto.type === "canvas.reset") {
        const resetEvent = realtimeMapper.toCanvasResetEvent(dto);
        for (const listener of this.resetListeners) {
          listener(resetEvent);
        }
        return;
      }

      console.warn("[WebSocket] Unknown event type:", (dto as { type: string }).type);
    } catch (error) {
      console.warn("[WebSocket] Failed to parse message:", error);
    }
  }

  private getReconnectDelay(): number {
    const exponential = Math.min(
      WebSocketCanvasGateway.MAX_DELAY_MS,
      WebSocketCanvasGateway.BASE_DELAY_MS * 2 ** this.reconnectAttempts,
    );
    const jitter = exponential * (0.5 + Math.random() * 0.5);
    return Math.min(jitter, WebSocketCanvasGateway.MAX_DELAY_MS);
  }

  private scheduleReconnect(): void {
    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {
        this.setStatus("reconnecting");
        this.scheduleReconnect();
      });
    }, delay);
  }
}
