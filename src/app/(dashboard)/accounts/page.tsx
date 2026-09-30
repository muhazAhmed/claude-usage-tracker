import { Card, CardTitle, EmptyRow, PageHeader, Status, tbodyRow, td, th, theadRow, SpendCell } from "@/components/ui";
import { parseFilters, type Search } from "@/lib/filters";
import { compact, dateTime, int, usd } from "@/lib/format";
import { getDashboard, NO_ACCOUNT } from "@/lib/stats";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboard(filters);

  const maxCost = Math.max(0, ...data.accounts.map((x) => x.costUsd));

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="Usage per Claude account. When someone switches accounts, the new one shows up here as its own row."
        filters={filters}
        deviceOptions={data.deviceOptions}
        modelOptions={data.modelOptions}
        accountOptions={data.accountOptions}
      />

      <section className="mt-5">
        <Card>
          <div className="px-5 pt-5">
            <CardTitle title="All accounts" note="sorted by spend" />
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-200 text-sm">
              <thead>
                <tr className={theadRow}>
                  <th className={th}>Account</th>
                  <th className={th}>Status</th>
                  <th className={th}>Used on</th>
                  <th className={`${th} text-right`}>Requests</th>
                  <th className={`${th} text-right`}>In / out</th>
                  <th className={`${th} text-right`}>Spend</th>
                  <th className={`${th} text-right`}>First / last use</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.length === 0 && <EmptyRow cols={7}>No usage in this period.</EmptyRow>}
                {data.accounts.map((a) => (
                  <tr key={a.account} className={tbodyRow}>
                    <td className={`${td} font-medium`}>{a.account}</td>
                    <td className={td}>
                      <Status last={a.lastActive} now={data.generatedAt} />
                    </td>
                    <td className={`${td} max-w-64`}>
                      <div className="flex max-w-52 flex-col gap-0.5">
                        {a.devices.map((d) => (
                          <span key={d} className="truncate text-xs">
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`${td} num text-right`}>{int(a.requests)}</td>
                    <td className={`${td} num text-right`}>
                      {compact(a.inputTokens)} / {compact(a.outputTokens)}
                    </td>
                    <td className={td}>
                      <SpendCell value={a.costUsd} max={maxCost} display={usd(a.costUsd)} />
                    </td>
                    <td className={`${td} whitespace-nowrap text-right text-xs text-ink-2`}>
                      <div>{dateTime(a.firstActive)}</div>
                      <div>{dateTime(a.lastActive)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.accounts.some((a) => a.account === NO_ACCOUNT) && (
            <p className="border-t border-line px-5 py-3 text-xs text-ink-3">
              “{NO_ACCOUNT}” is usage where Claude Code didn&apos;t send an account email, for example when it runs with an
              API key instead of a Claude login.
            </p>
          )}
        </Card>
      </section>
    </>
  );
}
