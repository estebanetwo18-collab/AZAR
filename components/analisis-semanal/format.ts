import type { Currency } from "@/lib/types";

const en0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const en1 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const en2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const isNum = (v: number | null | undefined): v is number => v !== null && v !== undefined && Number.isFinite(v);

export interface Fmt {
  currency: Currency;
  rate: number;
  /** Monto (dato en UYU) en la moneda elegida: sin decimales desde $U100 / US$10, como la referencia. */
  money: (uyu: number | null | undefined) => string;
  /** Monto siempre en UYU con 2 decimales (verificación contra el Excel). */
  uyu: (v: number | null | undefined) => string;
  int: (v: number | null | undefined) => string;
  /** Proporción (0,25) → "25.0%". */
  pct: (v: number | null | undefined) => string;
  /** Valor ya en % (CTR) → "2.4%". */
  pct100: (v: number | null | undefined) => string;
  freq: (v: number | null | undefined) => string;
  times: (v: number | null | undefined) => string;
}

/** Formatos del análisis semanal con el estilo del dashboard ($U / $, separador en-US). */
export function makeFmt(currency: Currency, rate: number): Fmt {
  const prefix = currency === "USD" ? "US$" : "$U";
  const money = (v: number | null | undefined) => {
    if (!isNum(v)) return "—";
    const x = currency === "USD" ? v / rate : v;
    const lim = currency === "USD" ? 10 : 100;
    const sign = x < 0 ? "-" : "";
    return `${sign}${prefix}${Math.abs(x) >= lim ? en0.format(Math.abs(x)) : en2.format(Math.abs(x))}`;
  };
  return {
    currency,
    rate,
    money,
    uyu: (v) => (isNum(v) ? `$U${en2.format(v)}` : "—"),
    int: (v) => (isNum(v) ? en0.format(v) : "—"),
    pct: (v) => (isNum(v) ? `${en1.format(v * 100)}%` : "—"),
    pct100: (v) => (isNum(v) ? `${en1.format(v)}%` : "—"),
    freq: (v) => (isNum(v) ? en2.format(v) : "—"),
    times: (v) => (isNum(v) ? `${en1.format(v)}×` : "—"),
  };
}

/** Variación con flecha y lectura (mejor/peor), para KPIs y tablas con semana anterior. */
export function delta(v: number | null | undefined, lowerIsBetter = false): { text: string; good: boolean | null } {
  if (!isNum(v)) return { text: "—", good: null };
  const up = v > 0;
  const good = lowerIsBetter ? !up : up;
  return { text: `${up ? "▲" : "▼"} ${en1.format(Math.abs(v * 100))}% ${good ? "(mejor)" : "(peor)"}`, good };
}
