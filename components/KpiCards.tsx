"use client";

import { ArrowRight, CalendarDays, MoreHorizontal, Receipt, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { byCountry, pctChange, rangeDays, sumOf, type FilteredData } from "@/lib/aggregations";
import { formatDate } from "@/lib/dates";
import { formatInt, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { Flag } from "./Flag";
import { DeltaBadge, cn } from "./ui";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function KpiCard({
  featured = false,
  icon,
  title,
  subtitle,
  value,
  badge,
  extra,
  action,
  target,
  index,
}: {
  featured?: boolean;
  icon: ReactNode;
  title: string;
  subtitle: ReactNode;
  value: ReactNode;
  badge: ReactNode;
  extra?: ReactNode;
  action: string;
  target: string;
  index: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card flex flex-col overflow-hidden"
    >
      <div className={cn("relative flex-1 p-6", featured && "bg-brand-gradient text-white")}>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              featured ? "bg-white text-azar shadow-sm" : "border border-line bg-card-muted text-azar",
            )}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn("text-lg font-semibold tracking-tight", !featured && "text-fg")}>{title}</h3>
            <p className={cn("truncate text-sm", featured ? "text-white/70" : "text-muted")}>{subtitle}</p>
          </div>
          <MoreHorizontal className={cn("h-5 w-5", featured ? "text-white/60" : "text-muted")} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className={cn("text-3xl font-bold tracking-tight sm:text-4xl", !featured && "text-fg")}>{value}</p>
          {badge}
        </div>
        {extra && <div className={cn("mt-2 text-sm", featured ? "text-white/70" : "text-muted")}>{extra}</div>}
      </div>
      <button
        onClick={() => scrollTo(target)}
        className="group flex items-center justify-between border-t border-line px-6 py-4 text-sm text-muted transition hover:bg-card-muted hover:text-fg"
      >
        {action}
        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1 group-hover:text-azar" />
      </button>
    </motion.section>
  );
}

export function KpiCards({ data, currency }: { data: FilteredData; currency: Currency }) {
  const total = sumOf(data.current, currency);
  const prevTotal = data.previous ? sumOf(data.previous, currency) : null;
  const days = rangeDays(data.range);
  const prevDays = rangeDays(data.prevRange);
  const avg = days ? total / days : 0;
  const prevAvg = prevTotal !== null && prevDays ? prevTotal / prevDays : null;
  const count = data.current.length;
  const prevCount = data.previous ? data.previous.length : null;
  const top = byCountry(data.current, currency)[0];
  const money = (n: number) => formatMoney(n, currency);
  const rangeText = data.range
    ? data.range.from === data.range.to
      ? formatDate(data.range.from)
      : `${formatDate(data.range.from)} – ${formatDate(data.range.to)}`
    : "Sin datos";
  const vsText = data.prevRange ? `vs ${formatDate(data.prevRange.from)} – ${formatDate(data.prevRange.to)}` : "Sin período anterior";

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <KpiCard
        index={0}
        featured
        icon={<Wallet className="h-6 w-6" />}
        title="Inversión total"
        subtitle={rangeText}
        value={<AnimatedNumber value={total} format={money} />}
        badge={<DeltaBadge value={pctChange(total, prevTotal)} onDark />}
        extra={vsText}
        action="Ver movimientos"
        target="movimientos"
      />
      <KpiCard
        index={1}
        icon={<CalendarDays className="h-6 w-6" />}
        title="Promedio diario"
        subtitle={`${formatInt(days)} ${days === 1 ? "día" : "días"} en el período`}
        value={<AnimatedNumber value={avg} format={money} />}
        badge={<DeltaBadge value={pctChange(avg, prevAvg)} />}
        extra={prevAvg !== null ? `Anterior: ${money(prevAvg)} / día` : "Sin período anterior"}
        action="Ver flujo de inversión"
        target="flujo"
      />
      <KpiCard
        index={2}
        icon={<Receipt className="h-6 w-6" />}
        title="Recargas / facturas"
        subtitle="Cantidad de recargas en el período"
        value={<AnimatedNumber value={count} format={(n) => formatInt(Math.round(n))} />}
        badge={<DeltaBadge value={pctChange(count, prevCount)} />}
        extra={
          top ? (
            <span className="flex items-center gap-1.5">
              Mayor inversión: <Flag country={top.key} name={top.name} size={16} />
              <span className="font-medium text-fg">{top.name}</span> · {money(top.total)}
            </span>
          ) : (
            "—"
          )
        }
        action="Ver inversión por país"
        target="paises"
      />
    </div>
  );
}
