"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { CountryTotal } from "@/lib/aggregations";
import { formatInt, formatMoney, formatPct } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { Flag } from "./Flag";
import { EmptyState } from "./states";
import { Card, CardTitle, cn } from "./ui";

export function CountryBreakdown({
  countries,
  currency,
  selected,
  onToggle,
}: {
  countries: CountryTotal[];
  currency: Currency;
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <Card className="p-6" >
      <div id="paises" className="scroll-mt-48" />
      <CardTitle
        title="Inversión por país"
        subtitle="Clic en un país para filtrar todo el dashboard"
      />
      {countries.length === 0 ? (
        <EmptyState compact />
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {countries.map((c, i) => {
            const active = selected.includes(c.key);
            return (
              <motion.button
                key={c.key}
                type="button"
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onToggle(c.key)}
                className={cn(
                  "group relative rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-azar bg-azar-50 dark:bg-azar/10"
                    : "border-transparent bg-card-muted hover:border-line hover:shadow-sm",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Flag country={c.key} name={c.name} size={22} />
                    <span className="truncate text-sm font-medium text-fg">{c.name}</span>
                  </span>
                  {active ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-azar text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="tabular text-xs font-semibold text-azar">{formatPct(c.pct)}</span>
                  )}
                </div>
                <p className="mt-3 truncate text-lg font-bold tracking-tight text-fg sm:text-xl">
                  <AnimatedNumber value={c.total} format={(n) => formatMoney(n, currency)} />
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-azar-bright to-azar"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(c.pct, 1.5)}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {formatInt(c.accounts)} {c.accounts === 1 ? "cuenta" : "cuentas"} · {formatInt(c.count)} recargas
                </p>
              </motion.button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
