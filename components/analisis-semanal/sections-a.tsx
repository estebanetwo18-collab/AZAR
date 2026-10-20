"use client";

import { Fragment, type ReactNode } from "react";
import { ok, share, variacion } from "@/lib/analisis-semanal/calc";
import { countryColor } from "@/lib/countries";
import { cn } from "../ui";
import { Panel, Section, Table, num } from "../pauta/parts";
import type { AggK, Ctx } from "./context";
import { delta } from "./format";
import { AccSwatch, AccTag, accFill, Hint, PAIS_NOMBRE, PaisTag, Rich, Tag } from "./shared";
import { DistBar, Funnel } from "./viz";

const PAISES = ["CR", "GT", "HN"];

/** Texto de variación con flecha (además del color). */
function DeltaText({ v, lowerIsBetter }: { v: number | null | undefined; lowerIsBetter?: boolean }) {
  const d = delta(v, lowerIsBetter);
  return (
    <span className={cn("tabular text-xs font-medium", d.good === true && "text-emerald-600 dark:text-emerald-400", d.good === false && "text-red-600 dark:text-red-400", d.good === null && "text-muted")}>
      {d.text}
    </span>
  );
}

/* ───────────── 01 Resumen ───────────── */
export function Resumen({ c }: { c: Ctx }) {
  const { data, fmt, TOT, PA, CU, CMP, calc } = c;
  const s = data.meta.semana;
  const dTxt = (k: keyof NonNullable<typeof CMP>, lower = false) => (CMP ? <DeltaText v={CMP[k]} lowerIsBetter={lower} /> : <span className="text-xs text-muted">Sin semana anterior</span>);
  const K: [string, string, ReactNode, boolean?][] = [
    ["Inversión total", fmt.money(TOT.gasto), dTxt("gasto"), true],
    ["Registros", fmt.int(TOT.registros), dTxt("registros")],
    ["Costo por registro", fmt.money(TOT.cpr), dTxt("cpr", true), true],
    ["Impresiones", fmt.int(TOT.impresiones), dTxt("impresiones")],
    ["Alcance (sumado)", fmt.int(TOT.alcance), <span key="a" className="text-xs text-muted">Puede duplicar personas</span>],
    ["CPM", fmt.money(TOT.cpm), dTxt("cpm", true)],
    ["CTR (todos)", fmt.pct100(TOT.ctr), <span key="c" className="text-xs text-muted">Ponderado por impresiones</span>],
  ];
  const po = PAISES.map((k) => PA.find((p) => p.k === k)).filter(Boolean) as AggK[];
  const segs = (rows: AggK[], campo: "gasto" | "registros", style: (k: string) => React.CSSProperties, label: string) =>
    rows.map((r) => ({
      key: r.k,
      label: r.k,
      share: share(r[campo], TOT[campo]) ?? 0,
      style: style(r.k),
      tip: (
        <>
          <b className="block">{r.k}</b>
          {label}: {fmt.pct(share(r[campo], TOT[campo]))}
          <br />
          {campo === "gasto" ? fmt.money(r.gasto) : `${fmt.int(r.registros)} registros`}
        </>
      ),
    }));
  const paisStyle = (k: string) => ({ background: countryColor(k, 0, c.dark), color: k === "HN" && !c.dark ? "#fff" : undefined });
  const sub = calc.agregar(calc.ADS.filter((a) => calc.cuentasConClics.has(a.cuenta)));
  const conClics = [...calc.cuentasConClics].join(", ");
  const sinClics = CU.filter((x) => !calc.cuentasConClics.has(x.k));
  const anterior = (() => {
    const [y, m, d] = s.inicio.split("-").map(Number);
    const a = new Date(Date.UTC(y, m - 1, d - 7));
    const b = new Date(Date.UTC(y, m - 1, d - 1));
    const f = (x: Date) => `${x.getUTCDate()}`;
    return `del ${f(a)} al ${f(b)} de ${new Intl.DateTimeFormat("es", { month: "long", timeZone: "UTC" }).format(b)}`;
  })();

  return (
    <Section
      id="resumen"
      n={1}
      title="Resumen de la semana"
      subtitle={
        <>
          {s.desde} al {s.hasta} · {TOT.n} anuncios en {CU.length} cuentas y {PA.length} países.
          <br />
          <span className="text-xs">
            {fmt.currency === "USD"
              ? `Montos en USD a ${fmt.rate.toFixed(2)} UYU por dólar (tasa de referencia, editable arriba). Montos originales en UYU.`
              : "Montos en UYU, moneda del reporte. Cambia a USD arriba."}
          </span>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-4 xl:grid-cols-7">
        {K.map(([l, v, d, main], i) => (
          <div key={l} className={cn("flex min-w-0 flex-col gap-1 bg-card p-4", i === K.length - 1 && "col-span-2 sm:col-span-1")}>
            <span className="text-xs text-muted">{l}</span>
            <span className={cn("tabular truncate text-xl font-bold tracking-tight sm:text-2xl", main ? "text-azar" : "text-fg")}>{v}</span>
            {d}
          </div>
        ))}
      </div>

      {c.prev ? (
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4 text-sm text-muted">
          <Tag kind="good">Activa</Tag>
          <span>
            Comparación contra <b className="text-fg">{c.prev.etiqueta}</b> activa. Las variaciones se ven en los KPIs, por país y por cuenta.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
          <Tag kind="mut">Pendiente</Tag>
          <span>
            <b className="text-fg">Comparación semanal.</b> Los indicadores de variación se activan cuando se cargue el análisis de la semana {anterior} (sin semana anterior). No se calculan comparaciones con una sola semana.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Gasto contra registros">
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            {PAISES.map((p) => (
              <PaisTag key={p} p={p} dark={c.dark} />
            ))}
            {CU.map((x) => (
              <AccTag key={x.k} id={x.k} />
            ))}
          </div>
          <div className="space-y-3.5">
            <p className="text-[11px] uppercase tracking-wide text-muted">Por país</p>
            <DistBar label="Gasto" segments={segs(po, "gasto", paisStyle, "Gasto")} />
            <DistBar label="Registros" segments={segs(po, "registros", paisStyle, "Registros")} />
            <p className="pt-1 text-[11px] uppercase tracking-wide text-muted">Por cuenta</p>
            <DistBar label="Gasto" segments={segs(CU, "gasto", accFill, "Gasto")} />
            <DistBar label="Registros" segments={segs(CU, "registros", accFill, "Registros")} />
          </div>
          <p className="mt-4 border-l-2 border-line pl-3 text-xs text-muted">
            Cada barra suma 100 %. Si un segmento es más ancho en «Gasto» que en «Registros», ese país o cuenta consume más presupuesto del que convierte.
          </p>
        </Panel>
        <Panel title="Embudo">
          <Funnel
            steps={[
              { label: "Impresiones", value: sub.impresiones, text: fmt.int(sub.impresiones), tip: <>{fmt.int(sub.impresiones)} · {conClics}</> },
              {
                label: "Clics en el enlace",
                value: sub.clics,
                text: fmt.int(sub.clics),
                conv: `${fmt.pct(sub.clics / sub.impresiones)} de las impresiones hacen clic (CTR de enlace)`,
                tip: <>{fmt.int(sub.clics)} · {conClics}</>,
              },
              {
                label: "Registros",
                value: sub.registros,
                text: fmt.int(sub.registros),
                conv: `${fmt.pct(sub.registros / sub.clics)} de los clics se registran`,
                tip: <>{fmt.int(sub.registros)} · {conClics}</>,
              },
            ]}
          />
          <p className="mt-4 border-l-2 border-line pl-3 text-xs text-muted">
            {sinClics.length ? (
              <>
                Solo {conClics}: {sinClics.map((x) => x.k).join(", ")} no trae «Clics en el enlace». CPC de enlace: <b className="tabular text-fg">{fmt.money(sub.cpcEnlace)}</b>.
              </>
            ) : (
              <>
                Incluye las tres cuentas: P282 ya trae «Clics en el enlace» en la exportación nueva. CPC de enlace consolidado: <b className="tabular text-fg">{fmt.money(sub.cpcEnlace)}</b>.
              </>
            )}
          </p>
        </Panel>
      </div>

      <Panel title="Comportamiento de la semana">
        <ol className="space-y-2.5">
          {data.contenido.puntosSemana.map((t, i) => (
            <li key={i} className="grid grid-cols-[22px_1fr] gap-2 text-sm leading-relaxed text-muted">
              <b className="font-mono font-medium text-azar">{i + 1}</b>
              <span>
                <Rich text={t} fmt={fmt} />
              </span>
            </li>
          ))}
        </ol>
      </Panel>
    </Section>
  );
}

/* Tabla agregada (país o cuenta) con marca de más y menos eficiente y variación si hay semana anterior. */
function TablaAgg({ c, rows, prevRows, primera, etiqueta }: { c: Ctx; rows: AggK[]; prevRows?: AggK[]; primera: string; etiqueta: (k: string) => ReactNode }) {
  const { fmt, TOT } = c;
  const finite = rows.filter((r) => ok(r.cpr));
  const best = [...finite].sort((a, b) => (a.cpr as number) - (b.cpr as number))[0];
  const worst = [...finite].sort((a, b) => (b.cpr as number) - (a.cpr as number))[0];
  const prevOf = (k: string) => prevRows?.find((p) => p.k === k);
  const conPrev = !!prevRows;
  return (
    <Table
      minWidth={conPrev ? 1180 : 960}
      head={
        <>
          <th>{primera}</th>
          <th className="text-right">Inversión</th>
          {conPrev && <th className="text-right">Var. inversión</th>}
          <th className="text-right">% gasto</th>
          <th className="text-right">Registros</th>
          {conPrev && <th className="text-right">Var. registros</th>}
          <th className="text-right">% registros</th>
          <th className="text-right">Costo / registro</th>
          {conPrev && <th className="text-right">Var. costo / reg.</th>}
          <th className="text-right">CPM</th>
          <th className="text-right">CTR (todos)</th>
          <th className="text-right">Frecuencia*</th>
          <th className="text-right">Anuncios</th>
        </>
      }
      foot={
        <tr>
          <td>Total</td>
          <td className={num}>{fmt.money(TOT.gasto)}</td>
          {conPrev && <td className={num}><DeltaText v={c.CMP?.gasto} /></td>}
          <td className={num}>100.0%</td>
          <td className={num}>{fmt.int(TOT.registros)}</td>
          {conPrev && <td className={num}><DeltaText v={c.CMP?.registros} /></td>}
          <td className={num}>100.0%</td>
          <td className={num}>{fmt.money(TOT.cpr)}</td>
          {conPrev && <td className={num}><DeltaText v={c.CMP?.cpr} lowerIsBetter /></td>}
          <td className={num}>{fmt.money(TOT.cpm)}</td>
          <td className={num}>{fmt.pct100(TOT.ctr)}</td>
          <td className={num}>{fmt.freq(TOT.frecuencia)}</td>
          <td className={num}>{TOT.n}</td>
        </tr>
      }
    >
      {rows.map((r) => {
        const p = prevOf(r.k);
        return (
          <tr key={r.k}>
            <td className="whitespace-nowrap">
              {etiqueta(r.k)}
              {r === best && <span className="ml-2"><Tag kind="good">▲ más eficiente</Tag></span>}
              {r === worst && <span className="ml-2"><Tag kind="bad">▼ menos eficiente</Tag></span>}
            </td>
            <td className={num}>{fmt.money(r.gasto)}</td>
            {conPrev && <td className={num}>{p ? <DeltaText v={variacion(r.gasto, p.gasto)} /> : <span className="text-xs text-muted">Sin dato previo</span>}</td>}
            <td className={num}>{fmt.pct(share(r.gasto, TOT.gasto))}</td>
            <td className={num}>{fmt.int(r.registros)}</td>
            {conPrev && <td className={num}>{p ? <DeltaText v={variacion(r.registros, p.registros)} /> : <span className="text-xs text-muted">Sin dato previo</span>}</td>}
            <td className={num}>{fmt.pct(share(r.registros, TOT.registros))}</td>
            <td className={cn(num, "font-semibold text-fg")}>{fmt.money(r.cpr)}</td>
            {conPrev && <td className={num}>{p ? <DeltaText v={variacion(r.cpr, p.cpr)} lowerIsBetter /> : <span className="text-xs text-muted">Sin dato previo</span>}</td>}
            <td className={num}>{fmt.money(r.cpm)}</td>
            <td className={num}>{fmt.pct100(r.ctr)}</td>
            <td className={num}>{fmt.freq(r.frecuencia)}</td>
            <td className={num}>{r.n}</td>
          </tr>
        );
      })}
    </Table>
  );
}

/* ───────────── 02 Por país ───────────── */
export function PorPais({ c }: { c: Ctx }) {
  const { fmt, PA, CU, calc } = c;
  const combos = calc.comboList();
  const maxC = Math.max(...combos.filter((x) => ok(x.cpr)).map((x) => x.cpr as number));
  return (
    <Section id="pais" n={2} title="Perspectiva por país" subtitle="Honduras solo tiene datos en P321.">
      <TablaAgg
        c={c}
        rows={PA}
        prevRows={c.prev?.PA}
        primera="País"
        etiqueta={(k) => (
          <span className="inline-flex items-center gap-2">
            <PaisTag p={k} dark={c.dark} />
            <span className="text-muted">
              {PAIS_NOMBRE[k]}
              {k === "HN" ? " · solo P321" : ""}
            </span>
          </span>
        )}
      />
      <Panel title="País × cuenta">
        <Table
          minWidth={720}
          head={
            <>
              <th>País</th>
              {CU.map((x) => (
                <th key={x.k} className="text-right">
                  <span className="inline-flex justify-end">
                    <AccTag id={x.k} />
                  </span>
                </th>
              ))}
              <th className="text-right">Total país</th>
            </>
          }
        >
          {PAISES.map((p) => {
            const t = PA.find((x) => x.k === p);
            return (
              <tr key={p}>
                <td className="align-top">
                  <PaisTag p={p} dark={c.dark} />
                </td>
                {CU.map((cu) => {
                  const x = combos.find((o) => o.pais === p && o.cuenta === cu.k);
                  if (!x)
                    return (
                      <td key={cu.k} className="text-right align-top text-xs italic text-muted">
                        Sin datos en {cu.k}
                      </td>
                    );
                  return (
                    <td key={cu.k} className="align-top">
                      <Hint
                        as="div"
                        className="ml-auto flex w-max flex-col items-end gap-0.5 rounded-md"
                        tip={
                          <>
                            <b className="block">
                              {cu.k} · {p}
                            </b>
                            {fmt.money(x.gasto)} · {fmt.int(x.registros)} registros
                            <br />
                            CPM {fmt.money(x.cpm)} · CTR {fmt.pct100(x.ctr)}
                          </>
                        }
                      >
                        <span className="tabular font-mono text-sm text-fg">{fmt.money(x.cpr)}</span>
                        <span className="text-[11px] text-muted">
                          {fmt.money(x.gasto)} · {fmt.int(x.registros)} reg.
                        </span>
                        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-card-muted">
                          <i className="block h-full rounded-full bg-muted" style={{ width: `${ok(x.cpr) ? ((x.cpr as number) / maxC) * 100 : 0}%` }} />
                        </span>
                      </Hint>
                    </td>
                  );
                })}
                <td className="align-top">
                  {t && (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="tabular font-mono text-sm font-semibold text-fg">{fmt.money(t.cpr)}</span>
                      <span className="text-[11px] text-muted">
                        {fmt.money(t.gasto)} · {fmt.int(t.registros)} reg.
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-3 border-l-2 border-line pl-3 text-xs text-muted">
          Cada celda muestra gasto, registros y costo por registro. La barra compara el costo por registro contra el más alto de la tabla (más corta = más eficiente).
        </p>
      </Panel>
      <p className="text-xs text-muted">* Frecuencia = impresiones ÷ alcance sumado; puede subestimarse porque una persona puede contarse más de una vez.</p>
    </Section>
  );
}

/* ───────────── 03 Por cuenta ───────────── */
export function PorCuenta({ c }: { c: Ctx }) {
  const { fmt, CU, TOT, calc, data } = c;
  const combos = calc.comboList().sort((a, b) => b.gasto - a.gasto);
  const med = [...combos].map((x) => x.gasto).sort((a, b) => a - b)[Math.floor(combos.length / 2)];
  const lectura = (x: (typeof combos)[0]) => {
    if (!ok(x.cpr)) return <Tag kind="mut">Sin registros</Tag>;
    if (x.gasto >= med && (x.cpr as number) > (TOT.cpr as number)) return <Tag kind="bad">▼ Gasto alto, costo alto</Tag>;
    if (x.gasto < med && (x.cpr as number) < (TOT.cpr as number)) return <Tag kind="good">▲ Eficiente, poco presupuesto</Tag>;
    if ((x.cpr as number) < (TOT.cpr as number)) return <Tag kind="good">▲ Bajo el promedio</Tag>;
    return <Tag kind="warn">● Sobre el promedio</Tag>;
  };
  return (
    <Section id="cuenta" n={3} title="Perspectiva por cuenta" subtitle="Misma estructura que por país.">
      <TablaAgg
        c={c}
        rows={CU}
        prevRows={c.prev?.CU}
        primera="Cuenta"
        etiqueta={(k) => (
          <span className="inline-flex items-center gap-2">
            <AccTag id={k} />
            <span className="text-muted">{data.meta.cuentas.find((x) => x.id === k)?.paises.join(", ")}</span>
          </span>
        )}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Combinaciones cuenta-país">
          <Table
            minWidth={460}
            head={
              <>
                <th>Cuenta · país</th>
                <th className="text-right">Inversión</th>
                <th className="text-right">Costo / registro</th>
                <th>Lectura</th>
              </>
            }
          >
            {combos.map((x) => (
              <tr key={`${x.cuenta}-${x.pais}`}>
                <td className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <AccTag id={x.cuenta} /> <PaisTag p={x.pais} dark={c.dark} />
                  </span>
                </td>
                <td className={num}>{fmt.money(x.gasto)}</td>
                <td className={num}>{fmt.money(x.cpr)}</td>
                <td>{lectura(x)}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 border-l-2 border-line pl-3 text-xs text-muted">
            «Gasto alto» = inversión igual o mayor a la mediana de las combinaciones ({fmt.money(med)}). «Costo alto» = costo por registro mayor al consolidado ({fmt.money(TOT.cpr)}).
          </p>
        </Panel>
        <Panel title="Métricas que no trae cada cuenta">
          <div className="divide-y divide-line">
            {data.meta.cuentas.map((x) => (
              <div key={x.id} className="py-3 first:pt-0">
                <span className="inline-flex items-center gap-1.5 font-mono text-sm">
                  <AccSwatch id={x.id} /> {x.id}
                </span>
                <p className="mt-1.5 text-sm text-fg">
                  {x.faltantes.length ? (
                    <>
                      <span className="text-muted">No trae:</span> {x.faltantes.join(", ")}
                    </>
                  ) : (
                    <span className="text-muted">Trae todas las métricas comunes.</span>
                  )}
                </p>
                {x.extras.length > 0 && <p className="mt-1 text-xs text-muted">Extra (contexto): {x.extras.join(", ")}</p>}
              </div>
            ))}
          </div>
          <p className="mt-3 border-l-2 border-line pl-3 text-xs text-muted">
            CPC de enlace consolidado:{" "}
            {CU.map((x, i) => (
              <Fragment key={x.k}>
                {i > 0 && " · "}
                {x.k} {calc.cuentasConClics.has(x.k) ? fmt.money(x.cpcEnlace) : "no disponible"}
              </Fragment>
            ))}
            .
          </p>
        </Panel>
      </div>
    </Section>
  );
}
