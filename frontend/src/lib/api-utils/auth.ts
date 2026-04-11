import type { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/dynamodb/repositories/user-session.repository";
import { errorResponse } from "./errors";

export interface AuthContext {
  user: {
    discordId: string;
    username: string;
    avatar: string | null;
  };
  token: string;
}

type AuthenticatedHandler = (request: NextRequest, auth: AuthContext) => Promise<NextResponse>;

function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const token = extractBearerToken(request);
    if (!token) {
      return errorResponse(401, "missing or invalid token");
    }

    const session = await getUserFromToken(token);
    if (!session) {
      return errorResponse(401, "missing or invalid token");
    }

    const avatar = session.avatar === "" ? null : session.avatar;

    return handler(request, {
      user: {
        discordId: session.discord_id,
        username: session.username,
        avatar,
      },
      token,
    });
  };
}
