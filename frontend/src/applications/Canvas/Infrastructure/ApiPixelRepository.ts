import type { ApiClient } from "@/lib/api/apiClient";
import {
  type ChunkResponseDto,
  type PixelDto,
  pixelMapper,
} from "../Application/mappers/pixel.mapper";
import type { Pixel } from "../Domain/entities/Pixel.entity";
import type { PixelRepository } from "../Domain/repositories/pixel-repository.port";
import type { Color } from "../Domain/value-objects/Color.vo";
import type { Coordinate } from "../Domain/value-objects/Coordinate.vo";

export class ApiPixelRepository implements PixelRepository {
  constructor(private readonly api: ApiClient) {}

  async getChunk(chunkX: number, chunkY: number): Promise<Pixel[]> {
    const { data } = await this.api.get<ChunkResponseDto>(
      `/canvas/chunk?cx=${chunkX}&cy=${chunkY}`,
    );
    return data.pixels.map(pixelMapper.toDomain);
  }

  async getCanvasState(): Promise<Pixel[]> {
    return this.getChunk(0, 0);
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

  async placePixel(coordinate: Coordinate, color: Color): Promise<Pixel> {
    const { data } = await this.api.post<PixelDto>("/canvas/pixel", {
      x: coordinate.x,
      y: coordinate.y,
      color: color.hex,
    });
    return pixelMapper.toDomain(data);
  }
}
