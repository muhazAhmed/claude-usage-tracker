import { Card, CardTitle, EmptyRow, PageHeader, tbodyRow, td, th, theadRow, SpendCell } from "@/components/ui";
import { parseFilters, type Search } from "@/lib/filters";
import { compact, int, usd } from "@/lib/format";
import { getDashboard } from "@/lib/stats";

export default async function ModelsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboard(filters);

  const maxCost = Math.max(0, ...data.models.map((x) => x.costUsd));

  return (
    <>
      <PageHeader
        title="Models"
        subtitle="Which Claude models are used, and what each one costs"
        filters={filters}
        deviceOptions={data.deviceOptions}
        modelOptions={data.modelOptions}
        accountOptions={data.accountOptions}
      />

      <section className="mt-5">
        <Card>
          <div className="px-5 pt-5">
            <CardTitle title="Model breakdown" />
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-200 text-sm">
              <thead>
                <tr className={theadRow}>
                  <th className={th}>Model</th>
                  <th className={`${th} text-right`}>Requests</th>
                  <th className={`${th} text-right`}>Input</th>
                  <th className={`${th} text-right`}>Output</th>
                  <th className={`${th} text-right`}>Cache read</th>
                  <th className={`${th} text-right`}>Cache write</th>
                  <th className={`${th} text-right`}>Avg / request</th>
                  <th className={`${th} text-right`}>Spend</th>
                </tr>
              </thead>
              <tbody>
                {data.models.length === 0 && <EmptyRow cols={8}>No usage in this period.</EmptyRow>}
                {data.models.map((m) => (
                  <tr key={m.model} className={tbodyRow}>
                    <td className={td}>
                      <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs">{m.model}</span>
                    </td>
                    <td className={`${td} num text-right`}>{int(m.requests)}</td>
                    <td className={`${td} num text-right`}>{compact(m.inputTokens)}</td>
                    <td className={`${td} num text-right`}>{compact(m.outputTokens)}</td>
                    <td className={`${td} num text-right text-ink-2`}>{compact(m.cacheReadTokens)}</td>
                    <td className={`${td} num text-right text-ink-2`}>{compact(m.cacheCreationTokens)}</td>
                    <td className={`${td} num text-right`}>{usd(m.requests ? m.costUsd / m.requests : 0)}</td>
                    <td className={td}>
                      <SpendCell value={m.costUsd} max={maxCost} display={usd(m.costUsd)} />
                    </td>
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
