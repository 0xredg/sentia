import { NextResponse } from "next/server";
import { getPayoutMode } from "@/lib/payout-mode";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type TaskResponseStat = {
  status: string;
  created_at: string;
};

type PaidTaskStat = {
  created_at: string;
  paid_at: string | null;
  task_responses:
    | {
        status: string;
      }
    | {
        status: string;
      }[]
    | null;
};

function firstItem<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ user: null, stats: null });
    }

    const supabase = getSupabaseAdmin();
    const payoutMode = getPayoutMode();
    const { data: responses, error: responsesError } = await supabase
      .from("task_responses")
      .select("status, created_at")
      .eq("user_id", currentUser.user.id)
      .eq("payout_mode", payoutMode)
      .order("created_at", { ascending: false })
      .returns<TaskResponseStat[]>();

    if (responsesError) {
      throw responsesError;
    }

    const { data: paidTasks, error: paidTasksError } = await supabase
      .from("earnings_ledger")
      .select("created_at, paid_at, task_responses(status)")
      .eq("user_id", currentUser.user.id)
      .eq("status", "paid")
      .eq("payout_mode", payoutMode)
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .returns<PaidTaskStat[]>();

    if (paidTasksError) {
      throw paidTasksError;
    }

    const completedTasks = paidTasks?.length ?? 0;
    const acceptedPaidTasks =
      paidTasks?.filter(
        (task) => firstItem(task.task_responses)?.status === "accepted",
      ).length ??
      0;
    const reliabilityPercent =
      completedTasks === 0
        ? 0
        : Math.round((acceptedPaidTasks / completedTasks) * 100);

    return NextResponse.json({
      user: currentUser.user,
      stats: {
        completedTasks,
        reliabilityPercent,
        streakDays: calculateStreakDays(paidTasks ?? []),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load profile.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function calculateStreakDays(paidTasks: PaidTaskStat[]) {
  if (paidTasks.length === 0) {
    return 0;
  }

  const activeDays = new Set(
    paidTasks.map((task) => (task.paid_at ?? task.created_at).slice(0, 10)),
  );
  const sortedDays = Array.from(activeDays).sort().reverse();
  const latestDay = sortedDays[0];

  if (!latestDay) {
    return 0;
  }

  let streakDays = 0;
  let cursor = new Date(`${latestDay}T00:00:00.000Z`);

  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streakDays;
}
