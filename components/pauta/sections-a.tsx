"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { daily, PAISES, PERIODO_LABEL, yJoin } from "@/lib/pauta";
import { formatCompact, formatInt } from "@/lib/format";
import { Flag } from "../Flag";
import { cn } from "../ui";
import { pct, share, type PautaCtx } from "./context";
import { countryKeyOf, HBars, Panel, Section, Stat, Table, Var, VarText, num } from "./parts";


/* ───────────── 1. Resumen ejecutivo ───────────── */
export function Resumen({ c }: { c: PautaCtx }) {
  const { R, f, fmt, money, comp } = c;
  const per = f.periodo;
  const ML = c.isImp ? "Impresiones" : "Consumo";
  const dimW1 = !["all", "w1"].includes(per);
  const dimW2 = !["all", "w2"].includes(per);
  // Textos y hallazgos: siempre en consumo y sin filtros (como el original).
  const A = c.SC("all", "all", "all");
  const CAM = c.SC("all", "all", "CAM");
  const IND = c.SC("all", "all", "Individual");
  const pr = PAISES.map((p) => ({ p, s: c.SC(p, "all", "all") })).sort((a, z) => z.s.total - a.s.total);
  const camAcc = [...new Set(c.rows.filter((r) => r.tipo === "CAM").map((r) => r.cuenta))].sort().map((x) => ({ x, s: c.SC("all", x, "all") })).filter((r) => r.s.var_ritmo !== null);
  const compTxt = yJoin(comp);

  return (
    <Section id="resumen" n={1} title="Resumen ejecutivo" subtitle="Las tarjetas responden a los filtros. Las variaciones usan la base comparable: perfiles con datos en ambas semanas.">
      <div className="card overflow-hidden">
        <p className="bg-brand-gradient p-5 text-sm leading-relaxed text-white sm:p-6 sm:text-base">
          Al 16 de octubre se registran <b>{money(A.total)}</b> sin duplicados. En la semana 2 el ritmo diario de inversión va{" "}
          <b>{pct(A.var_ritmo)}</b> frente a la semana 1 (base comparable: {compTxt}).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat index={0} label={`${ML} 5–11 oct`} value={fmt(R.w1)} period="Semana 1 · 7 días · completa" tip="Suma de todo lo reportado del 5 al 11 de octubre, por día o por semana (P282)." foot={<span className="text-xs text-muted">● Periodo base</span>} dim={dimW1} />
        <Stat
          index={1}
          label={`${ML} 12–16 oct`}
          value={fmt(R.w2)}
          period="Semana 2 · 5 días · parcial"
          tip="Lo reportado del 12 al 16 de octubre. El archivo de P282 llega al 17, pero al corte ese día no ha ocurrido. La variación compara solo perfiles con ambas semanas."
          foot={R.var_pct === null ? undefined : <Var v={R.var_pct} suffix="vs semana 1" />}
          dim={dimW2}
        />
        <Stat
          index={2}
          featured
          label={`${ML} · ${PERIODO_LABEL[per]}`}
          value={fmt(R.get(per))}
          period={per === "all" ? "Acumulado 1–16 oct, sin duplicados" : "Periodo del filtro"}
          foot={<span className="text-xs text-white/70">● Acumulado</span>}
        />
        <Stat
          index={3}
          label="Variación entre semanas"
          value={pct(R.var_ritmo)}
          period="Cambio del promedio diario · base comparable"
          tip="Compara el promedio diario de la semana 2 (5 días) con el de la semana 1 (7 días), solo en perfiles con datos en ambas semanas. Debajo, el cambio de los totales."
          foot={
            <div className="flex flex-wrap gap-1.5">
              {R.var_pct !== null && <Var v={R.var_pct} suffix="en total" />}
              {R.var_ritmo_todas !== null && Math.abs((R.var_ritmo_todas ?? 0) - (R.var_ritmo ?? 0)) > 0.0005 && <Var v={R.var_ritmo_todas} suffix="con P345" />}
            </div>
          }
        />
        <Stat index={4} label="Promedio diario semana 1" value={fmt(R.prom_w1)} period="5–11 oct ÷ 7 días" tip="Total de la semana 1 dividido entre 7 días." foot={<span className="text-xs text-muted">● Periodo base</span>} dim={dimW1} />
        <Stat
          index={5}
          label="Promedio diario semana 2"
          value={fmt(R.prom_w2)}
          period="12–16 oct ÷ 5 días"
          tip="Total de la semana 2 dividido entre 5 días reales (incluye P345). La variación es la del ritmo diario en base comparable."
          foot={R.var_ritmo === null ? undefined : <Var v={R.var_ritmo} suffix="ritmo" />}
          dim={dimW2}
        />
        <Stat index={6} label="Cuentas activas" value={String(R.n_cuentas(per))} period={`Perfiles con consumo · ${PERIODO_LABEL[per]}`} tip="Perfiles con consumo mayor a cero en el periodo." foot={<span className="text-xs text-muted">● Conteo</span>} />
        <Stat index={7} label="Países con inversión" value={String(R.n_paises(per))} period="Costa Rica, Guatemala, Honduras" tip="Países con consumo en el periodo, según el nombre de campaña." foot={<span className="text-xs text-muted">● Conteo</span>} />
      </div>

      <Panel title="Principales hallazgos" subtitle="Sobre el total, sin filtros.">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg marker:text-azar">
          <li>
            Consumo acumulado del 1 al 16 de octubre: <b>{money(A.total)}</b> en <b>{A.n_cuentas("all")}</b> perfiles y <b>{A.n_paises("all")}</b> países.
          </li>
          <li>
            Las cuentas CAM concentran <b>{money(CAM.total)}</b> (<b>{share(CAM.total / (A.total || 1))}</b> del total). Las individuales suman <b>{money(IND.total)}</b>.
          </li>
          <li>
            {pr[0].p} es el país con más inversión: <b>{money(pr[0].s.total)}</b> (<b>{share(pr[0].s.total / (A.total || 1))}</b>). Le siguen {pr[1].p} con <b>{share(pr[1].s.total / (A.total || 1))}</b> y {pr[2].p} con{" "}
            <b>{share(pr[2].s.total / (A.total || 1))}</b>.
          </li>
          <li>
            Base comparable ({compTxt}): la semana 2 lleva <b>{money(A.cc_w2)}</b> en 5 días frente a <b>{money(A.cc_w1)}</b> en 7 días (<b>{pct(A.var_pct)}</b> en total, <b>{pct(A.var_ritmo)}</b> en ritmo diario).
          </li>
          {camAcc.length > 0 && (
            <li>
              Ritmo diario por cuenta:{" "}
              {camAcc.map((r, i) => (
                <span key={r.x}>
                  {i ? "; " : ""}
                  {r.x} <b>{pct(r.s.var_ritmo)}</b>
                </span>
              ))}
              .
            </li>
          )}
          <li>
            Contando también a P345 (nueva en la semana 2), el ritmo diario total va <b>{pct(A.var_ritmo_todas)}</b>: {money(A.prom_w2)} por día frente a {money(A.prom_w1)}.
          </li>
          <li>
            Si el ritmo de la semana 2 se mantiene, cerraría en <b>{money(A.proy_s2)}</b> al 18 de octubre. Proyección estimada, no consumo real.
          </li>
        </ul>
      </Panel>
    </Section>
  );
}

