import { TZ } from "./stats";

export function compact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function usd(n: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n !== 0 && Math.abs(n) < 1 ? 3 : 2,
  }).format(n);
}

export function int(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

export function dateTime(d: Date | string | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function place(d: { city?: string; region?: string; country?: string }) {
  const country = d.country ? (regionNames.of(d.country) ?? d.country) : undefined;
  return [d.city, country].filter(Boolean).join(", ") || "—";
}
