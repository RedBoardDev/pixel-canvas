import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb/client";
import { TABLE } from "@/lib/dynamodb/tables";
import type { SessionItem } from "@/lib/dynamodb/types";

export async function getActiveSession(): Promise<SessionItem | null> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE.sessions,
      FilterExpression: "#s = :active AND SK = :meta",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":active": "active",
        ":meta": "METADATA",
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  const session = result.Items[0] as Partial<SessionItem>;
  return {
    ...session,
    canvas_version: session.canvas_version ?? 1,
  } as SessionItem;
}
