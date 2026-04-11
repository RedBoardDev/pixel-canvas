import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils/errors";
import { createUserSession } from "@/lib/dynamodb/repositories/user-session.repository";
import { getServerEnv } from "@/lib/server-env";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid request body");
  }

  if (!body.code || typeof body.code !== "string") {
    return errorResponse(400, "missing code");
  }

  // Validate server env vars (throws with clear message if missing)
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch (e) {
    console.error("[auth/callback]", (e as Error).message);
    return errorResponse(500, "server configuration error");
  }

  // Exchange code with Discord
  const tokenParams = new URLSearchParams({
    client_id: env.discordClientId,
    client_secret: env.discordClientSecret,
    grant_type: "authorization_code",
    code: body.code,
    redirect_uri: env.discordRedirectUri,
  });

  console.log("[auth/callback] Exchanging code with Discord", {
    client_id: env.discordClientId,
    redirect_uri: env.discordRedirectUri,
    grant_type: "authorization_code",
    code_length: body.code.length,
  });

  const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    console.error("[auth/callback] Discord token exchange failed:", tokenRes.status, errorBody);
    if (tokenRes.status === 401 || tokenRes.status === 400) {
      return errorResponse(401, "invalid authorization code");
    }
    return errorResponse(502, "failed to communicate with Discord");
  }

  const discordToken: DiscordTokenResponse = await tokenRes.json();

  // Fetch Discord user (token stays server-side)
  const userRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${discordToken.access_token}` },
  });

  if (!userRes.ok) {
    console.error("[auth/callback] Discord user fetch failed:", userRes.status);
    return errorResponse(502, "failed to fetch user from Discord");
  }

  const discordUser: DiscordUser = await userRes.json();

  // Generate app token
  const appToken = crypto.randomBytes(32).toString("hex");

  // Store session in DynamoDB
  try {
    await createUserSession(appToken, discordUser.id, discordUser.username, discordUser.avatar);
  } catch (e) {
    console.error("[auth/callback] DynamoDB error:", (e as Error).message);
    return errorResponse(500, "internal server error");
  }

  return NextResponse.json({
    access_token: appToken,
    expires_in: 7 * 24 * 60 * 60,
    user: {
      id: discordUser.id,
      discord_id: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
    },
  });
}
