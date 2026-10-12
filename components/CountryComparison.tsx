"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CountryTotal, SeriesPoint } from "@/lib/aggregations";
import { countryColor } from "@/lib/countries";
import { formatBucket } from "@/lib/dates";
import { formatCompact, formatMoney } from "@/lib/format";
import type { Currency, GroupBy } from "@/lib/types";
import { Flag } from "./Flag";
import { EmptyState } from "./states";
import { Card, CardTitle, Segmented } from "./ui";

type Mode = "stacked" | "grouped";

interface TipProps {
  active?: boolean;
  label?: string;
  payload?: { dataKey: string; value: number; color: string }[];
  currency: Currency;
  groupBy: GroupBy;
  names: Record<string, string>;
}

function ComparisonTooltip({ active, label, payload, currency, groupBy, names }: TipProps) {
  if (!active || !payload?.length || !label) return null;
  const rows = [...payload].filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  const total = rows.reduce((a, p) => a + p.value, 0);
  return (
    <div className="min-w-[200px] rounded-2xl bg-ink px-4 py-3 text-xs text-white shadow-2xl ring-1 ring-white/10">
      <p className="text-white/60">{formatBucket(label, groupBy, false)}</p>
      <div className="mt-2 space-y-1">
        {rows.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-white/80">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color === "#0A0A0A" ? "#E7E5E4" : p.color }} />
              {names[p.dataKey] ?? p.dataKey}
            </span>
            <span className="tabular">{formatMoney(p.value, currency)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold">
        <span>Total</span>
        <span className="tabular">{formatMoney(total, currency)}</span>
      </div>
    </div>
  );
}

export function CountryComparison({
  series,
  countries,
  currency,
  groupBy,
  dark,
}: {
  series: SeriesPoint[];
  countries: CountryTotal[];
  currency: Currency;
  groupBy: GroupBy;
  dark: boolean;
}) {
  const [mode, setMode] = useState<Mode>("grouped");
  const keys = countries.map((c) => c.key);
  const names = Object.fromEntries(countries.map((c) => [c.key, c.name]));
  const data = useMemo(
    () => series.map((p) => ({ key: p.key, ...Object.fromEntries(keys.map((k) => [k, p.countries[k] ?? 0])) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, keys.join(",")],
  );
  const hasData = series.some((p) => p.total > 0);
  const axis = dark ? "#9CA3AF" : "#6B7280";
  const grid = dark ? "#222" : "#EEF0F2";

  return (
    <Card className="flex flex-col p-6">
      <CardTitle
        title="Comparativa por país"
        subtitle={`Inversión ${groupBy === "day" ? "diaria" : groupBy === "week" ? "semanal" : "mensual"} por país`}
        right={
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: "grouped", label: "Agrupadas" },
              { value: "stacked", label: "Apiladas" },
            ]}
          />
        }
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {countries.map((c, i) => (
          <span key={c.key} className="inline-flex items-center gap-1.5 rounded-full bg-card-muted px-2.5 py-1 text-xs text-fg">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: countryColor(c.key, i, dark) }} />
            <Flag country={c.key} name={c.name} size={14} />
            {c.name}
          </span>
        ))}
      </div>
      {!hasData ? (
        <EmptyState compact />
      ) : (
        <div className="mt-4 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={2} barCategoryGap={mode === "grouped" ? "18%" : "24%"}>
              <CartesianGrid vertical={false} stroke={grid} strokeDasharray="4 4" />
              <XAxis
                dataKey="key"
                tickFormatter={(k: string) => formatBucket(k, groupBy)}
                tick={{ fill: axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                minTickGap={16}
                dy={8}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompact(v, currency)}
                tick={{ fill: axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={currency === "UYU" ? 64 : 56}
              />
              <Tooltip
                cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(10,10,10,0.04)", radius: 8 }}
                content={<ComparisonTooltip currency={currency} groupBy={groupBy} names={names} />}
                wrapperStyle={{ outline: "none", zIndex: 30 }}
              />
              {keys.map((k, i) => (
                <Bar
                  key={`${mode}-${k}`}
                  dataKey={k}
                  name={names[k]}
                  stackId={mode === "stacked" ? "a" : undefined}
                  fill={countryColor(k, i, dark)}
                  radius={mode === "grouped" || i === keys.length - 1 ? [6, 6, 0, 0] : 0}
                  maxBarSize={mode === "grouped" ? 22 : 44}
                  animationDuration={650}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
