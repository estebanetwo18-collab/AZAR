import type { Currency } from "./types";

const usd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uyu = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** USD "$2,263.69" · UYU "$U91,000" */
export function formatMoney(value: number, currency: Currency): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return currency === "USD" ? `${sign}$${usd.format(abs)}` : `${sign}$U${uyu.format(Math.round(abs))}`;
}

/** Versión compacta para ejes: "$2.3k", "$U1.2M". */
export function formatCompact(value: number, currency: Currency): string {
  const prefix = currency === "USD" ? "$" : "$U";
  const abs = Math.abs(value);
  const fmt = (n: number, s: string) => `${prefix}${n.toFixed(n < 10 && n % 1 !== 0 ? 1 : 0)}${s}`;
  if (abs >= 1e6) return fmt(value / 1e6, "M");
  if (abs >= 1e3) return fmt(value / 1e3, "k");
  return `${prefix}${Math.round(value)}`;
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export const formatInt = (n: number) => new Intl.NumberFormat("en-US").format(n);
