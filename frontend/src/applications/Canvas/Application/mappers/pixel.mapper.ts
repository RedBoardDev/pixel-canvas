import { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";
import { Color } from "@/applications/Canvas/Domain/value-objects/Color.vo";
import { Coordinate } from "@/applications/Canvas/Domain/value-objects/Coordinate.vo";

export interface PixelDto {
  x: number;
  y: number;
  color: string;
  userId: string;
  username: string;
  updatedAt: string;
}

export interface CanvasIdentityDto {
  sessionId: string | null;
  canvasVersion: number | null;
}

export interface ChunkResponseDto {
  sessionId: string | null;
  canvasVersion: number | null;
  sessionStatus: "active" | null;
  chunkX: number;
  chunkY: number;
  pixels: PixelDto[];
}

export interface PixelResponseDto extends PixelDto {
  sessionId: string;
  canvasVersion: number;
}

export interface PixelUpdatedEventDto {
  type: "pixel.updated";
  payload: {
    sessionId: string;
    canvasVersion: number;
    pixel: PixelDto;
  };
}

export interface CanvasResetEventDto {
  type: "canvas.reset";
  payload: {
    sessionId: string;
    canvasVersion: number;
    resetAt: string;
  };
}

export interface SessionStateEventDto {
  type: "session.state_changed";
  payload: {
    sessionId: string;
    canvasVersion: number;
    status: string;
    changedAt: string;
  };
}

export type CanvasRealtimeEventDto =
  | PixelUpdatedEventDto
  | CanvasResetEventDto
  | SessionStateEventDto;

export const pixelMapper = {
  toDomain(dto: PixelDto): Pixel {
    return Pixel.create(
      {
        coordinate: Coordinate.create(dto.x, dto.y),
        color: Color.create(dto.color),
        userId: dto.userId,
        username: dto.username,
        updatedAt: new Date(dto.updatedAt),
      },
      `${dto.x},${dto.y}`,
    );
  },

  toDto(pixel: Pixel): PixelDto {
    return {
      x: pixel.coordinate.x,
      y: pixel.coordinate.y,
      color: pixel.color.hex,
      userId: pixel.userId,
      username: pixel.username,
      updatedAt: pixel.updatedAt.toISOString(),
    };
  },
};
