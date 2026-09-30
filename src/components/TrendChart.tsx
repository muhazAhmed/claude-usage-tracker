"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Series = { name: string; color: string; values: number[] };

type Props = {
  labels: string[];
  tooltipLabels?: string[];
  series: Series[];
  format: (n: number) => string;
  height?: number;
  compactAxis?: boolean;
};

const PAD = { top: 16, right: 12, bottom: 28, left: 48 };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((m) => m >= v)!;
}

// Monotone cubic interpolation (Fritsch–Carlson): smooth, but never overshoots
// below zero or past a peak the way a plain Catmull-Rom curve can.
function smoothPath(pts: [number, number][]) {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const c = dx[i] / 3;
    d += `C${x0 + c},${y0 + t[i] * c} ${x1 - c},${y1 - t[i + 1] * c} ${x1},${y1}`;
  }
  return d;
}

export function TrendChart({ labels, tooltipLabels, series, format, height = 260, compactAxis }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const gid = useId().replace(/:/g, "");
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = compactAxis ? { ...PAD, left: 36 } : PAD;
  const n = labels.length;
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 60))));
  const baseY = pad.top + innerH;

  function onMove(e: React.PointerEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - pad.left;
    const i = n <= 1 ? 0 : Math.round((px / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  const tipW = 168;

  return (
    <div ref={ref} className="relative select-none" onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => s.name).join(" and ") + " over time"}>
          <defs>
            {series.map((s, si) => (
              <linearGradient key={si} id={`${gid}-g${si}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--text-muted)" className="num">
                {format(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % every === 0 ? (
              <text
                key={i}
                x={x(i)}
                y={height - 8}
                textAnchor="middle"
                fontSize={11}
                fill={hover === i ? "var(--accent)" : "var(--text-muted)"}
                fontWeight={hover === i ? 600 : 400}
              >
                {l}
              </text>
            ) : null,
          )}
          {series.map((s, si) => {
            const pts = s.values.map((v, i) => [x(i), y(v)] as [number, number]);
            const line = smoothPath(pts);
            return (
              <g key={si}>
                {n > 1 && <path d={`${line}L${x(n - 1)},${baseY}L${x(0)},${baseY}Z`} fill={`url(#${gid}-g${si})`} />}
                <path d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={baseY} stroke="var(--text-muted)" strokeDasharray="4 4" />
              {series.map((s, si) => (
                <circle
                  key={si}
                  cx={x(hover)}
                  cy={y(s.values[hover])}
                  r={5}
                  fill={s.color}
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
          <rect
            x={pad.left - 10}
            y={pad.top}
            width={innerW + 20}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
          />
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-[#16181c] px-3 py-2 text-xs text-white shadow-lg"
          style={{
            width: tipW,
            top: Math.max(0, Math.min(...series.map((s) => y(s.values[hover]))) - 12 - 22 * (series.length + 1)),
            left: Math.min(Math.max(0, x(hover) - tipW / 2), Math.max(0, width - tipW)),
          }}
        >
          <div className="mb-1 text-white/70">{(tooltipLabels ?? labels)[hover]}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-white/80">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
              <span className="num font-semibold">{format(s.values[hover])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
