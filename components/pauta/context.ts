import { formatInt, formatMoney } from "@/lib/format";
import { comparables, match, stats, type PautaFilters, type PautaPayload, type PautaRow, type Stats } from "@/lib/pauta";

/** Todo lo que necesitan las secciones: datos, filtros y un getter de estadísticas cacheado. */
export interface PautaCtx {
  data: PautaPayload;
  f: PautaFilters;
  rate: number;
  rows: PautaRow[];
  comp: string[];
  cuentas: string[];
  /** Estadísticas de la combinación país/cuenta/tipo ("all" = todos). */
  S: (pais: string, cuenta: string, tipo: string) => Stats;
  /** Igual que S pero siempre en consumo (para textos y hallazgos). */
  SC: (pais: string, cuenta: string, tipo: string) => Stats;
  /** Estadísticas con los filtros actuales. */
  R: Stats;
  /** Formatea un valor de la métrica actual (moneda o impresiones). */
  fmt: (v: number | null | undefined) => string;
  /** Formatea consumo en la moneda actual, sin importar la métrica. */
  money: (v: number | null | undefined) => string;
  isImp: boolean;
  unit: string;
}

export function buildCtx(data: PautaPayload, f: PautaFilters): PautaCtx {
  const rate = data.tipoCambio.uyu_por_usd;
  const rows = data.filas;
  const comp = comparables(rows);
  const cache = new Map<string, Stats>();
  const getter = (ff: Pick<PautaFilters, "metrica" | "currency">) => (pais: string, cuenta: string, tipo: string) => {
    const k = `${pais}|${cuenta}|${tipo}|${ff.metrica}|${ff.currency}`;
    let s = cache.get(k);
    if (!s) {
      s = stats(rows.filter((r) => match(r, pais, cuenta, tipo)), comp, ff, rate);
      cache.set(k, s);
    }
    return s;
  };
  const S = getter(f);
  const SC = getter({ metrica: "c", currency: f.currency });
  const isImp = f.metrica === "i";
  const money = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : formatMoney(v, f.currency));
  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined || !Number.isFinite(v) ? "—" : isImp ? formatInt(Math.round(v)) : formatMoney(v, f.currency);
  return {
    data,
    f,
    rate,
    rows,
    comp,
    cuentas: [...new Set(rows.map((r) => r.cuenta))].sort(),
    S,
    SC,
    R: S(f.pais, f.cuenta, f.tipo),
    fmt,
    money,
    isImp,
    unit: isImp ? "impresiones" : f.currency,
  };
}

/** Fracción → "+40.6%". */
export function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = Math.abs(v * 100).toFixed(1);
  return `${v > 0.0005 ? "+" : v < -0.0005 ? "−" : ""}${s}%`;
}

export const share = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(1)}%`;

export const tone = (v: number | null | undefined) =>
  v === null || v === undefined ? "neu" : v > 0.0005 ? "pos" : v < -0.0005 ? "neg" : "neu";
