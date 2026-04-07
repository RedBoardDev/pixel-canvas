import { Pixel } from "../Domain/entities/Pixel.entity";
import type { CanvasGateway, ConnectionStatus } from "../Domain/repositories/canvas-gateway.port";
import { Color } from "../Domain/value-objects/Color.vo";
import { Coordinate } from "../Domain/value-objects/Coordinate.vo";

const BOT_COLORS = ["#FF4500", "#00A368", "#3690EA", "#811E9F", "#FFD635"];
const BOT_NAMES = ["PixelBot", "ArtBot", "DrawBot", "ColorBot"];

export class MockCanvasGateway implements CanvasGateway {
  private pixelListeners = new Set<(pixel: Pixel) => void>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private status: ConnectionStatus = "disconnected";
  private interval: ReturnType<typeof setInterval> | null = null;

  async connect(): Promise<void> {
    this.setStatus("connecting");
    await new Promise((r) => setTimeout(r, 500));
    this.setStatus("connected");
    this.startSimulation();
  }

  disconnect(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.setStatus("disconnected");
  }

  onPixelUpdate(callback: (pixel: Pixel) => void): () => void {
    this.pixelListeners.add(callback);
    return () => this.pixelListeners.delete(callback);
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const cb of this.statusListeners) cb(status);
  }

  private startSimulation(): void {
    this.interval = setInterval(() => {
      const x = Math.floor(Math.random() * 400) - 200;
      const y = Math.floor(Math.random() * 400) - 200;
      const pixel = Pixel.create(
        {
          coordinate: Coordinate.create(x, y),
          color: Color.create(BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)]),
          userId: `bot_${Math.floor(Math.random() * 4)}`,
          username: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
          updatedAt: new Date(),
        },
        `${x},${y}`,
      );
      for (const cb of this.pixelListeners) cb(pixel);
    }, 2000);
  }
}
