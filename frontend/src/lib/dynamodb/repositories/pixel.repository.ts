import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { CHUNK_SIZE } from "@/lib/constants/server.constants";
import { docClient } from "@/lib/dynamodb/client";
import { keys, parsePixelSK, TABLE } from "@/lib/dynamodb/tables";
import type { PixelItem } from "@/lib/dynamodb/types";

export async function getPixel(sessionId: string, x: number, y: number): Promise<PixelItem | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE.canvasPixels,
      Key: { PK: keys.pixel.pk(sessionId), SK: keys.pixel.sk(x, y) },
    }),
  );

  const pixel = (result.Item as Partial<PixelItem> | undefined) ?? null;
  if (!pixel) {
    return null;
  }

  return {
    ...pixel,
    canvas_version: pixel.canvas_version ?? 1,
  } as PixelItem;
}

export async function putPixel(
  sessionId: string,
  canvasVersion: number,
  x: number,
  y: number,
  color: string,
  userId: string,
  username: string,
): Promise<PixelItem> {
  const now = new Date().toISOString();
  const item: PixelItem = {
    PK: keys.pixel.pk(sessionId),
    SK: keys.pixel.sk(x, y),
    color,
    user_id: userId,
    username,
    canvas_version: canvasVersion,
    updated_at: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE.canvasPixels, Item: item }));

  return item;
}

export async function getChunkPixels(
  sessionId: string,
  canvasVersion: number,
  cx: number,
  cy: number,
): Promise<PixelItem[]> {
  const minX = cx * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE;
  const minY = cy * CHUNK_SIZE;
  const maxY = minY + CHUNK_SIZE;

  const allPixels: PixelItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE.canvasPixels,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": keys.pixel.pk(sessionId),
          ":prefix": keys.pixel.skPrefix,
        },
        ExclusiveStartKey: lastKey,
      }),
    );

    if (result.Items) {
      for (const item of result.Items) {
        const pixel = item as Partial<PixelItem>;
        const coords = parsePixelSK(pixel.SK ?? "");
        const pixelCanvasVersion = pixel.canvas_version ?? 1;

        if (
          coords &&
          pixelCanvasVersion === canvasVersion &&
          coords.x >= minX &&
          coords.x < maxX &&
          coords.y >= minY &&
          coords.y < maxY
        ) {
          allPixels.push({
            ...pixel,
            canvas_version: pixelCanvasVersion,
          } as PixelItem);
        }
      }
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return allPixels;
}
