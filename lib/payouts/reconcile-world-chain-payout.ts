import type { SupabaseClient } from "@supabase/supabase-js";
import { getClaimConfig } from "@/lib/earnings/claim-message";
import {
  type WorldChainPayoutMetadata,
  readVaultPaidStatus,
} from "@/lib/payouts/world-chain-vault";

type ReconcileEarningRow = {
  id: string;
  user_id: string;
  amount: string | number;
  token: string;
  status: "processing" | "paid";
  payout_tx_hash: string | null;
  chain_id: number | null;
  payout_contract_address: string | null;
  payout_token_address: string | null;
};

type ClaimIntentRow = {
  id: string;
  nonce: string | number;
  status: "pending" | "consumed" | "expired";
};

type UserNonceRow = {
  claim_nonce: string | number;
};

export type ReconcileWorldChainPayoutInput = {
  supabase: SupabaseClient;
  userId: string;
  txHash?: string;
  demoRunId?: string | null;
};

export async function reconcileWorldChainPayout({
  supabase,
  userId,
  txHash,
  demoRunId,
}: ReconcileWorldChainPayoutInput) {
  let query = supabase
    .from("earnings_ledger")
    .select(
      "id, user_id, amount, token, status, payout_tx_hash, chain_id, payout_contract_address, payout_token_address",
    )
    .eq("user_id", userId)
    .eq("payout_mode", "real")
    .in("status", ["processing", "paid"]);

  if (txHash) {
    query = query.eq("payout_tx_hash", txHash);
  } else if (demoRunId) {
    query = query.eq("demo_run_id", demoRunId);
  } else {
    query = query.is("demo_run_id", null);
  }

  const { data: earnings, error: earningsError } =
    await query.returns<ReconcileEarningRow[]>();

  if (earningsError) {
    throw earningsError;
  }

  const rows = earnings ?? [];
  const skipped: Array<{ id: string; reason: string }> = [];

  if (rows.length === 0) {
    return { reconciled: [], skipped };
  }

  const rowsWithTxHash = rows.filter((row) => row.payout_tx_hash);

  const txHashes = new Set(
    rowsWithTxHash
      .map((row) => row.payout_tx_hash)
      .filter((hash): hash is string => Boolean(hash)),
  );

  if (txHashes.size !== 1) {
    for (const row of rows) {
      skipped.push({
        id: row.id,
        reason: row.payout_tx_hash ? "mixed_tx_hashes" : "missing_tx_hash",
      });
    }

    return { reconciled: [], skipped };
  }

  const payoutTxHash = [...txHashes][0];
  const finalizableRows = rows.filter(
    (row) => row.payout_tx_hash === payoutTxHash,
  );

  if (finalizableRows.length === 0) {
    return { reconciled: [], skipped };
  }

  const claimConfig = getClaimConfig();
  const metadata: WorldChainPayoutMetadata = {
    txHash: payoutTxHash as `0x${string}`,
    chainId: claimConfig.chainId,
    vaultAddress:
      finalizableRows[0]?.payout_contract_address ?? claimConfig.vaultAddress,
    tokenAddress:
      finalizableRows[0]?.payout_token_address ?? claimConfig.tokenAddress,
  };
  const paidStatuses = await readVaultPaidStatus({
    earningIds: finalizableRows.map((row) => row.id),
    vaultAddress: metadata.vaultAddress,
  });
  const unpaid = paidStatuses.filter((status) => !status.isPaid);

  if (unpaid.length > 0) {
    return {
      reconciled: [],
      skipped: finalizableRows.map((row) => ({
        id: row.id,
        reason: unpaid.some((status) => status.earningId === row.id)
          ? "vault_paid_false"
          : "blocked_by_batch_consistency",
      })),
    };
  }

  const paidAt = new Date().toISOString();
  const earningIds = finalizableRows.map((row) => row.id);
  const processingEarningIds = finalizableRows
    .filter((row) => row.status === "processing")
    .map((row) => row.id);

  if (processingEarningIds.length > 0) {
    const { error: paidError } = await supabase
      .from("earnings_ledger")
      .update({
        status: "paid",
        paid_at: paidAt,
        chain_id: metadata.chainId,
        payout_contract_address: metadata.vaultAddress,
        payout_token_address: metadata.tokenAddress,
        payout_tx_hash: metadata.txHash,
        payout_error: null,
      })
      .in("id", processingEarningIds)
      .eq("status", "processing");

    if (paidError) {
      throw paidError;
    }
  }

  const { error: attemptsError } = await supabase
    .from("payout_attempts")
    .update({
      status: "confirmed",
      confirmed_at: paidAt,
      chain_id: metadata.chainId,
      payout_contract_address: metadata.vaultAddress,
      payout_token_address: metadata.tokenAddress,
      payout_tx_hash: metadata.txHash,
      error_code: null,
      error_message: null,
    })
    .in("earning_id", earningIds)
    .eq("status", "submitted");

  if (attemptsError) {
    throw attemptsError;
  }

  const { data: intent } = await supabase
    .from("claim_intents")
    .select("id, nonce, status")
    .eq("user_id", userId)
    .eq("status", "pending")
    .contains("earning_ids", earningIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ClaimIntentRow>();

  if (intent) {
    await supabase
      .from("claim_intents")
      .update({
        status: "consumed",
        consumed_at: paidAt,
      })
      .eq("id", intent.id)
      .eq("status", "pending");

    const { data: user } = await supabase
      .from("users")
      .select("claim_nonce")
      .eq("id", userId)
      .maybeSingle<UserNonceRow>();

    if (user && String(user.claim_nonce) === String(intent.nonce)) {
      await supabase
        .from("users")
        .update({ claim_nonce: Number(intent.nonce) + 1 })
        .eq("id", userId)
        .eq("claim_nonce", intent.nonce);
    }
  }

  return {
    reconciled: earningIds.map((id) => ({
      id,
      status: "paid",
      txHash: metadata.txHash,
    })),
    skipped,
  };
}
