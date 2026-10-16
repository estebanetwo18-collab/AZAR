"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BarChart3, Eye, Info, Megaphone, Target, TrendingUp } from "lucide-react";
import {
  countryKey,
  filterPauta,
  pautaByAccount,
  pautaByCampaign,
  pautaByCountry,
  pautaDaily,
  pautaSummary,
  toCurrency,
  type AuditNote,
  type PautaFilters,
  type PautaPayload,
} from "@/lib/pauta";
import { countryColor, countryInfo } from "@/lib/countries";
import { formatDate } from "@/lib/dates";
import { formatCompact, formatInt, formatMoney, formatPct } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { useTheme } from "@/lib/use-dashboard-data";
import { AnimatedNumber } from "../AnimatedNumber";
import { Flag } from "../Flag";
import { Header } from "../Header";
import { DashboardSkeleton, EmptyState, ErrorState } from "../states";
import { Card, CardTitle, DeltaBadge, Segmented, cn } from "../ui";

const DEFAULT: PautaFilters = { pais: "all", tipo: "all", cuenta: "all", currency: "UYU" };

function Kpi({
  featured,
  icon,
  title,
  subtitle,
  value,
  badge,
  extra,
  index,
}: {
  featured?: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: React.ReactNode;
  badge?: React.ReactNode;
  extra?: React.ReactNode;
  index: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card overflow-hidden"
    >
      <div className={cn("h-full p-6", featured && "bg-brand-gradient text-white")}>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            featured ? "bg-white text-azar" : "border border-line bg-card-muted text-azar",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className={cn("text-lg font-semibold tracking-tight", !featured && "text-fg")}>{title}</h3>
          <p className={cn("text-sm", featured ? "text-white/70" : "text-muted")}>{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <p className={cn("text-3xl font-bold tracking-tight", !featured && "text-fg")}>{value}</p>
        {badge}
      </div>
      {extra && <div className={cn("mt-2 space-y-0.5 text-sm", featured ? "text-white/75" : "text-muted")}>{extra}</div>}
      </div>
    </motion.section>
  );
}

const pill = (active: boolean) =>
  cn(
    "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
    active ? "bg-azar text-white" : "border border-white/10 bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white",
  );

function Filters({ f, set, paises, cuentas }: { f: PautaFilters; set: (p: Partial<PautaFilters>) => void; paises: string[]; cuentas: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={pill(f.pais === "all")} onClick={() => set({ pais: "all" })}>
        Todos los países
      </button>
      {paises.map((k) => (
        <button key={k} className={cn(pill(f.pais === k), "inline-flex items-center gap-1.5")} onClick={() => set({ pais: f.pais === k ? "all" : k })}>
          <Flag country={k} size={16} />
          {countryInfo(k).name}
        </button>
      ))}
      <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" />
      {["all", "CAM", "Individual"].map((t) => (
        <button key={t} className={pill(f.tipo === t)} onClick={() => set({ tipo: t })}>
          {t === "all" ? "Todos los tipos" : t === "CAM" ? "Cuentas CAM" : "Individuales"}
        </button>
      ))}
      <select
        value={f.cuenta}
        onChange={(e) => set({ cuenta: e.target.value })}
        className="rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-sm font-medium text-white outline-none [&>option]:text-ink"
      >
        <option value="all">Todas las cuentas</option>
        {cuentas.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <div className="sm:ml-auto">
        <Segmented
          variant="dark"
          size="sm"
          value={f.currency}
          onChange={(currency: Currency) => set({ currency })}
          options={[
            { value: "UYU", label: "Pesos $U" },
            { value: "USD", label: "Dólares US$" },
          ]}
        />
      </div>
    </div>
  );
}

const SEVERITY: Record<AuditNote["severidad"], string> = {
  alta: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  media: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  baja: "bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300",
  info: "bg-azar-50 text-azar dark:bg-azar/15 dark:text-azar-200",
};

export function PautaDashboard() {
  const { dark, toggle } = useTheme();
  const [data, setData] = useState<PautaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<PautaFilters>(DEFAULT);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const set = (p: Partial<PautaFilters>) => setF((x) => ({ ...x, ...p }));

  const load = () => {
    setError(null);
    fetch("/api/pauta", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) window.location.href = "/login";
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError("No se pudo cargar el reporte de pauta."));
  };
  useEffect(load, []);

  const view = useMemo(() => {
    if (!data) return null;
    const rows = filterPauta(data.filas, f);
    return {
      rows,
      summary: pautaSummary(rows, data),
      daily: pautaDaily(rows),
      countries: pautaByCountry(rows, data),
      accounts: pautaByAccount(rows, data),
      campaigns: pautaByCampaign(rows, data),
      paises: [...new Set(data.filas.map((r) => countryKey(r.pais)))],
      cuentas: [...new Set(data.filas.map((r) => r.cuenta))].sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
    };
  }, [data, f]);

  if (!data && !error) return <DashboardSkeleton />;

  const rate = data?.tipoCambio.uyu_por_usd ?? 40;
  const cur = f.currency;
  const money = (uyu: number) => formatMoney(toCurrency(uyu, cur, rate), cur);
  const moneyAnim = (uyu: number) => <AnimatedNumber value={toCurrency(uyu, cur, rate)} format={(n) => formatMoney(n, cur)} />;

  return (
    <div className="min-h-screen">
      <Header subtitle="Meta Ads · Pauta 1–16 oct 2026" dark={dark} onToggleTheme={toggle}>
        {view && <Filters f={f} set={set} paises={view.paises} cuentas={view.cuentas} />}
      </Header>

      {error || !data || !view ? (
        <main className="px-4">
          <ErrorState message={error ?? "Sin datos"} onRetry={load} />
        </main>
      ) : (
        <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-full bg-card px-3 py-1 ring-1 ring-line">Corte: {formatDate(data.corte)}</span>
            <span className="rounded-full bg-card px-3 py-1 ring-1 ring-line">Montos de Meta en UYU</span>
            <span className="rounded-full bg-card px-3 py-1 ring-1 ring-line">
              USD = UYU ÷ {rate} ({data.tipoCambio.referencia})
            </span>
          </div>

          {view.rows.length === 0 ? (
            <div className="card">
              <EmptyState onClear={() => setF({ ...DEFAULT, currency: f.currency })} />
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <Kpi
                  index={0}
                  featured
                  icon={<Megaphone className="h-6 w-6" />}
                  title="Consumo octubre"
                  subtitle="1 al 16 de octubre"
                  value={moneyAnim(view.summary.consumo)}
                  extra={
                    <>
                      <p>1–4 oct: {money(view.summary.pre)}</p>
                      <p>Semana 1: {money(view.summary.w1)} · Semana 2: {money(view.summary.w2)}</p>
                    </>
                  }
                />
                <Kpi
                  index={1}
                  icon={<TrendingUp className="h-6 w-6" />}
                  title="Ritmo semana 2"
                  subtitle="Promedio diario 12–16 oct vs 5–11 oct"
                  value={moneyAnim(view.summary.promW2)}
                  badge={<DeltaBadge value={view.summary.variacion} />}
                  extra={
                    <>
                      <p>Semana 1: {money(view.summary.promW1)} / día</p>
                      {view.summary.excluidas.length > 0 && (
                        <p className="text-xs">Base comparable · sin {view.summary.excluidas.join(", ")}</p>
                      )}
                    </>
                  }
                />
                <Kpi
                  index={2}
                  icon={<Target className="h-6 w-6" />}
                  title="Resultados"
                  subtitle="Según el tipo de resultado de cada campaña"
                  value={formatInt(view.summary.resultTypes.reduce((a, r) => a + r.resultados, 0))}
                  extra={
                    view.summary.resultTypes.length ? (
                      view.summary.resultTypes.map((r) => (
                        <p key={r.tipo}>
                          {formatInt(r.resultados)} {r.tipo.toLowerCase()} · <span className="font-medium text-fg">{money(r.costo)}</span> c/u
                        </p>
                      ))
                    ) : (
                      <p>Estas cuentas no reportan resultados</p>
                    )
                  }
                />
                <Kpi
                  index={3}
                  icon={<Eye className="h-6 w-6" />}
                  title="Impresiones"
                  subtitle="CPM = consumo ÷ impresiones × 1.000"
                  value={<AnimatedNumber value={view.summary.impresiones} format={(n) => formatInt(Math.round(n))} />}
                  extra={<p>CPM: <span className="font-medium text-fg">{money(view.summary.cpm)}</span></p>}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,5fr)]">
                <Card className="min-w-0 p-6">
                  <CardTitle
                    title="Consumo diario"
                    subtitle={
                      view.summary.semanalSinDia > 0
                        ? `P282 llega en reportes semanales sin desglose diario (${money(view.summary.semanalSinDia)}); no aparece en este gráfico.`
                        : "Consumo por día y país"
                    }
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {view.countries.map((c, i) => (
                      <span key={c.key} className="inline-flex items-center gap-1.5 rounded-full bg-card-muted px-2.5 py-1 text-xs text-fg">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: countryColor(c.key, i, dark) }} />
                        {c.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={view.daily.map((d) => ({ dia: d.dia, total: d.total, ...d.countries }))}
                        margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
                        barCategoryGap="18%"
                      >
                        <CartesianGrid vertical={false} stroke={dark ? "#222" : "#EEF0F2"} strokeDasharray="4 4" />
                        <XAxis
                          dataKey="dia"
                          tickFormatter={(d: string) => String(Number(d.slice(8)))}
                          tick={{ fill: dark ? "#9CA3AF" : "#6B7280", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          dy={8}
                        />
                        <YAxis
                          tickFormatter={(v: number) => formatCompact(toCurrency(v, cur, rate), cur)}
                          tick={{ fill: dark ? "#9CA3AF" : "#6B7280", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          width={64}
                        />
                        <Tooltip
                          cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(10,10,10,0.04)" }}
                          wrapperStyle={{ outline: "none", zIndex: 30 }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const total = payload.reduce((a, p) => a + Number(p.value ?? 0), 0);
                            return (
                              <div className="min-w-[200px] rounded-2xl bg-ink px-4 py-3 text-xs text-white shadow-2xl ring-1 ring-white/10">
                                <p className="text-white/60">{formatDate(String(label))}</p>
                                <div className="mt-2 space-y-1">
                                  {payload.map((p) => (
                                    <div key={String(p.dataKey)} className="flex justify-between gap-6">
                                      <span className="flex items-center gap-2 text-white/80">
                                        <span className="h-2 w-2 rounded-full" style={{ background: countryColor(String(p.dataKey), 0, true) }} />
                                        {countryInfo(String(p.dataKey)).name}
                                      </span>
                                      <span className="tabular">{money(Number(p.value))}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold">
                                  <span>Total</span>
                                  <span className="tabular">{money(total)}</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        {view.countries.map((c, i) => (
                          <Bar
                            key={c.key}
                            dataKey={c.key}
                            stackId="a"
                            fill={countryColor(c.key, i, dark)}
                            radius={i === view.countries.length - 1 ? [6, 6, 0, 0] : 0}
                            maxBarSize={40}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 grid grid-cols-[4fr_7fr_5fr] gap-1 pl-[68px] text-center text-[11px] text-muted">
                    <span className="rounded-full bg-card-muted py-0.5">1–4 oct</span>
                    <span className="rounded-full bg-card-muted py-0.5">Semana 1 · 5–11</span>
                    <span className="rounded-full bg-azar-50 py-0.5 text-azar dark:bg-azar/15">Semana 2 · 12–16</span>
                  </div>
                </Card>

                <Card className="min-w-0 p-6">
                  <CardTitle title="Por país" subtitle="País tomado del nombre de la campaña" />
                  <div className="mt-5 space-y-3">
                    {view.countries.map((c, i) => (
                      <button
                        key={c.key}
                        onClick={() => set({ pais: f.pais === c.key ? "all" : c.key })}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition",
                          f.pais === c.key ? "border-azar bg-azar-50 dark:bg-azar/10" : "border-transparent bg-card-muted hover:border-line",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium text-fg">
                            <Flag country={c.key} size={22} />
                            {c.label}
                          </span>
                          <DeltaBadge value={c.variacion} />
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <span className="text-xl font-bold tracking-tight text-fg">{moneyAnim(c.consumo)}</span>
                          <span className="tabular text-xs font-semibold text-azar">{formatPct(c.pct)}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: countryColor(c.key, i, dark) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${c.pct}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          {formatInt(c.impresiones)} impresiones · {formatInt(c.resultados)} resultados
                        </p>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="min-w-0 p-6">
                <CardTitle
                  title="Por cuenta · semana 1 vs semana 2"
                  subtitle="Variación del promedio diario (semana 1 = 7 días, semana 2 = 5 días). Clic en una fila para filtrar."
                />
                <div className="scrollbar-thin mt-5 overflow-x-auto rounded-2xl border border-line">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="bg-card-muted text-left text-muted">
                        {["Cuenta", "Países", "1–4 oct", "Semana 1", "Semana 2", "Variación", "Consumo total", "Impresiones", "CPM", "Resultados"].map((h, i) => (
                          <th key={h} className={cn("px-4 py-3.5 font-medium", i >= 2 && "text-right")}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {view.accounts.map((a) => (
                        <tr
                          key={a.key}
                          onClick={() => set({ cuenta: f.cuenta === a.key ? "all" : a.key })}
                          className={cn("cursor-pointer border-t border-line transition-colors hover:bg-card-muted", f.cuenta === a.key && "bg-azar-50 dark:bg-azar/10")}
                        >
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <span className="font-semibold text-fg">{a.label}</span>
                            <span
                              className={cn(
                                "ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                a.tipo === "CAM" ? "bg-azar-50 text-azar dark:bg-azar/15" : "bg-card-muted text-muted",
                              )}
                            >
                              {a.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="flex gap-1">
                              {a.paises.map((p) => (
                                <Flag key={p} country={p} size={18} />
                              ))}
                            </span>
                          </td>
                          <td className="tabular whitespace-nowrap px-4 py-3.5 text-right text-muted">{a.pre ? money(a.pre) : "—"}</td>
                          <td className="tabular whitespace-nowrap px-4 py-3.5 text-right text-fg">{a.w1 ? money(a.w1) : "—"}</td>
                          <td className="tabular whitespace-nowrap px-4 py-3.5 text-right text-fg">{a.w2 ? money(a.w2) : "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right">
                            {a.variacion === null ? <span className="text-xs text-muted">sin base</span> : <DeltaBadge value={a.variacion} />}
                          </td>
                          <td className="tabular whitespace-nowrap px-4 py-3.5 text-right font-semibold text-fg">{money(a.consumo)}</td>
                          <td className="tabular whitespace-nowrap px-4 py-3.5 text-right text-fg">{formatInt(a.impresiones)}</td>
                          <td className="tabular whitespace-nowrap px-4 py-3.5 text-right text-fg">
                            {a.impresiones ? money((a.consumo / a.impresiones) * 1000) : "—"}
                          </td>
                          <td className="tabular whitespace-nowrap px-4 py-3.5 text-right text-fg">{a.resultados ? formatInt(a.resultados) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)]">
                <Card className="min-w-0 p-6">
                  <CardTitle title="Campañas" subtitle="Consumo por campaña en el período" />
                  <div className="mt-5 space-y-4">
                    {view.campaigns.map((c, i) => (
                      <div key={c.key}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <BarChart3 className="h-4 w-4 shrink-0 text-azar" />
                            <span className="truncate font-medium text-fg">{c.label}</span>
                          </span>
                          <span className="tabular shrink-0 text-xs text-muted">
                            <span className="font-semibold text-fg">{money(c.consumo)}</span> · {formatPct(c.pct)}
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-card-muted">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-azar to-azar-bright"
                            initial={{ width: 0 }}
                            animate={{ width: `${(c.consumo / (view.campaigns[0]?.consumo || 1)) * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          {formatInt(c.impresiones)} impresiones{c.resultados ? ` · ${formatInt(c.resultados)} resultados` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="min-w-0 p-6">
                  <CardTitle title="Notas del reporte" subtitle="Supuestos, alertas y correcciones del consolidado de octubre" />
                  <ul className="mt-5 space-y-3">
                    {(showAllNotes ? data.auditoria : data.auditoria.filter((n) => n.severidad === "alta" || n.severidad === "media")).map((n) => (
                      <li key={n.id} className="rounded-2xl bg-card-muted p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", SEVERITY[n.severidad])}>{n.severidad}</span>
                          <span className="text-xs text-muted">{n.categoria}</span>
                        </div>
                        <p className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-fg">
                          {n.severidad === "alta" ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          ) : (
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                          )}
                          {n.titulo}
                        </p>
                        <p className="mt-1 break-words text-xs leading-relaxed text-muted [overflow-wrap:anywhere]">{n.detalle}</p>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setShowAllNotes((s) => !s)} className="mt-4 text-sm font-medium text-azar hover:text-azar-bright">
                    {showAllNotes ? "Ver solo alertas importantes" : `Ver todas las notas (${data.auditoria.length})`}
                  </button>
                </Card>
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}
