import { CHUNK_SIZE } from "@/applications/Canvas/Domain/constants/canvas.constants";
import { ValueObject } from "@/domain-driven-design";

interface CanvasBoundsProps {
  width: number;
  height: number;
}

export class CanvasBounds extends ValueObject<CanvasBoundsProps> {
  private constructor(props: CanvasBoundsProps) {
    super(props);
  }

  static infinite(): CanvasBounds {
    return new CanvasBounds({ width: 0, height: 0 });
  }

  static finite(width: number, height: number): CanvasBounds {
    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid finite canvas dimensions: ${width}x${height}`);
    }
    return new CanvasBounds({ width, height });
  }

  static fromRaw(width: number, height: number): CanvasBounds {
    if (width > 0 && height > 0) {
      return CanvasBounds.finite(width, height);
    }
    return CanvasBounds.infinite();
  }

  get width(): number {
    return this.props.width;
  }

  get height(): number {
    return this.props.height;
  }

  isInfinite(): boolean {
    return this.props.width === 0;
  }

  isFinite(): boolean {
    return !this.isInfinite();
  }

  containsPixel(x: number, y: number): boolean {
    if (this.isInfinite()) return true;
    return x >= 0 && x < this.props.width && y >= 0 && y < this.props.height;
  }

  containsChunk(cx: number, cy: number): boolean {
    if (this.isInfinite()) return true;
    const chunkMinX = cx * CHUNK_SIZE;
    const chunkMinY = cy * CHUNK_SIZE;
    const chunkMaxX = chunkMinX + CHUNK_SIZE;
    const chunkMaxY = chunkMinY + CHUNK_SIZE;
    return (
      chunkMaxX > 0 &&
      chunkMaxY > 0 &&
      chunkMinX < this.props.width &&
      chunkMinY < this.props.height
    );
  }
}
