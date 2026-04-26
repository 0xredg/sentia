import { NextResponse } from "next/server";
import {
  buildClaimMessage,
  buildEarningIdsHash,
  decimalWldToWei,
  getClaimConfig,
  getClaimDeadline,
  normalizeAddress,
  sumWldAmounts,
} from "@/lib/earnings/claim-message";
import { getPayoutMode } from "@/lib/payout-mode";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type UserClaimState = {
  id: string;
  wallet_address: string | null;
  verification_status: string;
  builder_access_status: string;
  claim_nonce: string | number;
};

type EarningRow = {
  id: string;
  amount: string | number;
  token: string;
};

function hasClaimAccess(user: UserClaimState) {
  return (
    user.verification_status === "verified" ||
    user.builder_access_status === "granted"
  );
}

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (getPayoutMode() !== "real") {
    return NextResponse.json(
      { error: "claim_intent_unavailable_in_mock" },
      { status: 409 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select(
      "id, wallet_address, verification_status, builder_access_status, claim_nonce",
    )
    .eq("id", currentUser.user.id)
    .maybeSingle<UserClaimState>();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Could not load user claim state." },
      { status: 500 },
    );
  }

  if (!hasClaimAccess(user)) {
    return NextResponse.json(
      { error: "verification_required" },
      { status: 403 },
    );
  }

  if (!user.wallet_address) {
    return NextResponse.json(
      { error: "wallet_required" },
      { status: 409 },
    );
  }

  let walletAddress: string;

  try {
    walletAddress = normalizeAddress(user.wallet_address);
  } catch {
    return NextResponse.json(
      { error: "invalid_wallet_address" },
      { status: 409 },
    );
  }

  const { data: earnings, error: earningsError } = await supabase
    .from("earnings_ledger")
    .select("id, amount, token")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .eq("payout_mode", "real")
    .eq("token", "WLD")
    .returns<EarningRow[]>();

  if (earningsError) {
    return NextResponse.json(
      { error: "Could not load claimable earnings." },
      { status: 500 },
    );
  }

  if (!earnings || earnings.length === 0) {
    return NextResponse.json({
      claimRequired: false,
      payoutMode: "real",
      claim: null,
      message: null,
    });
  }

  const earningIds = earnings.map((earning) => earning.id).sort();
  const amountFormatted = sumWldAmounts(
    earnings.map((earning) => earning.amount),
  );
  const amountWei = decimalWldToWei(amountFormatted);
  const earningIdsHash = buildEarningIdsHash(earningIds);
  const deadline = getClaimDeadline();
  const claimConfig = getClaimConfig();
  const nonce = String(user.claim_nonce);
  const message = buildClaimMessage({
    walletAddress,
    vaultAddress: claimConfig.vaultAddress,
    chainId: claimConfig.chainId,
    tokenAddress: claimConfig.tokenAddress,
    earningIdsHash,
    amountWei,
    nonce,
    deadline,
  });

  const { data: intent, error: intentError } = await supabase
    .from("claim_intents")
    .insert({
      user_id: user.id,
      payout_mode: "real",
      earning_ids: earningIds,
      earning_ids_hash: earningIdsHash,
      amount_wei: amountWei,
      amount_formatted: amountFormatted,
      nonce,
      deadline,
      wallet_address: walletAddress,
      vault_address: claimConfig.vaultAddress,
      chain_id: claimConfig.chainId,
      token_address: claimConfig.tokenAddress,
      message,
      status: "pending",
    })
    .select("id")
    .single();

  if (intentError || !intent) {
    return NextResponse.json(
      { error: "Could not create claim intent." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    claimRequired: true,
    intentId: intent.id,
    message,
    claim: {
      earningIds,
      earningIdsHash,
      amountWei,
      amountFormatted,
      nonce: user.claim_nonce,
      deadline,
      vaultAddress: claimConfig.vaultAddress,
      chainId: claimConfig.chainId,
      tokenAddress: claimConfig.tokenAddress,
    },
  });
}
