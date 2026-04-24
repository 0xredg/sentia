import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.WORLD_APP_ID ?? process.env.NEXT_PUBLIC_WORLD_APP_ID;
  const rpId = process.env.WORLD_RP_ID ?? process.env.NEXT_PUBLIC_WORLD_RP_ID;

  return NextResponse.json({
    appId,
    rpId,
    isConfigured: Boolean(appId && rpId),
  });
}
