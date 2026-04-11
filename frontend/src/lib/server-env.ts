function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`[server-env] Missing required environment variable: ${key}`);
  }
  return value;
}

export function getServerEnv() {
  return {
    awsRegion: requireEnv("AWS_REGION", process.env.CUSTOM_AWS_REGION ?? "eu-west-1"),
    discordClientId: requireEnv("NEXT_PUBLIC_DISCORD_CLIENT_ID"),
    discordClientSecret: requireEnv("DISCORD_CLIENT_SECRET"),
    discordRedirectUri: requireEnv("DISCORD_REDIRECT_URI"),
  };
}
