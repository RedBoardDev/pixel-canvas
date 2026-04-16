export interface CanvasRateLimitDto {
  limit: number;
  used: number;
  remaining: number;
  windowStartedAt: string;
  resetAt: string;
}
