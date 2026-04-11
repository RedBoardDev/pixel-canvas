import { CHUNK_SIZE } from "@/applications/Canvas/Domain/constants/canvas.constants";
import { ValueObject } from "@/domain-driven-design";

export { CHUNK_SIZE };

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ChunkCoordinateProps {
  cx: number;
  cy: number;
}

export class ChunkCoordinate extends ValueObject<ChunkCoordinateProps> {
  private constructor(props: ChunkCoordinateProps) {
    super(props);
  }

  static create(cx: number, cy: number): ChunkCoordinate {
    return new ChunkCoordinate({ cx, cy });
  }

  static fromPixel(x: number, y: number): ChunkCoordinate {
    return new ChunkCoordinate({
      cx: Math.floor(x / CHUNK_SIZE),
      cy: Math.floor(y / CHUNK_SIZE),
    });
  }

  static getVisibleChunkKeys(viewport: ViewportBounds, padding = 1): string[] {
    const minCx = Math.floor(viewport.minX / CHUNK_SIZE) - padding;
    const minCy = Math.floor(viewport.minY / CHUNK_SIZE) - padding;
    const maxCx = Math.floor(viewport.maxX / CHUNK_SIZE) + padding;
    const maxCy = Math.floor(viewport.maxY / CHUNK_SIZE) + padding;

    const keys: string[] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        keys.push(`${cx},${cy}`);
      }
    }
    return keys;
  }

  get cx(): number {
    return this.props.cx;
  }

  get cy(): number {
    return this.props.cy;
  }

  toKey(): string {
    return `${this.props.cx},${this.props.cy}`;
  }

  getPixelBounds(): ViewportBounds {
    return {
      minX: this.props.cx * CHUNK_SIZE,
      minY: this.props.cy * CHUNK_SIZE,
      maxX: this.props.cx * CHUNK_SIZE + CHUNK_SIZE - 1,
      maxY: this.props.cy * CHUNK_SIZE + CHUNK_SIZE - 1,
    };
  }
}
