"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesPoint } from "@/lib/aggregations";
import { countryColor, countryInfo } from "@/lib/countries";
import { formatBucket } from "@/lib/dates";
import { formatCompact, formatInt, formatMoney } from "@/lib/format";
import type { Currency, GroupBy } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { EmptyState } from "./states";
import { Card, Segmented } from "./ui";

interface ShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

function makeShape(activeIndex: number | null, dark: boolean) {
  function FlowBar(props: ShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, index } = props;
    if (width <= 0) return null;
    const active = index === activeIndex;
    const h = Math.max(height, 2);
    const top = y + height - h;
    const bottom = top + h;
    return (
      <g>
        <path d={roundedTop(x, top, width, h, Math.min(12, width / 2))} fill={active ? "url(#flow-active)" : "url(#flow-idle)"} />
        {active && (
          <>
            <line
              x1={x + width / 2}
              x2={x + width / 2}
              y1={top + 14}
              y2={bottom}
              stroke={dark ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.7)"}
              strokeWidth={1.5}
            />
            <circle cx={x + width / 2} cy={top} r={7} fill="#E85A1E" stroke={dark ? "#161616" : "#fff"} strokeWidth={3} />
          </>
        )}
      </g>
    );
  }
  return FlowBar;
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: SeriesPoint }[];
  currency: Currency;
  groupBy: GroupBy;
  names: Record<string, string>;
}

function FlowTooltip({ active, payload, currency, groupBy, names }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const entries = Object.entries(p.countries).sort((a, b) => b[1] - a[1]);
  return (
    <div className="min-w-[220px] rounded-2xl bg-ink px-4 py-3 text-xs text-white shadow-2xl ring-1 ring-white/10">
      <p className="text-white/60">{formatBucket(p.key, groupBy, false)}</p>
      <div className="mt-2 flex items-center justify-between gap-6">
        <span className="text-white/70">Total</span>
        <span className="tabular text-sm font-semibold">{formatMoney(p.total, currency)}</span>
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-white/70">Recargas</span>
        <span className="tabular">{formatInt(p.count)}</span>
      </div>
      {entries.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
          {entries.map(([k, v], i) => (
            <div key={k} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-white/80">
                <span className="h-2 w-2 rounded-full" style={{ background: countryColor(k, i, true) }} />
                {names[k] ?? countryInfo(k).name}
              </span>
              <span className="tabular">{formatMoney(v, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InvestmentFlow({
  series,
  total,
  currency,
  groupBy,
  onGroupBy,
  names,
  dark,
}: {
  series: SeriesPoint[];
  total: number;
  currency: Currency;
  groupBy: GroupBy;
  onGroupBy: (g: GroupBy) => void;
  names: Record<string, string>;
  dark: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hasData = series.some((p) => p.total > 0);
  const axis = dark ? "#9CA3AF" : "#6B7280";
  const grid = dark ? "#222" : "#EEF0F2";

  return (
    <Card className="flex flex-col p-6">
      <div id="flujo" className="scroll-mt-48" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Flujo de inversión</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            <AnimatedNumber value={total} format={(n) => formatMoney(n, currency)} />
          </p>
        </div>
        <Segmented
          value={groupBy}
          onChange={onGroupBy}
          options={[
            { value: "day", label: "Diario" },
            { value: "week", label: "Semanal" },
            { value: "month", label: "Mensual" },
          ]}
        />
      </div>
      {!hasData ? (
        <EmptyState compact />
      ) : (
        <div className="mt-6 h-[300px] w-full sm:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series}
              margin={{ top: 16, right: 4, left: 4, bottom: 0 }}
              barCategoryGap={series.length > 40 ? "12%" : "22%"}
              onMouseMove={(s) => {
                const i = s?.activeTooltipIndex;
                setActiveIndex(i === undefined || i === null ? null : Number(i));
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <defs>
                <linearGradient id="flow-idle" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E85A1E" stopOpacity={dark ? 0.45 : 0.32} />
                  <stop offset="100%" stopColor="#E85A1E" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="flow-active" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E85A1E" stopOpacity={1} />
                  <stop offset="70%" stopColor="#FF6A13" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#FF6A13" stopOpacity={0.25} />
                </linearGradient>
              </defs>
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
                cursor={false}
                content={<FlowTooltip currency={currency} groupBy={groupBy} names={names} />}
                wrapperStyle={{ outline: "none", zIndex: 30 }}
                // Arriba del gráfico para no tapar la barra activa.
                position={{ y: -8 }}
                offset={24}
              />
              <Bar dataKey="total" maxBarSize={56} shape={makeShape(activeIndex, dark) as never} animationDuration={700} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
