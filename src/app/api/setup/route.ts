import type { NextRequest } from "next/server";
import { checkIngestToken } from "@/lib/auth";
import { setupScript } from "@/lib/setup-script";

// Windows: irm "https://<app>/api/setup?key=<INGEST_TOKEN>" | iex
// macOS:   curl -fsSL "https://<app>/api/setup?key=<INGEST_TOKEN>&os=mac" | bash
// Linux:   same as macOS with os=linux (one script handles both)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const os = sp.get("os") === "mac" || sp.get("os") === "linux" ? "mac" : "windows";
  if (!checkIngestToken(new Headers(), sp.get("key"))) {
    const msg = os === "mac" ? 'echo "Invalid or missing setup key."\n' : 'Write-Host "Invalid or missing setup key." -ForegroundColor Red\n';
    return new Response(msg, { status: 401, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const base = (process.env.PUBLIC_URL || req.nextUrl.origin).replace(/\/$/, "");
  const script = setupScript({ endpoint: `${base}/api/otel`, token: process.env.INGEST_TOKEN!, os });
  return new Response(script, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
