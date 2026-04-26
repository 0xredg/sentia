import { NextResponse } from "next/server";
import { getCurrentDemoRunId } from "@/lib/demo-runs";
import {
  getPayoutMode,
  getWorldscanTxUrl,
  type PayoutMode,
} from "@/lib/payout-mode";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type LedgerStatus = "pending" | "processing" | "paid" | "failed" | "blocked";

type LedgerRow = {
  id: string;
  amount: string | number;
  token: string;
  status: LedgerStatus;
  payout_mode: PayoutMode;
  created_at: string;
  paid_at: string | null;
  mock_tx_id: string | null;
  payout_tx_hash: string | null;
  task_responses:
    | {
        tasks:
          | {
              requester_name: string;
            }
          | {
              requester_name: string;
            }[]
          | null;
      }
    | {
        tasks:
          | {
              requester_name: string;
            }
          | {
              requester_name: string;
            }[]
          | null;
      }[]
    | null;
};

function firstItem<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function getRequesterName(row: LedgerRow) {
  const taskResponse = firstItem(row.task_responses);
  const task = firstItem(taskResponse?.tasks);

  return task?.requester_name ?? null;
}

function normalizeDecimal(value: string | number) {
  return String(value);
}

function addDecimalStrings(first: string, second: string) {
  const [firstWhole = "0", firstFraction = ""] = first.split(".");
  const [secondWhole = "0", secondFraction = ""] = second.split(".");
  const fractionLength = Math.max(firstFraction.length, secondFraction.length);
  const firstUnits = BigInt(
    `${firstWhole}${firstFraction.padEnd(fractionLength, "0")}`,
  );
  const secondUnits = BigInt(
    `${secondWhole}${secondFraction.padEnd(fractionLength, "0")}`,
  );
  const totalUnits = firstUnits + secondUnits;

  if (fractionLength === 0) {
    return totalUnits.toString();
  }

  const isNegative = totalUnits < BigInt(0);
  const absoluteTotal = (isNegative ? -totalUnits : totalUnits)
    .toString()
    .padStart(fractionLength + 1, "0");
  const whole = absoluteTotal.slice(0, -fractionLength);
  const fraction = absoluteTotal.slice(-fractionLength).replace(/0+$/, "");
  const sign = isNegative ? "-" : "";

  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}

function sumRows(rows: LedgerRow[], status: LedgerStatus) {
  return rows
    .filter((row) => row.status === status)
    .reduce(
      (total, row) => addDecimalStrings(total, normalizeDecimal(row.amount)),
      "0",
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

  const supabase = getSupabaseAdmin();
  const payoutMode = getPayoutMode();
  const demoRunId = await getCurrentDemoRunId(
    supabase,
    currentUser.user.id,
    payoutMode,
  );
  let query = supabase
    .from("earnings_ledger")
    .select(
      "id, amount, token, status, payout_mode, created_at, paid_at, mock_tx_id, payout_tx_hash, task_responses(tasks(requester_name))",
    )
    .eq("user_id", currentUser.user.id)
    .eq("payout_mode", payoutMode);

  if (payoutMode === "real") {
    query = demoRunId
      ? query.eq("demo_run_id", demoRunId)
      : query.is("demo_run_id", null);
  }

  const { data, error } = await query
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Could not load earnings." },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as LedgerRow[];
  const available = sumRows(rows, "pending");
  const processing = sumRows(rows, "processing");
  const totalPaid = sumRows(rows, "paid");
  const paidOperations = rows
    .filter((row) => row.status === "paid")
    .map((row) => ({
      id: row.id,
      amount: String(row.amount),
      token: row.token,
      paidAt: row.paid_at ?? row.created_at,
      payoutMode: row.payout_mode,
      mockTxId: row.mock_tx_id,
      txHash: row.payout_tx_hash,
      worldscanUrl: row.payout_tx_hash
        ? getWorldscanTxUrl(row.payout_tx_hash)
        : null,
      requesterName: getRequesterName(row),
    }));

  return NextResponse.json({
    payoutMode,
    summary: {
      available,
      processing,
      totalPaid,
    },
    paidOperations,
  });
}
