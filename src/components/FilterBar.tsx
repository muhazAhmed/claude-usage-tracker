"use client";

import { useRouter } from "next/navigation";

type Props = {
  days: string;
  device?: string;
  model?: string;
  ranges: Record<string, string>;
  deviceOptions: { key: string; name: string }[];
  modelOptions: string[];
};

export function FilterBar({ days, device, model, ranges, deviceOptions, modelOptions }: Props) {
  const router = useRouter();

  function go(next: Partial<Record<"days" | "device" | "model", string>>) {
    const merged = { days, device, model, ...next };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    router.push(`/?${qs}`);
  }

  const select =
    "h-9 min-w-40 max-w-full flex-1 sm:flex-none sm:max-w-72 rounded-lg border border-line bg-surface-1 px-2 text-sm text-ink outline-none focus:border-accent";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-9 rounded-lg border border-line bg-surface-1 p-0.5" role="group" aria-label="Time range">
        {Object.entries(ranges).map(([k, label]) => (
          <button
            key={k}
            onClick={() => go({ days: k })}
            aria-pressed={k === days}
            className={`rounded-md px-3 text-sm ${k === days ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <select aria-label="Device" className={select} value={device ?? ""} onChange={(e) => go({ device: e.target.value })}>
        <option value="">All devices</option>
        {deviceOptions.map((d) => (
          <option key={d.key} value={d.key}>
            {d.name}
          </option>
        ))}
      </select>
      <select aria-label="Model" className={select} value={model ?? ""} onChange={(e) => go({ model: e.target.value })}>
        <option value="">All models</option>
        {modelOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
