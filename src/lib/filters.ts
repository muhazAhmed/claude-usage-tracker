import { RANGES, type Filters, type RangeKey } from "./stats";

export type Search = { days?: string; device?: string; model?: string; account?: string; page?: string };

export function parseFilters(sp: Search): Filters {
  const days: RangeKey = sp.days && sp.days in RANGES ? (sp.days as RangeKey) : "7";
  return { days, device: sp.device || undefined, model: sp.model || undefined, account: sp.account || undefined };
}

export function filterQuery(f: Filters) {
  return new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
}
