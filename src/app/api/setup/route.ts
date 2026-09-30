import type { NextRequest } from "next/server";
import { checkIngestToken } from "@/lib/auth";
import { setupScript } from "@/lib/setup-script";

// irm "https://<app>/api/setup?key=<INGEST_TOKEN>" | iex
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!checkIngestToken(new Headers(), key)) {
    return new Response('Write-Host "Invalid or missing setup key." -ForegroundColor Red\n', {
      status: 401,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const base = (process.env.PUBLIC_URL || req.nextUrl.origin).replace(/\/$/, "");
  const script = setupScript({
    endpoint: `${base}/api/otel`,
    token: process.env.INGEST_TOKEN!,
    remove: req.nextUrl.searchParams.get("action") === "remove",
  });
  return new Response(script, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
