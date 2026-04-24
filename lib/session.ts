import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import {
  AUTH_NONCE_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "./constants";
import { getSupabaseAdmin } from "./supabase-server";

export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setNonceCookie(nonce: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_NONCE_COOKIE, nonce, cookieOptions(10 * 60));
}

export async function getNonceCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_NONCE_COOKIE)?.value;
}

export async function clearNonceCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_NONCE_COOKIE);
}

export async function setSessionCookie(sessionToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    sessionToken,
    cookieOptions(SESSION_TTL_SECONDS),
  );
}

export async function getSessionTokenCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const tokenHash = hashToken(sessionToken);

  const { data, error } = await supabase
    .from("user_sessions")
    .select(
      "user_id, expires_at, users(id, wallet_address, world_username, display_name, avatar_url, verification_status, verified_at)",
    )
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data || !data.users) {
    return null;
  }

  const user = Array.isArray(data.users) ? data.users[0] : data.users;

  return {
    session: data,
    user,
  };
}

export function getSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
}
