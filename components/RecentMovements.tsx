"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Search, SlidersHorizontal } from "lucide-react";
import { amountOf } from "@/lib/aggregations";
import { formatDate } from "@/lib/dates";
import { formatInt, formatMoney } from "@/lib/format";
import type { Currency, Movement } from "@/lib/types";
import { Flag } from "./Flag";
import { EmptyState } from "./states";
import { Card, Popover, cn } from "./ui";

type SortKey = "date" | "country" | "type" | "account" | "accountId" | "invoice" | "amount";
const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "date", label: "Fecha" },
  { key: "country", label: "País" },
  { key: "type", label: "Tipo" },
  { key: "account", label: "Cuenta" },
  { key: "accountId", label: "ID de la cuenta" },
  { key: "invoice", label: "Factura" },
  { key: "amount", label: "Importe", className: "text-right" },
];

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(rows: Movement[]) {
  const header = ["Fecha", "País", "Tipo", "Cuenta", "ID de la cuenta", "Factura", "Importe UYU", "Importe USD"];
  const lines = rows.map((r) =>
    [
      r.date.split("-").reverse().join("/"),
      r.countryName,
      r.type,
      r.account,
      // ="…" evita que Excel convierta el ID largo a notación científica.
      r.accountId ? `="${r.accountId}"` : "",
      r.invoice,
      r.uyu.toFixed(2),
      r.usd.toFixed(2),
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `azar-inversion-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RecentMovements({ rows, currency }: { rows: Movement[]; currency: Currency }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lo = min ? Number(min) : -Infinity;
    const hi = max ? Number(max) : Infinity;
    const out = rows.filter((r) => {
      const amt = amountOf(r, currency);
      if (amt < lo || amt > hi) return false;
      if (!q) return true;
      return [r.countryName, r.type, r.account, r.accountId, r.invoice, r.date, formatDate(r.date)].some((f) =>
        f.toLowerCase().includes(q),
      );
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (r: Movement): string | number => {
      switch (sort.key) {
        case "amount":
          return amountOf(r, currency);
        case "country":
          return r.countryName;
        default:
          return r[sort.key];
      }
    };
    return out.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es", { numeric: true });
      return c * dir || b.date.localeCompare(a.date);
    });
  }, [rows, query, sort, currency, min, max]);

  useEffect(() => setPage(0), [rows, query, min, max, pageSize]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "date" || key === "amount" ? "desc" : "asc" }));
  const localFilters = (min ? 1 : 0) + (max ? 1 : 0);

  return (
    <Card className="p-6">
      <div id="movimientos" className="scroll-mt-48" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-fg">Movimientos recientes</h2>
          <p className="text-sm text-muted">{formatInt(filtered.length)} movimientos</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="h-11 w-full rounded-2xl border border-line bg-card pl-10 pr-3 text-sm text-fg outline-none transition placeholder:text-muted focus:border-azar"
            />
          </div>
          <Popover
            align="right"
            width="w-64"
            trigger={(open, t) => (
              <button
                onClick={t}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-card px-4 text-sm font-medium text-fg transition hover:bg-card-muted",
                  (open || localFilters > 0) && "border-azar",
                )}
              >
                Filtro
                {localFilters > 0 && <span className="rounded-full bg-azar px-1.5 text-[10px] text-white">{localFilters}</span>}
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            )}
          >
            {() => (
              <div className="space-y-3 p-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Importe ({currency})</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    placeholder="Mínimo"
                    className="w-full rounded-xl border border-line bg-card-muted px-3 py-2 text-sm outline-none focus:border-azar"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    placeholder="Máximo"
                    className="w-full rounded-xl border border-line bg-card-muted px-3 py-2 text-sm outline-none focus:border-azar"
                  />
                </div>
                <button
                  onClick={() => {
                    setMin("");
                    setMax("");
                  }}
                  className="text-xs font-medium text-azar hover:text-azar-bright"
                >
                  Quitar filtro de importe
                </button>
              </div>
            )}
          </Popover>
          <button
            onClick={() => exportCsv(filtered)}
            disabled={!filtered.length}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-ink px-4 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50 dark:bg-white dark:text-ink dark:hover:bg-white/90"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState compact />
      ) : (
        <>
          <div className="scrollbar-thin mt-5 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="bg-card-muted text-left text-muted">
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={cn("px-4 py-3.5 font-medium", c.className)}>
                      <button
                        onClick={() => toggleSort(c.key)}
                        className={cn("inline-flex items-center gap-1 transition hover:text-fg", sort.key === c.key && "text-fg")}
                      >
                        {c.label}
                        {sort.key === c.key ? (
                          sort.dir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-azar" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-azar" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.map((r) => (
                  <tr key={r.id} className="border-t border-line transition-colors hover:bg-card-muted">
                    <td className="whitespace-nowrap px-4 py-3.5 text-fg">{formatDate(r.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="flex items-center gap-2 text-fg">
                        <Flag country={r.country} name={r.countryName} size={18} />
                        {r.countryName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-fg">
                        <span className={cn("h-1.5 w-1.5 rounded-full", r.type === "REGISTRO DIRECTO" ? "bg-azar" : r.type === "CALLCENTER" ? "bg-amber-400" : "bg-stone-400")} />
                        {r.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-fg">{r.account}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-muted">{r.accountId || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-fg">{r.invoice || "—"}</td>
                    <td className="tabular whitespace-nowrap px-4 py-3.5 text-right font-semibold text-fg">{formatMoney(amountOf(r, currency), currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <label className="flex items-center gap-2">
              Filas
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-xl border border-line bg-card px-2 py-1 text-fg outline-none"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-3">
              <span className="tabular">
                {formatInt(page * pageSize + 1)}–{formatInt(Math.min(filtered.length, (page + 1) * pageSize))} de {formatInt(filtered.length)}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg transition hover:bg-card-muted disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={page >= pages - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg transition hover:bg-card-muted disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
