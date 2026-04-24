import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const BUILDER_ACCESS_CODE_HASH =
  "1d78f05ba922a92af4e93ff396936f9a5ea2f7e3dccc34a791f37fae7750f133";

type RequestBody = {
  code?: unknown;
};

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function isValidCode(code: string) {
  const expected = Buffer.from(BUILDER_ACCESS_CODE_HASH, "hex");
  const actual = Buffer.from(hashCode(code), "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as RequestBody;

  if (typeof body.code !== "string" || !isValidCode(body.code)) {
    return NextResponse.json({ error: "invalid_builder_code" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("users")
    .update({
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentUser.user.id)
    .select(
      "id, wallet_address, world_username, display_name, avatar_url, verification_status, verified_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not grant builder access." },
      { status: 500 },
    );
  }

  return NextResponse.json({ user });
}
