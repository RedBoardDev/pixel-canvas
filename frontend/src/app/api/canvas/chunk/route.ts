import { type NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils/errors";
import { getChunkPixels } from "@/lib/dynamodb/repositories/pixel.repository";
import { getActiveSession } from "@/lib/dynamodb/repositories/session.repository";
import { parsePixelSK } from "@/lib/dynamodb/tables";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const cxParam = searchParams.get("cx");
  const cyParam = searchParams.get("cy");

  if (cxParam === null || cyParam === null) {
    return errorResponse(400, "missing cx or cy query parameters");
  }

  const cx = Number(cxParam);
  const cy = Number(cyParam);

  if (!Number.isInteger(cx) || !Number.isInteger(cy)) {
    return errorResponse(400, "cx and cy must be integers");
  }

  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({
      sessionId: null,
      canvasVersion: null,
      sessionStatus: null,
      canvasWidth: 0,
      canvasHeight: 0,
      chunkX: cx,
      chunkY: cy,
      pixels: [],
    });
  }

  const pixelItems = await getChunkPixels(session.session_id, session.canvas_version, cx, cy);

  const pixels = pixelItems.flatMap((item) => {
    const coords = parsePixelSK(item.SK);
    if (!coords) {
      return [];
    }

    return [
      {
        x: coords.x,
        y: coords.y,
        color: item.color,
        userId: item.user_id,
        username: item.username,
        updatedAt: item.updated_at,
      },
    ];
  });

  return NextResponse.json({
    sessionId: session.session_id,
    canvasVersion: session.canvas_version,
    sessionStatus: "active" as const,
    canvasWidth: session.canvas_width ?? 0,
    canvasHeight: session.canvas_height ?? 0,
    chunkX: cx,
    chunkY: cy,
    pixels,
  });
}
