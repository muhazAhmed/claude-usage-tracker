import { gunzipSync } from "node:zlib";
import { NextResponse, type NextRequest } from "next/server";
import { checkIngestToken } from "@/lib/auth";
import { getDb, type DeviceDoc, type EventDoc } from "@/lib/db";
import { parseLogs, type OtlpLogsRequest } from "@/lib/otlp";

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
// OTEL_RESOURCE_ATTRIBUTES values are percent-encoded by the setup script.
const res = (v: unknown) => decodeHeader(str(v) ?? null);

function decodeHeader(v: string | null) {
  if (!v) return undefined;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function POST(req: NextRequest) {
  if (!checkIngestToken(req.headers, req.nextUrl.searchParams.get("key"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(req.headers.get("content-type") ?? "").includes("json")) {
    return NextResponse.json(
      { error: "only OTLP http/json is supported; set OTEL_EXPORTER_OTLP_PROTOCOL=http/json" },
      { status: 415 },
    );
  }

  let body: OtlpLogsRequest;
  try {
    let raw = Buffer.from(await req.arrayBuffer());
    if (req.headers.get("content-encoding") === "gzip") raw = gunzipSync(raw);
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const records = parseLogs(body);
  if (records.length === 0) return NextResponse.json({});

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || undefined;
  const geo = {
    city: decodeHeader(req.headers.get("x-vercel-ip-city")),
    region: decodeHeader(req.headers.get("x-vercel-ip-country-region")),
    country: decodeHeader(req.headers.get("x-vercel-ip-country")),
  };
  const receivedAt = new Date();

  const events: EventDoc[] = records.map(({ ts, name, attrs, resource }) => {
    const host = res(resource["host.name"]);
    const osUser = res(resource["os.user"]);
    return {
      ts,
      receivedAt,
      name,
      sessionId: str(attrs["session.id"]),
      promptId: str(attrs["prompt.id"]),
      model: str(attrs["model"]),
      costUsd: num(attrs["cost_usd"]),
      inputTokens: num(attrs["input_tokens"]),
      outputTokens: num(attrs["output_tokens"]),
      cacheReadTokens: num(attrs["cache_read_tokens"]),
      cacheCreationTokens: num(attrs["cache_creation_tokens"]),
      durationMs: num(attrs["duration_ms"]),
      terminalType: str(attrs["terminal.type"]),
      appVersion: str(attrs["app.version"]) ?? str(resource["service.version"]),
      userEmail: str(attrs["user.email"]),
      deviceKey: `${host ?? "unknown-host"}|${osUser ?? "unknown-user"}`,
      host,
      osUser,
      osType: res(resource["os.type"]),
      label: res(resource["device.label"]),
      ip,
      ...geo,
      attrs,
    };
  });

  const db = await getDb();
  await db.collection<EventDoc>("events").insertMany(events, { ordered: false });

  const latest = new Map<string, EventDoc>();
  for (const e of events) {
    const prev = latest.get(e.deviceKey);
    if (!prev || e.ts > prev.ts) latest.set(e.deviceKey, e);
  }
  await db.collection<DeviceDoc>("devices").bulkWrite(
    [...latest.values()].map((e) => ({
      updateOne: {
        filter: { _id: e.deviceKey },
        update: {
          $setOnInsert: { firstSeen: receivedAt },
          $set: {
            host: e.host,
            osUser: e.osUser,
            osType: e.osType,
            ...(e.label ? { label: e.label } : {}),
            lastSeen: receivedAt,
            lastIp: ip,
            ...geo,
          },
          ...(ip ? { $addToSet: { ips: ip } } : {}),
        },
        upsert: true,
      },
    })),
  );

  return NextResponse.json({});
}
