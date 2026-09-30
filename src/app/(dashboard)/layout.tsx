import { headers } from "next/headers";
import { Suspense } from "react";
import { MobileNav, Sidebar } from "@/components/Sidebar";
import { requireLogin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireLogin();
  const account = process.env.ACCOUNT_LABEL || "Performance Marketing";

  // The setup command points PCs at whatever address the dashboard is opened on.
  const h = await headers();
  const origin = process.env.PUBLIC_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = `${origin.replace(/\/$/, "")}/api/setup?key=${process.env.INGEST_TOKEN ?? "<INGEST_TOKEN>"}`;
  const commands = {
    windows: `irm "${url}" | iex`,
    mac: `curl -fsSL "${url}&os=mac" | bash`,
    linux: `curl -fsSL "${url}&os=linux" | bash`,
  };

  return (
    <div className="lg:flex">
      <Suspense>
        <Sidebar account={account} commands={commands} />
        <MobileNav commands={commands} />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
