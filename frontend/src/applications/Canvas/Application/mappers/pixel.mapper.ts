import { Pixel } from "../../Domain/entities/Pixel.entity";
import { Color } from "../../Domain/value-objects/Color.vo";
import { Coordinate } from "../../Domain/value-objects/Coordinate.vo";

export interface PixelDto {
  x: number;
  y: number;
  color: string;
  userId: string;
  username: string;
  updatedAt: string;
}

export interface ChunkResponseDto {
  chunkX: number;
  chunkY: number;
  pixels: PixelDto[];
}

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
