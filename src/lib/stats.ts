import type { Document } from "mongodb";
import { getDb, type DeviceDoc, type EventDoc } from "./db";

export const TZ = process.env.DASHBOARD_TZ || "Asia/Dubai";
export const RANGES = { "1": "24 hours", "7": "7 days", "30": "30 days", "90": "90 days" } as const;
export type RangeKey = keyof typeof RANGES;

export type Filters = { days: RangeKey; device?: string; model?: string };

export type Usage = {
  requests: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
};

export type DeviceRow = Usage & {
  deviceKey: string;
  host?: string;
  osUser?: string;
  label?: string;
  city?: string;
  region?: string;
  country?: string;
  lastIp?: string;
  ipCount: number;
  sessions: number;
  prompts: number;
  lastActive?: Date;
};

export type ModelRow = Usage & { model: string };
export type Bucket = {
  key: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  sessions: number;
};

const usageGroup = {
  requests: { $sum: 1 },
  costUsd: { $sum: { $ifNull: ["$costUsd", 0] } },
  inputTokens: { $sum: { $ifNull: ["$inputTokens", 0] } },
  outputTokens: { $sum: { $ifNull: ["$outputTokens", 0] } },
  cacheReadTokens: { $sum: { $ifNull: ["$cacheReadTokens", 0] } },
  cacheCreationTokens: { $sum: { $ifNull: ["$cacheCreationTokens", 0] } },
};

const emptyUsage: Usage = {
  requests: 0,
  costUsd: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
};

export function since(days: RangeKey) {
  return new Date(Date.now() - Number(days) * 86_400_000);
}

export function eventMatch(f: Filters, name = "api_request"): Document {
  return {
    name,
    ts: { $gte: since(f.days) },
    ...(f.device ? { deviceKey: f.device } : {}),
    ...(f.model ? { model: f.model } : {}),
  };
}

function bucketKeys(days: RangeKey): { format: string; keys: string[] } {
  const hourly = days === "1";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(hourly ? { hour: "2-digit", hourCycle: "h23" } : {}),
  });
  const toKey = (d: Date) => {
    const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
    return hourly ? `${p.year}-${p.month}-${p.day} ${p.hour}` : `${p.year}-${p.month}-${p.day}`;
  };
  const step = hourly ? 3_600_000 : 86_400_000;
  const count = hourly ? 24 : Number(days);
  const now = Date.now();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const k = toKey(new Date(now - i * step));
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  return { format: hourly ? "%Y-%m-%d %H" : "%Y-%m-%d", keys };
}

