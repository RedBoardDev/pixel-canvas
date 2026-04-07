import type { Pixel } from "../../Domain/entities/Pixel.entity";
import { CooldownNotExpiredError } from "../../Domain/errors/canvas.errors";
import type { CanvasGateway } from "../../Domain/repositories/canvas-gateway.port";
import type { PixelRepository } from "../../Domain/repositories/pixel-repository.port";
import { canPlacePixel } from "../../Domain/rules/placement.rules";
import { Color } from "../../Domain/value-objects/Color.vo";
import { Coordinate } from "../../Domain/value-objects/Coordinate.vo";

interface PlacePixelParams {
  x: number;
  y: number;
  color: string;
  lastPlacedAt: Date | null;
}

export class CanvasService {
  constructor(
    private readonly pixelRepo: PixelRepository,
    private readonly gateway: CanvasGateway,
    private readonly cooldownMs: number,
  ) {}

  async getChunk(cx: number, cy: number): Promise<Pixel[]> {
    return this.pixelRepo.getChunk(cx, cy);
  }

  async getPixelAt(x: number, y: number): Promise<Pixel | null> {
    return this.pixelRepo.getPixelAt(Coordinate.create(x, y));
  }

  async placePixel(params: PlacePixelParams): Promise<Pixel> {
    const { allowed, remainingMs } = canPlacePixel(params.lastPlacedAt, this.cooldownMs);
    if (!allowed) throw new CooldownNotExpiredError(remainingMs);

    return this.pixelRepo.placePixel(
      Coordinate.create(params.x, params.y),
      Color.create(params.color),
    );
  }

  async connectGateway(): Promise<void> {
    return this.gateway.connect();
  }

  disconnectGateway(): void {
    this.gateway.disconnect();
  }

  onPixelUpdate(callback: (pixel: Pixel) => void): () => void {
    return this.gateway.onPixelUpdate(callback);
  }

  getGatewayStatus() {
    return this.gateway.getStatus();
  }

  onGatewayStatusChange(
    callback: (status: "disconnected" | "connecting" | "connected" | "reconnecting") => void,
  ) {
    return this.gateway.onStatusChange(callback);
  }
}
