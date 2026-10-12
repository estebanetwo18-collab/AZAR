import type { DatePreset, GroupBy } from "./types";

export const TIME_ZONE = "America/Costa_Rica";

/** Fecha de hoy (yyyy-mm-dd) en Costa Rica, independiente de la zona del navegador o servidor. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (t: number) => new Date(t).toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  return fromUTC(toUTC(iso) + days * 86400000);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86400000);
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}

export function endOfMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return fromUTC(Date.UTC(y, m, 0));
}

/** Lunes de la semana de la fecha. */
export function startOfWeek(iso: string): string {
  const dow = new Date(toUTC(iso)).getUTCDay();
  return addDays(iso, -((dow + 6) % 7));
}

export function bucketKey(iso: string, groupBy: GroupBy): string {
  if (groupBy === "week") return startOfWeek(iso);
  if (groupBy === "month") return iso.slice(0, 7);
  return iso;
}

export function nextBucket(key: string, groupBy: GroupBy): string {
  if (groupBy === "day") return addDays(key, 1);
  if (groupBy === "week") return addDays(key, 7);
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export interface DateRange {
  from: string;
  to: string;
}

/** Rango concreto de un preset. "all" usa los límites de los datos. */
export function presetRange(
  preset: DatePreset,
  today: string,
  custom: Partial<DateRange>,
  dataBounds: DateRange | null,
): DateRange | null {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "thisMonth":
      return { from: startOfMonth(today), to: today };
    case "lastMonth": {
      const prev = addDays(startOfMonth(today), -1);
      return { from: startOfMonth(prev), to: prev };
    }
    case "custom": {
      const from = custom.from ?? dataBounds?.from;
      const to = custom.to ?? dataBounds?.to;
      if (!from || !to) return null;
      return from <= to ? { from, to } : { from: to, to: from };
    }
    case "all":
    default:
      return dataBounds;
  }
}

/** Período anterior equivalente (mismo largo, inmediatamente antes). */
export function previousRange(range: DateRange, preset: DatePreset): DateRange | null {
  if (preset === "all") return null;
  if (preset === "thisMonth") {
    // Mes anterior hasta el mismo día del mes (comparación justa de mes en curso).
    const prevMonthEnd = addDays(range.from, -1);
    const prevStart = startOfMonth(prevMonthEnd);
    const len = daysBetween(range.from, range.to);
    const to = addDays(prevStart, len);
    return { from: prevStart, to: to > prevMonthEnd ? prevMonthEnd : to };
  }
  if (preset === "lastMonth") {
    const prevEnd = addDays(range.from, -1);
    return { from: startOfMonth(prevEnd), to: prevEnd };
  }
  const len = daysBetween(range.from, range.to) + 1;
  return { from: addDays(range.from, -len), to: addDays(range.from, -1) };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "14 abr 2026" */
export function formatDate(iso: string, withYear = true): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** Etiqueta corta de un bucket para ejes. */
export function formatBucket(key: string, groupBy: GroupBy, short = true): string {
  if (groupBy === "month") {
    const [y, m] = key.split("-").map(Number);
    return short ? `${MONTHS[m - 1]} ${String(y).slice(2)}` : `${MONTHS_LONG[m - 1]} ${y}`;
  }
  if (groupBy === "week") return short ? `Sem ${formatDate(key, false)}` : `Semana del ${formatDate(key)}`;
  return short ? formatDate(key, false) : formatDate(key);
}
