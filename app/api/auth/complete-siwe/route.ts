import { NextRequest, NextResponse } from "next/server";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { WALLET_AUTH_STATEMENT } from "@/lib/constants";
import {
  clearNonceCookie,
  createToken,
  getNonceCookie,
  getSessionExpiry,
  hashToken,
  setSessionCookie,
} from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type RequestBody = {
  payload: unknown;
  nonce: string;
  profile?: {
    username?: string | null;
    profilePictureUrl?: string | null;
  };
};

export async function POST(request: NextRequest) {
  const expectedNonce = await getNonceCookie();
  const { payload, nonce, profile } = (await request.json()) as RequestBody;

  if (!expectedNonce || nonce !== expectedNonce) {
    return NextResponse.json({ error: "Invalid nonce." }, { status: 400 });
  }

  try {
    const verification = await verifySiweMessage(
      payload as never,
      nonce,
      WALLET_AUTH_STATEMENT,
    );

    if (!verification.isValid) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const verifiedAddress = verification.siweMessageData.address;

    if (!verifiedAddress) {
      return NextResponse.json(
        { error: "Wallet address missing from SIWE message." },
        { status: 400 },
      );
    }

    const walletAddress = verifiedAddress.toLowerCase();
    const username = profile?.username?.trim() || null;
    const avatarUrl = profile?.profilePictureUrl?.trim() || null;
    const supabase = getSupabaseAdmin();

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select(
        "id, world_username, display_name, avatar_url, verification_status, verified_at, builder_access_status, builder_access_granted_at",
      )
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (existingUserError) {
      return NextResponse.json(
        { error: "Could not load existing user profile." },
        { status: 500 },
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .upsert(
        {
          wallet_address: walletAddress,
          world_username: username ?? existingUser?.world_username ?? null,
          display_name:
            username ??
            existingUser?.display_name ??
            existingUser?.world_username ??
            null,
          avatar_url: avatarUrl ?? existingUser?.avatar_url ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wallet_address" },
      )
      .select(
        "id, wallet_address, world_username, display_name, avatar_url, verification_status, verified_at, builder_access_status, builder_access_granted_at",
      )
      .single();

    if (userError) {
      return NextResponse.json(
        { error: "Could not save user profile." },
        { status: 500 },
      );
    }

    const sessionToken = createToken();
    const { error: sessionError } = await supabase.from("user_sessions").insert({
      user_id: user.id,
      token_hash: hashToken(sessionToken),
      expires_at: getSessionExpiry(),
    });

    if (sessionError) {
      return NextResponse.json(
        { error: "Could not create session." },
        { status: 500 },
      );
    }

    await clearNonceCookie();
    await setSessionCookie(sessionToken);

    return NextResponse.json({ user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Wallet authentication failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
