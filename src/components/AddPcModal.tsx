"use client";

import { useRef, useState } from "react";
import { CopyCommand } from "./CopyCommand";

export type SetupCommands = { windows: string; mac: string; linux: string };
type Os = keyof SetupCommands;

function WindowsLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="#0078D4" aria-hidden>
      <path d="M0 3.45 9.75 2.1v9.45H0V3.45Zm10.95-1.5L24 0v11.4H10.95V1.95ZM0 12.6h9.75v9.45L0 20.7v-8.1Zm10.95 0H24V24l-13.05-1.8V12.6Z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor" aria-hidden>
      <path d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.2 3.09 3.79 3.04 1.52-.07 2.09-.99 3.93-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.16-1.69 1.64-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.86-.03-3.04 2.48-4.49 2.6-4.56-1.43-2.09-3.62-2.32-4.39-2.38-2-.16-3.68 1.09-4.61 1.09ZM15.53 3.83c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.66.8-3.53 1.82-.78.9-1.46 2.34-1.27 3.71 1.33.1 2.71-.69 3.55-1.7Z" />
    </svg>
  );
}

// Simplified Tux; body follows the text colour so it shows in both themes.
function LinuxLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden>
      <ellipse cx="12" cy="13" rx="7" ry="9.5" fill="currentColor" />
      <ellipse cx="12" cy="15.5" rx="4.6" ry="6" fill="var(--surface-1)" />
      <circle cx="10" cy="7.4" r="1.4" fill="var(--surface-1)" />
      <circle cx="14" cy="7.4" r="1.4" fill="var(--surface-1)" />
      <circle cx="10.3" cy="7.6" r="0.6" fill="currentColor" />
      <circle cx="13.7" cy="7.6" r="0.6" fill="currentColor" />
      <path d="M9.6 9.6c.7-.6 1.5-.9 2.4-.9s1.7.3 2.4.9L12 11.4 9.6 9.6Z" fill="#F5B301" />
      <ellipse cx="8.2" cy="22" rx="2.8" ry="1.3" fill="#F5B301" />
      <ellipse cx="15.8" cy="22" rx="2.8" ry="1.3" fill="#F5B301" />
    </svg>
  );
}

const SYSTEMS: Record<Os, { name: string; logo: () => React.ReactElement; shell: string; open: string; restart: string }> = {
  windows: {
    name: "Windows",
    logo: WindowsLogo,
    shell: "PowerShell",
    open: "Open PowerShell and paste this",
    restart: "Close terminals and reload VS Code.",
  },
  mac: {
    name: "macOS",
    logo: AppleLogo,
    shell: "Terminal",
    open: "Open Terminal and paste this",
    restart: "Close terminals, then quit and reopen VS Code.",
  },
  linux: {
    name: "Linux",
    logo: LinuxLogo,
    shell: "Terminal",
    open: "Open a terminal and paste this",
    restart: "Close terminals, then quit and reopen VS Code.",
  },
};

export function AddPcButton({ commands, className, children }: { commands: SetupCommands; className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [os, setOs] = useState<Os | null>(null);
  const sys = os ? SYSTEMS[os] : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOs(null);
          ref.current?.showModal();
        }}
        className={className}
      >
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
                {sys
                  ? `Set up tracking on ${sys.name}.`
                  : "Which system is the computer running? Tracking keeps working when someone switches Claude accounts."}
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

          {!sys ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(Object.keys(SYSTEMS) as Os[]).map((k) => {
                const s = SYSTEMS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setOs(k)}
                    className="flex flex-row items-center gap-4 rounded-xl border border-line p-4 text-left transition hover:border-accent hover:bg-accent-soft/40 focus-visible:border-accent focus-visible:outline-none sm:flex-col sm:py-6 sm:text-center"
                  >
                    <s.logo />
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-ink-3">uses {s.shell}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOs(null)}
                className="mt-4 flex items-center gap-2 rounded-lg border border-line py-1.5 pl-2 pr-3 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-4">
                  <sys.logo />
                  {sys.name}
                </span>
                <span className="text-ink-3">· change</span>
              </button>

              <ol className="mt-5 flex flex-col gap-4 text-sm">
                <li className="flex gap-3">
                  <Step n={1} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{sys.open}</div>
                    <div className="mt-2">
                      <CopyCommand command={commands[os!]} />
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Step n={2} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Type a name or nickname when asked</div>
                    <div className="text-ink-2">Optional. It&apos;s how the computer is labelled on the dashboard.</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Step n={3} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Restart Claude Code</div>
                    <div className="text-ink-2">{sys.restart} The computer then appears under Devices.</div>
                  </div>
                </li>
              </ol>
            </>
          )}

          <p className="mt-5 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
            Keep this command private: anyone with it can send usage data to this dashboard. Prompt text and code are never
            sent.
          </p>
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
