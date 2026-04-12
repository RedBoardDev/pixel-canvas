import type { Pixel } from "@/applications/Canvas/Domain/entities/Pixel.entity";
import type {
  CanvasChunkSnapshot,
  CanvasPlacedPixelResult,
} from "@/applications/Canvas/Domain/types/canvas.types";
import type { Color } from "@/applications/Canvas/Domain/value-objects/Color.vo";
import type { Coordinate } from "@/applications/Canvas/Domain/value-objects/Coordinate.vo";

export interface PixelRepository {
  getChunk(chunkX: number, chunkY: number): Promise<CanvasChunkSnapshot>;
  getPixelAt(coordinate: Coordinate): Promise<Pixel | null>;
  placePixel(coordinate: Coordinate, color: Color): Promise<CanvasPlacedPixelResult>;
}
