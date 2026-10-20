"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Download, Search } from "lucide-react";
import { control, PAISES, PERIODO_LABEL, resultados, yJoin } from "@/lib/pauta";
import { formatInt, formatMoney } from "@/lib/format";
import { Flag } from "../Flag";
import { cn } from "../ui";
import { pct, share, type PautaCtx } from "./context";
import { countryKeyOf, paisColor, Panel, Section, Stat, Table, Var, VarText, num } from "./parts";

/* ───────────── 5. Detalle de cuentas CAM ───────────── */
export function CuentasCam({ c, dark }: { c: PautaCtx; dark: boolean }) {
  const { f, fmt, S } = c;
  const unitLab = c.isImp ? "" : ` (${f.currency})`;
  const camCuentas = [...new Set(c.rows.filter((r) => r.tipo === "CAM").map((r) => r.cuenta))].sort().filter((x) => f.cuenta === "all" || x === f.cuenta);
  const CT = S(f.pais, f.cuenta, "CAM");
  const grand = S("all", "all", "all");
  return (
    <Section id="cam" n={5} title="Detalle de cuentas CAM" subtitle="Cuentas CAM con campañas en varios países, separadas por país.">
      {f.tipo === "Individual" || camCuentas.length === 0 ? (
        <div className="card p-6 text-sm text-muted">El filtro actual no incluye cuentas CAM.</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat
              featured
              label={`Total CAM · ${PERIODO_LABEL[f.periodo]}${f.pais === "all" ? "" : ` · ${f.pais}`}`}
              value={fmt(CT.get(f.periodo))}
              period="Incluido en el total general, sin duplicar"
              foot={<span className="text-xs text-white/80">● {share(CT.get(f.periodo) / (grand.get(f.periodo) || 1))} del total general</span>}
            />
            <Stat
              index={1}
              label="Variación CAM entre semanas"
              value={pct(CT.var_ritmo)}
              period="Ritmo diario · base comparable"
              tip="Suma de P282, P287 y P321 con consumo en ambas semanas."
              foot={CT.var_pct === null ? undefined : <Var v={CT.var_pct} suffix="en total" />}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {camCuentas.map((x) => {
              const RA = S(f.pais, x, "all");
              const ids = [...new Set(c.rows.filter((r) => r.cuenta === x).map((r) => r.cuentaPublicitaria))].filter(Boolean).join(", ");
              const cuentaTotal = S("all", x, "all");
              const cps = (f.pais === "all" ? PAISES : [f.pais]).map((p) => ({ p, s: S(p, x, "all") })).filter((r) => r.s.total > 0);
              const part = (v: number) => v / (cuentaTotal.get(f.periodo) || 1);
              return (
                <Panel key={x} className="flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-fg">{x}</h3>
                    <span className="tabular text-xl font-bold tracking-tight text-fg">{fmt(RA.get(f.periodo))}</span>
                  </div>
                  <p className="mt-1 break-words text-[11px] text-muted [overflow-wrap:anywhere]">
                    Cuenta publicitaria: {ids || "—"} · {PERIODO_LABEL[f.periodo]}
                  </p>
                  <div className="mt-3 flex h-3 overflow-hidden rounded-full">
                    {cps.map(({ p, s }) => (
                      <div key={p} title={p} style={{ width: `${part(s.get(f.periodo)) * 100}%`, background: paisColor(p, dark) }} className="transition-all duration-700" />
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
                    {cps.map(({ p, s }) => (
                      <span key={p} className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: paisColor(p, dark) }} />
                        {p} <b className="text-fg">{share(part(s.get(f.periodo)))}</b>
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Table
                      compact
                      minWidth={0}
                      head={
                        <>
                          <th>País</th>
                          <th className="text-right">5–11{unitLab}</th>
                          <th className="text-right">12–16{unitLab}</th>
                          <th className="text-right">Total</th>
                          <th className="text-right">Var.</th>
                        </>
                      }
                    >
                      {cps.map(({ p, s }) => (
                        <tr key={p}>
                          <td className="whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <Flag country={countryKeyOf(p)} size={14} />
                              {p}
                            </span>
                          </td>
                          <td className={num}>{s.w1 ? fmt(s.w1) : "—"}</td>
                          <td className={num}>{s.w2 ? fmt(s.w2) : "—"}</td>
                          <td className={cn(num, "font-semibold text-fg")}>{fmt(s.get(f.periodo))}</td>
                          <td className={num}>
                            <VarText v={s.var_ritmo} fallback={s.nota_var} />
                          </td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </Section>
  );
}

/* ───────────── 6. Métricas comunes ───────────── */
export function Metricas({ c }: { c: PautaCtx }) {
  const { f, comp } = c;
  const R = c.SC(f.pais, f.cuenta, f.tipo);
  const per = f.periodo === "all" ? "total" : f.periodo;
  const m2 = (v: number | null) => (v === null ? "—" : formatMoney(v, f.currency));
  const up = (v: number | null) => (v ?? 0) > 0.0005;
  const cpmVar = R.cpm.cc_w1 && R.cpm.cc_w2 !== null ? (R.cpm.cc_w2 - R.cpm.cc_w1) / R.cpm.cc_w1 : null;
  const impVar = R.impresiones.cc_w1 > 0 ? (R.impresiones.cc_w2 - R.impresiones.cc_w1) / R.impresiones.cc_w1 : null;
  const rows = [
    {
      name: `Consumo (${f.currency})`,
      a: m2(R.cc_w1),
      b: m2(R.cc_w2),
      t: m2(R.get(f.periodo)),
      v: R.var_pct,
      lectura: up(R.var_pct) ? "La semana 2 ya supera a la semana 1 con 2 días menos." : "La semana 2 va por debajo de la semana 1; faltan 2 días.",
    },
    {
      name: "Impresiones",
      a: formatInt(R.impresiones.cc_w1),
      b: formatInt(R.impresiones.cc_w2),
      t: formatInt(R.impresiones[per as "total"]),
      v: impVar,
      lectura: up(impVar) ? "Más impresiones en 5 días que en los 7 anteriores." : "Menos impresiones que la semana 1 hasta ahora.",
    },
    {
      name: `CPM calculado (${f.currency})`,
      a: m2(R.cpm.cc_w1),
      b: m2(R.cpm.cc_w2),
      t: m2(R.cpm[per as "total"]),
      v: cpmVar,
      lectura: up(cpmVar) ? "Cada 1,000 impresiones cuestan más que en la semana 1." : "Cada 1,000 impresiones cuestan menos que en la semana 1.",
    },
  ];
  return (
    <Section
      id="metricas"
      n={6}
      title="Métricas comunes a todos los perfiles"
      subtitle={`Presentes en todos los archivos: consumo e impresiones. CPM calculado = consumo ÷ impresiones × 1,000. Semana 1 y 2 en base comparable (${yJoin(comp)}); Total = ${PERIODO_LABEL[f.periodo]}, todos los perfiles del filtro.`}
    >
      <Panel>
        <Table
          minWidth={780}
          head={
            <>
              <th>Métrica</th>
              <th className="text-right">Semana 1</th>
              <th className="text-right">Semana 2</th>
              <th className="text-right">Total / acumulado</th>
              <th className="text-right">Variación</th>
              <th>Lectura</th>
            </>
          }
        >
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="whitespace-nowrap font-medium text-fg">{r.name}</td>
              <td className={num}>{r.a}</td>
              <td className={num}>{r.b}</td>
              <td className={cn(num, "font-semibold text-fg")}>{r.t}</td>
              <td className={num}>
                <VarText v={r.v} />
              </td>
              <td className="text-xs text-muted">{r.v === null ? "Sin base comparable para este filtro." : r.lectura}</td>
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-xs text-muted">
          Alcance y frecuencia están en todos los archivos, pero en los reportes diarios el alcance es por día y no se puede sumar por semana sin contar varias veces a la misma persona. Por eso van en Datos no comparables. Clics, CTR y CPC no existen en ningún archivo.
        </p>
      </Panel>
    </Section>
  );
}

/* ───────────── 7. Datos no comparables ───────────── */
const DISPONIBILIDAD = [
  ["Resultados y costo por resultado", "P287, P344, P345, P346, P347, P349", "Solo referencia"],
  ["Tipo de resultado", "Visitas a la página de destino (P344–P349); registros completados (P287)", "No comparable"],
  ["Alcance y frecuencia", "Todos, pero por día en los reportes diarios", "No se suman por semana"],
  ["Configuración de atribución", 'Todos, con valores distintos ("-" en una campaña GT)', "Solo auditoría"],
  ["ID de cuenta publicitaria", "CAMP282 y CAM P321", "Control de duplicados"],
  ["Inicio de campaña", "P344–P349", "Contexto de fechas"],
  ["Clics, CTR, CPC, conversiones", "Ningún archivo", "No disponible"],
];

export function NoComparables({ c }: { c: PautaCtx }) {
  const res = resultados(c.rows, c.f.currency, c.rate);
  return (
    <Section id="nocomp" n={7} title="Datos no comparables" subtitle="Indicadores que existen solo en algunos perfiles. No entran al análisis principal.">
      <div className="grid gap-4">
        <Panel title="Resultados reportados" subtitle="Solo P287 y las cuentas individuales traen resultados, con tipos distintos (registros vs visitas a la página): no se suman entre sí. P282 y P321 no traen resultados.">
          <Table
            minWidth={760}
            head={
              <>
                <th>Cuenta</th>
                <th>País</th>
                <th>Tipo de resultado</th>
                <th className="text-right">5–11 oct</th>
                <th className="text-right">12–16 oct</th>
                <th className="text-right">Total oct</th>
                <th className="text-right">Costo por resultado ({c.f.currency})</th>
              </>
            }
          >
            {res.map((r) => (
              <tr key={`${r.cuenta}-${r.pais}`}>
                <td className="whitespace-nowrap font-medium text-fg">{r.cuenta}</td>
                <td className="whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Flag country={countryKeyOf(r.pais)} size={14} />
                    {r.pais}
                  </span>
                </td>
                <td className="text-xs">{r.tipoResultado}</td>
                <td className={num}>{r.res_w1 ? formatInt(r.res_w1) : "—"}</td>
                <td className={num}>{r.res_w2 ? formatInt(r.res_w2) : "—"}</td>
                <td className={cn(num, "font-semibold text-fg")}>{formatInt(r.resultados)}</td>
                <td className={num}>{r.costo === null ? "—" : formatMoney(r.costo, c.f.currency)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Disponibilidad por indicador">
          <Table
            minWidth={460}
            head={
              <>
                <th>Indicador</th>
                <th>Disponible en</th>
                <th>Uso</th>
              </>
            }
          >
            {DISPONIBILIDAD.map(([a, b, u]) => (
              <tr key={a}>
                <td className="font-medium text-fg">{a}</td>
                <td className="text-xs text-muted">{b}</td>
                <td className="whitespace-nowrap text-xs">{u}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Section>
  );
}

/* ───────────── 8. Tabla consolidada ───────────── */
export function Consolidado({ c }: { c: PautaCtx }) {
  const { f, rate } = c;
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const size = 15;
  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return c.rows
      .filter((r) => (f.pais === "all" || r.pais === f.pais) && (f.cuenta === "all" || r.cuenta === f.cuenta) && (f.tipo === "all" || r.tipo === f.tipo) && (f.periodo === "all" || r.bucket === f.periodo))
      .filter((r) => !qq || Object.values(r).join(" ").toLowerCase().includes(qq));
  }, [c.rows, f, q]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const cur = rows.slice(Math.min(page, pages - 1) * size, Math.min(page, pages - 1) * size + size);
  const exportCsv = () => {
    const head = ["Id", "Cuenta", "Tipo", "País", "Periodo", "Campaña", "Cuenta publicitaria", "Consumo (UYU)", "Consumo (USD)", "Impresiones", "Resultados", "Archivo", "Fila"];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) =>
      [r.id, r.cuenta, r.tipo, r.pais, r.periodo, r.campana, r.cuentaPublicitaria ? `="${r.cuentaPublicitaria}"` : "", r.consumo.toFixed(2), (r.consumo / rate).toFixed(2), r.impresiones ?? "", r.resultados ?? "", r.archivo, r.fila].map(esc).join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pauta-octubre-consolidado.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <Section id="consolidado-sec" n={8} title="Tabla consolidada" subtitle="Todas las filas usadas, sin duplicados, con su archivo y fila de origen. Responde a los filtros.">
      <Panel
        title={`${formatInt(rows.length)} filas`}
        right={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Buscar en la tabla"
                className="h-10 w-56 rounded-2xl border border-line bg-card pl-9 pr-3 text-sm text-fg outline-none focus:border-azar"
              />
            </div>
            <button onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-ink px-4 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-ink">
              <Download className="h-4 w-4" /> Exportar CSV
            </button>
          </div>
        }
      >
        <Table
          minWidth={1280}
          head={
            <>
              {["Id", "Cuenta", "Tipo", "País", "Periodo", "Campaña", "Cuenta publicitaria"].map((h) => (
                <th key={h}>{h}</th>
              ))}
              {["Consumo (UYU)", "Consumo (USD)", "Impresiones", "Resultados"].map((h) => (
                <th key={h} className="text-right">
                  {h}
                </th>
              ))}
              <th>Archivo</th>
              <th className="text-right">Fila</th>
            </>
          }
        >
          {cur.map((r) => (
            <tr key={r.id}>
              <td className="font-mono text-xs text-muted">{r.id}</td>
              <td className="whitespace-nowrap font-medium text-fg">{r.cuenta}</td>
              <td className="text-xs">{r.tipo}</td>
              <td className="whitespace-nowrap">{r.pais}</td>
              <td className="whitespace-nowrap text-xs">{r.periodo}</td>
              <td className="min-w-[200px] text-xs">{r.campana}</td>
              <td className="font-mono text-[11px] text-muted">{r.cuentaPublicitaria ?? "—"}</td>
              <td className={num}>{formatMoney(r.consumo, "UYU")}</td>
              <td className={num}>{formatMoney(r.consumo / rate, "USD")}</td>
              <td className={num}>{formatInt(r.impresiones ?? 0)}</td>
              <td className={num}>{r.resultados === null ? "—" : formatInt(r.resultados)}</td>
              <td className="whitespace-nowrap text-[11px] text-muted">{r.archivo}</td>
              <td className={num}>{r.fila}</td>
            </tr>
          ))}
        </Table>
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted">
          <span className="tabular">
            Página {Math.min(page, pages - 1) + 1} de {pages}
          </span>
          <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-full border border-line px-3 py-1 disabled:opacity-40">
            Anterior
          </button>
          <button disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="rounded-full border border-line px-3 py-1 disabled:opacity-40">
            Siguiente
          </button>
        </div>
      </Panel>
    </Section>
  );
}

/* ───────────── 9. Auditoría ───────────── */
const SEV: Record<string, string> = {
  alta: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  media: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  baja: "bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300",
  info: "bg-azar-50 text-azar dark:bg-azar/15 dark:text-azar-200",
};

export function Auditoria({ c }: { c: PautaCtx }) {
  const ct = control(c.data.originales);
  const [showOrig, setShowOrig] = useState(false);
  const registro = c.data.auditoria.filter((n) => ["Info", "Confirmado", "Corrección"].includes(n.categoria));
  const u = (v: number) => formatMoney(v, "UYU");
  return (
    <Section id="auditoria-sec" n={9} title="Auditoría de datos" subtitle="Qué se procesó, qué se excluyó y cómo se calculó.">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(
          [
            ["Archivos procesados", String(ct.archivos)],
            ["Hojas procesadas", String(ct.hojas)],
            ["Filas leídas", String(ct.filas)],
            ["Filas de total excluidas", String(ct.filas_total)],
            ["Suma bruta de archivos (UYU)", u(ct.suma_bruta)],
            ["Duplicado evitado (UYU)", u(ct.duplicado)],
            ["Consolidado sin duplicados (UYU)", u(c.data.filas.reduce((a, r) => a + r.consumo, 0))],
          ] as const
        ).map(([l, v]) => (
          <div key={l} className="card px-4 py-3">
            <dt className="text-[11px] text-muted">{l}</dt>
            <dd className="tabular mt-1 text-base font-bold text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4">
        <Panel title="Registro de procesamiento">
          <Table
            minWidth={420}
            head={
              <>
                <th>Tema</th>
                <th>Detalle</th>
              </>
            }
          >
            {registro.map((n) => (
              <tr key={n.id}>
                <td className="align-top font-medium text-fg">
                  {n.titulo}
                  <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase", SEV[n.severidad])}>{n.categoria}</span>
                </td>
                <td className="text-xs leading-relaxed text-muted [overflow-wrap:anywhere]">{n.detalle}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
      <Panel
        title="Filas originales de los archivos"
        subtitle="Valores tal como vienen en cada Excel, con el uso que se les dio."
        right={
          <button onClick={() => setShowOrig((s) => !s)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm text-fg hover:bg-card-muted">
            {showOrig ? "Ocultar" : `Ver ${c.data.originales.length} filas`}
            <ChevronDown className={cn("h-4 w-4 transition", showOrig && "rotate-180")} />
          </button>
        }
      >
        {showOrig && (
          <Table
            minWidth={1400}
            head={
              <>
                {["Id", "Archivo", "Hoja"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
                <th className="text-right">Fila</th>
                {["Cuenta publicitaria", "Campaña", "Día", "Inicio informe", "Fin informe"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
                {["Consumo (UYU)", "Impresiones", "Alcance", "Resultados"].map((h) => (
                  <th key={h} className="text-right">
                    {h}
                  </th>
                ))}
                <th>Uso</th>
              </>
            }
          >
            {c.data.originales.map((r) => (
              <tr key={r.id} className={cn(r.estado !== "Usado" && "opacity-60")}>
                <td className="font-mono text-xs text-muted">{r.id}</td>
                <td className="whitespace-nowrap text-[11px]">{r.archivo}</td>
                <td className="whitespace-nowrap text-[11px] text-muted">{r.hoja}</td>
                <td className={num}>{r.fila}</td>
                <td className="font-mono text-[11px] text-muted">{r.cuentaPublicitaria || "—"}</td>
                <td className="min-w-[180px] text-xs">{r.campana}</td>
                <td className="whitespace-nowrap text-xs">{r.dia || "—"}</td>
                <td className="whitespace-nowrap text-xs">{r.inicioInforme}</td>
                <td className="whitespace-nowrap text-xs">{r.finInforme}</td>
                <td className={num}>{formatMoney(Number(r.consumo), "UYU")}</td>
                <td className={num}>{formatInt(Number(r.impresiones))}</td>
                <td className={num}>{formatInt(Number(r.alcance))}</td>
                <td className={num}>{r.resultados === null || (r.resultados as unknown) === "" ? "—" : formatInt(Number(r.resultados))}</td>
                <td className={cn("min-w-[200px] text-xs", r.estado === "Usado" ? "text-fg" : "text-muted")}>{r.estado}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </Section>
  );
}

/* ───────────── 10. Cómo actualizar ───────────── */
export function Actualizar() {
  const pasos = [
    "En el Administrador de anuncios de Meta, exporta cada cuenta publicitaria por separado con Desglose → Por tiempo → Día. Con datos por día se puede separar cualquier semana sin supuestos.",
    "Incluye las columnas: Nombre e ID de la cuenta, Nombre de la campaña, Día, Monto gastado, Impresiones, Alcance, Frecuencia, Clics (todos), CTR, CPC y Resultados.",
    "Usa como rango el día 1 del mes hasta el último día cerrado. Evita rangos que pasen la fecha de corte.",
    "Nombra los archivos con el perfil, el país y el rango, por ejemplo P282-CAM_2026-10-01_a_2026-10-18.xlsx.",
    'Comparte los Excel y pide "actualiza la pauta de octubre": se reemplazan los datos de esta sección y se conservan el diseño, los filtros y la auditoría.',
    "Revisa la sección de auditoría antes de compartir: ahí aparecen duplicados, faltantes y supuestos nuevos.",
  ];
  return (
    <Section id="actualizar" n={10} title="Cómo actualizar con nuevos reportes">
      <Panel>
        <ol className="space-y-3">
          {pasos.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-fg">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-azar text-xs font-semibold text-white">{i + 1}</span>
              {p}
            </li>
          ))}
        </ol>
      </Panel>
    </Section>
  );
}
