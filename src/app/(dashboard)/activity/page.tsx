import Link from "next/link";
import { Card, EmptyRow, PageHeader, tbodyRow, td, th, theadRow } from "@/components/ui";
import { filterQuery, parseFilters, type Search } from "@/lib/filters";
import { compact, dateTime, int, place, usd } from "@/lib/format";
import { deviceName, getDashboard, getRecent, PAGE_SIZE } from "@/lib/stats";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [data, recent] = await Promise.all([getDashboard(filters), getRecent(filters, page)]);
  const qs = filterQuery(filters);
  const pageHref = (n: number) => `/activity?${qs ? `${qs}&` : ""}page=${n}`;
  const from = recent.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, recent.total);

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle="Every Claude Code request, newest first"
        filters={filters}
        deviceOptions={data.deviceOptions}
        modelOptions={data.modelOptions}
        accountOptions={data.accountOptions}
      />

      <Card className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-240 text-sm">
            <thead>
              <tr className={`${theadRow} border-t-0`}>
                <th className={th}>Time</th>
                <th className={th}>Account</th>
                <th className={th}>Device</th>
                <th className={th}>Model</th>
                <th className={th}>Where</th>
                <th className={`${th} text-right`}>In / out</th>
                <th className={`${th} text-right`}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {recent.rows.length === 0 && <EmptyRow cols={7}>No requests in this period.</EmptyRow>}
              {recent.rows.map((e) => (
                <tr key={String(e._id)} className={tbodyRow}>
                  <td className={`${td} whitespace-nowrap text-ink-2`}>{dateTime(e.ts)}</td>
                  <td className={td}><div className="max-w-52 truncate">{e.account ?? <span className="text-ink-3">—</span>}</div></td>
                  <td className={td}>{deviceName(e)}</td>
                  <td className={td}>
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs">{e.model ?? "—"}</span>
                  </td>
                  <td className={`${td} text-ink-2`}>
                    <div>{place(e)}</div>
                    <div className="font-mono text-xs text-ink-3">
                      {e.ip ?? "—"}
                      {e.terminalType && ` · ${e.terminalType}`}
                    </div>
                  </td>
                  <td className={`${td} num text-right`}>
                    {compact(e.inputTokens ?? 0)} / {compact(e.outputTokens ?? 0)}
                  </td>
                  <td className={`${td} num text-right`}>{usd(e.costUsd ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-sm">
          <span className="text-ink-2">
            {int(from)}–{int(to)} of {int(recent.total)}
          </span>
          <div className="flex gap-2">
            <PageLink href={pageHref(page - 1)} disabled={page <= 1}>
              ← Newer
            </PageLink>
            <span className="px-2 py-1 text-ink-3">
              Page {page} of {recent.pages}
            </span>
            <PageLink href={pageHref(page + 1)} disabled={page >= recent.pages}>
              Older →
            </PageLink>
          </div>
        </div>
      </Card>
    </>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="rounded-lg border border-line px-3 py-1 text-ink-3 opacity-50">{children}</span>;
  return (
    <Link href={href} className="rounded-lg border border-line px-3 py-1 hover:bg-surface-2">
      {children}
    </Link>
  );
}
