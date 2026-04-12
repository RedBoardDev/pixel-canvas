import { ValueObject } from "@/domain-driven-design";

interface CoordinateProps {
  x: number;
  y: number;
}

export class Coordinate extends ValueObject<CoordinateProps> {
  private constructor(props: CoordinateProps) {
    super(props);
  }

  static create(x: number, y: number): Coordinate {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new Error(`Coordinates must be integers: (${x}, ${y})`);
    }
    return new Coordinate({ x, y });
  }

  get x(): number {
    return this.props.x;
  }

  get y(): number {
    return this.props.y;
  }
}
