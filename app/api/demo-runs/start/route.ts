import { NextResponse } from "next/server";
import { startNewRealDemoRun } from "@/lib/demo-runs";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const canStartDemoRun =
    currentUser.user.verification_status === "verified" ||
    currentUser.user.builder_access_status === "granted";

  if (!canStartDemoRun) {
    return NextResponse.json(
      { error: "verification_required" },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdmin();
  const demoRunId = await startNewRealDemoRun(supabase, currentUser.user.id);

  return NextResponse.json({
    ok: true,
    demoRunId,
  });
}
