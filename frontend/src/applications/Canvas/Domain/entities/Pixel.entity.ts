import { Entity, Identifier } from "@/domain-driven-design";
import type { Color } from "../value-objects/Color.vo";
import type { Coordinate } from "../value-objects/Coordinate.vo";

interface PixelProps {
  coordinate: Coordinate;
  color: Color;
  userId: string;
  username: string;
  updatedAt: Date;
}

export class Pixel extends Entity<PixelProps> {
  private constructor(props: PixelProps, id?: string) {
    super(props, id ? new Identifier(id) : undefined);
  }

  static create(props: PixelProps, id?: string): Pixel {
    return new Pixel(props, id);
  }

  get coordinate(): Coordinate {
    return this.props.coordinate;
  }

  get color(): Color {
    return this.props.color;
  }

  get userId(): string {
    return this.props.userId;
  }

  get username(): string {
    return this.props.username;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get key(): string {
    return `${this.props.coordinate.x},${this.props.coordinate.y}`;
  }
}
