import { DomainError } from "@/domain-driven-design";

export class AuthenticationError extends DomainError {
  readonly code = "AUTHENTICATION_FAILED";
  readonly httpStatus = 401;

  constructor(message = "Authentication failed") {
    super(message);
  }
}

export class TokenExpiredError extends DomainError {
  readonly code = "TOKEN_EXPIRED";
  readonly httpStatus = 401;

  constructor() {
    super("Authentication token has expired.");
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  readonly httpStatus = 401;

  constructor() {
    super("User is not authenticated.");
  }
}
