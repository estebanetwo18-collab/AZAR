import { resolveCountry } from "./countries";
import type { Currency } from "./types";

/** Fila consolidada del reporte de pauta de Meta Ads (consumo en UYU). */
export interface PautaRow {
  id: string;
  cuenta: string;
  /** "CAM" (campañas regionales) o "Individual". */
  tipo: string;
  pais: string;
  /** pre = 1–4 oct · w1 = semana 1 (5–11) · w2 = semana 2 (12–16). */
  bucket: "pre" | "w1" | "w2";
  /** yyyy-mm-dd; null en los reportes semanales sin desglose diario (P282). */
  dia: string | null;
  periodo: string;
  campana: string;
  cuentaPublicitaria: string | null;
  archivo: string;
  consumo: number;
  impresiones: number | null;
  alcance: number | null;
  resultados: number | null;
  tipoResultado: string | null;
}

export interface AuditNote {
  id: string;
  categoria: string;
  severidad: "alta" | "media" | "baja" | "info";
  titulo: string;
  detalle: string;
}

export interface PautaPayload {
  titulo: string;
  corte: string;
  moneda: "UYU";
  tipoCambio: { fecha: string; uyu_por_usd: number; referencia: string };
  semanas: Record<"pre" | "w1" | "w2", { label: string; dias: number }>;
  filas: PautaRow[];
  auditoria: AuditNote[];
}

export interface PautaFilters {
  pais: string; // "all" o clave de país (CR, GT, HN)
  tipo: string; // "all" | "CAM" | "Individual"
  cuenta: string; // "all" o código de cuenta
  currency: Currency;
}

export const countryKey = (pais: string) => resolveCountry(pais).key;

export function filterPauta(rows: PautaRow[], f: PautaFilters) {
  return rows.filter(
    (r) =>
      (f.pais === "all" || countryKey(r.pais) === f.pais) &&
      (f.tipo === "all" || r.tipo === f.tipo) &&
      (f.cuenta === "all" || r.cuenta === f.cuenta),
  );
}

/** Convierte un monto UYU a la moneda elegida con el tipo de cambio del reporte. */
export const toCurrency = (uyu: number, currency: Currency, rate: number) => (currency === "USD" ? uyu / rate : uyu);

const sum = <T,>(rows: T[], fn: (r: T) => number | null | undefined) => rows.reduce((a, r) => a + (fn(r) ?? 0), 0);

export function pautaSummary(rows: PautaRow[], p: PautaPayload) {
  const consumo = sum(rows, (r) => r.consumo);
  const impresiones = sum(rows, (r) => r.impresiones);
  const byBucket = (b: PautaRow["bucket"], set = rows) => sum(set.filter((r) => r.bucket === b), (r) => r.consumo);

  // Base comparable: cuentas con consumo en ambas semanas (igual que el reporte original).
  const cuentas = [...new Set(rows.map((r) => r.cuenta))];
  const comparable = cuentas.filter((c) => {
    const rs = rows.filter((r) => r.cuenta === c);
    return byBucket("w1", rs) > 0 && byBucket("w2", rs) > 0;
  });
  const compRows = rows.filter((r) => comparable.includes(r.cuenta));
  const w1 = byBucket("w1");
  const w2 = byBucket("w2");
  const promW1 = byBucket("w1", compRows) / p.semanas.w1.dias;
  const promW2 = byBucket("w2", compRows) / p.semanas.w2.dias;

  const resultTypes = new Map<string, { resultados: number; consumo: number }>();
  for (const r of rows) {
    if (!r.tipoResultado || r.resultados === null) continue;
    const e = resultTypes.get(r.tipoResultado) ?? { resultados: 0, consumo: 0 };
    e.resultados += r.resultados;
    e.consumo += r.consumo;
    resultTypes.set(r.tipoResultado, e);
  }

  return {
    consumo,
    impresiones,
    cpm: impresiones ? (sum(rows.filter((r) => r.impresiones), (r) => r.consumo) / impresiones) * 1000 : 0,
    pre: byBucket("pre"),
    w1,
    w2,
    promW1,
    promW2,
    variacion: promW1 ? ((promW2 - promW1) / promW1) * 100 : null,
    comparable,
    excluidas: cuentas.filter((c) => !comparable.includes(c)),
    /** Proyección de la semana 2 completa (7 días) al ritmo actual. No es consumo real. */
    proyeccionW2: (w2 / p.semanas.w2.dias) * 7,
    resultTypes: [...resultTypes.entries()]
      .map(([tipo, v]) => ({ tipo, ...v, costo: v.resultados ? v.consumo / v.resultados : 0 }))
      .sort((a, b) => b.consumo - a.consumo),
    semanalSinDia: sum(rows.filter((r) => !r.dia), (r) => r.consumo),
  };
}

