"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, ChevronDown, Globe2, Layers, Search, Wallet, X } from "lucide-react";
import { PRESET_LABELS } from "@/lib/filters";
import { formatDate, type DateRange } from "@/lib/dates";
import type { FilterOptions } from "@/lib/aggregations";
import type { DatePreset, Filters } from "@/lib/types";
import { Flag } from "./Flag";
import { Popover, Segmented, cn } from "./ui";

interface Props {
  filters: Filters;
  options: FilterOptions;
  range: DateRange | null;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

const pill =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.12]";

function Trigger({ icon, label, count, open, onClick }: { icon: ReactNode; label: string; count?: number; open: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(pill, open && "bg-white/[0.14]", count ? "border-azar/60" : "")}>
      <span className="text-white/60">{icon}</span>
      <span className="max-w-[180px] truncate">{label}</span>
      {!!count && (
        <span className="tabular rounded-full bg-azar px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{count}</span>
      )}
      <ChevronDown className={cn("h-4 w-4 text-white/50 transition", open && "rotate-180")} />
    </button>
  );
}

interface Option {
  value: string;
  label: string;
  icon?: ReactNode;
}

function MultiSelect({
  icon,
  label,
  allLabel,
  options,
  selected,
  onChange,
  searchable = false,
}: {
  icon: ReactNode;
  label: string;
  allLabel: string;
  options: Option[];
  selected: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options),
    [q, options],
  );
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const text =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${label} (${selected.length})`;

  return (
    <Popover
      trigger={(open, t) => <Trigger icon={icon} label={text} count={selected.length > 1 ? selected.length : undefined} open={open} onClick={t} />}
    >
      {() => (
        <div>
          {searchable && (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}…`}
                className="w-full rounded-xl border border-line bg-card-muted py-2 pl-9 pr-3 text-sm outline-none focus:border-azar"
              />
            </div>
          )}
          <div className="scrollbar-thin max-h-72 overflow-y-auto">
            {shown.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted">Sin resultados</p>}
            {shown.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-card-muted"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition",
                      on ? "border-azar bg-azar text-white" : "border-line",
                    )}
                  >
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {o.icon}
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line px-2 pt-2 text-xs">
            <button className="font-medium text-muted hover:text-fg" onClick={() => onChange(shown.map((o) => o.value))}>
              Seleccionar {q ? "resultados" : "todo"}
            </button>
            <button className="font-medium text-azar hover:text-azar-bright" onClick={() => onChange([])}>
              Limpiar
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

const PRESET_ORDER: DatePreset[] = ["all", "today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "custom"];

function DateFilter({ filters, range, onChange }: { filters: Filters; range: DateRange | null; onChange: Props["onChange"] }) {
  const label =
    filters.preset === "custom" && range ? `${formatDate(range.from)} – ${formatDate(range.to)}` : PRESET_LABELS[filters.preset];
  return (
    <Popover trigger={(open, t) => <Trigger icon={<Calendar className="h-4 w-4" />} label={label} open={open} onClick={t} />}>
      {(close) => (
        <div>
          {PRESET_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (p === "custom") onChange({ preset: "custom", from: range?.from, to: range?.to });
                else {
                  onChange({ preset: p, from: undefined, to: undefined });
                  close();
                }
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-card-muted",
                filters.preset === p && "font-semibold text-azar",
              )}
            >
              {PRESET_LABELS[p]}
              {filters.preset === p && <Check className="h-4 w-4" />}
            </button>
          ))}
          {filters.preset === "custom" && (
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line px-1 pt-3">
              <label className="text-xs text-muted">
                Desde
                <input
                  type="date"
                  value={filters.from ?? range?.from ?? ""}
                  onChange={(e) => e.target.value && onChange({ preset: "custom", from: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-line bg-card-muted px-2 py-1.5 text-sm text-fg outline-none focus:border-azar"
                />
              </label>
              <label className="text-xs text-muted">
                Hasta
                <input
                  type="date"
                  value={filters.to ?? range?.to ?? ""}
                  onChange={(e) => e.target.value && onChange({ preset: "custom", to: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-line bg-card-muted px-2 py-1.5 text-sm text-fg outline-none focus:border-azar"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}

export function FilterBar({ filters, options, range, onChange, onClear }: Props) {
  const countryName = (k: string) => options.countries.find((c) => c.key === k)?.name ?? k;

  const chips: { key: string; label: ReactNode; remove: () => void }[] = [
    ...(filters.preset !== "all"
      ? [
          {
            key: "date",
            label:
              filters.preset === "custom" && range
                ? `${formatDate(range.from)} – ${formatDate(range.to)}`
                : PRESET_LABELS[filters.preset],
            remove: () => onChange({ preset: "all", from: undefined, to: undefined }),
          },
        ]
      : []),
    ...filters.countries.map((c) => ({
      key: `c-${c}`,
      label: (
        <span className="flex items-center gap-1.5">
          <Flag country={c} name={countryName(c)} size={14} />
          {countryName(c)}
        </span>
      ),
      remove: () => onChange({ countries: filters.countries.filter((x) => x !== c) }),
    })),
    ...filters.types.map((t) => ({
      key: `t-${t}`,
      label: t,
      remove: () => onChange({ types: filters.types.filter((x) => x !== t) }),
    })),
    ...filters.accounts.map((a) => ({
      key: `a-${a}`,
      label: `Cuenta ${a}`,
      remove: () => onChange({ accounts: filters.accounts.filter((x) => x !== a) }),
    })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DateFilter filters={filters} range={range} onChange={onChange} />
        <MultiSelect
          icon={<Globe2 className="h-4 w-4" />}
          label="Países"
          allLabel="Todos los países"
          options={options.countries.map((c) => ({ value: c.key, label: c.name, icon: <Flag country={c.key} name={c.name} size={18} /> }))}
          selected={filters.countries}
          onChange={(countries) => onChange({ countries })}
        />
        <MultiSelect
          icon={<Layers className="h-4 w-4" />}
          label="Tipos"
          allLabel="Todos los tipos"
          options={options.types.map((t) => ({ value: t, label: t }))}
          selected={filters.types}
          onChange={(types) => onChange({ types })}
        />
        <MultiSelect
          icon={<Wallet className="h-4 w-4" />}
          label="Cuentas"
          allLabel="Todas las cuentas"
          options={options.accounts.map((a) => ({ value: a, label: a }))}
          selected={filters.accounts}
          onChange={(accounts) => onChange({ accounts })}
          searchable
        />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Segmented
            variant="dark"
            size="sm"
            value={filters.currency}
            onChange={(currency) => onChange({ currency })}
            options={[
              { value: "USD", label: "USD" },
              { value: "UYU", label: "UYU" },
            ]}
          />
          <Segmented
            variant="dark"
            size="sm"
            value={filters.groupBy}
            onChange={(groupBy) => onChange({ groupBy })}
            options={[
              { value: "day", label: "Día" },
              { value: "week", label: "Semana" },
              { value: "month", label: "Mes" },
            ]}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <AnimatePresence initial={false}>
                {chips.map((c) => (
                  <motion.span
                    key={c.key}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-azar/15 py-1 pl-3 pr-1 text-xs font-medium text-azar-200"
                  >
                    {c.label}
                    <button
                      onClick={c.remove}
                      className="rounded-full p-0.5 text-azar-200/80 hover:bg-white/10 hover:text-white"
                      aria-label="Quitar filtro"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              <button onClick={onClear} className="ml-1 text-xs font-medium text-white/60 underline-offset-4 hover:text-white hover:underline">
                Limpiar filtros
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
