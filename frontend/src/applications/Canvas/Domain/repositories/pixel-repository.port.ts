import type { Pixel } from "../entities/Pixel.entity";
import type { Color } from "../value-objects/Color.vo";
import type { Coordinate } from "../value-objects/Coordinate.vo";

export interface PixelRepository {
  getChunk(chunkX: number, chunkY: number): Promise<Pixel[]>;
  getCanvasState(): Promise<Pixel[]>;
  getPixelAt(coordinate: Coordinate): Promise<Pixel | null>;
  placePixel(coordinate: Coordinate, color: Color): Promise<Pixel>;
}
