"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { formatCompact, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { Flag } from "../Flag";
import { cn } from "../ui";
import type { PautaCtx } from "./context";
import { countryKeyOf, Panel, Section, Table, num } from "./parts";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;

interface Fila {
  key: string;
  pais: string;
  presupuesto: { usd: number; uyu: number };
  consumo: { usd: number; uyu: number };
  ejecutado: number;
  proyeccion: { usd: number; uyu: number };
}

/** Gráfico de barras agrupadas: presupuesto del mes contra consumo al corte, en una moneda. */
function GraficoPresupuesto({ filas, currency, dark }: { filas: Fila[]; currency: Currency; dark: boolean }) {
  const k = currency === "USD" ? "usd" : "uyu";
  const data = filas.map((f) => ({ pais: f.pais, presupuesto: f.presupuesto[k], consumo: f.consumo[k], ejecutado: f.ejecutado }));
  const axis = dark ? "#9CA3AF" : "#6B7280";
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 4, left: 4, bottom: 0 }} barGap={4} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={dark ? "#222" : "#EEF0F2"} strokeDasharray="4 4" />
          <XAxis dataKey="pais" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v: number) => formatCompact(v, currency)} tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} width={currency === "UYU" ? 64 : 52} />
          <Tooltip
            cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(10,10,10,0.04)" }}
            wrapperStyle={{ outline: "none", zIndex: 30 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[0];
              return (
                <div className="min-w-[200px] rounded-2xl bg-ink px-4 py-3 text-xs text-white shadow-2xl ring-1 ring-white/10">
                  <p className="font-medium">{String(label)}</p>
                  <div className="mt-2 flex justify-between gap-6">
                    <span className="text-white/70">Presupuesto</span>
                    <span className="tabular">{formatMoney(d.presupuesto, currency)}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-white/70">Consumido</span>
                    <span className="tabular">{formatMoney(d.consumo, currency)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-6 border-t border-white/10 pt-1 font-semibold">
                    <span>Ejecutado</span>
                    <span className="tabular">{pct(d.ejecutado)}</span>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="presupuesto" name="Presupuesto" fill={dark ? "#3F3F46" : "#D6D3D1"} radius={[6, 6, 0, 0]} maxBarSize={56} />
          <Bar dataKey="consumo" name="Consumido" fill="#E85A1E" radius={[6, 6, 0, 0]} maxBarSize={56}>
            <LabelList dataKey="ejecutado" position="top" formatter={(v: unknown) => pct(Number(v))} style={{ fill: dark ? "#F5F5F5" : "#0A0A0A", fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ───────────── 2. Presupuesto vs consumo ───────────── */
export function PresupuestoVsConsumo({ c, dark }: { c: PautaCtx; dark: boolean }) {
  const { f, data } = c;
  const P = data.presupuesto;
  const tasa = P.tipoCambio.uyuPorUsd;
  // El presupuesto es mensual: se compara con todo lo consumido en octubre (no aplica el filtro de periodo).
  const rows = c.rows.filter((r) => (f.cuenta === "all" || r.cuenta === f.cuenta) && (f.tipo === "all" || r.tipo === f.tipo));
  const diasMes = diasEntre(P.desde, P.hasta);
  const diasCorte = diasEntre(P.desde, data.corte);
  const ritmo = diasCorte / diasMes;

  const paises = P.paises.filter((p) => f.pais === "all" || p.pais === f.pais);
  const filas: Fila[] = paises.map((p) => {
    const uyu = rows.filter((r) => r.pais === p.pais).reduce((a, r) => a + r.consumo, 0);
    return {
      key: countryKeyOf(p.pais),
      pais: p.pais,
      presupuesto: { usd: p.usd, uyu: p.uyu },
      consumo: { usd: uyu / tasa, uyu },
      ejecutado: p.uyu ? uyu / p.uyu : 0,
      proyeccion: { usd: ((uyu / diasCorte) * diasMes) / tasa, uyu: (uyu / diasCorte) * diasMes },
    };
  });
  const sum = (fn: (x: Fila) => number) => filas.reduce((a, x) => a + fn(x), 0);
  const tot: Fila = {
    key: "TOTAL",
    pais: "Total",
    presupuesto: { usd: sum((x) => x.presupuesto.usd), uyu: sum((x) => x.presupuesto.uyu) },
    consumo: { usd: sum((x) => x.consumo.usd), uyu: sum((x) => x.consumo.uyu) },
    ejecutado: 0,
    proyeccion: { usd: sum((x) => x.proyeccion.usd), uyu: sum((x) => x.proyeccion.uyu) },
  };
  tot.ejecutado = tot.presupuesto.uyu ? tot.consumo.uyu / tot.presupuesto.uyu : 0;
  const conTotal = filas.length > 1 ? [...filas, tot] : filas;
  const alcance = f.cuenta !== "all" ? `cuenta ${f.cuenta}` : f.tipo === "CAM" ? "solo cuentas CAM" : f.tipo === "Individual" ? "solo cuentas individuales" : "todas las cuentas (CAM e individuales)";

  return (
    <Section
      id="presupuesto"
      n={2}
      title="Presupuesto vs consumo"
      subtitle={`${P.titulo}. Consumo del 1 al ${Number(data.corte.slice(8))} de octubre (${alcance}). Al corte pasaron ${diasCorte} de ${diasMes} días: el ritmo esperado es ${pct(ritmo)} del presupuesto.`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { l: "Presupuesto octubre", usd: tot.presupuesto.usd, uyu: tot.presupuesto.uyu, sub: `${filas.length === 1 ? filas[0].pais : "CR 60% · GT 30% · HN 10%"}` },
          { l: `Consumido al ${Number(data.corte.slice(8))} oct`, usd: tot.consumo.usd, uyu: tot.consumo.uyu, sub: `${pct(tot.ejecutado)} ejecutado · ritmo esperado ${pct(ritmo)}`, main: true },
          { l: "Disponible", usd: tot.presupuesto.usd - tot.consumo.usd, uyu: tot.presupuesto.uyu - tot.consumo.uyu, sub: `Proyección al 31 oct: ${formatMoney(tot.proyeccion.uyu, "UYU")} (${pct(tot.proyeccion.uyu / (tot.presupuesto.uyu || 1))})` },
        ].map((k) => (
          <div key={k.l} className="card overflow-hidden">
            <div className={cn("h-full p-5", k.main && "bg-brand-gradient text-white")}>
              <p className={cn("text-sm font-medium", k.main ? "text-white/85" : "text-muted")}>{k.l}</p>
              <p className={cn("mt-2 text-2xl font-bold tracking-tight", !k.main && "text-fg")}>{formatMoney(k.usd, "USD")}</p>
              <p className={cn("text-base font-semibold", k.main ? "text-white/85" : "text-fg")}>{formatMoney(k.uyu, "UYU")}</p>
              <p className={cn("mt-2 text-xs", k.main ? "text-white/70" : "text-muted")}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["USD", "UYU"] as Currency[]).map((cur) => (
          <Panel
            key={cur}
            title={cur === "USD" ? "Gasto vs presupuesto · dólares" : "Gasto vs presupuesto · pesos uruguayos"}
            subtitle={cur === "USD" ? `Consumo convertido a USD con la tasa del presupuesto (${tasa} UYU).` : "Montos en UYU, moneda de Meta."}
            right={
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: dark ? "#3F3F46" : "#D6D3D1" }} /> Presupuesto
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-sm bg-azar" /> Consumido
                </span>
              </div>
            }
          >
            <GraficoPresupuesto filas={conTotal} currency={cur} dark={dark} />
          </Panel>
        ))}
      </div>

      <Panel title="Avance por país" subtitle={`La línea marca el ritmo esperado al ${Number(data.corte.slice(8))} de octubre (${pct(ritmo)}). Por debajo = se está invirtiendo más lento que el plan.`}>
        <div className="space-y-4">
          {conTotal.map((x, i) => {
            const atrasado = x.ejecutado < ritmo;
            return (
              <div key={x.key}>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-fg">
                    {x.key !== "TOTAL" && <Flag country={x.key} size={18} />}
                    {x.pais}
                  </span>
                  <span className="tabular text-xs text-muted">
                    {formatMoney(x.consumo.uyu, "UYU")} de {formatMoney(x.presupuesto.uyu, "UYU")} · {formatMoney(x.consumo.usd, "USD")} de {formatMoney(x.presupuesto.usd, "USD")} ·{" "}
                    <b className={cn(atrasado ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                      {atrasado ? "▼" : "▲"} {pct(x.ejecutado)}
                    </b>
                  </span>
                </div>
                <div className="relative h-3 rounded-full bg-card-muted">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-azar to-azar-bright"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, x.ejecutado * 100)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <span className="absolute -bottom-1 -top-1 border-l-2 border-dashed border-fg/60" style={{ left: `${ritmo * 100}%` }} aria-hidden />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Detalle en ambas monedas">
        <Table
          minWidth={980}
          head={
            <>
              <th>País</th>
              <th className="text-right">Distribución</th>
              <th className="text-right">Presupuesto (USD)</th>
              <th className="text-right">Consumido (USD)</th>
              <th className="text-right">Presupuesto (UYU)</th>
              <th className="text-right">Consumido (UYU)</th>
              <th className="text-right">Disponible (UYU)</th>
              <th className="text-right">% ejecutado</th>
              <th className="text-right">Proyección al 31 oct (UYU)</th>
            </>
          }
          foot={
            filas.length > 1 ? (
              <tr>
                <td>Total</td>
                <td className={num}>{pct(paises.reduce((a, p) => a + p.distribucion, 0))}</td>
                <td className={num}>{formatMoney(tot.presupuesto.usd, "USD")}</td>
                <td className={num}>{formatMoney(tot.consumo.usd, "USD")}</td>
                <td className={num}>{formatMoney(tot.presupuesto.uyu, "UYU")}</td>
                <td className={num}>{formatMoney(tot.consumo.uyu, "UYU")}</td>
                <td className={num}>{formatMoney(tot.presupuesto.uyu - tot.consumo.uyu, "UYU")}</td>
                <td className={num}>{pct(tot.ejecutado)}</td>
                <td className={num}>
                  {formatMoney(tot.proyeccion.uyu, "UYU")} ({pct(tot.proyeccion.uyu / (tot.presupuesto.uyu || 1))})
                </td>
              </tr>
            ) : undefined
          }
        >
          {filas.map((x) => {
            const p = paises.find((y) => y.pais === x.pais)!;
            return (
              <tr key={x.key}>
                <td className="whitespace-nowrap">
                  <span className="flex items-center gap-2 font-medium text-fg">
                    <Flag country={x.key} size={16} />
                    {x.pais}
                  </span>
                </td>
                <td className={num}>{pct(p.distribucion)}</td>
                <td className={num}>{formatMoney(x.presupuesto.usd, "USD")}</td>
                <td className={num}>{formatMoney(x.consumo.usd, "USD")}</td>
                <td className={num}>{formatMoney(x.presupuesto.uyu, "UYU")}</td>
                <td className={num}>{formatMoney(x.consumo.uyu, "UYU")}</td>
                <td className={num}>{formatMoney(x.presupuesto.uyu - x.consumo.uyu, "UYU")}</td>
                <td className={cn(num, "font-semibold", x.ejecutado < ritmo ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                  {x.ejecutado < ritmo ? "▼" : "▲"} {pct(x.ejecutado)}
                </td>
                <td className={num}>
                  {formatMoney(x.proyeccion.uyu, "UYU")} ({pct(x.proyeccion.uyu / (x.presupuesto.uyu || 1))})
                </td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-3 border-l-2 border-line pl-3 text-xs text-muted">
          El presupuesto es mensual, por eso esta sección usa todo lo consumido en octubre aunque el filtro de periodo esté en una semana. Responde a los filtros de país, cuenta y tipo. Proyección = promedio diario al corte × {diasMes} días; es una estimación,
          no consumo real.
        </p>
      </Panel>
    </Section>
  );
}
