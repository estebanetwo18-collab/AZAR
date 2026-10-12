import { bucketKey, daysBetween, nextBucket, presetRange, previousRange, type DateRange } from "./dates";
import type { Currency, Filters, GroupBy, Movement } from "./types";

export const amountOf = (r: Movement, currency: Currency) => (currency === "USD" ? r.usd : r.uyu);

export const sumOf = (rows: Movement[], currency: Currency) =>
  rows.reduce((acc, r) => acc + amountOf(r, currency), 0);

/** Variación porcentual; null si no hay base de comparación. */
export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function dataBounds(rows: Movement[]): DateRange | null {
  if (!rows.length) return null;
  let from = rows[0].date;
  let to = rows[0].date;
  for (const r of rows) {
    if (r.date < from) from = r.date;
    if (r.date > to) to = r.date;
  }
  return { from, to };
}

function matchesDimensions(r: Movement, f: Filters) {
  return (
    (!f.countries.length || f.countries.includes(r.country)) &&
    (!f.types.length || f.types.includes(r.type)) &&
    (!f.accounts.length || f.accounts.includes(r.account))
  );
}

const inRange = (r: Movement, range: DateRange) => r.date >= range.from && r.date <= range.to;

export interface FilteredData {
  range: DateRange | null;
  prevRange: DateRange | null;
  current: Movement[];
  previous: Movement[] | null;
}

export function applyFilters(rows: Movement[], f: Filters, today: string): FilteredData {
  const range = presetRange(f.preset, today, { from: f.from, to: f.to }, dataBounds(rows));
  const prevRange = range ? previousRange(range, f.preset) : null;
  const dims = rows.filter((r) => matchesDimensions(r, f));
  return {
    range,
    prevRange,
    current: range ? dims.filter((r) => inRange(r, range)) : [],
    previous: prevRange ? dims.filter((r) => inRange(r, prevRange)) : null,
  };
}

export const rangeDays = (range: DateRange | null) => (range ? daysBetween(range.from, range.to) + 1 : 0);

export interface CountryTotal {
  key: string;
  name: string;
  total: number;
  pct: number;
  count: number;
  accounts: number;
}

export function byCountry(rows: Movement[], currency: Currency): CountryTotal[] {
  const map = new Map<string, { name: string; total: number; count: number; accounts: Set<string> }>();
  for (const r of rows) {
    const e = map.get(r.country) ?? { name: r.countryName, total: 0, count: 0, accounts: new Set<string>() };
    e.total += amountOf(r, currency);
    e.count++;
    e.accounts.add(r.account);
    map.set(r.country, e);
  }
  const grand = sumOf(rows, currency) || 1;
  return [...map.entries()]
    .map(([key, e]) => ({
      key,
      name: e.name,
      total: e.total,
      pct: (e.total / grand) * 100,
      count: e.count,
      accounts: e.accounts.size,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface TypeTotal {
  type: string;
  total: number;
  pct: number;
  count: number;
}

export function byType(rows: Movement[], currency: Currency): TypeTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const e = map.get(r.type) ?? { total: 0, count: 0 };
    e.total += amountOf(r, currency);
    e.count++;
    map.set(r.type, e);
  }
  const grand = sumOf(rows, currency) || 1;
  return [...map.entries()]
    .map(([type, e]) => ({ type, total: e.total, count: e.count, pct: (e.total / grand) * 100 }))
    .sort((a, b) => b.total - a.total);
}

export interface AccountTotal {
  account: string;
  accountId: string;
  country: string;
  countryName: string;
  total: number;
  count: number;
  pct: number;
}

export function topAccounts(rows: Movement[], currency: Currency, limit = 8): AccountTotal[] {
  const map = new Map<string, Omit<AccountTotal, "pct">>();
  const countryTotals = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const e = map.get(r.account) ?? {
      account: r.account,
      accountId: r.accountId,
      country: r.country,
      countryName: r.countryName,
      total: 0,
      count: 0,
    };
    e.total += amountOf(r, currency);
    e.count++;
    map.set(r.account, e);
    // La cuenta puede usarse en varios países: se muestra el principal.
    const ct = countryTotals.get(r.account) ?? new Map<string, number>();
    ct.set(r.country, (ct.get(r.country) ?? 0) + amountOf(r, currency));
    countryTotals.set(r.account, ct);
  }
  const grand = sumOf(rows, currency) || 1;
  return [...map.values()]
    .map((e) => {
      const ct = [...(countryTotals.get(e.account) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
      const main = rows.find((r) => r.account === e.account && r.country === ct[0]?.[0]);
      return {
        ...e,
        country: main?.country ?? e.country,
        countryName: main?.countryName ?? e.countryName,
        pct: (e.total / grand) * 100,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export interface SeriesPoint {
  key: string;
  total: number;
  count: number;
  /** Total por país (clave = código de país). */
  countries: Record<string, number>;
}

/** Serie temporal con todos los buckets del rango (los vacíos en 0) para que las barras no salten. */
export function timeSeries(rows: Movement[], groupBy: GroupBy, range: DateRange | null, currency: Currency): SeriesPoint[] {
  if (!range) return [];
  const points = new Map<string, SeriesPoint>();
  const first = bucketKey(range.from, groupBy);
  const last = bucketKey(range.to, groupBy);
  let k = first;
  let guard = 0;
  while (k <= last && guard++ < 2000) {
    points.set(k, { key: k, total: 0, count: 0, countries: {} });
    k = nextBucket(k, groupBy);
  }
  for (const r of rows) {
    const p = points.get(bucketKey(r.date, groupBy));
    if (!p) continue;
    const v = amountOf(r, currency);
    p.total += v;
    p.count++;
    p.countries[r.country] = (p.countries[r.country] ?? 0) + v;
  }
  return [...points.values()];
}

/** Opciones disponibles para los filtros (sobre todos los datos, sin filtrar). */
export function filterOptions(rows: Movement[]) {
  const countries = new Map<string, { key: string; name: string; total: number }>();
  const types = new Map<string, number>();
  const accounts = new Map<string, number>();
  for (const r of rows) {
    const c = countries.get(r.country) ?? { key: r.country, name: r.countryName, total: 0 };
    c.total += r.usd;
    countries.set(r.country, c);
    types.set(r.type, (types.get(r.type) ?? 0) + 1);
    accounts.set(r.account, (accounts.get(r.account) ?? 0) + 1);
  }
  return {
    countries: [...countries.values()].sort((a, b) => b.total - a.total),
    types: [...types.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
    accounts: [...accounts.keys()].sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
  };
}

export type FilterOptions = ReturnType<typeof filterOptions>;