export interface DailyPoint {
  dia: string;
  total: number;
  countries: Record<string, number>;
}

/** Consumo por día y país. Las filas semanales sin día (P282) no entran. */
export function pautaDaily(rows: PautaRow[]): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (let d = 1; d <= 16; d++) {
    const dia = `2026-10-${String(d).padStart(2, "0")}`;
    map.set(dia, { dia, total: 0, countries: {} });
  }
  for (const r of rows) {
    if (!r.dia) continue;
    const p = map.get(r.dia) ?? { dia: r.dia, total: 0, countries: {} };
    const k = countryKey(r.pais);
    p.total += r.consumo;
    p.countries[k] = (p.countries[k] ?? 0) + r.consumo;
    map.set(r.dia, p);
  }
  return [...map.values()].sort((a, b) => a.dia.localeCompare(b.dia));
}

export interface GroupTotal {
  key: string;
  label: string;
  tipo?: string;
  paises: string[];
  consumo: number;
  pct: number;
  impresiones: number;
  resultados: number;
  pre: number;
  w1: number;
  w2: number;
  /** Variación del promedio diario semana 2 vs semana 1; null sin base. */
  variacion: number | null;
}

function group(rows: PautaRow[], p: PautaPayload, keyOf: (r: PautaRow) => string, labelOf: (r: PautaRow) => string): GroupTotal[] {
  const total = sum(rows, (r) => r.consumo) || 1;
  const map = new Map<string, PautaRow[]>();
  for (const r of rows) map.set(keyOf(r), [...(map.get(keyOf(r)) ?? []), r]);
  return [...map.entries()]
    .map(([key, rs]) => {
      const consumo = sum(rs, (r) => r.consumo);
      const w1 = sum(rs.filter((r) => r.bucket === "w1"), (r) => r.consumo);
      const w2 = sum(rs.filter((r) => r.bucket === "w2"), (r) => r.consumo);
      const a = w1 / p.semanas.w1.dias;
      const b = w2 / p.semanas.w2.dias;
      return {
        key,
        label: labelOf(rs[0]),
        tipo: rs[0].tipo,
        paises: [...new Set(rs.map((r) => countryKey(r.pais)))],
        consumo,
        pct: (consumo / total) * 100,
        impresiones: sum(rs, (r) => r.impresiones),
        resultados: sum(rs, (r) => r.resultados),
        pre: sum(rs.filter((r) => r.bucket === "pre"), (r) => r.consumo),
        w1,
        w2,
        variacion: w1 > 0 && w2 > 0 ? ((b - a) / a) * 100 : null,
      };
    })
    .sort((x, y) => y.consumo - x.consumo);
}

export const pautaByCountry = (rows: PautaRow[], p: PautaPayload) => group(rows, p, (r) => countryKey(r.pais), (r) => resolveCountry(r.pais).name);
export const pautaByAccount = (rows: PautaRow[], p: PautaPayload) => group(rows, p, (r) => r.cuenta, (r) => r.cuenta);
export const pautaByCampaign = (rows: PautaRow[], p: PautaPayload) => group(rows, p, (r) => r.campana, (r) => r.campana);
