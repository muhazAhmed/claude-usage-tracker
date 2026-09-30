import type { NextRequest } from "next/server";
import { isLoggedIn } from "@/lib/auth";
import { getDb, type EventDoc } from "@/lib/db";
import { eventMatch, RANGES, type RangeKey } from "@/lib/stats";

const COLUMNS: (keyof EventDoc)[] = [
  "ts",
  "label",
  "host",
  "osUser",
  "ip",
  "city",
  "region",
  "country",
  "terminalType",
  "sessionId",
  "model",
  "inputTokens",
  "outputTokens",
  "cacheReadTokens",
  "cacheCreationTokens",
  "costUsd",
  "durationMs",
];

function cell(v: unknown) {
  if (v === undefined || v === null) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  if (!(await isLoggedIn())) return new Response("unauthorized", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const days = (sp.get("days") ?? "30") in RANGES ? (sp.get("days") as RangeKey) : "30";
  const match = eventMatch({ days, device: sp.get("device") || undefined, model: sp.get("model") || undefined });

  const db = await getDb();
  const rows = await db
    .collection<EventDoc>("events")
    .find(match, { projection: { attrs: 0 } })
    .sort({ ts: -1 })
    .limit(100_000)
    .toArray();

  const csv = [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="claude-usage-${days}d.csv"`,
    },
  });
}
