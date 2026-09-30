"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logout } from "@/app/actions";
import { AddPcButton, type SetupCommands } from "./AddPcModal";

const NAV = [
  ["/", "Overview", "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"],
  ["/devices", "Devices", "M4 5h16v11H4V5Zm-2 13h20v2H2v-2Z"],
  ["/accounts", "Accounts", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  ["/models", "Models", "M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3L18.7 8 12 11.7 5.3 8 12 4.3Z"],
  ["/activity", "Activity", "M3 12h4l3-8 4 16 3-8h4"],
] as const;

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function useNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  // Carry the time range / device / model filters between pages, but not paging.
  const qs = new URLSearchParams();
  for (const k of ["days", "device", "model", "account"]) {
    const v = sp.get(k);
    if (v) qs.set(k, v);
  }
  const suffix = qs.size ? `?${qs}` : "";
  return NAV.map(([href, label, d]) => ({
    href: href + suffix,
    label,
    d,
    active: href === "/" ? pathname === "/" : pathname.startsWith(href),
  }));
}

export function Sidebar({ account, commands }: { account: string; commands: SetupCommands }) {
  const nav = useNav();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar px-4 py-5 text-white lg:flex">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a78d6] text-sm font-bold">C</div>
        <span className="font-semibold">Usage Tracker</span>
      </div>
      <nav className="mt-8 flex flex-col gap-1 text-sm">
        {nav.map((n) => (
          <Link
            key={n.label}
            href={n.href}
            aria-current={n.active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 ${n.active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon d={n.d} />
            {n.label}
          </Link>
        ))}
      </nav>
      <AddPcButton
        commands={commands}
        className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white"
      >
        <Icon d="M12 5v14M5 12h14" />
        Add a PC
      </AddPcButton>
      <div className="mt-auto flex items-center gap-3 rounded-lg bg-white/5 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
          {account.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-tight font-medium">{account}</div>
          <div className="text-xs text-white/50">Shared Claude account</div>
        </div>
        <form action={logout}>
          <button title="Sign out" aria-label="Sign out" className="rounded p-1 text-white/60 hover:text-white">
            <Icon d="M15 12H3m12 0-4-4m4 4-4 4M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" />
          </button>
        </form>
      </div>
    </aside>
  );
}

export function MobileNav({ commands }: { commands: SetupCommands }) {
  const nav = useNav();
  return (
    <div className="sticky top-0 z-20 bg-sidebar text-white lg:hidden">
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2a78d6] text-xs font-bold">C</div>
          <span className="text-sm font-semibold">Usage Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <AddPcButton commands={commands} className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-white">
            + Add a PC
          </AddPcButton>
          <form action={logout}>
            <button className="text-xs text-white/60 hover:text-white">Sign out</button>
          </form>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 py-2 text-sm">
        {nav.map((n) => (
          <Link
            key={n.label}
            href={n.href}
            aria-current={n.active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 ${n.active ? "bg-white/10 text-white" : "text-white/60"}`}
          >
            <Icon d={n.d} className="h-3.5 w-3.5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
