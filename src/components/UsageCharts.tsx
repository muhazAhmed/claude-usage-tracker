"use client";

import { useState } from "react";
import { TrendChart } from "./TrendChart";

type Bucket = {
  key: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  sessions: number;
};

const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const money = (n: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: n >= 100 ? 0 : 2 }).format(n);

function axisLabel(key: string, hourly: boolean) {
  if (hourly) return `${key.slice(11)}:00`;
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function tipLabel(key: string, hourly: boolean) {
  const d = new Date(`${key.slice(0, 10)}T00:00:00Z`);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return hourly ? `${day}, ${key.slice(11)}:00` : day;
}

function Toggle<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border border-line p-0.5 text-xs" role="group">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-md px-2.5 py-1 ${value === v ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function MainChart({ buckets, hourly }: { buckets: Bucket[]; hourly: boolean }) {
  const [metric, setMetric] = useState<"cost" | "tokens">("cost");
  const labels = buckets.map((b) => axisLabel(b.key, hourly));
  const tips = buckets.map((b) => tipLabel(b.key, hourly));
  const series =
    metric === "cost"
      ? [{ name: "Cost", color: "var(--series-1)", values: buckets.map((b) => b.costUsd) }]
      : [
          { name: "Input", color: "var(--series-1)", values: buckets.map((b) => b.inputTokens) },
          { name: "Output", color: "var(--series-2)", values: buckets.map((b) => b.outputTokens) },
        ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{metric === "cost" ? "Spend over time" : "Input vs output tokens"}</h2>
          {series.length > 1 && (
            <div className="mt-1 flex gap-4 text-xs text-ink-2">
              {series.map((s) => (
                <span key={s.name} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <Toggle
          value={metric}
          options={[
            ["cost", "Cost"],
            ["tokens", "Tokens"],
          ]}
          onChange={setMetric}
        />
      </div>
      <div className="mt-4">
        <TrendChart labels={labels} tooltipLabels={tips} series={series} format={metric === "cost" ? money : compact} height={300} />
      </div>
    </div>
  );
}

export function ActivityChart({ buckets, hourly }: { buckets: Bucket[]; hourly: boolean }) {
  const [metric, setMetric] = useState<"sessions" | "requests">("sessions");
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm text-ink-2">{metric === "sessions" ? "Sessions" : "Requests"} over time</h3>
        <Toggle
          value={metric}
          options={[
            ["sessions", "Sessions"],
            ["requests", "Requests"],
          ]}
          onChange={setMetric}
        />
      </div>
      <div className="mt-3">
        <TrendChart
          labels={buckets.map((b) => axisLabel(b.key, hourly))}
          tooltipLabels={buckets.map((b) => tipLabel(b.key, hourly))}
          series={[{ name: metric === "sessions" ? "Sessions" : "Requests", color: "var(--series-1)", values: buckets.map((b) => b[metric]) }]}
          format={compact}
          height={190}
          compactAxis
        />
      </div>
    </div>
  );
}
