import type { Currency } from "./types";

/**
 * Pauta de Meta Ads de octubre (réplica del dashboard "Pauta Octubre Azar Latino").
 * Mismo criterio que el original: semana 1 = 5–11 oct (7 días), semana 2 = 12–16 oct (5 días),
 * variaciones solo con la base comparable (cuentas con consumo en ambas semanas).
 */

export type Bucket = "pre" | "w1" | "w2" | "nosplit";

export interface PautaRow {
  id: string;
  cuenta: string;
  /** "CAM" o "Individual". */
  tipo: string;
  pais: string;
  bucket: Bucket;
  /** yyyy-mm-dd; null en los reportes semanales sin desglose diario (P282). */
  dia: string | null;
  periodo: string;
  campana: string;
  cuentaPublicitaria: string | null;
  archivo: string;
  fila: number;
  consumo: number;
  impresiones: number | null;
  alcance: number | null;
  resultados: number | null;
  tipoResultado: string | null;
}

export interface OriginalRow {
  id: string;
  archivo: string;
  hoja: string;
  fila: number;
  cuentaPublicitaria: string | null;
  campana: string;
  dia: string | null;
  inicioInforme: string;
  finInforme: string;
  consumo: number;
  impresiones: number;
  alcance: number;
  resultados: number | null;
  estado: string;
  duplicado: number | null;
}

export interface AuditNote {
  id: string;
  categoria: string;
  severidad: "alta" | "media" | "baja" | "info";
  titulo: string;
  detalle: string;
}

/** Presupuesto mensual de CAM por país (USD y UYU, con su propia tasa). */
export interface Presupuesto {
  titulo: string;
  mes: string;
  desde: string;
  hasta: string;
  tipoCambio: { uyuPorUsd: number; referencia: string };
  paises: { pais: string; distribucion: number; usd: number; uyu: number }[];
  total: { usd: number; uyu: number };
}

export interface PautaPayload {
  presupuesto: Presupuesto;
  titulo: string;
  corte: string;
  moneda: "UYU";
  tipoCambio: { fecha: string; uyu_por_usd: number; referencia: string };
  filas: PautaRow[];
  auditoria: AuditNote[];
  originales: OriginalRow[];
}

export type Periodo = "all" | "w1" | "w2" | "pre";
export type Metrica = "c" | "i";

export interface PautaFilters {
  periodo: Periodo;
  pais: string; // "all" o nombre ("Costa Rica")
  cuenta: string; // "all" o código
  tipo: string; // "all" | "CAM" | "Individual"
  currency: Currency;
  metrica: Metrica;
}

export const DEFAULT_PAUTA_FILTERS: PautaFilters = {
  periodo: "all",
  pais: "all",
  cuenta: "all",
  tipo: "all",
  currency: "UYU",
  metrica: "c",
};

export const PAISES = ["Costa Rica", "Guatemala", "Honduras"];
export const DIAS_S1 = 7;
export const DIAS_S2 = 5;

export const PERIODO_LABEL: Record<Periodo, string> = {
  all: "Octubre 1–16",
  w1: "5–11 oct",
  w2: "12–16 oct",
  pre: "1–4 oct",
};

/** Valor de una fila según la métrica y moneda elegidas. */
export function valueOf(r: PautaRow, f: Pick<PautaFilters, "metrica" | "currency">, rate: number): number {
  if (f.metrica === "i") return r.impresiones ?? 0;
  return f.currency === "USD" ? r.consumo / rate : r.consumo;
}

const sum = (rows: PautaRow[], fn: (r: PautaRow) => number) => rows.reduce((a, r) => a + (fn(r) || 0), 0);

/** Cuentas con consumo en ambas semanas, sobre todos los datos (igual que el original). */
export function comparables(all: PautaRow[]): string[] {
  const cuentas = [...new Set(all.map((r) => r.cuenta))].sort();
  return cuentas.filter((c) => (["w1", "w2"] as Bucket[]).every((b) => all.some((r) => r.cuenta === c && r.bucket === b)));
}

