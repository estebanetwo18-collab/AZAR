import type { Currency, DatePreset, Filters, GroupBy } from "./types";

export const DEFAULT_FILTERS: Filters = {
  preset: "all",
  countries: [],
  types: [],
  accounts: [],
  currency: "UYU",
  groupBy: "day",
};

const PRESETS: DatePreset[] = ["all", "today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "custom"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const PRESET_LABELS: Record<DatePreset, string> = {
  all: "Todo el historial",
  today: "Hoy",
  yesterday: "Ayer",
  last7: "Últimos 7 días",
  last30: "Últimos 30 días",
  thisMonth: "Este mes",
  lastMonth: "Mes pasado",
  custom: "Personalizado",
};

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

export function filtersFromParams(p: URLSearchParams): Filters {
  const preset = p.get("rango") as DatePreset | null;
  const cur = p.get("moneda")?.toUpperCase() as Currency | undefined;
  const group = p.get("agrupar") as GroupBy | null;
  const from = p.get("desde") ?? undefined;
  const to = p.get("hasta") ?? undefined;
  return {
    preset: preset && PRESETS.includes(preset) ? preset : DEFAULT_FILTERS.preset,
    from: from && ISO.test(from) ? from : undefined,
    to: to && ISO.test(to) ? to : undefined,
    countries: list(p.get("pais")),
    types: list(p.get("tipo")),
    accounts: list(p.get("cuenta")),
    currency: cur === "USD" ? "USD" : "UYU",
    groupBy: group === "week" || group === "month" ? group : "day",
  };
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.preset !== DEFAULT_FILTERS.preset) p.set("rango", f.preset);
  if (f.preset === "custom") {
    if (f.from) p.set("desde", f.from);
    if (f.to) p.set("hasta", f.to);
  }
  if (f.countries.length) p.set("pais", f.countries.join(","));
  if (f.types.length) p.set("tipo", f.types.join(","));
  if (f.accounts.length) p.set("cuenta", f.accounts.join(","));
  if (f.currency !== DEFAULT_FILTERS.currency) p.set("moneda", f.currency);
  if (f.groupBy !== "day") p.set("agrupar", f.groupBy);
  return p;
}
