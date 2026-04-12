import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESSION_TTL_DAYS } from "@/lib/constants/server.constants";
import { docClient } from "@/lib/dynamodb/client";
import { keys, TABLE } from "@/lib/dynamodb/tables";
import type { UserSessionItem } from "@/lib/dynamodb/types";

export async function getUserFromToken(token: string): Promise<UserSessionItem | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE.userSessions,
      Key: { PK: keys.userSession.pk(token), SK: keys.userSession.skMetadata },
    }),
  );

  if (!result.Item) return null;

  const item = result.Item as UserSessionItem;
  // Explicit TTL check (DynamoDB TTL deletion is eventually consistent)
  if (item.TTL <= Math.floor(Date.now() / 1000)) return null;

  return item;
}

export async function createUserSession(
  token: string,
  discordId: string,
  username: string,
  avatar: string | null,
): Promise<void> {
  const now = new Date();
  const ttl = Math.floor(now.getTime() / 1000) + SESSION_TTL_DAYS * 24 * 60 * 60;

  await docClient.send(
    new PutCommand({
      TableName: TABLE.userSessions,
      Item: {
        PK: keys.userSession.pk(token),
        SK: keys.userSession.skMetadata,
        discord_id: discordId,
        username,
        avatar: avatar ?? "",
        created_at: now.toISOString(),
        TTL: ttl,
      },
    }),
  );
}