export function match(r: PautaRow, pais: string, cuenta: string, tipo: string) {
  return (pais === "all" || r.pais === pais) && (cuenta === "all" || r.cuenta === cuenta) && (tipo === "all" || r.tipo === tipo);
}

export interface Stats {
  w1: number;
  w2: number;
  pre: number;
  nosplit: number;
  total: number;
  /** Base comparable. */
  cc_w1: number;
  cc_w2: number;
  prom_w1: number;
  prom_w2: number;
  promc_w1: number;
  promc_w2: number;
  dif_ritmo: number | null;
  var_abs: number | null;
  var_pct: number | null;
  var_ritmo: number | null;
  /** Variación de ritmo con todas las cuentas (incluye las nuevas en semana 2, p. ej. P345). */
  var_ritmo_todas: number | null;
  proy_s2: number | null;
  /** CPM por periodo (sobre consumo en la moneda elegida). */
  cpm: Record<"w1" | "w2" | "pre" | "total" | "cc_w1" | "cc_w2", number | null>;
  impresiones: Record<"w1" | "w2" | "pre" | "total" | "cc_w1" | "cc_w2", number>;
  n_cuentas: (b: Periodo) => number;
  n_paises: (b: Periodo) => number;
  paises: string[];
  /** Por qué no tiene variación (cuando aplica). */
  nota_var: string;
  get: (p: Periodo) => number;
}

export function stats(rows: PautaRow[], comp: string[], f: Pick<PautaFilters, "metrica" | "currency">, rate: number): Stats {
  const v = (r: PautaRow) => valueOf(r, f, rate);
  const money = (r: PautaRow) => (f.currency === "USD" ? r.consumo / rate : r.consumo);
  const imp = (r: PautaRow) => r.impresiones ?? 0;
  const inB = (b: Bucket, rs = rows) => rs.filter((r) => r.bucket === b);
  const compRows = rows.filter((r) => comp.includes(r.cuenta));
  const w1 = sum(inB("w1"), v);
  const w2 = sum(inB("w2"), v);
  const pre = sum(inB("pre"), v);
  const nosplit = sum(inB("nosplit"), v);
  const cc_w1 = sum(inB("w1", compRows), v);
  const cc_w2 = sum(inB("w2", compRows), v);
  const sets: Record<"w1" | "w2" | "pre" | "total" | "cc_w1" | "cc_w2", PautaRow[]> = {
    w1: inB("w1"),
    w2: inB("w2"),
    pre: inB("pre"),
    total: rows,
    cc_w1: inB("w1", compRows),
    cc_w2: inB("w2", compRows),
  };
  const cpm = {} as Stats["cpm"];
  const impresiones = {} as Stats["impresiones"];
  for (const [k, rs] of Object.entries(sets) as [keyof typeof sets, PautaRow[]][]) {
    const i = sum(rs, imp);
    impresiones[k] = i;
    cpm[k] = i > 0 ? (sum(rs, money) / i) * 1000 : null;
  }
  const byPeriod = (b: Periodo) => (b === "all" ? rows : inB(b)).filter((r) => r.consumo > 0);
  const nota_var =
    cc_w1 > 0 ? "" : nosplit > 0 ? "Sin desglose" : w1 > 0 ? "Sin reporte 12–16" : w2 > 0 ? "Nueva en semana 2" : "";
  const total = w1 + w2 + pre + nosplit;
  return {
    w1,
    w2,
    pre,
    nosplit,
    total,
    cc_w1,
    cc_w2,
    prom_w1: w1 / DIAS_S1,
    prom_w2: w2 / DIAS_S2,
    promc_w1: cc_w1 / DIAS_S1,
    promc_w2: cc_w2 / DIAS_S2,
    dif_ritmo: cc_w1 > 0 ? cc_w2 / DIAS_S2 - cc_w1 / DIAS_S1 : null,
    var_abs: cc_w1 > 0 ? cc_w2 - cc_w1 : null,
    var_pct: cc_w1 > 0 ? (cc_w2 - cc_w1) / cc_w1 : null,
    var_ritmo: cc_w1 > 0 ? cc_w2 / DIAS_S2 / (cc_w1 / DIAS_S1) - 1 : null,
    var_ritmo_todas: w1 > 0 ? w2 / DIAS_S2 / (w1 / DIAS_S1) - 1 : null,
    proy_s2: w2 > 0 ? (w2 / DIAS_S2) * 7 : null,
    cpm,
    impresiones,
    n_cuentas: (b) => new Set(byPeriod(b).map((r) => r.cuenta)).size,
    n_paises: (b) => new Set(byPeriod(b).map((r) => r.pais)).size,
    paises: [...new Set(rows.filter((r) => r.consumo > 0).map((r) => r.pais))].sort(),
    nota_var,
    get: (p) => (p === "all" ? total : p === "w1" ? w1 : p === "w2" ? w2 : pre),
  };
}

