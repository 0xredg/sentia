import { NextRequest, NextResponse } from "next/server";
import type { IDKitResult } from "@worldcoin/idkit";
import { PROFILE_VERIFICATION_ACTION } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type RequestBody = {
  idkitResponse?: IDKitResult;
};

type UniquenessResult = IDKitResult & {
  action?: string;
};

function hexToDecimalString(value?: string) {
  if (!value) {
    return null;
  }

  return BigInt(value).toString(10);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const rpId = process.env.WORLD_RP_ID ?? process.env.NEXT_PUBLIC_WORLD_RP_ID;

  if (!rpId) {
    return NextResponse.json(
      { error: "WORLD_RP_ID is not configured." },
      { status: 500 },
    );
  }

  const { idkitResponse } = (await request.json()) as RequestBody;

  if (!idkitResponse || "session_id" in idkitResponse) {
    return NextResponse.json({ error: "Invalid proof type." }, { status: 400 });
  }

  const uniquenessResult = idkitResponse as UniquenessResult;

  if (uniquenessResult.action !== PROFILE_VERIFICATION_ACTION) {
    return NextResponse.json({ error: "Invalid proof action." }, { status: 400 });
  }

  const verifyResponse = await fetch(
    `https://developer.world.org/api/v4/verify/${rpId}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(uniquenessResult),
    },
  );

  if (!verifyResponse.ok) {
    return NextResponse.json(
      { error: "World ID verification failed." },
      { status: 400 },
    );
  }

  const firstResponse = uniquenessResult.responses[0];

  if (!firstResponse) {
    return NextResponse.json({ error: "Proof response is empty." }, { status: 400 });
  }

  const nullifierNumeric =
    "nullifier" in firstResponse
      ? hexToDecimalString(firstResponse.nullifier)
      : null;

  const supabase = getSupabaseAdmin();
  let existingVerificationBelongsToCurrentUser = false;

  if (nullifierNumeric) {
    const { data: existing, error: existingError } = await supabase
      .from("world_verifications")
      .select("user_id")
      .eq("action", PROFILE_VERIFICATION_ACTION)
      .eq("nullifier_numeric", nullifierNumeric)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Could not check verification replay state." },
        { status: 500 },
      );
    }

    if (existing && existing.user_id !== currentUser.user.id) {
      return NextResponse.json(
        { error: "This World ID proof is already linked to another profile." },
        { status: 409 },
      );
    }

    existingVerificationBelongsToCurrentUser =
      existing?.user_id === currentUser.user.id;
  }

  if (!nullifierNumeric || !existingVerificationBelongsToCurrentUser) {
    const { error: verificationError } = await supabase
      .from("world_verifications")
      .insert({
        user_id: currentUser.user.id,
        action: PROFILE_VERIFICATION_ACTION,
        protocol_version: uniquenessResult.protocol_version,
        identifier: firstResponse.identifier,
        nullifier_numeric: nullifierNumeric,
        session_id: null,
        session_nullifier:
          "session_nullifier" in firstResponse
            ? JSON.stringify(firstResponse.session_nullifier)
            : null,
        proof_payload: uniquenessResult,
      });

    if (verificationError) {
      return NextResponse.json(
        { error: "Could not store verification." },
        { status: 500 },
      );
    }
  }

  const { data: user, error: userError } = await supabase
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

  if (userError) {
    return NextResponse.json(
      { error: "Could not update profile verification status." },
      { status: 500 },
    );
  }

  return NextResponse.json({ user });
}
