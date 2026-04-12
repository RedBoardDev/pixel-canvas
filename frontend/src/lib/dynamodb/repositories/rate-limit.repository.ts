import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { MAX_PIXELS_PER_MINUTE } from "@/lib/constants/server.constants";
import { docClient } from "@/lib/dynamodb/client";
import { keys, TABLE } from "@/lib/dynamodb/tables";
import type { RateLimitItem } from "@/lib/dynamodb/types";

interface RateLimitResult {
  allowed: boolean;
  count: number;
}

export async function checkRateLimit(userId: string, sessionId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / 60000) * 60000);
  const windowStartStr = windowStart.toISOString();

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE.rateLimits,
      Key: { PK: keys.rateLimit.pk(userId), SK: keys.rateLimit.sk(sessionId) },
    }),
  );

  let currentCount = 0;
  if (result.Item) {
    const item = result.Item as RateLimitItem;
    // Reset if different minute window
    if (item.window_start === windowStartStr) {
      currentCount = item.pixel_count;
    }
  }

  if (currentCount >= MAX_PIXELS_PER_MINUTE) {
    return { allowed: false, count: currentCount };
  }

  return { allowed: true, count: currentCount };
}

export async function incrementRateLimit(
  userId: string,
  sessionId: string,
  currentCount: number,
): Promise<void> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / 60000) * 60000);
  const ttl = Math.floor(windowStart.getTime() / 1000) + 60;

  await docClient.send(
    new PutCommand({
      TableName: TABLE.rateLimits,
      Item: {
        PK: keys.rateLimit.pk(userId),
        SK: keys.rateLimit.sk(sessionId),
        pixel_count: currentCount + 1,
        window_start: windowStart.toISOString(),
        TTL: ttl,
      },
    }),
  );
}
