"use client";

import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CountryTotal, TypeTotal } from "@/lib/aggregations";
import { countryColor } from "@/lib/countries";
import { formatCompact, formatInt, formatMoney, formatPct } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { Flag } from "./Flag";
import { EmptyState } from "./states";
import { Card, CardTitle } from "./ui";

const TYPE_SHADES = ["#E85A1E", "#FF8A47", "#2A1206", "#FDBA74", "#78716C", "#A0522D"];

export function Distribution({
  countries,
  types,
  total,
  currency,
  dark,
}: {
  countries: CountryTotal[];
  types: TypeTotal[];
  total: number;
  currency: Currency;
  dark: boolean;
}) {
  const typeColor = (i: number) => (dark && i === 2 ? "#E7E5E4" : TYPE_SHADES[i % TYPE_SHADES.length]);
  return (
    <Card className="flex flex-col p-6">
      <CardTitle title="Distribución" subtitle="Participación por país y por tipo" />
      {countries.length === 0 ? (
        <EmptyState compact />
      ) : (
        <>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[200px_1fr] lg:grid-cols-1 xl:grid-cols-[200px_1fr]">
            <div className="relative mx-auto h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countries}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={94}
                    paddingAngle={countries.length > 1 ? 2 : 0}
                    cornerRadius={6}
                    stroke="none"
                    animationDuration={800}
                  >
                    {countries.map((c, i) => (
                      <Cell key={c.key} fill={countryColor(c.key, i, dark)} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const c = payload[0].payload as CountryTotal;
                      return (
                        <div className="rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-xl">
                          <p className="font-medium">{c.name}</p>
                          <p className="tabular text-white/70">
                            {formatMoney(c.total, currency)} · {formatPct(c.pct)}
                          </p>
                        </div>
                      );
                    }}
                    wrapperStyle={{ outline: "none", zIndex: 30 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted">Total</span>
                <span className="text-lg font-bold tracking-tight text-fg">
                  <AnimatedNumber value={total} format={(n) => formatCompact(n, currency)} />
                </span>
              </div>
            </div>
            <ul className="space-y-2">
              {countries.map((c, i) => (
                <li key={c.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: countryColor(c.key, i, dark) }} />
                    <Flag country={c.key} name={c.name} size={16} />
                    <span className="truncate text-fg">{c.name}</span>
                  </span>
                  <span className="tabular shrink-0 font-semibold text-fg">{formatPct(c.pct)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-3 text-sm font-medium text-fg">Por tipo</p>
            <div className="space-y-3">
              {types.map((t, i) => (
                <div key={t.type}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-fg">{t.type}</span>
                    <span className="tabular shrink-0 text-muted">
                      {formatMoney(t.total, currency)} · {formatInt(t.count)} · <span className="font-semibold text-fg">{formatPct(t.pct)}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-card-muted">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: typeColor(i) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(t.pct, 1)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
