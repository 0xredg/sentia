import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type TaskResponseStat = {
  status: string;
  created_at: string;
};

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ user: null, stats: null });
    }

    const supabase = getSupabaseAdmin();
    const { data: responses, error } = await supabase
      .from("task_responses")
      .select("status, created_at")
      .eq("user_id", currentUser.user.id)
      .order("created_at", { ascending: false })
      .returns<TaskResponseStat[]>();

    if (error) {
      throw error;
    }

    const completedTasks = responses?.length ?? 0;
    const acceptedTasks =
      responses?.filter((response) => response.status === "accepted").length ??
      0;
    const reliabilityPercent =
      completedTasks === 0
        ? 0
        : Math.round((acceptedTasks / completedTasks) * 100);

    return NextResponse.json({
      user: currentUser.user,
      stats: {
        completedTasks,
        reliabilityPercent,
        streakDays: calculateStreakDays(responses ?? []),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load profile.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function calculateStreakDays(responses: TaskResponseStat[]) {
  if (responses.length === 0) {
    return 0;
  }

  const activeDays = new Set(
    responses.map((response) => response.created_at.slice(0, 10)),
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