/* ───────────── 2. Semana 1 vs semana 2 ───────────── */
export function Semanal({ c, dark }: { c: PautaCtx; dark: boolean }) {
  const { R, f, fmt, S, comp } = c;
  const unitLab = c.isImp ? "" : ` (${f.currency})`;
  const ctas = c.cuentas.filter((x) => f.cuenta === "all" || x === f.cuenta).map((x) => ({ x, s: S(f.pais, x, f.tipo) }));
  const compRows = ctas.filter((r) => r.s.cc_w1 > 0);
  const fuera = ctas.filter((r) => !(r.s.cc_w1 > 0) && r.s.total > 0);
  const prs = (f.pais === "all" ? PAISES : [f.pais]).map((p) => ({ p, s: S(p, f.cuenta, f.tipo) })).filter((r) => r.s.cc_w1 > 0);
  const mxp = Math.max(1, ...prs.flatMap((r) => [r.s.cc_w1, r.s.cc_w2]));
  const dd = daily(c.rows.filter((r) => (f.pais === "all" || r.pais === f.pais) && (f.cuenta === "all" || r.cuenta === f.cuenta) && (f.tipo === "all" || r.tipo === f.tipo)), f, c.rate);
  const colorOf = (b: string) => (b === "pre" ? (dark ? "#57534E" : "#D6D3D1") : b === "w1" ? "#F59E0B" : "#E85A1E");
  const cols: [string, keyof typeof R | "var_abs"][] = [
    ["Semana 1 · 5–11 oct", "cc_w1"],
    ["Semana 2 · 12–16 oct", "cc_w2"],
    ["Diferencia", "var_abs"],
    ["Variación total", "var_pct"],
    ["Prom. diario S1", "promc_w1"],
    ["Prom. diario S2", "promc_w2"],
    ["Variación ritmo diario", "var_ritmo"],
  ];
  const isPct = (k: string) => k === "var_pct" || k === "var_ritmo";
  const vrow = (key: string, label: React.ReactNode, s: typeof R, foot = false) => (
    <tr key={key}>
      <td className={cn("whitespace-nowrap", foot ? "font-semibold" : "font-medium text-fg")}>{label}</td>
      {cols.map(([, k]) => {
        const v = s[k as keyof typeof s] as number | null;
        return (
          <td key={k} className={num}>
            {isPct(k) ? <VarText v={v} /> : k === "var_abs" ? <span className={cn((v ?? 0) > 0 ? "text-azar" : (v ?? 0) < 0 ? "text-red-600" : "")}>{v === null ? "—" : `${v > 0 ? "+" : ""}${fmt(v)}`}</span> : fmt(v)}
          </td>
        );
      })}
    </tr>
  );
  const head = (first: string) => (
    <>
      <th>{first}</th>
      {cols.map(([l, k]) => (
        <th key={k} className="text-right">
          {l}
          {isPct(k) ? "" : unitLab}
        </th>
      ))}
    </>
  );
  const segs: [keyof typeof R, string, string][] = [
    ["pre", "1–4 oct", dark ? "#57534E" : "#D6D3D1"],
    ["w1", "Semana 1 · 5–11", "#F59E0B"],
    ["w2", "Semana 2 · 12–16", "#E85A1E"],
    ["nosplit", "1–16 sin desglose", "#78350F"],
  ];

  return (
    <Section
      id="semanal"
      n={2}
      title="Comparativo semana 1 vs semana 2"
      subtitle="Semana 1 tiene 7 días; semana 2 tiene 5 días reales (12–16 oct). Por eso se compara el total y también el promedio diario. Solo entran perfiles con reporte en las dos semanas."
    >
      <div className="card grid gap-4 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-6">
        <div>
          <p className="text-sm font-medium text-muted">Semana 1</p>
          <p className="text-xs text-muted">5–11 de octubre · 7 días · completa</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-fg">{fmt(R.cc_w1)}</p>
          <p className="mt-1 text-sm text-muted">
            Promedio diario: <b className="text-fg">{fmt(R.promc_w1)}</b> por día
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-card-muted px-5 py-4 text-center">
          <small className="text-xs text-muted">Ritmo diario</small>
          <Var v={R.var_ritmo} className="px-3 py-1.5 text-base" />
          <span className="text-xs text-muted">
            Total: <VarText v={R.var_pct} />
          </span>
          <span className="text-xs text-muted">
            Diferencia: <b className="text-fg">{R.var_abs === null ? "—" : `${R.var_abs > 0 ? "+" : ""}${fmt(R.var_abs)}`}</b>
          </span>
        </div>
        <div className="sm:text-right">
          <p className="text-sm font-medium text-azar">Semana 2</p>
          <p className="text-xs text-muted">12–16 de octubre · 5 días · parcial</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-fg">{fmt(R.cc_w2)}</p>
          <p className="mt-1 text-sm text-muted">
            Promedio diario: <b className="text-fg">{fmt(R.promc_w2)}</b> por día
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted sm:col-span-3">
          {R.cc_w1 > 0 ? (
            <>
              La semana 2 lleva <b className="text-fg">{fmt(R.cc_w2)}</b> en 5 días, <b className="text-fg">{pct(R.var_pct)}</b> {(R.var_pct ?? 0) >= 0 ? "por encima de" : "frente a"} la semana 1 completa. Por día invierte{" "}
              <b className="text-fg">{pct(R.var_ritmo)}</b> {(R.var_ritmo ?? 0) >= 0 ? "más" : "menos"} que en la semana 1. Si mantiene ese ritmo, cerraría el 18 de octubre en <b className="text-fg">{fmt(R.proy_s2)}</b> (proyección estimada, no consumo real).
            </>
          ) : (
            "Con los filtros actuales no hay perfiles con datos en las dos semanas."
          )}
        </p>
      </div>

      <Panel title="Por país · semana 1 vs semana 2">
        {prs.length === 0 ? (
          <p className="text-sm text-muted">Sin perfiles comparables con este filtro.</p>
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {prs.map(({ p, s }) => (
                <div key={p} className="rounded-2xl bg-card-muted p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <Flag country={countryKeyOf(p)} size={20} />
                      {p}
                    </span>
                    <Var v={s.var_ritmo} suffix="ritmo" />
                  </div>
                  <div className="mt-3">
                    <HBars
                      max={mxp}
                      items={[
                        { key: "s1", label: "Sem. 1", value: s.cc_w1, text: fmt(s.cc_w1), color: "#F59E0B" },
                        { key: "s2", label: "Sem. 2", value: s.cc_w2, text: fmt(s.cc_w2) },
                      ]}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Total <VarText v={s.var_pct} /> · por día {fmt(s.promc_w1)} → {fmt(s.promc_w2)}
                  </p>
                </div>
              ))}
            </div>
            <Table minWidth={920} head={head("País")} foot={prs.length > 1 ? vrow("tot", "Total comparable", S("all", f.cuenta, f.tipo), true) : undefined}>
              {prs.map(({ p, s }) =>
                vrow(
                  p,
                  <span className="flex items-center gap-2">
                    <Flag country={countryKeyOf(p)} size={16} />
                    {p}
                  </span>,
                  s,
                ),
              )}
            </Table>
          </>
        )}
      </Panel>

      <Panel title="Por cuenta · semana 1 vs semana 2">
        <Table minWidth={920} head={head("Cuenta")} foot={compRows.length > 1 ? vrow("tot", "Total comparable", R, true) : undefined}>
          {compRows.map(({ x, s }) => vrow(x, x, s))}
        </Table>
        <p className="mt-3 text-xs text-muted">
          Base comparable: {compRows.map((r) => r.x).join(", ") || "ninguna con este filtro"}. Fuera de la comparación:{" "}
          {fuera.map((r) => `${r.x} (${r.s.nota_var.toLowerCase()})`).join(", ") || "ninguna"}. Variación ritmo diario = promedio diario semana 2 (÷5) vs semana 1 (÷7).
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={`${c.isImp ? "Impresiones" : "Inversión"} diaria${c.isImp ? "" : ` (${f.currency})`}`} subtitle="Todos los perfiles con reporte diario. P282 llega por semana y no aparece aquí.">
          {dd.some((d) => d.value > 0) ? (
            <>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dd} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="18%">
                    <CartesianGrid vertical={false} stroke={dark ? "#222" : "#EEF0F2"} strokeDasharray="4 4" />
                    <XAxis dataKey="dia" tickFormatter={(d: string) => String(Number(d.slice(8)))} tick={{ fill: dark ? "#9CA3AF" : "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v: number) => (c.isImp ? formatInt(Math.round(v / 1000)) + "k" : formatCompact(v, f.currency))}
                      tick={{ fill: dark ? "#9CA3AF" : "#6B7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(10,10,10,0.04)" }}
                      wrapperStyle={{ outline: "none", zIndex: 30 }}
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-xl">
                            <p className="text-white/60">{Number(String(payload[0].payload.dia).slice(8))} de octubre</p>
                            <p className="tabular font-semibold">{c.isImp ? `${formatInt(Number(payload[0].value))} impresiones` : fmt(Number(payload[0].value))}</p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={36}>
                      {dd.map((d) => (
                        <Cell key={d.dia} fill={colorOf(d.bucket)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                {[
                  ["pre", "1–4 oct"],
                  ["w1", "Semana 1 · 5–11"],
                  ["w2", "Semana 2 · 12–16"],
                ].map(([b, l]) => (
                  <span key={b} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(b) }} />
                    {l}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">El filtro actual no tiene perfiles con reporte diario.</p>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title={`${c.isImp ? "Impresiones" : "Consumo"} por semana`} subtitle="La barra punteada es una proyección estimada, no consumo real.">
            <HBars
              items={[
                { key: "w1", label: "Semana 1", sub: "5–11 oct · 7 días", value: R.w1, text: fmt(R.w1), color: "#F59E0B" },
                { key: "w2", label: "Semana 2 (parcial)", sub: "12–16 oct · 5 días", value: R.w2, text: fmt(R.w2) },
                { key: "pr", label: "Proyección al 18 oct", sub: "Estimada, no real", value: R.proy_s2, text: fmt(R.proy_s2), dashed: true },
              ]}
            />
          </Panel>
          <Panel title="Promedio diario (ritmo de inversión)" subtitle="Semana 1 ÷ 7 días y semana 2 ÷ 5 días. El 16 es día en curso a la hora de exportación.">
            <HBars
              items={[
                { key: "p1", label: "Semana 1", sub: "por día", value: R.prom_w1, text: fmt(R.prom_w1), color: "#F59E0B" },
                { key: "p2", label: "Semana 2", sub: "por día", value: R.prom_w2, text: fmt(R.prom_w2) },
              ]}
            />
            <p className="mt-3 text-xs text-muted">
              Diferencia de ritmo (base comparable): <b className="text-fg">{R.dif_ritmo === null ? "—" : `${R.dif_ritmo > 0 ? "+" : ""}${fmt(R.dif_ritmo)}`}</b> {c.unit} por día (<VarText v={R.var_ritmo} />).
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Base comparable" subtitle={`Solo perfiles con consumo en ambas semanas: ${yJoin(comp)}. Fuera: ${c.cuentas.map((x) => ({ x, s: S("all", x, "all") })).filter((r) => r.s.nota_var).map((r) => `${r.x} (${r.s.nota_var.toLowerCase()})`).join(", ") || "ninguno"}.`}>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["Semana 1", fmt(R.cc_w1)],
                ["Semana 2", fmt(R.cc_w2)],
                ["Cambio absoluto", R.var_abs === null ? "—" : `${R.var_abs > 0 ? "+" : ""}${fmt(R.var_abs)}`],
                ["Variación total", pct(R.var_pct)],
                ["Promedio diario S1", fmt(R.promc_w1)],
                ["Promedio diario S2", fmt(R.promc_w2)],
                ["Variación ritmo diario", pct(R.var_ritmo)],
              ] as const
            ).map(([l, v]) => (
              <div key={l} className="rounded-xl bg-card-muted px-3 py-2.5">
                <dt className="text-[11px] text-muted">{l}</dt>
                <dd className="tabular mt-0.5 text-sm font-semibold text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title={`Composición del acumulado de octubre al 16 · ${c.isImp ? "impresiones" : "consumo"}`} subtitle="Qué parte del acumulado viene de cada periodo.">
          <div className="flex h-8 overflow-hidden rounded-xl">
            {segs.map(([k, , col]) => (
              <div key={k} style={{ width: `${R.total ? ((R[k] as number) / R.total) * 100 : 0}%`, background: col }} className="transition-all duration-700" />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
            {segs
              .filter(([k]) => (R[k] as number) > 0)
              .map(([k, l, col]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: col }} />
                  {l} <b className="tabular text-fg">{fmt(R[k] as number)}</b> ({share((R[k] as number) / (R.total || 1))})
                </span>
              ))}
          </div>
        </Panel>
      </div>
    </Section>
  );
}

/* ───────────── 3. Consumo por país ───────────── */
export function PorPais({ c, onPais }: { c: PautaCtx; onPais: (p: string) => void }) {
  const { f, fmt, S } = c;
  const ML = c.isImp ? "Impresiones" : "Consumo";
  const unitLab = c.isImp ? "" : ` (${f.currency})`;
  const list = (f.pais === "all" ? PAISES : [f.pais]).map((p) => ({ p, s: S(p, f.cuenta, f.tipo) }));
  const grand = S("all", "all", "all");
  const totTitle = f.periodo === "all" ? "Total octubre" : `Total · ${PERIODO_LABEL[f.periodo]}`;
  const row = (key: string, label: React.ReactNode, s: ReturnType<typeof S>, foot = false) => (
    <tr key={key} className={cn(!foot && "cursor-pointer")} onClick={foot ? undefined : () => onPais(key)}>
      <td className="font-medium text-fg">{label}</td>
      <td className={num}>{fmt(s.w1)}</td>
      <td className={num}>{fmt(s.w2)}</td>
      <td className={num}>{fmt(s.pre + s.nosplit)}</td>
      <td className={cn(num, "font-semibold text-fg")}>{fmt(s.get(f.periodo))}</td>
      <td className={num}>
        <VarText v={s.var_ritmo} fallback={s.nota_var} />
      </td>
    </tr>
  );
  return (
    <Section id="pais" n={3} title="Consumo por país" subtitle="País tomado del nombre de campaña (API (CAM) CR / GT / HN, TRAFICO CR / GT) y, si la campaña no lo dice, del archivo y la etiqueta del perfil.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel
          title={`${ML} por país · ${PERIODO_LABEL[f.periodo]}`}
          subtitle={`${f.cuenta === "all" ? "Todas las cuentas" : f.cuenta}${f.tipo === "all" ? "" : f.tipo === "CAM" ? " · solo CAM" : " · solo individuales"}.`}
        >
          <HBars
            items={list.map(({ p, s }) => ({
              key: p,
              label: (
                <span className="flex items-center gap-1.5">
                  <Flag country={countryKeyOf(p)} size={14} />
                  {p}
                </span>
              ),
              sub: `${share(s.get(f.periodo) / (grand.get(f.periodo) || 1))} del total general`,
              value: s.get(f.periodo),
              text: fmt(s.get(f.periodo)),
              color: p === "Costa Rica" ? "#F59E0B" : p === "Guatemala" ? "#A0522D" : "#0A0A0A",
            }))}
          />
        </Panel>
        <Panel title="Por semana" subtitle={'Variación = cambio del promedio diario, base comparable. "1–4 oct" = consumo real antes de la semana 1 (P287 y P321, que iniciaron el 1 de octubre). Clic en un país para filtrar.'}>
          <Table
            minWidth={620}
            head={
              <>
                <th>País</th>
                <th className="text-right">5–11 oct{unitLab}</th>
                <th className="text-right">12–16 oct{unitLab}</th>
                <th className="text-right">1–4 oct{unitLab}</th>
                <th className="text-right">
                  {totTitle}
                  {unitLab}
                </th>
                <th className="text-right">Variación</th>
              </>
            }
            foot={f.pais === "all" ? row("total", "Total", S("all", f.cuenta, f.tipo), true) : undefined}
          >
            {list.map(({ p, s }) =>
              row(
                p,
                <span className="flex items-center gap-2">
                  <Flag country={countryKeyOf(p)} size={16} />
                  {p}
                </span>,
                s,
              ),
            )}
          </Table>
          <p className="mt-3 text-xs text-muted">Todas las filas tienen país identificado; no hay consumo en &quot;País por confirmar&quot;.</p>
        </Panel>
      </div>
    </Section>
  );
}

/* ───────────── 4. Consumo por cuenta ───────────── */
type SortBy = "desc" | "asc" | "var" | "pais" | "cuenta";

export function PorCuenta({ c, onCuenta }: { c: PautaCtx; onCuenta: (x: string) => void }) {
  const { f, fmt, S } = c;
  const [sortBy, setSortBy] = useState<SortBy>("desc");
  const unitLab = c.isImp ? "" : ` (${f.currency})`;
  const all = c.cuentas.filter((x) => f.cuenta === "all" || x === f.cuenta);
  const rows = all
    .map((x) => {
      const s = S(f.pais, x, f.tipo);
      const g = S("all", x, "all");
      const tipo = c.rows.find((r) => r.cuenta === x)?.tipo;
      const tipoTxt = tipo === "CAM" ? (g.paises.length > 1 ? "Cuenta CAM · múltiples países" : "Cuenta CAM") : "Cuenta individual";
      return { x, s, tipo, tipoTxt };
    })
    .filter((r) => r.s.total > 0);
  const sorters: Record<SortBy, (a: (typeof rows)[0], z: (typeof rows)[0]) => number> = {
    desc: (a, z) => z.s.get(f.periodo) - a.s.get(f.periodo),
    asc: (a, z) => a.s.get(f.periodo) - z.s.get(f.periodo),
    var: (a, z) => (z.s.var_ritmo ?? -Infinity) - (a.s.var_ritmo ?? -Infinity),
    pais: (a, z) => a.s.paises.join().localeCompare(z.s.paises.join()) || a.x.localeCompare(z.x),
    cuenta: (a, z) => a.x.localeCompare(z.x, "es", { numeric: true }),
  };
  rows.sort(sorters[sortBy]);
  const ma = Math.max(1, ...rows.map((r) => r.s.get(f.periodo)));
  return (
    <Section id="cuenta" n={4} title="Consumo por cuenta" subtitle="Un perfil por fila. País = países con consumo en sus campañas. Clic en una fila para filtrar.">
      <Panel
        right={
          <label className="flex items-center gap-2 text-xs text-muted">
            Ordenar por
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="rounded-xl border border-line bg-card px-2 py-1.5 text-sm text-fg outline-none">
              <option value="desc">Mayor consumo</option>
              <option value="asc">Menor consumo</option>
              <option value="var">Mayor variación</option>
              <option value="pais">País</option>
              <option value="cuenta">Cuenta</option>
            </select>
          </label>
        }
        title="Cuentas"
      >
        <Table
          minWidth={860}
          head={
            <>
              <th>Cuenta</th>
              <th>Tipo</th>
              <th>País</th>
              <th className="text-right">5–11 oct{unitLab}</th>
              <th className="text-right">12–16 oct{unitLab}</th>
              <th className="text-right">
                {f.periodo === "all" ? "Total octubre" : `Total · ${PERIODO_LABEL[f.periodo]}`}
                {unitLab}
              </th>
              <th className="text-right">Variación</th>
            </>
          }
        >
          {rows.map(({ x, s, tipo, tipoTxt }) => (
            <tr key={x} onClick={() => onCuenta(x)} className={cn("cursor-pointer", f.cuenta === x && "bg-azar-50 dark:bg-azar/10")}>
              <td className="whitespace-nowrap font-semibold text-fg">{x}</td>
              <td>
                <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", tipo === "CAM" ? "bg-azar-50 text-azar dark:bg-azar/15 dark:text-azar-200" : "bg-card-muted text-muted ring-1 ring-line")}>{tipoTxt}</span>
              </td>
              <td>
                <span className="flex flex-wrap gap-1">
                  {s.paises.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 rounded-full bg-card-muted px-2 py-0.5 text-[11px] text-muted ring-1 ring-line">
                      <Flag country={countryKeyOf(p)} size={12} />
                      {p}
                    </span>
                  ))}
                </span>
              </td>
              <td className={num}>{s.w1 ? fmt(s.w1) : "—"}</td>
              <td className={num}>{s.w2 ? fmt(s.w2) : "—"}</td>
              <td className={num}>
                <span className="inline-flex items-center justify-end gap-2">
                  <i className="inline-block h-2 rounded-full bg-gradient-to-r from-azar to-azar-bright" style={{ width: Math.round((s.get(f.periodo) / ma) * 60) }} />
                  <b className="text-fg">{fmt(s.get(f.periodo))}</b>
                </span>
              </td>
              <td className={num}>
                <VarText v={s.var_ritmo} fallback={s.nota_var} />
              </td>
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-xs text-muted">Variación = cambio del promedio diario entre semanas. &quot;Nueva en semana 2&quot; = sin consumo en la semana 1 (P345), suma en los totales pero no tiene base para la variación.</p>
      </Panel>
    </Section>
  );
}


