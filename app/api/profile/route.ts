import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: currentUser.user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load profile.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