export async function getDashboard(f: Filters) {
  const db = await getDb();
  const events = db.collection<EventDoc>("events");
  const { format, keys } = bucketKeys(f.days);

  const [facet] = await events
    .aggregate([
      { $match: eventMatch(f) },
      {
        $facet: {
          totals: [{ $group: { _id: null, ...usageGroup, sessions: { $addToSet: "$sessionId" } } }],
          byDevice: [
            {
              $group: {
                _id: "$deviceKey",
                ...usageGroup,
                sessions: { $addToSet: "$sessionId" },
                lastActive: { $max: "$ts" },
              },
            },
          ],
          byModel: [{ $group: { _id: "$model", ...usageGroup } }, { $sort: { costUsd: -1 } }],
          buckets: [
            {
              $group: {
                _id: { $dateToString: { date: "$ts", format, timezone: TZ } },
                costUsd: { $sum: { $ifNull: ["$costUsd", 0] } },
                inputTokens: { $sum: { $ifNull: ["$inputTokens", 0] } },
                outputTokens: { $sum: { $ifNull: ["$outputTokens", 0] } },
                requests: { $sum: 1 },
                sessions: { $addToSet: "$sessionId" },
              },
            },
          ],
          recent: [{ $sort: { ts: -1 } }, { $limit: 15 }, { $project: { attrs: 0 } }],
        },
      },
    ])
    .toArray();

  const prevStart = new Date(since(f.days).getTime() - Number(f.days) * 86_400_000);
  const [prev] = await events
    .aggregate([
      { $match: { ...eventMatch(f), ts: { $gte: prevStart, $lt: since(f.days) } } },
      { $group: { _id: null, ...usageGroup, sessions: { $addToSet: "$sessionId" }, devices: { $addToSet: "$deviceKey" } } },
    ])
    .toArray();

  const promptCounts = await events
    .aggregate<{ _id: string; n: number }>([
      { $match: eventMatch({ ...f, model: undefined }, "user_prompt") },
      { $group: { _id: "$deviceKey", n: { $sum: 1 } } },
    ])
    .toArray();
  const prompts = new Map(promptCounts.map((p) => [p._id, p.n]));

  const [devices, models] = await Promise.all([
    db.collection<DeviceDoc>("devices").find().sort({ lastSeen: -1 }).toArray(),
    events.distinct("model", { name: "api_request", ts: { $gte: since("90") } }),
  ]);

  const usageByDevice = new Map<string, Document>(facet.byDevice.map((d: Document) => [d._id, d]));
  const deviceRows: DeviceRow[] = devices
    .filter((d) => (f.device ? d._id === f.device : true))
    .map((d) => {
      const u = usageByDevice.get(d._id);
      usageByDevice.delete(d._id);
      return {
        ...emptyUsage,
        ...(u ? pickUsage(u) : {}),
        deviceKey: d._id,
        host: d.host,
        osUser: d.osUser,
        label: d.label,
        city: d.city,
        region: d.region,
        country: d.country,
        lastIp: d.lastIp,
        ipCount: d.ips?.length ?? 0,
        sessions: u ? u.sessions.filter(Boolean).length : 0,
        prompts: prompts.get(d._id) ?? 0,
        lastActive: u?.lastActive ?? d.lastSeen,
      };
    });
  // Usage from a device whose registry row is missing (shouldn't happen, but don't hide it).
  for (const [key, u] of usageByDevice) {
    deviceRows.push({
      ...pickUsage(u),
      deviceKey: key,
      ipCount: 0,
      sessions: u.sessions.filter(Boolean).length,
      prompts: prompts.get(key) ?? 0,
      lastActive: u.lastActive,
    });
  }
  deviceRows.sort((a, b) => b.costUsd - a.costUsd || +(b.lastActive ?? 0) - +(a.lastActive ?? 0));

  const t = facet.totals[0];
  const bucketMap = new Map<string, Document>(facet.buckets.map((b: Document) => [b._id, b]));

  return {
    totals: {
      ...(t ? pickUsage(t) : emptyUsage),
      sessions: t ? t.sessions.filter(Boolean).length : 0,
      activeDevices: facet.byDevice.length as number,
    },
    previous: {
      ...(prev ? pickUsage(prev) : emptyUsage),
      sessions: prev ? prev.sessions.filter(Boolean).length : 0,
      activeDevices: prev ? (prev.devices.length as number) : 0,
    },
    devices: deviceRows,
    models: facet.byModel.map((m: Document) => ({ ...pickUsage(m), model: m._id ?? "unknown" })) as ModelRow[],
    buckets: keys.map((key) => {
      const b = bucketMap.get(key);
      return {
        key,
        costUsd: b?.costUsd ?? 0,
        inputTokens: b?.inputTokens ?? 0,
        outputTokens: b?.outputTokens ?? 0,
        requests: b?.requests ?? 0,
        sessions: b ? b.sessions.filter(Boolean).length : 0,
      };
    }) as Bucket[],
    hourly: f.days === "1",
    generatedAt: Date.now(),
    recent: facet.recent as EventDoc[],
    deviceOptions: devices.map((d) => ({ key: d._id, name: deviceName(d) })),
    modelOptions: (models.filter(Boolean) as string[]).sort(),
  };
}

function pickUsage(d: Document): Usage {
  return {
    requests: d.requests,
    costUsd: d.costUsd,
    inputTokens: d.inputTokens,
    outputTokens: d.outputTokens,
    cacheReadTokens: d.cacheReadTokens,
    cacheCreationTokens: d.cacheCreationTokens,
  };
}

export function deviceName(d: { label?: string; host?: string; osUser?: string }) {
  const machine = [d.host, d.osUser].filter(Boolean).join(" / ") || "Unknown device";
  return d.label ? `${d.label} (${machine})` : machine;
}
