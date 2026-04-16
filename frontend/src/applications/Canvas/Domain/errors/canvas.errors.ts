import { DomainError } from "@/domain-driven-design";
import type { CanvasRateLimit } from "../types/canvas.types";

export class CooldownNotExpiredError extends DomainError {
  readonly code = "COOLDOWN_NOT_EXPIRED";
  readonly httpStatus = 429;
  readonly remainingMs: number;

  constructor(remainingMs: number) {
    super(`Cooldown not expired. ${Math.ceil(remainingMs / 1000)}s remaining.`);
    this.remainingMs = remainingMs;
  }
}

export class RateLimitExceededError extends DomainError {
  readonly code = "RATE_LIMIT_REACHED";
  readonly httpStatus = 429;
  readonly rateLimit: CanvasRateLimit;

  constructor(rateLimit: CanvasRateLimit, message = "Rate limit reached.") {
    super(message, { details: rateLimit });
    this.rateLimit = rateLimit;
  }
}
