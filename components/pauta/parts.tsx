"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { countryColor, resolveCountry } from "@/lib/countries";
import { Flag } from "../Flag";
import { cn } from "../ui";
import { pct, tone } from "./context";

export const countryKeyOf = (pais: string) => resolveCountry(pais).key;
export const paisColor = (pais: string, dark = false) => countryColor(countryKeyOf(pais), 0, dark);

export function Section({ id, n, title, subtitle, children }: { id: string; n: number; title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-64 space-y-4">
      <div>
        <h2 className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-fg">
          <span className="text-azar">{n}.</span> {title}
        </h2>
        {subtitle && <p className="mt-1 max-w-4xl text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function Panel({ title, subtitle, className, children, right }: { title?: string; subtitle?: ReactNode; className?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className={cn("card min-w-0 p-5 sm:p-6", className)}>
      {(title || right) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

/** Pill de variación con flecha; positivo en naranja, negativo en rojo suave. */
export function Var({ v, suffix, className }: { v: number | null | undefined; suffix?: string; className?: string }) {
  const t = tone(v);
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        t === "pos" && "bg-azar-50 text-azar dark:bg-azar/15 dark:text-azar-bright",
        t === "neg" && "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
        t === "neu" && "bg-card-muted text-muted",
        className,
      )}
    >
      <span aria-hidden>{t === "pos" ? "▲" : t === "neg" ? "▼" : "●"}</span>
      {pct(v)}
      {suffix && <span className="font-normal opacity-80">{suffix}</span>}
    </span>
  );
}

/** Texto de variación sin pill (para tablas). */
export function VarText({ v, fallback }: { v: number | null | undefined; fallback?: string }) {
  if (v === null || v === undefined) return <span className="text-xs text-muted">{fallback || "—"}</span>;
  const t = tone(v);
  return <span className={cn("tabular font-semibold", t === "pos" && "text-azar", t === "neg" && "text-red-600 dark:text-red-400", t === "neu" && "text-muted")}>{pct(v)}</span>;
}

export function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 cursor-help text-muted" tabIndex={0} aria-label={text} />
      <span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-60 rounded-xl bg-ink px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-xl group-focus-within:block group-hover:block">
        {text}
      </span>
    </span>
  );
}

export function Stat({
  label,
  value,
  period,
  tip,
  foot,
  dim,
  featured,
  index = 0,
}: {
  label: string;
  value: ReactNode;
  period: string;
  tip?: string;
  foot?: ReactNode;
  dim?: boolean;
  featured?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: dim ? 0.5 : 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="card min-w-0 overflow-hidden"
    >
      <div className={cn("flex h-full flex-col p-5", featured && "bg-brand-gradient text-white")}>
        <div className="flex items-start justify-between gap-2">
          <span className={cn("text-sm font-medium", featured ? "text-white/85" : "text-muted")}>{label}</span>
          {tip && !featured && <Tip text={tip} />}
        </div>
        <div className={cn("mt-3 truncate text-2xl font-bold tracking-tight sm:text-[28px]", !featured && "text-fg")}>{value}</div>
        <p className={cn("mt-1 text-xs", featured ? "text-white/70" : "text-muted")}>{period}</p>
        <div className="mt-auto pt-3">{foot ?? <span className={cn("text-xs", featured ? "text-white/60" : "text-muted")}>● Sin comparación</span>}</div>
      </div>
    </motion.div>
  );
}

export interface HBarItem {
  key: string;
  label: ReactNode;
  sub?: ReactNode;
  value: number | null;
  text: string;
  color?: string;
  dashed?: boolean;
}

/** Barras horizontales con etiqueta, animadas al cargar y al filtrar. */
export function HBars({ items, max }: { items: HBarItem[]; max?: number }) {
  const m = max ?? Math.max(1, ...items.map((i) => i.value ?? 0));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.key} className="grid grid-cols-[minmax(90px,140px)_1fr] items-center gap-3">
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium text-fg">{it.label}</div>
            {it.sub && <div className="truncate text-[11px] text-muted">{it.sub}</div>}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-7 min-w-0 flex-1">
              <motion.div
                className={cn("h-full rounded-lg", it.dashed && "border-2 border-dashed border-azar/70 bg-azar/10")}
                style={it.dashed ? undefined : { background: it.color ?? "linear-gradient(90deg,#E85A1E,#FF6A13)" }}
                initial={{ width: 0 }}
                animate={{ width: `${m > 0 && it.value ? Math.max(1, (it.value / m) * 100) : 0}%` }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="tabular w-[110px] shrink-0 text-right text-sm font-semibold text-fg">{it.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Chip({ children, cam }: { children: ReactNode; cam?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
        cam ? "bg-azar-50 text-azar dark:bg-azar/15 dark:text-azar-200" : "bg-card-muted text-muted ring-1 ring-line",
      )}
    >
      {children}
    </span>
  );
}

export function PaisChip({ pais }: { pais: string }) {
  return (
    <Chip>
      <Flag country={countryKeyOf(pais)} size={12} />
      {pais}
    </Chip>
  );
}

/** Tabla con estilo del dashboard. */
export function Table({ head, children, foot, minWidth = 640, compact }: { head: ReactNode; children: ReactNode; foot?: ReactNode; minWidth?: number; compact?: boolean }) {
  return (
    <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-line">
      <table className={cn("w-full", compact ? "text-xs [&_td]:!px-2.5 [&_th]:!px-2.5" : "text-sm")} style={{ minWidth }}>
        <thead>
          <tr className="bg-card-muted text-left text-xs text-muted [&>th]:whitespace-nowrap [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">{head}</tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-line [&>tr:hover]:bg-card-muted [&_td]:px-4 [&_td]:py-3">{children}</tbody>
        {foot && <tfoot className="border-t-2 border-line bg-card-muted font-semibold [&_td]:px-4 [&_td]:py-3">{foot}</tfoot>}
      </table>
    </div>
  );
}

export const num = "tabular whitespace-nowrap text-right";
