import { NextRequest, NextResponse } from "next/server";
import {
  buildClaimMessage,
  buildEarningIdsHash,
  decimalWldToWei,
  normalizeAddress,
  sumWldAmounts,
} from "@/lib/earnings/claim-message";
import { verifyClaimSignature } from "@/lib/earnings/claim-signature";
import { getPayoutMode } from "@/lib/payout-mode";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type MockClaimRow = {
  id: string;
  amount: string | number;
  token: string;
  status: "paid";
  mock_tx_id: string;
  paid_at: string;
};

type RealClaimRequestBody = {
  intentId?: unknown;
  message?: unknown;
  signature?: unknown;
  address?: unknown;
};

type ClaimIntentRow = {
  id: string;
  user_id: string;
  earning_ids: string[];
  earning_ids_hash: string;
  amount_wei: string;
  amount_formatted: string;
  nonce: string | number;
  deadline: string | number;
  wallet_address: string;
  vault_address: string;
  chain_id: number;
  token_address: string;
  message: string;
  status: "pending" | "consumed" | "expired";
};

type EarningRow = {
  id: string;
  amount: string | number;
  token: string;
};

type UserClaimState = {
  wallet_address: string | null;
  claim_nonce: string | number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const hasHumanOrBuilderAccess =
    currentUser.user.verification_status === "verified" ||
    currentUser.user.builder_access_status === "granted";

  if (!hasHumanOrBuilderAccess) {
    return NextResponse.json(
      { error: "verification_required" },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdmin();
  const payoutMode = getPayoutMode();

  if (payoutMode === "real") {
    const parsedBody = await request.json().catch(() => null);
    const body: RealClaimRequestBody = isRecord(parsedBody) ? parsedBody : {};

    if (
      typeof body.intentId !== "string" ||
      typeof body.message !== "string" ||
      typeof body.signature !== "string"
    ) {
      return NextResponse.json(
        { error: "invalid_claim_signature_request" },
        { status: 400 },
      );
    }

    const { data: intent, error: intentError } = await supabase
      .from("claim_intents")
      .select(
        "id, user_id, earning_ids, earning_ids_hash, amount_wei, amount_formatted, nonce, deadline, wallet_address, vault_address, chain_id, token_address, message, status",
      )
      .eq("id", body.intentId)
      .eq("user_id", currentUser.user.id)
      .maybeSingle<ClaimIntentRow>();

    if (intentError) {
      return NextResponse.json(
        { error: "Could not load claim intent." },
        { status: 500 },
      );
    }

    if (!intent) {
      return NextResponse.json(
        { error: "claim_intent_not_found" },
        { status: 404 },
      );
    }

    if (intent.status !== "pending") {
      return NextResponse.json(
        { error: "claim_intent_consumed" },
        { status: 409 },
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("wallet_address, claim_nonce")
      .eq("id", currentUser.user.id)
      .maybeSingle<UserClaimState>();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Could not load user claim state." },
        { status: 500 },
      );
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const deadline = Number(intent.deadline);

    if (!Number.isFinite(deadline) || deadline <= nowSeconds) {
      await supabase
        .from("claim_intents")
        .update({ status: "expired" })
        .eq("id", intent.id)
        .eq("status", "pending");

      return NextResponse.json(
        { error: "claim_intent_expired" },
        { status: 409 },
      );
    }

    let walletAddress: string;

    try {
      walletAddress = normalizeAddress(user.wallet_address ?? "");
    } catch {
      return NextResponse.json(
        { error: "invalid_wallet_address" },
        { status: 409 },
      );
    }

    if (walletAddress !== intent.wallet_address) {
      return NextResponse.json(
        { error: "claim_wallet_changed" },
        { status: 409 },
      );
    }

    if (String(user.claim_nonce) !== String(intent.nonce)) {
      return NextResponse.json(
        { error: "claim_nonce_mismatch" },
        { status: 409 },
      );
    }

    const { data: earnings, error: earningsError } = await supabase
      .from("earnings_ledger")
      .select("id, amount, token")
      .eq("user_id", currentUser.user.id)
      .eq("status", "pending")
      .eq("payout_mode", "real")
      .eq("token", "WLD")
      .returns<EarningRow[]>();

    if (earningsError) {
      return NextResponse.json(
        { error: "Could not reload claimable earnings." },
        { status: 500 },
      );
    }

    const earningIds = (earnings ?? []).map((earning) => earning.id).sort();
    const amountFormatted = sumWldAmounts(
      (earnings ?? []).map((earning) => earning.amount),
    );
    const amountWei = decimalWldToWei(amountFormatted);
    const earningIdsHash = buildEarningIdsHash(earningIds);
    const expectedMessage = buildClaimMessage({
      walletAddress,
      vaultAddress: intent.vault_address,
      chainId: intent.chain_id,
      tokenAddress: intent.token_address,
      earningIdsHash,
      amountWei,
      nonce: intent.nonce,
      deadline: intent.deadline,
    });

    if (
      body.message !== intent.message ||
      body.message !== expectedMessage ||
      earningIdsHash !== intent.earning_ids_hash ||
      amountWei !== intent.amount_wei ||
      amountFormatted !== intent.amount_formatted ||
      JSON.stringify(earningIds) !==
        JSON.stringify([...intent.earning_ids].sort())
    ) {
      return NextResponse.json(
        { error: "claim_intent_mismatch" },
        { status: 409 },
      );
    }

    const signatureVerification = await verifyClaimSignature({
      message: body.message,
      signature: body.signature as `0x${string}`,
      expectedWalletAddress: walletAddress,
    });

    if (!signatureVerification.isValid) {
      return NextResponse.json(
        { error: "invalid_claim_signature" },
        { status: 400 },
      );
    }

    let submittedAddress: string | null = null;

    if (typeof body.address === "string") {
      try {
        submittedAddress = normalizeAddress(body.address);
      } catch {
        return NextResponse.json(
          { error: "claim_signer_wallet_mismatch" },
          { status: 409 },
        );
      }
    }

    if (
      submittedAddress !== null &&
      submittedAddress !== walletAddress &&
      submittedAddress !== signatureVerification.recoveredAddress
    ) {
      return NextResponse.json(
        { error: "claim_signer_wallet_mismatch" },
        { status: 409 },
      );
    }

    const { data: consumedIntent, error: consumeError } = await supabase
      .from("claim_intents")
      .update({
        status: "consumed",
        consumed_at: new Date().toISOString(),
      })
      .eq("id", intent.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (consumeError || !consumedIntent) {
      return NextResponse.json(
        { error: "claim_intent_consumed" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      status: "claim_verified",
      payoutMode,
      claim: {
        intentId: intent.id,
        earningIds,
        earningIdsHash,
        amountWei,
        amountFormatted,
        nonce: intent.nonce,
        deadline: intent.deadline,
        vaultAddress: intent.vault_address,
        chainId: intent.chain_id,
        tokenAddress: intent.token_address,
      },
    });
  }

  const recipientWallet =
    currentUser.user.wallet_address ?? `mock:${currentUser.user.id}`;
  const { data, error } = await supabase.rpc("claim_mock_earnings", {
    p_user_id: currentUser.user.id,
    p_recipient_wallet: recipientWallet,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not claim mock earnings." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    payoutMode,
    claimed: ((data ?? []) as MockClaimRow[]).map((row) => ({
      id: row.id,
      amount: String(row.amount),
      token: row.token,
      status: row.status,
      mockTxId: row.mock_tx_id,
      paidAt: row.paid_at,
    })),
  });
}