export interface DailyPoint {
  dia: string;
  value: number;
  bucket: Bucket;
}

/** Valor por día (solo perfiles con reporte diario; P282 no tiene día). */
export function daily(rows: PautaRow[], f: Pick<PautaFilters, "metrica" | "currency">, rate: number): DailyPoint[] {
  const all = [...new Set(rows.filter((r) => r.dia).map((r) => r.dia as string))];
  const dias = [...new Set([...all, ...Array.from({ length: 16 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`)])].sort();
  return dias.map((dia) => ({
    dia,
    value: sum(rows.filter((r) => r.dia === dia), (r) => valueOf(r, f, rate)),
    bucket: dia < "2026-10-05" ? "pre" : dia <= "2026-10-11" ? "w1" : "w2",
  }));
}

export interface ResultRow {
  cuenta: string;
  pais: string;
  tipoResultado: string | null;
  res_w1: number;
  res_w2: number;
  resultados: number;
  costo: number | null;
}

/** Resultados por cuenta y país (solo referencia: tipos distintos no se suman). */
export function resultados(rows: PautaRow[], currency: Currency, rate: number): ResultRow[] {
  const con = rows.filter((r) => r.resultados !== null && r.resultados !== undefined);
  const keys = [...new Set(con.map((r) => `${r.cuenta}|${r.pais}`))].sort();
  return keys.map((k) => {
    const [cuenta, pais] = k.split("|");
    const rs = con.filter((r) => r.cuenta === cuenta && r.pais === pais);
    const s = (b: Bucket | null, fn: (r: PautaRow) => number) => sum(b ? rs.filter((r) => r.bucket === b) : rs, fn);
    const res = s(null, (r) => r.resultados ?? 0);
    const gasto = s(null, (r) => r.consumo);
    return {
      cuenta,
      pais,
      tipoResultado: rs[0].tipoResultado,
      res_w1: s("w1", (r) => r.resultados ?? 0),
      res_w2: s("w2", (r) => r.resultados ?? 0),
      resultados: res,
      costo: res ? (currency === "USD" ? gasto / rate : gasto) / res : null,
    };
  });
}

/** Control de duplicados sobre las filas originales de los Excel. */
export function control(originales: OriginalRow[]) {
  const camp = originales.filter((r) => r.campana !== "(total)");
  return {
    archivos: new Set(originales.map((r) => r.archivo)).size,
    hojas: new Set(originales.map((r) => `${r.archivo}|${r.hoja}`)).size,
    filas: originales.length,
    filas_total: originales.length - camp.length,
    suma_bruta: camp.reduce((a, r) => a + Number(r.consumo), 0),
    duplicado: camp.reduce((a, r) => a + (Number(r.duplicado) || 0), 0),
  };
}

export const yJoin = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} y ${a[a.length - 1]}` : a.join(""));
