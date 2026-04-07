import { createChunkRng } from "@/lib/utils/seededRandom";
import { Pixel } from "../Domain/entities/Pixel.entity";
import type { PixelRepository } from "../Domain/repositories/pixel-repository.port";
import { CHUNK_SIZE } from "../Domain/value-objects/ChunkCoordinate.vo";
import type { Color } from "../Domain/value-objects/Color.vo";
import { Color as ColorVO } from "../Domain/value-objects/Color.vo";
import type { Coordinate } from "../Domain/value-objects/Coordinate.vo";
import { Coordinate as CoordinateVO } from "../Domain/value-objects/Coordinate.vo";

const PALETTE = [
  "#FF4500",
  "#FFA800",
  "#FFD635",
  "#00A368",
  "#2450A4",
  "#3690EA",
  "#811E9F",
  "#B44AC0",
];
const NAMES = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank"];

export class MockPixelRepository implements PixelRepository {
  private placed = new Map<string, Pixel>();

  async getChunk(chunkX: number, chunkY: number): Promise<Pixel[]> {
    await delay(80 + Math.random() * 120);
    return this.generateChunk(chunkX, chunkY);
  }

  async getCanvasState(): Promise<Pixel[]> {
    return this.getChunk(0, 0);
  }

  async getPixelAt(coordinate: Coordinate): Promise<Pixel | null> {
    return this.placed.get(`${coordinate.x},${coordinate.y}`) ?? null;
  }

  async placePixel(coordinate: Coordinate, color: Color): Promise<Pixel> {
    await delay(80);
    const pixel = Pixel.create(
      { coordinate, color, userId: "local_user", username: "You", updatedAt: new Date() },
      `${coordinate.x},${coordinate.y}`,
    );
    this.placed.set(`${coordinate.x},${coordinate.y}`, pixel);
    return pixel;
  }

  private generateChunk(cx: number, cy: number): Pixel[] {
    const rng = createChunkRng(`${cx},${cy}`);
    const count = Math.floor(rng() * 10) + 3;
    const pixels: Pixel[] = [];
    const baseX = cx * CHUNK_SIZE;
    const baseY = cy * CHUNK_SIZE;

    for (let i = 0; i < count; i++) {
      const x = baseX + Math.floor(rng() * CHUNK_SIZE);
      const y = baseY + Math.floor(rng() * CHUNK_SIZE);
      const key = `${x},${y}`;
      const overridden = this.placed.get(key);

      pixels.push(
        overridden ??
          Pixel.create(
            {
              coordinate: CoordinateVO.create(x, y),
              color: ColorVO.create(PALETTE[Math.floor(rng() * PALETTE.length)]),
              userId: `user_${Math.floor(rng() * 8)}`,
              username: NAMES[Math.floor(rng() * NAMES.length)],
              updatedAt: new Date(Date.now() - Math.floor(rng() * 3600000)),
            },
            key,
          ),
      );
    }
    return pixels;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
