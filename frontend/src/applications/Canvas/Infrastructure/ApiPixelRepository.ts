import {
  type ApiErrorDto,
  type ChunkResponseDto,
  type PixelDto,
  type PixelResponseDto,
  pixelMapper,
  rateLimitMapper,
} from "@/applications/Canvas/Application/mappers/pixel.mapper";
import { RateLimitExceededError } from "@/applications/Canvas/Domain/errors/canvas.errors";
import type { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";
import type { PixelRepository } from "@/applications/Canvas/Domain/repositories/pixel-repository.port";
import type { TokenProvider } from "@/applications/Canvas/Domain/repositories/token-provider.port";
import type {
  CanvasChunkSnapshot,
  CanvasPlacedPixelResult,
} from "@/applications/Canvas/Domain/types/canvas.types";
import { CanvasBounds } from "@/applications/Canvas/Domain/value-objects/CanvasBounds.vo";
import type { Color } from "@/applications/Canvas/Domain/value-objects/Color.vo";
import type { Coordinate } from "@/applications/Canvas/Domain/value-objects/Coordinate.vo";
import { ApiClientError, type ApiClient } from "@/lib/api/apiClient";

function isRateLimitErrorDto(
  value: unknown,
): value is ApiErrorDto & { rateLimit: NonNullable<ApiErrorDto["rateLimit"]> } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const rateLimit = candidate.rateLimit;

  return (
    typeof candidate.error === "string" &&
    typeof rateLimit === "object" &&
    rateLimit !== null &&
    typeof (rateLimit as Record<string, unknown>).limit === "number" &&
    typeof (rateLimit as Record<string, unknown>).used === "number" &&
    typeof (rateLimit as Record<string, unknown>).remaining === "number" &&
    typeof (rateLimit as Record<string, unknown>).windowStartedAt === "string" &&
    typeof (rateLimit as Record<string, unknown>).resetAt === "string"
  );
}

export class ApiPixelRepository implements PixelRepository {
  constructor(
    private readonly api: ApiClient,
    private readonly tokenProvider: TokenProvider,
  ) {}

  async getChunk(chunkX: number, chunkY: number): Promise<CanvasChunkSnapshot> {
    const { data } = await this.api.get<ChunkResponseDto>(
      `/canvas/chunk?cx=${chunkX}&cy=${chunkY}`,
    );
    return {
      sessionId: data.sessionId,
      canvasVersion: data.canvasVersion,
      sessionStatus: data.sessionStatus ?? null,
      canvasBounds: CanvasBounds.fromRaw(data.canvasWidth, data.canvasHeight),
      pixels: data.pixels.map(pixelMapper.toDomain),
    };
  }

  async getPixelAt(coordinate: Coordinate): Promise<Pixel | null> {
    try {
      const { data } = await this.api.get<PixelDto>(
        `/canvas/pixel?x=${coordinate.x}&y=${coordinate.y}`,
      );
      return pixelMapper.toDomain(data);
    } catch {
      return null;
    }
  }

  async placePixel(coordinate: Coordinate, color: Color): Promise<CanvasPlacedPixelResult> {
    const accessToken = this.tokenProvider.getAccessToken();
    try {
      const { data } = await this.api.post<PixelResponseDto>(
        "/canvas/pixel",
        {
          x: coordinate.x,
          y: coordinate.y,
          color: color.hex,
        },
        accessToken
          ? {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          : undefined,
      );
      return {
        sessionId: data.sessionId,
        canvasVersion: data.canvasVersion,
        pixel: pixelMapper.toDomain(data),
        rateLimit: rateLimitMapper.toDomain(data.rateLimit),
      };
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.status === 429 &&
        isRateLimitErrorDto(error.body)
      ) {
        throw new RateLimitExceededError(
          rateLimitMapper.toDomain(error.body.rateLimit),
          error.body.error,
        );
      }

      throw error;
    }
  }
}
