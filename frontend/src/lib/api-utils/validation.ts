export const COLOR_PALETTE = new Set([
  "#FF4500",
  "#FFA800",
  "#FFD635",
  "#00A368",
  "#7EED56",
  "#2450A4",
  "#3690EA",
  "#51E9F4",
  "#811E9F",
  "#B44AC0",
  "#FF99AA",
  "#9C6926",
  "#000000",
  "#898D90",
  "#D4D7D9",
  "#FFFFFF",
]);

export function isValidColor(hex: string): boolean {
  return COLOR_PALETTE.has(hex.toUpperCase());
}

export function isValidCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
