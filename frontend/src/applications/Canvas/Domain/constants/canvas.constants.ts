import type { ViewportBounds } from "@/applications/Canvas/Domain/value-objects/ChunkCoordinate.vo";

// Chunk geometry
export const CHUNK_SIZE = 64;

// Cache
export const MAX_CACHED_CHUNKS = 50;

// Zoom
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 10;
export const DEFAULT_ZOOM = 1;

// Rendering
export const PIXEL_SIZE = 10;

// Theme
export const BG_COLOR = "#08080c";
export const EMPTY_PIXEL_COLOR = "#181830";
export const GRID_COLOR = "rgba(57,255,133,0.06)";
export const OUT_OF_BOUNDS_COLOR = "#08080c";
export const CANVAS_BORDER_COLOR = "rgba(255, 255, 255, 0.12)";
export const HOVER_BORDER = "rgba(57,255,133,0.5)";

// Default viewport
export const INITIAL_VIEWPORT: ViewportBounds = {
  minX: -64,
  minY: -64,
  maxX: 128,
  maxY: 128,
};

// Color palette (single source of truth)
export const PALETTE_COLORS = [
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
] as const;

export type PaletteColor = (typeof PALETTE_COLORS)[number];

export const PALETTE_COLOR_SET: ReadonlySet<string> = new Set(PALETTE_COLORS);
