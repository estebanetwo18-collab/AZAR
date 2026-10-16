"use client";

import { motion } from "framer-motion";
import { applyFilters, pctChange, sumOf } from "@/lib/aggregations";
import { formatDate } from "@/lib/dates";
import { PRESET_LABELS } from "@/lib/filters";
import { formatInt, formatMoney } from "@/lib/format";
import type { DatePreset, Filters, Movement } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { DeltaBadge, cn } from "./ui";

const PULSE: { preset: DatePreset; vs: string }[] = [
  { preset: "today", vs: "vs mismo día semana pasada" },
  { preset: "yesterday", vs: "vs mismo día semana pasada" },
  { preset: "thisWeek", vs: "vs mismos días semana pasada" },
  { preset: "thisMonth", vs: "vs mismo tramo mes pasado" },
];

/** Franja rápida: hoy, ayer, esta semana y el mes en curso. Clic = cambiar el rango de todo el dashboard. */
export function QuickPulse({ rows, filters, today, onPick }: { rows: Movement[]; filters: Filters; today: string; onPick: (p: DatePreset) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {PULSE.map(({ preset, vs }, i) => {
        const d = applyFilters(rows, { ...filters, preset, from: undefined, to: undefined }, today);
        const total = sumOf(d.current, filters.currency);
        // Hoy y ayer se comparan con el mismo día de la semana anterior (más justo que contra el día previo).
        let prev: number | null = d.previous ? sumOf(d.previous, filters.currency) : null;
        if ((preset === "today" || preset === "yesterday") && d.range) {
          const same = applyFilters(
            rows,
            { ...filters, preset: "custom", from: shift(d.range.from), to: shift(d.range.to) },
            today,
          );
          prev = sumOf(same.current, filters.currency);
        }
        const active = filters.preset === preset;
        const label =
          preset === "thisMonth" && d.range ? monthName(d.range.from) : PRESET_LABELS[preset];
        return (
          <motion.button
            key={preset}
            type="button"
            onClick={() => onPick(preset)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "card group min-w-0 p-4 text-left transition hover:shadow-md",
              active && "!border-azar ring-2 ring-azar/20",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-sm font-semibold", active ? "text-azar" : "text-fg")}>{label}</span>
              <span className="truncate text-[11px] text-muted">
                {d.range ? (d.range.from === d.range.to ? formatDate(d.range.from, false) : `${formatDate(d.range.from, false)} – ${formatDate(d.range.to, false)}`) : ""}
              </span>
            </div>
            <p className="mt-2 truncate text-2xl font-bold tracking-tight text-fg">
              <AnimatedNumber value={total} format={(n) => formatMoney(n, filters.currency)} />
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <DeltaBadge value={pctChange(total, prev)} />
              <span>{formatInt(d.current.length)} recargas</span>
            </div>
            <p className="mt-1 truncate text-[10px] text-muted">{vs}</p>
          </motion.button>
        );
      })}
    </div>
  );
}

function shift(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 7)).toISOString().slice(0, 10);
}

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
