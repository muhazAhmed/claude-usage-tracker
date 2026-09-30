import Link from "next/link";
import { FilterBar } from "./FilterBar";
import { filterQuery } from "@/lib/filters";
import { RANGES, TZ, type Filters } from "@/lib/stats";

export function PageHeader(props: {
  title: string;
  subtitle?: string;
  filters?: Filters;
  deviceOptions?: { key: string; name: string }[];
  modelOptions?: string[];
  accountOptions?: string[];
}) {
  const { filters } = props;
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{props.title}</h1>
          <p className="text-sm text-ink-2">{props.subtitle ?? `Claude Code usage · times in ${TZ}`}</p>
        </div>
        {filters && (
          <a
            href={`/api/export?${filterQuery(filters)}`}
            className="flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
            </svg>
            Export CSV
          </a>
        )}
      </header>
      {filters && (
        <div className="mt-5" data-filters>
          <FilterBar
            days={filters.days}
            device={filters.device}
            model={filters.model}
            account={filters.account}
            ranges={RANGES}
            deviceOptions={props.deviceOptions ?? []}
            modelOptions={props.modelOptions ?? []}
            accountOptions={props.accountOptions ?? []}
          />
        </div>
      )}
    </>
  );
}

export function Card({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`min-w-0 rounded-2xl border border-line bg-surface-1 ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ title, href, note }: { title: string; href?: string; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-semibold">{title}</h2>
      {href ? (
        <Link href={href} className="text-xs font-medium text-accent hover:underline">
          View all →
        </Link>
      ) : (
        note && <span className="text-xs text-ink-3">{note}</span>
      )}
    </div>
  );
}

export function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev) return now ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">new</span> : null;
  const pct = ((now - prev) / prev) * 100;
  return (
    <span className="num inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
      {pct >= 0 ? "↑" : "↓"} {Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function Stat(props: { label: string; value: string; now: number; prev: number; range: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface-1 p-4 sm:p-5">
      <div className="text-sm text-ink-2">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{props.value}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <Delta now={props.now} prev={props.prev} />
        <span>vs previous {props.range}</span>
      </div>
      {props.note && <div className="mt-1 text-xs text-ink-3">{props.note}</div>}
    </div>
  );
}

export function Status({ last, now }: { last?: Date; now: number }) {
  const age = last ? now - new Date(last).getTime() : Infinity;
  const [label, cls] =
    age < 15 * 60_000
      ? ["Active now", "bg-good-soft text-good"]
      : age < 86_400_000
        ? ["Active today", "bg-accent-soft text-accent"]
        : ["Inactive", "bg-surface-2 text-ink-3"];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function DeviceCell({ label, host, osUser }: { label?: string; host?: string; osUser?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 5h16v11H4V5Zm-2 13h20" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="truncate font-medium">{label ?? host ?? "Unknown device"}</div>
        <div className="truncate text-xs text-ink-3">{[label ? host : null, osUser].filter(Boolean).join(" / ")}</div>
      </div>
    </div>
  );
}

export const th = "px-3 py-2.5 font-medium first:pl-5 last:pr-5";
export const td = "whitespace-nowrap px-3 py-3 first:pl-5 last:pr-5";
export const theadRow = "border-y border-line bg-surface-2 text-left text-xs text-ink-3";
export const tbodyRow = "border-b border-line last:border-0";

export function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-5 py-8 text-center text-ink-3">
        {children}
      </td>
    </tr>
  );
}

export function BarList({ items }: { items: { key: string; label: React.ReactNode; value: number; display: string; sub?: React.ReactNode }[] }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  const total = items.reduce((a, i) => a + i.value, 0);
  return (
    <ul className="flex flex-col gap-4">
      {items.map((i) => (
        <li key={i.key}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{i.label}</span>
            <span className="num shrink-0 font-semibold">{i.display}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-accent-soft">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${max ? (i.value / max) * 100 : 0}%` }} />
          </div>
          <div className="mt-1 flex justify-between gap-2 text-xs text-ink-3">
            <span className="min-w-0 truncate">{i.sub}</span>
            <span className="shrink-0">{total ? Math.round((i.value / total) * 100) : 0}%</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SpendCell({ value, max, display }: { value: number; max: number; display: string }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <div className="hidden h-1.5 w-16 rounded-full bg-accent-soft xl:block">
        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="num w-20 text-right font-semibold">{display}</span>
    </div>
  );
}
