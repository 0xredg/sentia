import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getPayoutMode } from "@/lib/payout-mode";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

type RequestBody = {
  answer?: unknown;
};

type ResponseSchema = {
  options?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptions(value: unknown) {
  const schema: ResponseSchema = isRecord(value) ? value : {};

  if (!Array.isArray(schema.options)) {
    return [];
  }

  return schema.options.filter(
    (option): option is string => typeof option === "string",
  );
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function POST(request: NextRequest, context: RouteContext) {
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

  const { taskId } = await context.params;
  const body = (await request.json()) as RequestBody;

  if (typeof body.answer !== "string") {
    return NextResponse.json({ error: "Invalid answer." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const payoutMode = getPayoutMode();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, response_schema, reward_amount, reward_token, status, expires_at")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json(
      { error: "Could not load task." },
      { status: 500 },
    );
  }

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  if (task.status !== "open") {
    return NextResponse.json({ error: "task_closed" }, { status: 409 });
  }

  if (task.expires_at && new Date(task.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "task_expired" }, { status: 409 });
  }

  if (!getOptions(task.response_schema).includes(body.answer)) {
    return NextResponse.json({ error: "invalid_answer" }, { status: 400 });
  }

  const { data: taskResponse, error: responseError } = await supabase
    .from("task_responses")
    .insert({
      task_id: task.id,
      user_id: currentUser.user.id,
      payout_mode: payoutMode,
      answer_payload: { answer: body.answer },
    })
    .select("id")
    .single();

  if (responseError) {
    if (isUniqueViolation(responseError)) {
      return NextResponse.json(
        { error: "already_completed" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Could not save response." },
      { status: 500 },
    );
  }

  const { error: ledgerError } = await supabase.from("earnings_ledger").insert({
    user_id: currentUser.user.id,
    task_response_id: taskResponse.id,
    token: task.reward_token,
    amount: task.reward_amount,
    payout_mode: payoutMode,
    status: "pending",
  });

  if (ledgerError) {
    if (isUniqueViolation(ledgerError)) {
      return NextResponse.json(
        { error: "already_completed" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Could not create earning." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    taskResponseId: taskResponse.id,
    earning: {
      amount: String(task.reward_amount),
      token: task.reward_token,
      payoutMode,
      status: "pending",
    },
  });
}
