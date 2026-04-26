import { NextResponse } from "next/server";
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

export async function POST() {
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
    const { count, error } = await supabase
      .from("earnings_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUser.user.id)
      .eq("status", "pending")
      .eq("payout_mode", "real");

    if (error) {
      return NextResponse.json(
        { error: "Could not prepare real claim." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "real_payout_not_ready",
        payoutMode,
        pendingCount: count ?? 0,
      },
      { status: 501 },
    );
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
