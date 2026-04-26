import type { SupabaseClient } from "@supabase/supabase-js";
import type { PayoutMode } from "./payout-mode";

type DemoRunRow = {
  id: string;
};

type UserDemoRunRow = {
  current_demo_run_id: string | null;
};

export async function getCurrentDemoRunId(
  supabase: SupabaseClient,
  userId: string,
  payoutMode: PayoutMode,
) {
  if (payoutMode !== "real") {
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("current_demo_run_id")
    .eq("id", userId)
    .maybeSingle<UserDemoRunRow>();

  if (userError) {
    throw userError;
  }

  if (user?.current_demo_run_id) {
    return user.current_demo_run_id;
  }

  const { data: run, error: runError } = await supabase
    .from("demo_runs")
    .insert({
      user_id: userId,
      payout_mode: "real",
      label: "Real demo run",
    })
    .select("id")
    .single<DemoRunRow>();

  if (runError) {
    throw runError;
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ current_demo_run_id: run.id })
    .eq("id", userId);

  if (updateError) {
    throw updateError;
  }

  return run.id;
}

export async function startNewRealDemoRun(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: run, error: runError } = await supabase
    .from("demo_runs")
    .insert({
      user_id: userId,
      payout_mode: "real",
      label: `Real demo run ${new Date().toISOString()}`,
    })
    .select("id")
    .single<DemoRunRow>();

  if (runError) {
    throw runError;
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ current_demo_run_id: run.id })
    .eq("id", userId);

  if (updateError) {
    throw updateError;
  }

  return run.id;
}
