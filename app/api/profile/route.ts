import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ user: null, stats: null });
    }

    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("task_responses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUser.user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      user: currentUser.user,
      stats: {
        completedTasks: count ?? 0,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load profile.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
