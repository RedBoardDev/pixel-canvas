import { PALETTE_COLOR_SET } from "@/applications/Canvas/Domain/constants/canvas.constants";

export function isValidColor(hex: string): boolean {
  return PALETTE_COLOR_SET.has(hex.toUpperCase());
}

export function isValidCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
