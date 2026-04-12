import type { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";
import { CooldownNotExpiredError } from "@/applications/Canvas/Domain/errors/canvas.errors";
import type {
  CanvasGateway,
  ConnectionStatus,
} from "@/applications/Canvas/Domain/repositories/canvas-gateway.port";
import type { PixelRepository } from "@/applications/Canvas/Domain/repositories/pixel-repository.port";
import { canPlacePixel } from "@/applications/Canvas/Domain/rules/placement.rules";
import type {
  CanvasChunkSnapshot,
  CanvasPixelUpdateEvent,
  CanvasPlacedPixelResult,
  CanvasResetEvent,
  SessionStateEvent,
} from "@/applications/Canvas/Domain/types/canvas.types";
import { Color } from "@/applications/Canvas/Domain/value-objects/Color.vo";
import { Coordinate } from "@/applications/Canvas/Domain/value-objects/Coordinate.vo";
import { Result } from "@/domain-driven-design";

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

  async getChunk(cx: number, cy: number): Promise<Result<CanvasChunkSnapshot>> {
    try {
      const snapshot = await this.pixelRepo.getChunk(cx, cy);
      return Result.ok(snapshot);
    } catch (error) {
      return Result.fail("Failed to load chunk", error);
    }
  }

  async getPixelAt(x: number, y: number): Promise<Result<Pixel | null>> {
    try {
      const pixel = await this.pixelRepo.getPixelAt(Coordinate.create(x, y));
      return Result.ok(pixel);
    } catch (error) {
      return Result.fail("Failed to fetch pixel", error);
    }
  }

  async placePixel(params: PlacePixelParams): Promise<Result<CanvasPlacedPixelResult>> {
    const { allowed, remainingMs } = canPlacePixel(params.lastPlacedAt, this.cooldownMs);
    if (!allowed) {
      const err = new CooldownNotExpiredError(remainingMs);
      return Result.fail(err.message, undefined, err.code);
    }

    try {
      const result = await this.pixelRepo.placePixel(
        Coordinate.create(params.x, params.y),
        Color.create(params.color),
      );
      return Result.ok(result);
    } catch (error) {
      return Result.fail("Failed to place pixel", error);
    }
  }

  async connectGateway(): Promise<void> {
    return this.gateway.connect();
  }

  disconnectGateway(): void {
    this.gateway.disconnect();
  }

  onPixelUpdate(callback: (event: CanvasPixelUpdateEvent) => void): () => void {
    return this.gateway.onPixelUpdate(callback);
  }

  onCanvasReset(callback: (event: CanvasResetEvent) => void): () => void {
    return this.gateway.onCanvasReset(callback);
  }

  getGatewayStatus() {
    return this.gateway.getStatus();
  }

  onSessionStateChange(callback: (event: SessionStateEvent) => void): () => void {
    return this.gateway.onSessionStateChange(callback);
  }

  onGatewayStatusChange(callback: (status: ConnectionStatus) => void) {
    return this.gateway.onStatusChange(callback);
  }
}
