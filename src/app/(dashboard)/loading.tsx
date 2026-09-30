// Shown while a page's data loads when switching pages from the sidebar.
export default function Loading() {
  const block = "animate-pulse rounded-2xl border border-line bg-surface-1";
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent-soft">
        <div className="loading-bar h-full w-1/3 bg-accent" />
      </div>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-2" />
      <div className="mt-5 h-9 w-full max-w-3xl animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`${block} h-32`} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className={`${block} h-96 xl:col-span-2`} />
        <div className={`${block} h-96`} />
      </div>
    </div>
  );
}
