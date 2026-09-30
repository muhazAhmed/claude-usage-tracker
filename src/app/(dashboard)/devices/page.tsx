import { Card, CardTitle, DeviceCell, EmptyRow, PageHeader, Status, tbodyRow, td, th, theadRow } from "@/components/ui";
import { parseFilters, type Search } from "@/lib/filters";
import { compact, dateTime, int, place, usd } from "@/lib/format";
import { getDashboard } from "@/lib/stats";

export default async function DevicesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboard(filters);

  return (
    <>
      <PageHeader
        title="Devices"
        subtitle="Every PC that has run the setup command, with where it connects from and which accounts it used"
        filters={filters}
        deviceOptions={data.deviceOptions}
        modelOptions={data.modelOptions}
        accountOptions={data.accountOptions}
      />

      <section className="mt-5">
        <Card>
          <div className="px-5 pt-5">
            <CardTitle title={`All devices (${data.devices.length})`} note="sorted by spend" />
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-200 text-sm">
              <thead>
                <tr className={theadRow}>
                  <th className={th}>Device</th>
                  <th className={th}>Status</th>
                  <th className={th}>Location · IP</th>
                  <th className={th}>Claude accounts</th>
                  <th className={`${th} text-right`}>Sessions</th>
                  <th className={`${th} text-right`}>In / out</th>
                  <th className={`${th} text-right`}>Spend</th>
                  <th className={`${th} text-right`}>Last active</th>
                </tr>
              </thead>
              <tbody>
                {data.devices.length === 0 && <EmptyRow cols={8}>No devices yet. Use “Add a PC” in the sidebar.</EmptyRow>}
                {data.devices.map((d) => (
                  <tr key={d.deviceKey} className={tbodyRow}>
                    <td className={td}>
                      <DeviceCell label={d.label} host={d.host} osUser={d.osUser} />
                    </td>
                    <td className={td}>
                      <Status last={d.lastActive} now={data.generatedAt} />
                    </td>
                    <td className={td}>
                      <div className="max-w-40 whitespace-normal">{place(d)}</div>
                      <div className="font-mono text-xs text-ink-3">
                        {d.lastIp ?? "—"}
                        {d.ipCount > 1 && ` +${d.ipCount - 1} other`}
                      </div>
                    </td>
                    <td className={`${td} max-w-52`}>
                      {d.accounts.length === 0 ? (
                        <span className="text-ink-3">—</span>
                      ) : (
                        <div className="flex max-w-52 flex-col gap-0.5">
                          {d.accounts.map((a) => (
                            <span key={a} className="truncate text-xs">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={`${td} num text-right`}>
                      {int(d.sessions)}
                      <div className="text-xs text-ink-3">{int(d.prompts)} prompts</div>
                    </td>
                    <td className={`${td} num text-right`}>
                      {compact(d.inputTokens)} / {compact(d.outputTokens)}
                      <div className="text-xs text-ink-3">{compact(d.cacheReadTokens)} cache</div>
                    </td>
                    <td className={`${td} num text-right font-semibold`}>{usd(d.costUsd)}</td>
                    <td className={`${td} whitespace-nowrap text-right text-ink-2`}>{dateTime(d.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}
