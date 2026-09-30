import { ActivityChart, MainChart } from "@/components/UsageCharts";
import { BarList, Card, CardTitle, Delta, PageHeader, Stat, Status } from "@/components/ui";
import { parseFilters, filterQuery, type Search } from "@/lib/filters";
import { compact, int, usd } from "@/lib/format";
import { getDashboard, RANGES } from "@/lib/stats";

export default async function Overview({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboard(filters);
  const t = data.totals;
  const p = data.previous;
  const range = RANGES[filters.days];
  const qs = filterQuery(filters);
  const link = (path: string) => (qs ? `${path}?${qs}` : path);

  return (
    <>
      <PageHeader
        title="Overview"
        filters={filters}
        deviceOptions={data.deviceOptions}
        modelOptions={data.modelOptions}
        accountOptions={data.accountOptions}
      />

      <section className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Total spend" value={usd(t.costUsd)} now={t.costUsd} prev={p.costUsd} range={range} />
        <Stat
          label="Tokens (in + out)"
          value={compact(t.inputTokens + t.outputTokens)}
          now={t.inputTokens + t.outputTokens}
          prev={p.inputTokens + p.outputTokens}
          range={range}
          note={`${compact(t.cacheReadTokens)} cache reads`}
        />
        <Stat label="Requests" value={compact(t.requests)} now={t.requests} prev={p.requests} range={range} />
        <Stat
          label="Active devices"
          value={int(t.activeDevices)}
          now={t.activeDevices}
          prev={p.activeDevices}
          range={range}
          note={`${data.deviceOptions.length} registered`}
        />
        <Stat label="Claude accounts used" value={int(t.activeAccounts)} now={t.activeAccounts} prev={p.activeAccounts} range={range} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <MainChart buckets={data.buckets} hourly={data.hourly} />
        </Card>
        <Card className="p-5">
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
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <CardTitle title="Top devices" href={link("/devices")} />
          {data.devices.length === 0 && <p className="mt-6 text-center text-sm text-ink-3">No devices yet.</p>}
          <ul className="mt-4 flex flex-col gap-3">
            {data.devices.slice(0, 5).map((d) => (
              <li key={d.deviceKey} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{d.label ?? d.host ?? "Unknown device"}</div>
                  <div className="mt-1">
                    <Status last={d.lastActive} now={data.generatedAt} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="num text-sm font-semibold">{usd(d.costUsd)}</div>
                  <div className="text-xs text-ink-3">{compact(d.inputTokens + d.outputTokens)} tokens</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <CardTitle title="Spend by account" href={link("/accounts")} />
          {data.accounts.length === 0 && <p className="mt-6 text-center text-sm text-ink-3">No usage in this period.</p>}
          <div className="mt-4">
            <BarList
              items={data.accounts.slice(0, 5).map((a) => ({
                key: a.account,
                label: a.account,
                value: a.costUsd,
                display: usd(a.costUsd),
                sub: `${int(a.requests)} req · ${a.devices.length} device${a.devices.length === 1 ? "" : "s"}`,
              }))}
            />
          </div>
        </Card>
        <Card className="p-5">
          <CardTitle title="Spend by model" href={link("/models")} />
          {data.models.length === 0 && <p className="mt-6 text-center text-sm text-ink-3">No usage in this period.</p>}
          <div className="mt-4">
            <BarList
              items={data.models.slice(0, 5).map((m) => ({
                key: m.model,
                label: <span className="font-mono text-xs">{m.model}</span>,
                value: m.costUsd,
                display: usd(m.costUsd),
                sub: `${int(m.requests)} req · ${compact(m.outputTokens)} out`,
              }))}
            />
          </div>
        </Card>
      </section>
    </>
  );
}
