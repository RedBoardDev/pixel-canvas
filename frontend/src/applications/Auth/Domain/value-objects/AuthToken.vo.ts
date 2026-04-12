import { ValueObject } from "@/domain-driven-design";

interface AuthTokenProps {
  accessToken: string;
  expiresAt: Date;
}

export class AuthToken extends ValueObject<AuthTokenProps> {
  private constructor(props: AuthTokenProps) {
    super(props);
  }

  static create(accessToken: string, expiresAt: Date): AuthToken {
    return new AuthToken({ accessToken, expiresAt });
  }

  get accessToken(): string {
    return this.props.accessToken;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return now >= this.props.expiresAt;
  }
}
