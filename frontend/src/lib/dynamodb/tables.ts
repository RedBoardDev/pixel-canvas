export const TABLE = {
  sessions: process.env.SESSIONS_TABLE ?? "sessions",
  canvasPixels: process.env.CANVAS_PIXELS_TABLE ?? "canvas_pixels",
  rateLimits: process.env.RATE_LIMITS_TABLE ?? "rate_limits",
  userSessions: process.env.SESSIONS_TABLE ?? "sessions",
};

export const keys = {
  session: {
    pk: (sessionId: string) => `SESSION#${sessionId}`,
    skMetadata: "METADATA",
  },
  pixel: {
    pk: (sessionId: string) => `SESSION#${sessionId}`,
    sk: (x: number, y: number) => `PIXEL#${x}#${y}`,
    skPrefix: "PIXEL#",
  },
  rateLimit: {
    pk: (userId: string) => `USER#${userId}`,
    sk: (sessionId: string) => `SESSION#${sessionId}`,
  },
  userSession: {
    pk: (token: string) => `TOKEN#${token}`,
    skMetadata: "METADATA",
  },
};

// Parse PIXEL#x#y → { x, y }. Handles negative coordinates.
const PIXEL_SK_REGEX = /^PIXEL#(-?\d+)#(-?\d+)$/;

export function parsePixelSK(sk: string): { x: number; y: number } | null {
  const match = sk.match(PIXEL_SK_REGEX);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}
