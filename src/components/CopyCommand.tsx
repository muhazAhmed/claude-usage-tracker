"use client";

import { useState } from "react";

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink">
        {command}
      </code>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-lg border border-line px-3 text-sm text-ink hover:bg-surface-2"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
