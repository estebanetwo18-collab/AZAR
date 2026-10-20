"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { formatoPieza, GRUPOS, grupoCreativo, keyOf, ok, porQue, ranking, regs, tieneResultado, type RankItem, type Ranking } from "@/lib/analisis-semanal/calc";
import type { Anuncio } from "@/lib/analisis-semanal/types";
import { cn } from "../ui";
import { Panel, Section, Table, num } from "../pauta/parts";
import type { Ctx } from "./context";
import { AccTag, NA, PaisTag, Rich, Tag } from "./shared";
import { RefBars } from "./viz";

/* Hook / Hold: "N/A (estático)" para piezas estáticas; nunca un cero inventado. */
function HookCell({ a, k, fmt }: { a: Anuncio; k: "hookRate" | "holdRate"; fmt: Ctx["fmt"] }) {
  if (formatoPieza(a).tipo === "estatico") return <NA>N/A (estático)</NA>;
  return ok(a[k]) ? <>{fmt.pct(a[k])}</> : <NA />;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azar",
        active ? "bg-azar text-white" : "border border-line bg-card text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function AdCard({ x, i, rk, tipo, c }: { x: RankItem; i: number; rk: Ranking; tipo: "top" | "bot"; c: Ctx }) {
  const a = x.a;
  const { fmt } = c;
  const metr: [string, ReactNode][] = [
    ["Inversión", fmt.money(a.gasto)],
    ["Registros", tieneResultado(a) ? fmt.int(a.resultados) : "0"],
    ["Costo / registro", x.sinResultado ? "—" : fmt.money(x.cpr)],
    ["CTR (todos)", fmt.pct100(a.ctrTodos)],
    ["CPM", fmt.money(a.cpm)],
    ["Frecuencia", fmt.freq(a.frecuencia)],
    ["Hook Rate", <HookCell key="h" a={a} k="hookRate" fmt={fmt} />],
    ["Hold Rate", <HookCell key="o" a={a} k="holdRate" fmt={fmt} />],
  ];
  return (
    <article className="grid grid-cols-[28px_1fr] gap-x-3 gap-y-1 border-t border-line p-4 first:border-t-0">
      <span className="font-mono text-xl leading-tight text-muted">{i + 1}</span>
      <div className="min-w-0">
        <p className="break-words font-semibold text-fg">{a.anuncio}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
          <AccTag id={a.cuenta} /> <PaisTag p={a.pais} dark={c.dark} /> <span>{a.conjunto}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
          {a.campana}
          {x.sinResultado && <Tag kind="bad">▼ Gasto sin resultado</Tag>}
        </p>
      </div>
      <dl className="col-start-2 mt-2 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-x-3 gap-y-1.5">
        {metr.map(([l, v]) => (
          <div key={l}>
            <dt className="text-[11px] text-muted">{l}</dt>
            <dd className="tabular font-mono text-sm text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <p className={cn("col-start-2 mt-1.5 border-l-2 pl-2.5 text-[13px] text-muted", tipo === "top" ? "border-emerald-500" : "border-red-500")}>
        <Rich text={porQue(x, rk, tipo)} fmt={fmt} />
      </p>
    </article>
  );
}

type ColKey = "anuncio" | "cuenta" | "pais" | "grupo" | "estado" | "gasto" | "impresiones" | "registros" | "cpr" | "ctrTodos" | "cpm" | "frecuencia" | "clicsEnlace" | "hookRate" | "holdRate" | "umbral";
const COLS: [ColKey, string, boolean?][] = [
  ["anuncio", "Anuncio", true],
  ["cuenta", "Cuenta", true],
  ["pais", "País", true],
  ["grupo", "Grupo", true],
  ["estado", "Estado", true],
  ["gasto", "Inversión"],
  ["impresiones", "Impresiones"],
  ["registros", "Registros"],
  ["cpr", "Costo / registro"],
  ["ctrTodos", "CTR (todos)"],
  ["cpm", "CPM"],
  ["frecuencia", "Frecuencia"],
  ["clicsEnlace", "Clics enlace"],
  ["hookRate", "Hook"],
  ["holdRate", "Hold"],
  ["umbral", "Ranking", true],
];
const ASC_FIRST: ColKey[] = ["anuncio", "cuenta", "pais", "grupo", "estado", "umbral", "cpr"];

/* ───────────── 04 Anuncios ───────────── */
export function Anuncios({ c }: { c: Ctx }) {
  const { fmt, calc, CU, data } = c;
  const [F, setF] = useState({ pais: "", cuenta: "" });
  const [sort, setSort] = useState<{ k: ColKey; dir: 1 | -1 }>({ k: "gasto", dir: -1 });
  const rk = useMemo(() => ranking(calc, F), [calc, F]);
  const u = data.meta.umbral;

  const sortVal = (a: Anuncio, k: ColKey): number | string => {
    if (k === "cpr") return tieneResultado(a) ? a.gasto / (a.resultados as number) : Infinity;
    if (k === "registros") return regs(a);
    if (k === "grupo") return grupoCreativo(a).label;
    if (k === "umbral") return calc.enUmbral(a) ? 0 : 1;
    if (k === "hookRate" || k === "holdRate") return formatoPieza(a).tipo === "estatico" ? -1 : (a[k] ?? -1);
    const v = a[k as keyof Anuncio];
    return typeof v === "string" ? v : typeof v === "number" ? v : -Infinity;
  };
  const list = [...rk.base].sort((a, b) => {
    const x = sortVal(a, sort.k);
    const y = sortVal(b, sort.k);
    return (typeof x === "string" ? x.localeCompare(String(y)) : (x as number) - (y as number)) * sort.dir;
  });
  const go = (k: ColKey) => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: ASC_FIRST.includes(k) ? 1 : -1 }));

  return (
    <Section id="anuncios" n={4} title="Top 3 y Bottom 3 anuncios" subtitle="Los filtros recalculan el ranking y la tabla.">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por país">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-muted">País</span>
          {["", "CR", "GT", "HN"].map((p) => (
            <Chip key={p || "all"} active={F.pais === p} onClick={() => setF((f) => ({ ...f, pais: p }))}>
              {p || "Todos"}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por cuenta">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-muted">Cuenta</span>
          {["", ...CU.map((x) => x.k)].map((x) => (
            <Chip key={x || "all"} active={F.cuenta === x} onClick={() => setF((f) => ({ ...f, cuenta: x }))}>
              {x || "Todas"}
            </Chip>
          ))}
        </div>
      </div>
      <p className="rounded-2xl border border-line bg-card px-4 py-2.5 text-[13px] text-muted">
        <b className="text-fg">KPI:</b> {data.meta.kpiRanking.descripcion} · <b className="text-fg">Desempate:</b> {data.meta.kpiRanking.desempate} · <b className="text-fg">Umbral:</b> gasto ≥ $U
        {u.gastoMin.toLocaleString("en-US")}
        {fmt.currency === "USD" ? ` (≈ ${fmt.money(u.gastoMin)})` : ""} y ≥ {fmt.int(u.impresionesMin)} impresiones · <b className="text-fg">{rk.elegibles.length}</b> de {rk.base.length} anuncios en el filtro pasan el umbral.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden border-t-4 !border-t-emerald-500">
          <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <Tag kind="good">▲ Top 3</Tag>
            <h3 className="text-sm font-semibold text-fg">Menor costo por registro</h3>
          </header>
          {rk.top.length ? rk.top.map((x, i) => <AdCard key={keyOf(x.a)} x={x} i={i} rk={rk} tipo="top" c={c} />) : <p className="p-4 text-sm italic text-muted">Ningún anuncio con registros pasa el umbral en este filtro.</p>}
        </div>
        <div className="card overflow-hidden border-t-4 !border-t-red-500">
          <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <Tag kind="bad">▼ Bottom 3</Tag>
            <h3 className="text-sm font-semibold text-fg">Mayor costo por registro</h3>
          </header>
          {rk.bot.length ? rk.bot.map((x, i) => <AdCard key={keyOf(x.a)} x={x} i={i} rk={rk} tipo="bot" c={c} />) : <p className="p-4 text-sm italic text-muted">No hay suficientes anuncios en ranking para un Bottom 3 distinto del Top 3.</p>}
        </div>
      </div>

      <Panel title={`Todos los anuncios · ${list.length} anuncios`}>
        <div className="max-h-[620px] overflow-auto rounded-2xl">
          <Table
            minWidth={1500}
            head={
              <>
                {COLS.map(([k, l, left]) => (
                  <th key={k} aria-sort={sort.k === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"} className={cn("sticky top-0 z-10 bg-card-muted", !left && "text-right")}>
                    <button type="button" onClick={() => go(k)} className={cn("inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azar", sort.k === k ? "text-fg" : "hover:text-fg")}>
                      {l}
                      {sort.k === k ? sort.dir > 0 ? <ArrowUp className="h-3.5 w-3.5 text-azar" /> : <ArrowDown className="h-3.5 w-3.5 text-azar" /> : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
                    </button>
                  </th>
                ))}
              </>
            }
          >
            {list.map((a) => (
              <tr key={keyOf(a)}>
                <td className="min-w-[220px] max-w-[340px] whitespace-normal">
                  <b className="font-medium text-fg">{a.anuncio}</b>
                  <div className="text-[11px] text-muted">{a.conjunto}</div>
                </td>
                <td>
                  <AccTag id={a.cuenta} />
                </td>
                <td>
                  <PaisTag p={a.pais} dark={c.dark} />
                </td>
                <td className="whitespace-nowrap">{grupoCreativo(a).label}</td>
                <td>{a.estado === "active" ? "Activo" : <Tag kind="mut">Inactivo</Tag>}</td>
                <td className={num}>{fmt.money(a.gasto)}</td>
                <td className={num}>{fmt.int(a.impresiones)}</td>
                <td className={num}>{tieneResultado(a) ? fmt.int(a.resultados) : <span className="text-muted">0</span>}</td>
                <td className={num}>{tieneResultado(a) ? fmt.money(a.gasto / (a.resultados as number)) : "—"}</td>
                <td className={num}>{fmt.pct100(a.ctrTodos)}</td>
                <td className={num}>{fmt.money(a.cpm)}</td>
                <td className={num}>
                  {fmt.freq(a.frecuencia)}
                  {(a.frecuencia ?? 0) > 4 && (
                    <span className="ml-1.5">
                      <Tag kind="warn">▲ &gt; 4</Tag>
                    </span>
                  )}
                </td>
                <td className={num}>{calc.cuentasConClics.has(a.cuenta) ? fmt.int(a.clicsEnlace ?? 0) : <NA />}</td>
                <td className={num}>
                  <HookCell a={a} k="hookRate" fmt={fmt} />
                </td>
                <td className={num}>
                  <HookCell a={a} k="holdRate" fmt={fmt} />
                </td>
                <td>{calc.enUmbral(a) ? <Tag kind="good">✓ En ranking</Tag> : <Tag kind="mut">Bajo umbral</Tag>}</td>
              </tr>
            ))}
          </Table>
        </div>
        <p className="mt-3 border-l-2 border-line pl-3 text-xs text-muted">
          Cada anuncio se identifica por cuenta + campaña + conjunto + anuncio. Nombres repetidos entre cuentas (por ejemplo «AD 6 KEYLA Tips para empezar» o «API (CAM) GT - NFL 3») aparecen como filas separadas.
        </p>
      </Panel>
    </Section>
  );
}

/* ───────────── 05 Creativo ───────────── */
export function Creativo({ c }: { c: Ctx }) {
  const { fmt, calc, TOT } = c;
  const m = calc.agruparPor(calc.ADS, (a) => grupoCreativo(a).id);
  const rows = GRUPOS.filter((g) => m.has(g.id)).map((g) => {
    const l = m.get(g.id)!;
    return { g, ...calc.agregar(l), fmts: [...new Set(l.map((a) => formatoPieza(a).label))] };
  });
  const withCpr = rows.filter((r) => ok(r.cpr)).sort((a, b) => (a.cpr as number) - (b.cpr as number));
  const max = Math.max(...withCpr.map((r) => r.cpr as number));
  const cls = [...calc.ADS].sort((a, b) => grupoCreativo(a).label.localeCompare(grupoCreativo(b).label) || a.cuenta.localeCompare(b.cuenta));
  return (
    <Section id="creativo" n={5} title="Análisis creativo" subtitle="Agrupación supuesta a partir del nombre del anuncio, el conjunto y el Hook/Hold Rate.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Costo por registro por grupo">
          <RefBars
            max={max}
            reference={TOT.cpr}
            items={[
              ...withCpr.map((r) => ({
                key: r.g.id,
                label: r.g.label,
                value: r.cpr,
                text: fmt.money(r.cpr),
                tip: (
                  <>
                    <b className="block">{r.g.label}</b>
                    {fmt.money(r.cpr)} por registro
                    <br />
                    {fmt.money(r.gasto)} · {fmt.int(r.registros)} registros · {r.n} anuncios
                  </>
                ),
              })),
              ...rows.filter((r) => !ok(r.cpr)).map((r) => ({ key: r.g.id, label: r.g.label, value: null, text: fmt.money(r.gasto), empty: "Sin registros" })),
            ]}
          />
          <p className="mt-3 border-l-2 border-line pl-3 text-xs text-muted">La línea punteada marca el costo por registro consolidado ({fmt.money(TOT.cpr)}). Menor es mejor.</p>
        </Panel>
        <Panel title="Resumen por grupo">
          <Table
            minWidth={620}
            head={
              <>
                <th>Grupo</th>
                <th className="text-right">Anuncios</th>
                <th className="text-right">Inversión</th>
                <th className="text-right">Registros</th>
                <th className="text-right">Costo / reg.</th>
                <th className="text-right">CTR</th>
                <th className="text-right">Hook*</th>
                <th className="text-right">Hold*</th>
              </>
            }
          >
            {[...rows]
              .sort((a, b) => b.gasto - a.gasto)
              .map((r) => (
                <tr key={r.g.id}>
                  <td>
                    {r.g.label}
                    <div className="text-[11px] text-muted">{r.fmts.join(", ")}</div>
                  </td>
                  <td className={num}>{r.n}</td>
                  <td className={num}>{fmt.money(r.gasto)}</td>
                  <td className={num}>{fmt.int(r.registros)}</td>
                  <td className={num}>{fmt.money(r.cpr)}</td>
                  <td className={num}>{fmt.pct100(r.ctr)}</td>
                  <td className={num}>{ok(r.hook) ? fmt.pct(r.hook) : <NA>N/A (estático)</NA>}</td>
                  <td className={num}>{ok(r.hold) ? fmt.pct(r.hold) : <NA>N/A (estático)</NA>}</td>
                </tr>
              ))}
          </Table>
          <p className="mt-3 text-xs text-muted">* Hook y Hold ponderados por impresiones, solo sobre piezas de video o animadas del grupo.</p>
        </Panel>
      </div>
      <Panel title="Cómo se clasificó cada anuncio">
        <div className="max-h-[480px] overflow-auto rounded-2xl">
          <Table
            minWidth={1000}
            head={
              <>
                {["Anuncio", "Cuenta", "País", "Grupo asignado", "Regla aplicada", "Formato", "Regla de formato"].map((h) => (
                  <th key={h} className="sticky top-0 z-10 bg-card-muted">
                    {h}
                  </th>
                ))}
              </>
            }
          >
            {cls.map((a) => {
              const g = grupoCreativo(a);
              const f = formatoPieza(a);
              return (
                <tr key={keyOf(a)}>
                  <td className="min-w-[220px] max-w-[340px] whitespace-normal text-fg">{a.anuncio}</td>
                  <td>
                    <AccTag id={a.cuenta} />
                  </td>
                  <td>
                    <PaisTag p={a.pais} dark={c.dark} />
                  </td>
                  <td className="whitespace-nowrap">{g.label}</td>
                  <td className="text-xs text-muted">{g.regla}</td>
                  <td className="whitespace-nowrap">{f.tipo === "estatico" ? <Tag kind="mut">{f.label}</Tag> : f.label}</td>
                  <td className="text-xs text-muted">{f.regla}</td>
                </tr>
              );
            })}
          </Table>
        </div>
      </Panel>
    </Section>
  );
}

/* ───────────── 06 Insights ───────────── */
const BLOQUE_ESTILO: Record<string, { k: string; cls: string }> = {
  datos: { k: "Datos", cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  insights: { k: "Insights", cls: "bg-azar-50 text-azar dark:bg-azar/15 dark:text-azar-200" },
  hipotesis: { k: "Hipótesis", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  recomendaciones: { k: "Recomendaciones", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
};

export function Insights({ c }: { c: Ctx }) {
  const { fmt } = c;
  const b = c.data.contenido.bloques;
  const head = (key: string, titulo: string) => (
    <header className="mb-3 flex items-center gap-2">
      <span className={cn("rounded px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider", BLOQUE_ESTILO[key].cls)}>{BLOQUE_ESTILO[key].k}</span>
      <h3 className="text-sm font-semibold text-fg">{titulo}</h3>
    </header>
  );
  return (
    <Section id="insights" n={6} title="Insights y recomendaciones" subtitle={`Recomendaciones para la ${c.data.contenido.recomendacionesPara.charAt(0).toLowerCase()}${c.data.contenido.recomendacionesPara.slice(1)}.`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          {head("datos", b.datos.titulo)}
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted marker:text-sky-500">
            {b.datos.items.map((t, i) => (
              <li key={i}>
                <Rich text={t} fmt={fmt} />
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          {head("insights", b.insights.titulo)}
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted marker:text-azar">
            {b.insights.items.map((t, i) => (
              <li key={i}>
                <Rich text={t} fmt={fmt} />
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          {head("hipotesis", b.hipotesis.titulo)}
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg marker:text-amber-500">
            {b.hipotesis.items.map((h, i) => (
              <li key={i}>
                <Rich text={h.texto} fmt={fmt} /> <span className="text-muted">{h.nota}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          {head("recomendaciones", b.recomendaciones.titulo)}
          <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-fg marker:font-semibold marker:text-emerald-600">
            {b.recomendaciones.items.map((r, i) => (
              <li key={i}>
                <span className="font-semibold">
                  <Rich text={r.accion} fmt={fmt} />
                </span>{" "}
                <Tag kind="mut">
                  <span>
                    <Rich text={r.donde} fmt={fmt} />
                  </span>
                </Tag>
                <span className="mt-0.5 block text-xs text-muted">
                  <Rich text={r.porque} fmt={fmt} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

/* ───────────── 07 Verificación ───────────── */
export function Verificacion({ c }: { c: Ctx }) {
  const { fmt, CU, PA, TOT, data, calc } = c;
  const C = data.meta.controlExcel;
  const row = (lab: ReactNode, calcV: number | null, ref: number, f: (v: number | null) => string, key: string) => {
    const okv = ok(calcV) && Math.abs(calcV - ref) < 0.005;
    return (
      <tr key={key}>
        <td className="whitespace-normal">{lab}</td>
        <td className={num}>{f(calcV)}</td>
        <td className={num}>{f(ref)}</td>
        <td className={cn("whitespace-nowrap font-medium", okv ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{okv ? "✓ Coincide" : "✗ Diferencia"}</td>
      </tr>
    );
  };
  const head = (first: string, ref: string) => (
    <>
      <th>{first}</th>
      <th className="text-right">Calculado</th>
      <th className="text-right">{ref}</th>
      <th>Estado</th>
    </>
  );
  const cr = PA.find((p) => p.k === "CR");
  const p287 = CU.find((x) => x.k === "P287");
  const ad = calc.ADS.find((a) => a.cuenta === "P321" && a.anuncio === "AD 6 KEYLA Tips para empezar");
  const adP282 = calc.ADS.find((a) => a.cuenta === "P282" && a.anuncio === "AD 6 KEYLA Tips para empezar");
  const M = C.manuales;
  const tc = data.meta.tipoCambio;
  return (
    <Section id="verificacion" n={7} title="Verificación de datos y limitaciones">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Totales recalculados contra el Excel" subtitle="En UYU, moneda del reporte.">
          <Table minWidth={460} head={head("Ámbito", "Suma del Excel")}>
            {CU.flatMap((x) => {
              const r = C.porCuenta[x.k];
              if (!r) return [];
              return [row(`${x.k} · inversión`, x.gasto, r.gasto, fmt.uyu, `${x.k}g`), row(`${x.k} · registros`, x.registros, r.registros, fmt.int, `${x.k}r`), row(`${x.k} · filas`, x.n, r.filas, fmt.int, `${x.k}f`)];
            })}
            {row(<b>Consolidado · inversión</b>, TOT.gasto, C.total.gasto, fmt.uyu, "tg")}
            {row(<b>Consolidado · registros</b>, TOT.registros, C.total.registros, fmt.int, "tr")}
          </Table>
        </Panel>
        <Panel title="Comprobaciones manuales">
          <Table minWidth={460} head={head("Comprobación", "Excel")}>
            {cr && row("País CR · costo por registro", cr.cpr, M.paisCR.cpr, fmt.uyu, "c1")}
            {cr && row("País CR · CPM", cr.cpm, M.paisCR.cpm, fmt.uyu, "c2")}
            {p287 && row("Cuenta P287 · costo por registro", p287.cpr, M.cuentaP287.cpr, fmt.uyu, "c3")}
            {p287 && row("Cuenta P287 · CPC de enlace", p287.cpcEnlace, M.cuentaP287.cpcEnlace, fmt.uyu, "c4")}
            {ad && row("Anuncio P321 «AD 6 KEYLA Tips» · costo por registro", ad.gasto / (ad.resultados as number), M.anuncio.costoPorResultadoExcel, fmt.uyu, "c5")}
            {ad && row("Anuncio P321 «AD 6 KEYLA Tips» · CPM", (ad.gasto / ad.impresiones) * 1000, M.anuncio.cpmExcel, fmt.uyu, "c6")}
            <tr>
              <td colSpan={4} className="whitespace-normal text-xs text-muted">
                El mismo nombre existe en P282 ({fmt.money(adP282?.gasto)}); se verificó que son filas separadas.{" "}
                {C.clavesDuplicadas === 0 ? "0 claves cuenta + campaña + conjunto + anuncio duplicadas." : `${C.clavesDuplicadas} claves duplicadas.`}
              </td>
            </tr>
          </Table>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Limitaciones">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {data.meta.limitaciones.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Supuestos y fuentes">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {data.meta.supuestos.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
            <li>
              Tipo de cambio: {tc.fuente} ·{" "}
              <a href={tc.url} target="_blank" rel="noopener noreferrer" className="text-azar underline-offset-2 hover:underline">
                fuente
              </a>
            </li>
            {data.meta.versiones.map((v) => (
              <li key={v.fecha}>
                Actualización {v.fecha}: {v.nota}
              </li>
            ))}
            {data.meta.archivos.map((f) => (
              <li key={f.cuenta} className="font-mono text-xs">
                {f.cuenta}: {f.archivo} · hoja «{f.hoja}» · {f.filas} filas
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Section>
  );
}
