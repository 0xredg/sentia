import { NextResponse } from "next/server";
import { createToken, setNonceCookie } from "@/lib/session";

export async function POST() {
  const nonce = createToken().replaceAll("-", "").replaceAll("_", "").slice(0, 32);
  await setNonceCookie(nonce);

  return NextResponse.json({ nonce });
}
