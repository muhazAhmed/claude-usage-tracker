import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { CopyCommand } from "@/components/CopyCommand";
import { FilterBar } from "@/components/FilterBar";
import { ActivityChart, MainChart } from "@/components/UsageCharts";
import { requireLogin, SESSION_COOKIE } from "@/lib/auth";
import { compact, dateTime, int, place, usd } from "@/lib/format";
import { deviceName, getDashboard, RANGES, TZ, type RangeKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

type Search = { days?: string; device?: string; model?: string };

const NAV = [
  ["#overview", "Overview", "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"],
  ["#devices", "Devices", "M4 5h16v11H4V5Zm-2 13h20v2H2v-2Z"],
  ["#models", "Models", "M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3L18.7 8 12 11.7 5.3 8 12 4.3Z"],
  ["#activity", "Activity", "M3 12h4l3-8 4 16 3-8h4"],
  ["#setup", "Add a PC", "M12 5v14M5 12h14"],
] as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<Search> }) {
  await requireLogin();
  const sp = await searchParams;
  const days: RangeKey = sp.days && sp.days in RANGES ? (sp.days as RangeKey) : "7";
  const filters = { days, device: sp.device || undefined, model: sp.model || undefined };
  const data = await getDashboard(filters);

  const h = await headers();
  const origin = process.env.PUBLIC_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const key = process.env.INGEST_TOKEN ?? "<INGEST_TOKEN>";
  const setupCmd = `irm "${origin}/api/setup?key=${key}" | iex`;
  const removeCmd = `irm "${origin}/api/setup?key=${key}&action=remove" | iex`;
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);

  const t = data.totals;
  const p = data.previous;
  const maxModelCost = Math.max(0, ...data.models.map((m) => m.costUsd));
  const totalModelCost = data.models.reduce((a, m) => a + m.costUsd, 0);
  const account = process.env.ACCOUNT_LABEL || "Performance Marketing";

  return (
    <div className="lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar px-4 py-5 text-white lg:flex">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a78d6] text-sm font-bold">C</div>
          <span className="font-semibold">Usage Tracker</span>
        </div>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          {NAV.map(([href, label, d], i) => (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${i === 0 ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d={d} />
              </svg>
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
            {account.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm leading-tight font-medium">{account}</div>
            <div className="text-xs text-white/50">Shared Claude account</div>
          </div>
          <form action={logout}>
            <button title="Sign out" aria-label="Sign out" className="rounded p-1 text-white/60 hover:text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 12H3m12 0-4-4m4 4-4 4M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      <main id="overview" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="text-sm text-ink-2">Claude Code usage by device and model · times in {TZ}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/export?${exportQs}`}
              className="flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
              </svg>
              Export CSV
            </a>
            <form action={logout} className="lg:hidden">
              <button className="h-9 rounded-lg px-3 text-sm text-ink-2 hover:text-ink">Sign out</button>
            </form>
          </div>
        </header>

        <div className="mt-5">
          <FilterBar
            days={days}
            device={filters.device}
            model={filters.model}
            ranges={RANGES}
            deviceOptions={data.deviceOptions}
            modelOptions={data.modelOptions}
          />
        </div>

        <section className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat label="Total spend" value={usd(t.costUsd)} now={t.costUsd} prev={p.costUsd} range={RANGES[days]} />
          <Stat
            label="Tokens (in + out)"
            value={compact(t.inputTokens + t.outputTokens)}
            now={t.inputTokens + t.outputTokens}
            prev={p.inputTokens + p.outputTokens}
            range={RANGES[days]}
            note={`${compact(t.cacheReadTokens)} cache reads`}
          />
          <Stat label="Requests" value={compact(t.requests)} now={t.requests} prev={p.requests} range={RANGES[days]} />
          <Stat
            label="Active devices"
            value={int(t.activeDevices)}
            now={t.activeDevices}
            prev={p.activeDevices}
            range={RANGES[days]}
            note={`${data.deviceOptions.length} registered`}
          />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-line bg-surface-1 p-5 xl:col-span-2">
            <MainChart buckets={data.buckets} hourly={data.hourly} />
          </div>
          <div className="min-w-0 rounded-2xl border border-line bg-surface-1 p-5">
            <h2 className="font-semibold">Sessions</h2>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-accent-soft p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-1 text-accent">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-ink-2">Claude Code sessions</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">{int(t.sessions)}</span>
                  <Delta now={t.sessions} prev={p.sessions} />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <ActivityChart buckets={data.buckets} hourly={data.hourly} />
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-3">
          <div id="devices" className="min-w-0 scroll-mt-6 rounded-2xl border border-line bg-surface-1 xl:col-span-2">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-semibold">Devices</h2>
              <span className="text-xs text-ink-3">sorted by spend</span>
            </div>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-y border-line bg-surface-2 text-left text-xs text-ink-3">
                    <th className="px-5 py-2.5 font-medium">Device</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Location · IP</th>
                    <th className="px-3 py-2.5 text-right font-medium">Prompts</th>
                    <th className="px-3 py-2.5 text-right font-medium">Tokens</th>
                    <th className="px-5 py-2.5 text-right font-medium">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-ink-3">
                        No devices yet. Run the setup command below on a PC.
                      </td>
                    </tr>
                  )}
                  {data.devices.map((d) => (
                    <tr key={d.deviceKey} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M4 5h16v11H4V5Zm-2 13h20" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{d.label ?? d.host ?? "Unknown device"}</div>
                            <div className="truncate text-xs text-ink-3">
                              {[d.label ? d.host : null, d.osUser].filter(Boolean).join(" / ")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Status last={d.lastActive} now={data.generatedAt} />
                      </td>
                      <td className="px-3 py-3">
                        <div>{place(d)}</div>
                        <div className="font-mono text-xs text-ink-3">
                          {d.lastIp ?? "—"}
                          {d.ipCount > 1 && ` +${d.ipCount - 1}`}
                        </div>
                      </td>
                      <td className="num px-3 py-3 text-right">{int(d.prompts)}</td>
                      <td className="num px-3 py-3 text-right">
                        <div>{compact(d.inputTokens + d.outputTokens)}</div>
                        <div className="text-xs text-ink-3">{int(d.requests)} req</div>
                      </td>
                      <td className="num px-5 py-3 text-right font-semibold">{usd(d.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div id="models" className="min-w-0 scroll-mt-6 rounded-2xl border border-line bg-surface-1 p-5">
            <h2 className="font-semibold">Spend by model</h2>
            {data.models.length === 0 && <p className="mt-6 text-center text-sm text-ink-3">No usage in this period.</p>}
            <ul className="mt-4 flex flex-col gap-4">
              {data.models.map((m) => (
                <li key={m.model}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-mono text-xs">{m.model}</span>
                    <span className="num font-semibold">{usd(m.costUsd)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-accent-soft">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${maxModelCost ? (m.costUsd / maxModelCost) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-ink-3">
                    <span>
                      {int(m.requests)} req · {compact(m.inputTokens)} in · {compact(m.outputTokens)} out
                    </span>
                    <span>{totalModelCost ? Math.round((m.costUsd / totalModelCost) * 100) : 0}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="activity" className="mt-4 scroll-mt-6 rounded-2xl border border-line bg-surface-1">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="font-semibold">Recent requests</h2>
            <span className="text-xs text-ink-3">latest {data.recent.length} · full list in Export CSV</span>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-200 text-sm">
              <thead>
                <tr className="border-y border-line bg-surface-2 text-left text-xs text-ink-3">
                  <th className="px-5 py-2.5 font-medium">Time</th>
                  <th className="px-3 py-2.5 font-medium">Device</th>
                  <th className="px-3 py-2.5 font-medium">Model</th>
                  <th className="px-3 py-2.5 font-medium">Where</th>
                  <th className="px-3 py-2.5 text-right font-medium">In / out</th>
                  <th className="px-5 py-2.5 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-ink-3">
                      No requests in this period.
                    </td>
                  </tr>
                )}
                {data.recent.map((e, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap px-5 py-2.5 text-ink-2">{dateTime(e.ts)}</td>
                    <td className="px-3 py-2.5">{deviceName(e)}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs">{e.model ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">
                      {place(e)}
                      {e.terminalType && <span className="text-ink-3"> · {e.terminalType}</span>}
                    </td>
                    <td className="num px-3 py-2.5 text-right">
                      {compact(e.inputTokens ?? 0)} / {compact(e.outputTokens ?? 0)}
                    </td>
                    <td className="num px-5 py-2.5 text-right">{usd(e.costUsd ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="setup" className="mt-4 scroll-mt-6 rounded-2xl border border-line bg-surface-1 p-5">
          <h2 className="font-semibold">Add a PC</h2>
          <p className="mt-1 text-sm text-ink-2">
            Paste this into PowerShell on the PC once, then restart Claude Code. Keep it private: anyone with it
            can send usage data here.
          </p>
          <div className="mt-3">
            <CopyCommand command={setupCmd} />
          </div>
          <p className="mt-4 text-sm text-ink-2">To stop tracking on a PC:</p>
          <div className="mt-2">
            <CopyCommand command={removeCmd} />
          </div>
        </section>
      </main>
    </div>
  );
}

function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev) return now ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">new</span> : null;
  const pct = ((now - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className="num inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
      {up ? "↑" : "↓"} {Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Stat(props: { label: string; value: string; now: number; prev: number; range: string; note?: string }) {
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

function Status({ last, now }: { last?: Date; now: number }) {
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
