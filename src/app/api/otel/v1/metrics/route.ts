import { NextResponse } from "next/server";

// Metrics aren't stored (usage comes from log events), but accept them so a
// machine with OTEL_METRICS_EXPORTER=otlp doesn't log export errors.
export async function POST() {
  return NextResponse.json({});
}
