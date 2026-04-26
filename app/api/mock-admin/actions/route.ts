import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/session";
import { isMockAdminEnabled, isMockAdminUser } from "@/lib/mock-admin";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type MockAdminAction = "reset_users" | "reset_tasks" | "pay_tasks";

type RequestBody = {
  action?: unknown;
};

const allRowsFilterId = "00000000-0000-0000-0000-000000000000";

function isMockAdminAction(action: unknown): action is MockAdminAction {
  return (
    action === "reset_users" ||
    action === "reset_tasks" ||
    action === "pay_tasks"
  );
}

export async function POST(request: NextRequest) {
  if (!isMockAdminEnabled()) {
    return NextResponse.json({ error: "mock_admin_disabled" }, { status: 404 });
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (!isMockAdminUser(currentUser.user)) {
    return NextResponse.json({ error: "mock_admin_forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as RequestBody;

  if (!isMockAdminAction(body.action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (body.action === "reset_users") {
    const now = new Date().toISOString();

    const { count: sessions, error: sessionsError } = await supabase
      .from("user_sessions")
      .delete({ count: "exact" })
      .neq("id", allRowsFilterId);

    if (sessionsError) {
      return NextResponse.json(
        { error: "Could not reset sessions." },
        { status: 500 },
      );
    }

    const { count: verifications, error: verificationsError } = await supabase
      .from("world_verifications")
      .delete({ count: "exact" })
      .neq("id", allRowsFilterId);

    if (verificationsError) {
      return NextResponse.json(
        { error: "Could not reset verifications." },
        { status: 500 },
      );
    }

    const { count: users, error: usersError } = await supabase
      .from("users")
      .update(
        {
          verification_status: "unverified",
          verified_at: null,
          builder_access_status: "none",
          builder_access_granted_at: null,
          updated_at: now,
        },
        { count: "exact" },
      )
      .neq("id", allRowsFilterId);

    if (usersError) {
      return NextResponse.json(
        { error: "Could not reset users." },
        { status: 500 },
      );
    }

    await clearSessionCookie();

    return NextResponse.json({
      ok: true,
      affected: {
        users: users ?? 0,
        sessions: sessions ?? 0,
        verifications: verifications ?? 0,
      },
    });
  }

  if (body.action === "reset_tasks") {
    const { data: mockEarnings, error: mockEarningsError } = await supabase
      .from("earnings_ledger")
      .select("task_response_id")
      .eq("payout_mode", "mock")
      .not("task_response_id", "is", null);

    if (mockEarningsError) {
      return NextResponse.json(
        { error: "Could not load mock earnings." },
        { status: 500 },
      );
    }

    const taskResponseIds = (mockEarnings ?? [])
      .map((earning) => earning.task_response_id)
      .filter((id): id is string => typeof id === "string");

    const { count: earnings, error: earningsError } = await supabase
      .from("earnings_ledger")
      .delete({ count: "exact" })
      .eq("payout_mode", "mock")
      .neq("id", allRowsFilterId);

    if (earningsError) {
      return NextResponse.json(
        { error: "Could not reset earnings." },
        { status: 500 },
      );
    }

    const taskResponsesResult = taskResponseIds.length
      ? await supabase
          .from("task_responses")
          .delete({ count: "exact" })
          .in("id", taskResponseIds)
      : { count: 0, error: null };

    const { count: taskResponses, error: taskResponsesError } =
      taskResponsesResult;

    if (taskResponsesError) {
      return NextResponse.json(
        { error: "Could not reset task responses." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      affected: {
        earnings: earnings ?? 0,
        taskResponses: taskResponses ?? 0,
      },
    });
  }

  const { count: earnings, error: earningsError } = await supabase
    .from("earnings_ledger")
    .update(
      {
        status: "paid",
        paid_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("status", "processing")
    .eq("payout_mode", "mock")
    .is("paid_at", null);

  if (earningsError) {
    return NextResponse.json(
      { error: "Could not pay processing tasks." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    affected: {
      earnings: earnings ?? 0,
    },
  });
}
