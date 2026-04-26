import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

type TaskType =
  | "sentiment_judgment"
  | "content_safety"
  | "qualitative_feedback"
  | "one_human_decision";

type ResponseType =
  | "thumbs"
  | "binary"
  | "choice_number"
  | "choice_text"
  | "rating"
  | "emoji";

type TaskPayload = {
  image_path?: unknown;
};

type ResponseSchema = {
  type?: unknown;
  options?: unknown;
};

const taskTypes = new Set<TaskType>([
  "sentiment_judgment",
  "content_safety",
  "qualitative_feedback",
  "one_human_decision",
]);

const responseTypes = new Set<ResponseType>([
  "thumbs",
  "binary",
  "choice_number",
  "choice_text",
  "rating",
  "emoji",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTaskType(value: unknown): TaskType | null {
  return typeof value === "string" && taskTypes.has(value as TaskType)
    ? (value as TaskType)
    : null;
}

function normalizeResponseType(value: unknown): ResponseType | null {
  return typeof value === "string" && responseTypes.has(value as ResponseType)
    ? (value as ResponseType)
    : null;
}

function normalizeOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((option): option is string => typeof option === "string");
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: completedResponses, error: completedError } = await supabase
      .from("task_responses")
      .select("task_id")
      .eq("user_id", currentUser.user.id);

    if (completedError) {
      throw completedError;
    }

    const completedTaskIds = (completedResponses ?? []).map(
      (response) => response.task_id,
    );
    let query = supabase
      .from("tasks")
      .select(
        "id, requester_name, prompt, task_type, input_payload, response_schema, reward_amount, reward_token, demo_source_id, demo_feed_order, created_at",
      )
      .eq("status", "open")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("demo_feed_order", { ascending: true, nullsFirst: false })
      .order("demo_source_id", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (completedTaskIds.length > 0) {
      query = query.not("id", "in", `(${completedTaskIds.join(",")})`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const tasks = (data ?? []).flatMap((task) => {
      const inputPayload: TaskPayload = isRecord(task.input_payload)
        ? task.input_payload
        : {};
      const responseSchema: ResponseSchema = isRecord(task.response_schema)
        ? task.response_schema
        : {};
      const taskType = normalizeTaskType(task.task_type);
      const responseType = normalizeResponseType(responseSchema.type);
      const responseOptions = normalizeOptions(responseSchema.options);

      if (
        !taskType ||
        !responseType ||
        typeof inputPayload.image_path !== "string" ||
        responseOptions.length === 0
      ) {
        return [];
      }

      return {
        id: task.id,
        demoSourceId: task.demo_source_id,
        requesterName: task.requester_name,
        prompt: task.prompt,
        taskType,
        imagePath: inputPayload.image_path,
        responseType,
        responseOptions,
        rewardAmount: String(task.reward_amount),
        rewardToken: task.reward_token,
      };
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load feed tasks.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
