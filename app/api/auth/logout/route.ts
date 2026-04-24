import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  getSessionTokenCookie,
  hashToken,
} from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST() {
  const sessionToken = await getSessionTokenCookie();

  if (sessionToken) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("user_sessions")
      .delete()
      .eq("token_hash", hashToken(sessionToken));
  }

  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
