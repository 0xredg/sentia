import { NextRequest, NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";
import { PROFILE_VERIFICATION_ACTION } from "@/lib/constants";

type RequestBody = {
  action?: string;
};

export async function POST(request: NextRequest) {
  const { action } = (await request.json()) as RequestBody;

  if (action !== PROFILE_VERIFICATION_ACTION) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  if (!process.env.RP_SIGNING_KEY) {
    return NextResponse.json(
      { error: "RP_SIGNING_KEY is not configured." },
      { status: 500 },
    );
  }

  const signature = signRequest({
    signingKeyHex: process.env.RP_SIGNING_KEY,
    action,
  });

  return NextResponse.json({
    sig: signature.sig,
    nonce: signature.nonce,
    created_at: signature.createdAt,
    expires_at: signature.expiresAt,
  });
}
