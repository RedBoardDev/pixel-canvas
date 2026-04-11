export interface SessionItem {
  PK: string;
  SK: string;
  session_id: string;
  status: "active" | "paused" | "ended";
  canvas_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_reset_at?: string;
  last_snapshot_url?: string;
  last_snapshot_at?: string;
  last_snapshot_pixels?: number;
  canvas_width?: number;
  canvas_height?: number;
}

export interface PixelItem {
  PK: string;
  SK: string;
  color: string;
  user_id: string;
  username: string;
  canvas_version: number;
  updated_at: string;
}

export interface RateLimitItem {
  PK: string;
  SK: string;
  pixel_count: number;
  window_start: string;
  TTL: number;
}

export interface UserSessionItem {
  PK: string;
  SK: string;
  discord_id: string;
  username: string;
  avatar: string;
  created_at: string;
  TTL: number;
}
