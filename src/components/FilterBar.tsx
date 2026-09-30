"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useOptimistic, useTransition } from "react";

type Key = "days" | "device" | "model" | "account";
type Values = Partial<Record<Key, string>>;

type Props = {
  days: string;
  device?: string;
  model?: string;
  account?: string;
  ranges: Record<string, string>;
  deviceOptions: { key: string; name: string }[];
  modelOptions: string[];
  accountOptions: string[];
};

export function FilterBar({ ranges, deviceOptions, modelOptions, accountOptions, ...current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  // Show the clicked choice straight away, while the page data reloads.
  const [shown, setShown] = useOptimistic<Values, Values>(current, (prev, next) => ({ ...prev, ...next }));

  // Lets the page content fade while new data loads (see globals.css).
  useEffect(() => {
    if (pending) document.documentElement.dataset.loading = "";
    else delete document.documentElement.dataset.loading;
  }, [pending]);

  function go(next: Values) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...next })) if (v) qs.set(k, v);
    startTransition(() => {
      setShown(next);
      router.push(`${pathname}?${qs}`);
    });
  }

  const select =
    "h-9 min-w-40 max-w-full flex-1 sm:flex-none sm:max-w-72 rounded-lg border border-line bg-surface-1 px-2 text-sm text-ink outline-none focus:border-accent";

  return (
    <>
      {pending && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent-soft" role="progressbar" aria-label="Loading">
          <div className="loading-bar h-full w-1/3 bg-accent" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 rounded-lg border border-line bg-surface-1 p-0.5" role="group" aria-label="Time range">
          {Object.entries(ranges).map(([k, label]) => (
            <button
              key={k}
              onClick={() => go({ days: k })}
              aria-pressed={k === shown.days}
              className={`rounded-md px-3 text-sm ${k === shown.days ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select aria-label="Device" className={select} value={shown.device ?? ""} onChange={(e) => go({ device: e.target.value })}>
          <option value="">All devices</option>
          {deviceOptions.map((d) => (
            <option key={d.key} value={d.key}>
              {d.name}
            </option>
          ))}
        </select>
        <select aria-label="Account" className={select} value={shown.account ?? ""} onChange={(e) => go({ account: e.target.value })}>
          <option value="">All accounts</option>
          {accountOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select aria-label="Model" className={select} value={shown.model ?? ""} onChange={(e) => go({ model: e.target.value })}>
          <option value="">All models</option>
          {modelOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {pending && (
          <span className="flex items-center gap-2 text-sm text-ink-2" aria-live="polite">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-soft border-t-accent" />
            Loading…
          </span>
        )}
      </div>
    </>
  );
}
