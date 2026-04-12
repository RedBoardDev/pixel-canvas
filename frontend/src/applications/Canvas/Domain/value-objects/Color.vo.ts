import { ValueObject } from "@/domain-driven-design";

interface ColorProps {
  hex: string;
}

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

export class Color extends ValueObject<ColorProps> {
  private constructor(props: ColorProps) {
    super(props);
  }

  static create(hex: string): Color {
    if (!HEX_REGEX.test(hex)) {
      throw new Error(`Invalid color format: ${hex}. Expected #RRGGBB`);
    }
    return new Color({ hex: hex.toLowerCase() });
  }

  get hex(): string {
    return this.props.hex;
  }
}
