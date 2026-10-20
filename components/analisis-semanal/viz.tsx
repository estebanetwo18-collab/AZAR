"use client";

import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { Hint } from "./shared";

export interface DistSegment {
  key: string;
  label: string;
  share: number;
  style: CSSProperties;
  tip: ReactNode;
}

/** Barra 100 % apilada con etiquetas dentro (si caben) y valores debajo. */
export function DistBar({ label, segments }: { label: string; segments: DistSegment[] }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-x-3">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex h-7 gap-0.5 overflow-hidden rounded-md" role="img" aria-label={`${label}: ${segments.map((s) => `${s.label} ${(s.share * 100).toFixed(1)}%`).join(", ")}`}>
        {segments.map((s) => (
          <Hint
            key={s.key}
            as="div"
            tip={s.tip}
            className="flex h-full min-w-0 items-center overflow-visible px-2 font-mono text-[11px] text-ink transition-[width] duration-700"
            style={{ width: `${s.share * 100}%`, ...s.style }}
          >
            <span className="truncate">{s.share >= 0.18 ? `${s.label} ${(s.share * 100).toFixed(1)}%` : ""}</span>
          </Hint>
        ))}
      </div>
      <span className="hidden sm:block" />
      <div className="flex flex-wrap gap-x-3.5 gap-y-0.5 text-[11px] text-muted">
        {segments.map((s) => (
          <span key={s.key}>
            {s.label} <b className="tabular font-medium text-fg">{(s.share * 100).toFixed(1)}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export interface FunnelStep {
  label: string;
  value: number;
  text: string;
  conv?: string;
  tip: ReactNode;
}

/** Embudo horizontal: ancho proporcional al primer paso, con la conversión entre pasos. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = steps[0]?.value || 1;
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => (
        <div key={s.label}>
          {s.conv && <p className="py-0.5 text-xs text-muted sm:pl-[140px]">↓ {s.conv}</p>}
          <div className="grid grid-cols-[96px_1fr_76px] items-center gap-2.5 text-sm sm:grid-cols-[130px_1fr_92px]">
            <span className="text-fg">{s.label}</span>
            <Hint as="div" tip={s.tip} className="relative h-7 overflow-hidden rounded-md bg-card-muted">
              <motion.i
                className="absolute inset-y-0 left-0 block rounded-md bg-gradient-to-r from-azar to-azar-bright"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0.4, (s.value / max) * 100)}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{ minWidth: 3 }}
              />
            </Hint>
            <span className="tabular text-right font-mono text-fg">{s.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface RefBarItem {
  key: string;
  label: ReactNode;
  value: number | null;
  text: string;
  tip?: ReactNode;
  /** Texto en lugar de barra (p. ej. "Sin registros"). */
  empty?: ReactNode;
}

/** Barras horizontales con una línea punteada de referencia (p. ej. el costo consolidado). */
export function RefBars({ items, max, reference }: { items: RefBarItem[]; max: number; reference?: number | null }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.key} className="grid grid-cols-[110px_1fr_80px] items-center gap-2.5 text-sm sm:grid-cols-[150px_1fr_96px]">
          <span className="truncate text-fg">{it.label}</span>
          {it.empty ? (
            <span className="text-xs text-muted">{it.empty}</span>
          ) : (
            <Hint as="div" tip={it.tip ?? it.text} className="relative h-[18px] rounded bg-card-muted">
              <motion.i
                className="absolute inset-y-0 left-0 block rounded-r bg-azar"
                initial={{ width: 0 }}
                animate={{ width: `${max > 0 && it.value ? (it.value / max) * 100 : 0}%` }}
                transition={{ duration: 0.7, delay: i * 0.05 }}
              />
              {reference !== undefined && reference !== null && max > 0 && (
                <span className="absolute -bottom-1 -top-1 border-l border-dashed border-muted" style={{ left: `${Math.min(100, (reference / max) * 100)}%` }} aria-hidden />
              )}
            </Hint>
          )}
          <span className="tabular text-right font-mono text-fg">{it.text}</span>
        </div>
      ))}
    </div>
  );
}
