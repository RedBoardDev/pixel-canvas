import { type PixelDto, pixelMapper } from "../Application/mappers/pixel.mapper";
import type { Pixel } from "../Domain/entities/Pixel.entity";
import type { CanvasGateway, ConnectionStatus } from "../Domain/repositories/canvas-gateway.port";

export class WebSocketCanvasGateway implements CanvasGateway {
  private ws: WebSocket | null = null;
  private pixelListeners = new Set<(pixel: Pixel) => void>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private status: ConnectionStatus = "disconnected";

  constructor(private readonly wsUrl: string) {}

  async connect(): Promise<void> {
    this.setStatus("connecting");

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.setStatus("connected");
        resolve();
      };

      this.ws.onerror = (event) => {
        reject(new Error(`WebSocket connection failed: ${event}`));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const dto = JSON.parse(event.data as string) as PixelDto;
          const pixel = pixelMapper.toDomain(dto);
          for (const listener of this.pixelListeners) {
            listener(pixel);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.setStatus("reconnecting");
        this.scheduleReconnect();
      };
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
    this.setStatus("disconnected");
  }

  onPixelUpdate(callback: (pixel: Pixel) => void): () => void {
    this.pixelListeners.add(callback);
    return () => {
      this.pixelListeners.delete(callback);
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

  private scheduleReconnect(): void {
    this.reconnectTimeout = setTimeout(() => {
      this.setStatus("connecting");
      this.connect().catch(() => {
        this.setStatus("reconnecting");
        this.scheduleReconnect();
      });
    }, 3000);
  }
}
