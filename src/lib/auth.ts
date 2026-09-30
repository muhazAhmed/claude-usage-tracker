import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "cut_session";

function secret() {
  const s = process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD;
  if (!s) throw new Error("DASHBOARD_PASSWORD is not set");
  return s;
}

export function sessionValue() {
  return createHmac("sha256", secret()).update("dashboard-v1").digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function isLoggedIn() {
  const c = (await cookies()).get(SESSION_COOKIE)?.value;
  return !!c && safeEqual(c, sessionValue());
}

export async function requireLogin() {
  if (!(await isLoggedIn())) redirect("/login");
}

// Accepts the key from an `x-ingest-key` header, `Authorization: Bearer`, or `?key=`.
export function checkIngestToken(headers: Headers, queryKey: string | null) {
  const token = process.env.INGEST_TOKEN;
  if (!token) return false;
  const given =
    headers.get("x-ingest-key") ?? headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? queryKey ?? "";
  return safeEqual(given, token);
}
