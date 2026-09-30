// Minimal parser for OTLP/HTTP JSON log exports (ExportLogsServiceRequest).

type AnyValue = {
  stringValue?: string;
  intValue?: string | number;
  doubleValue?: number;
  boolValue?: boolean;
  arrayValue?: { values?: AnyValue[] };
  kvlistValue?: { values?: KeyValue[] };
};
type KeyValue = { key: string; value?: AnyValue };

type LogRecord = {
  timeUnixNano?: string | number;
  observedTimeUnixNano?: string | number;
  body?: AnyValue;
  attributes?: KeyValue[];
};

export type OtlpLogsRequest = {
  resourceLogs?: {
    resource?: { attributes?: KeyValue[] };
    scopeLogs?: { logRecords?: LogRecord[] }[];
  }[];
};

export type ParsedRecord = {
  ts: Date;
  name: string;
  attrs: Record<string, unknown>;
  resource: Record<string, unknown>;
};

function value(v: AnyValue | undefined): unknown {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.intValue !== undefined) return Number(v.intValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.boolValue !== undefined) return v.boolValue;
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(value);
  if (v.kvlistValue) return toObject(v.kvlistValue.values);
  return undefined;
}

function toObject(kvs: KeyValue[] | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const kv of kvs ?? []) out[kv.key] = value(kv.value);
  return out;
}

function nanosToDate(n: string | number | undefined): Date | undefined {
  if (n === undefined || n === "0" || n === 0) return undefined;
  const ms = Number(BigInt(String(n)) / BigInt(1_000_000));
  return Number.isFinite(ms) && ms > 0 ? new Date(ms) : undefined;
}

export function parseLogs(req: OtlpLogsRequest): ParsedRecord[] {
  const out: ParsedRecord[] = [];
  for (const rl of req.resourceLogs ?? []) {
    const resource = toObject(rl.resource?.attributes);
    for (const sl of rl.scopeLogs ?? []) {
      for (const rec of sl.logRecords ?? []) {
        const attrs = toObject(rec.attributes);
        const rawName = String(attrs["event.name"] ?? value(rec.body) ?? "unknown");
        const stamp = typeof attrs["event.timestamp"] === "string" ? new Date(attrs["event.timestamp"]) : undefined;
        out.push({
          name: rawName.replace(/^claude_code\./, ""),
          ts: nanosToDate(rec.timeUnixNano) ?? (stamp && !isNaN(+stamp) ? stamp : undefined) ?? nanosToDate(rec.observedTimeUnixNano) ?? new Date(),
          attrs,
          resource,
        });
      }
    }
  }
  return out;
}
