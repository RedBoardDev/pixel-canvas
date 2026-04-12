import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    has_discord_client_id: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
    has_discord_secret: !!process.env.DISCORD_CLIENT_SECRET,
    has_discord_redirect: !!process.env.DISCORD_REDIRECT_URI,
    discord_redirect_value: process.env.DISCORD_REDIRECT_URI ?? "NOT SET",
    has_sessions_table: !!process.env.SESSIONS_TABLE,
    has_canvas_table: !!process.env.CANVAS_PIXELS_TABLE,
    has_aws_region: !!process.env.AWS_REGION,
    has_custom_aws_region: !!process.env.CUSTOM_AWS_REGION,
    node_env: process.env.NODE_ENV,
  });
}
