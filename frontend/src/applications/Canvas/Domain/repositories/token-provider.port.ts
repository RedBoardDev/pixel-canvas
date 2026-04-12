export interface TokenProvider {
  getAccessToken(): string | null;
}
