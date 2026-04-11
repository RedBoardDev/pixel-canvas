import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils/auth";
import { errorResponse } from "@/lib/api-utils/errors";
import { isValidColor, isValidCoordinate } from "@/lib/api-utils/validation";
import { getPixel, putPixel } from "@/lib/dynamodb/repositories/pixel.repository";
import {
  checkRateLimit,
  incrementRateLimit,
} from "@/lib/dynamodb/repositories/rate-limit.repository";
import { getActiveSession } from "@/lib/dynamodb/repositories/session.repository";
import { parsePixelSK } from "@/lib/dynamodb/tables";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const xParam = searchParams.get("x");
  const yParam = searchParams.get("y");

  if (xParam === null || yParam === null) {
    return errorResponse(400, "missing x or y query parameters");
  }

  const x = Number(xParam);
  const y = Number(yParam);

  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    return errorResponse(400, "x and y must be integers");
  }

  const session = await getActiveSession();
  if (!session) {
    return errorResponse(404, "no active session");
  }

  const pixel = await getPixel(session.session_id, x, y);
  if (!pixel || pixel.canvas_version !== session.canvas_version) {
    return errorResponse(404, "pixel not found");
  }

  const coords = parsePixelSK(pixel.SK);
  if (!coords) {
    return errorResponse(500, "invalid pixel coordinates");
  }

  return NextResponse.json({
    sessionId: session.session_id,
    canvasVersion: session.canvas_version,
    x: coords.x,
    y: coords.y,
    color: pixel.color,
    userId: pixel.user_id,
    username: pixel.username,
    updatedAt: pixel.updated_at,
  });
}

export const POST = withAuth(async (request, auth) => {
  let body: { x?: unknown; y?: unknown; color?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid request body");
  }

  const { x, y, color } = body;

  if (!isValidCoordinate(x) || !isValidCoordinate(y)) {
    return errorResponse(400, "x and y must be integers");
  }

  if (typeof color !== "string" || !isValidColor(color)) {
    return errorResponse(400, "invalid color");
  }

  const normalizedColor = color.toUpperCase();

  const session = await getActiveSession();
  if (!session) {
    return errorResponse(409, "no active session");
  }

  const rateCheck = await checkRateLimit(auth.user.discordId, session.session_id);
  if (!rateCheck.allowed) {
    return errorResponse(429, "rate limit reached");
  }

  const pixel = await putPixel(
    session.session_id,
    session.canvas_version,
    x,
    y,
    normalizedColor,
    auth.user.discordId,
    auth.user.username,
  );

  await incrementRateLimit(auth.user.discordId, session.session_id, rateCheck.count);

  return NextResponse.json({
    sessionId: session.session_id,
    canvasVersion: session.canvas_version,
    x,
    y,
    color: pixel.color,
    userId: pixel.user_id,
    username: pixel.username,
    updatedAt: pixel.updated_at,
  });
});
