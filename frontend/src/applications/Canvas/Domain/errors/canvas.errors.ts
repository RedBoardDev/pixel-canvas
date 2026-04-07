import { DomainError } from "@/domain-driven-design";

export class CooldownNotExpiredError extends DomainError {
  readonly code = "COOLDOWN_NOT_EXPIRED";
  readonly httpStatus = 429;
  readonly remainingMs: number;

  constructor(remainingMs: number) {
    super(`Cooldown not expired. ${Math.ceil(remainingMs / 1000)}s remaining.`);
    this.remainingMs = remainingMs;
  }
}
