import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { CanvasRateLimitDto } from "@/applications/Canvas/Application/dto/CanvasRateLimit.dto";
import { MAX_PIXELS_PER_MINUTE } from "@/lib/constants/server.constants";
import { docClient } from "@/lib/dynamodb/client";
import { keys, TABLE } from "@/lib/dynamodb/tables";
import type { RateLimitItem } from "@/lib/dynamodb/types";

interface RateLimitWindow {
  resetAt: Date;
  windowStart: Date;
}

interface RateLimitCheckResult {
  allowed: boolean;
  count: number;
  rateLimit: CanvasRateLimitDto;
}

function getCurrentRateLimitWindow(now: Date): RateLimitWindow {
  const windowStart = new Date(Math.floor(now.getTime() / 60000) * 60000);
  return {
    windowStart,
    resetAt: new Date(windowStart.getTime() + 60000),
  };
}

function createRateLimitDto(used: number, window: RateLimitWindow): CanvasRateLimitDto {
  return {
    limit: MAX_PIXELS_PER_MINUTE,
    used,
    remaining: Math.max(0, MAX_PIXELS_PER_MINUTE - used),
    windowStartedAt: window.windowStart.toISOString(),
    resetAt: window.resetAt.toISOString(),
  };
}

export async function checkRateLimit(
  userId: string,
  sessionId: string,
): Promise<RateLimitCheckResult> {
  const window = getCurrentRateLimitWindow(new Date());
  const windowStartStr = window.windowStart.toISOString();

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

  const rateLimit = createRateLimitDto(currentCount, window);

  if (currentCount >= MAX_PIXELS_PER_MINUTE) {
    return { allowed: false, count: currentCount, rateLimit };
  }

  return { allowed: true, count: currentCount, rateLimit };
}

export async function incrementRateLimit(
  userId: string,
  sessionId: string,
  currentCount: number,
): Promise<CanvasRateLimitDto> {
  const window = getCurrentRateLimitWindow(new Date());
  const ttl = Math.floor(window.resetAt.getTime() / 1000);
  const nextCount = currentCount + 1;

  await docClient.send(
    new PutCommand({
      TableName: TABLE.rateLimits,
      Item: {
        PK: keys.rateLimit.pk(userId),
        SK: keys.rateLimit.sk(sessionId),
        pixel_count: nextCount,
        window_start: window.windowStart.toISOString(),
        TTL: ttl,
      },
    }),
  );

  return createRateLimitDto(nextCount, window);
}
