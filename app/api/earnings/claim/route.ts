import { NextResponse } from "next/server";
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

  if (currentUser.user.verification_status !== "verified") {
    return NextResponse.json(
      { error: "verification_required" },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("earnings_ledger")
    .update({ status: "processing" })
    .eq("user_id", currentUser.user.id)
    .eq("status", "pending")
    .select("id, amount, token");

  if (error) {
    return NextResponse.json(
      { error: "Could not claim earnings." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    claimed: (data ?? []).map((row) => ({
      id: row.id,
      amount: String(row.amount),
      token: row.token,
      status: "processing",
    })),
  });
}
