import { type NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils/errors";
import { getUserFromToken } from "@/lib/dynamodb/repositories/user-session.repository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(401, "missing or invalid token");
  }

  const token = authHeader.slice(7);
  const session = await getUserFromToken(token);

  if (!session) {
    return errorResponse(401, "missing or invalid token");
  }

  const avatar = session.avatar === "" ? null : session.avatar;

  return NextResponse.json({
    id: session.discord_id,
    discord_id: session.discord_id,
    username: session.username,
    avatar,
  });
}
