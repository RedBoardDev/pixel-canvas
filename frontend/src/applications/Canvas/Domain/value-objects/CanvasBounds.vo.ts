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

  private static normalizeAxis(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
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
    return new CanvasBounds({
      width: CanvasBounds.normalizeAxis(width),
      height: CanvasBounds.normalizeAxis(height),
    });
  }

  get width(): number {
    return this.props.width;
  }

  get height(): number {
    return this.props.height;
  }

  hasFiniteWidth(): boolean {
    return this.props.width > 0;
  }

  hasFiniteHeight(): boolean {
    return this.props.height > 0;
  }

  isInfinite(): boolean {
    return !this.hasFiniteWidth() && !this.hasFiniteHeight();
  }

  isFinite(): boolean {
    return this.hasFiniteWidth() && this.hasFiniteHeight();
  }

  containsPixel(x: number, y: number): boolean {
    const withinWidth = this.hasFiniteWidth() ? x >= 0 && x < this.props.width : true;
    const withinHeight = this.hasFiniteHeight() ? y >= 0 && y < this.props.height : true;

    return withinWidth && withinHeight;
  }

  containsChunk(cx: number, cy: number): boolean {
    const chunkMinX = cx * CHUNK_SIZE;
    const chunkMinY = cy * CHUNK_SIZE;
    const chunkMaxX = chunkMinX + CHUNK_SIZE;
    const chunkMaxY = chunkMinY + CHUNK_SIZE;

    const withinWidth = this.hasFiniteWidth()
      ? chunkMaxX > 0 && chunkMinX < this.props.width
      : true;
    const withinHeight = this.hasFiniteHeight()
      ? chunkMaxY > 0 && chunkMinY < this.props.height
      : true;

    return withinWidth && withinHeight;
  }
}
