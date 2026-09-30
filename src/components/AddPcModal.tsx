"use client";

import { useRef } from "react";
import { CopyCommand } from "./CopyCommand";

export type SetupCommands = { install: string; remove: string };

export function AddPcButton({ commands, className, children }: { commands: SetupCommands; className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={className}>
        {children}
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-line bg-surface-1 p-0 text-ink shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Add a PC</h2>
              <p className="mt-1 text-sm text-ink-2">
                Start tracking Claude Code usage on a Windows PC. It keeps working when someone switches Claude accounts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close"
              className="rounded-lg p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <ol className="mt-5 flex flex-col gap-4 text-sm">
            <li className="flex gap-3">
              <Step n={1} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Open PowerShell on the PC and paste this</div>
                <div className="mt-2">
                  <CopyCommand command={commands.install} />
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <Step n={2} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Type a name or nickname when asked</div>
                <div className="text-ink-2">Optional. It&apos;s how the PC is labelled on the dashboard.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <Step n={3} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Restart Claude Code</div>
                <div className="text-ink-2">Close terminals and reload VS Code. The PC then appears under Devices.</div>
              </div>
            </li>
          </ol>

          <p className="mt-5 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
            Keep this command private: anyone with it can send usage data to this dashboard. Prompt text and code are never
            sent.
          </p>

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-ink-2 hover:text-ink">Stop tracking on a PC</summary>
            <div className="mt-2">
              <CopyCommand command={commands.remove} />
            </div>
          </details>
        </div>
      </dialog>
    </>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
      {n}
    </span>
  );
}
