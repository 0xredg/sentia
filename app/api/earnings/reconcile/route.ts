import { NextRequest, NextResponse } from "next/server";
import { getCurrentDemoRunId } from "@/lib/demo-runs";
import { getPayoutMode } from "@/lib/payout-mode";
import { reconcileWorldChainPayout } from "@/lib/payouts/reconcile-world-chain-payout";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

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

  const hasClaimAccess =
    currentUser.user.verification_status === "verified" ||
    currentUser.user.builder_access_status === "granted";

  if (!hasClaimAccess) {
    return NextResponse.json(
      { error: "verification_required" },
      { status: 403 },
    );
  }

  if (getPayoutMode() !== "real") {
    return NextResponse.json(
      { error: "reconcile_unavailable_in_mock" },
      { status: 409 },
    );
  }

  const parsedBody = await request.json().catch(() => null);
  const body = isRecord(parsedBody) ? parsedBody : {};
  const txHash =
    typeof body.txHash === "string" && body.txHash.length > 0
      ? body.txHash
      : undefined;

  if (txHash && !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json(
      { error: "invalid_tx_hash" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const demoRunId = await getCurrentDemoRunId(
    supabase,
    currentUser.user.id,
    "real",
  );

  try {
    const result = await reconcileWorldChainPayout({
      supabase,
      userId: currentUser.user.id,
      txHash,
      demoRunId,
    });

    return NextResponse.json({
      payoutMode: "real",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "world_chain_reconciliation_failed",
        message:
          error instanceof Error
            ? error.message
            : "World Chain reconciliation failed.",
      },
      { status: 500 },
    );
  }
}
