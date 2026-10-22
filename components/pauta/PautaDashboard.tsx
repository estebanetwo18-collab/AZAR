"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { DEFAULT_PAUTA_FILTERS, PAISES, type Metrica, type PautaFilters, type PautaPayload, type Periodo } from "@/lib/pauta";
import type { Currency } from "@/lib/types";
import { useTheme } from "@/lib/use-dashboard-data";
import { Flag } from "../Flag";
import { Header } from "../Header";
import { DashboardSkeleton, ErrorState } from "../states";
import { Segmented, cn } from "../ui";
import { buildCtx } from "./context";
import { countryKeyOf } from "./parts";
import { PresupuestoVsConsumo } from "./presupuesto";
import { PorCuenta, PorPais, Resumen, Semanal } from "./sections-a";
import { Actualizar, Auditoria, Consolidado, CuentasCam, Metricas, NoComparables } from "./sections-b";

const NAV = [
  ["resumen", "Resumen"],
  ["presupuesto", "Presupuesto"],
  ["semanal", "Semana 1 vs semana 2"],
  ["pais", "Por país"],
  ["cuenta", "Por cuenta"],
  ["cam", "Cuentas CAM"],
  ["metricas", "Métricas comunes"],
  ["nocomp", "Datos no comparables"],
  ["consolidado-sec", "Tabla consolidada"],
  ["auditoria-sec", "Auditoría"],
  ["actualizar", "Cómo actualizar"],
];

const selectCls =
  "rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-sm font-medium text-white outline-none hover:bg-white/[0.12] [&>option]:text-ink";
const pill = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
    active ? "bg-azar text-white" : "border border-white/10 bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white",
  );

function Filters({ f, set, cuentas, onReset }: { f: PautaFilters; set: (p: Partial<PautaFilters>) => void; cuentas: string[]; onReset: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Periodo" value={f.periodo} onChange={(e) => set({ periodo: e.target.value as Periodo })} className={selectCls}>
          <option value="all">Octubre 1–16 (todo)</option>
          <option value="w1">Semana 1 · 5–11 oct</option>
          <option value="w2">Semana 2 · 12–16 oct (parcial)</option>
          <option value="pre">1–4 oct</option>
        </select>
        <button className={pill(f.pais === "all")} onClick={() => set({ pais: "all" })}>
          Todos los países
        </button>
        {PAISES.map((p) => (
          <button key={p} className={pill(f.pais === p)} onClick={() => set({ pais: f.pais === p ? "all" : p })}>
            <Flag country={countryKeyOf(p)} size={16} />
            {p}
          </button>
        ))}
        <select aria-label="Cuenta" value={f.cuenta} onChange={(e) => set({ cuenta: e.target.value })} className={selectCls}>
          <option value="all">Todas las cuentas</option>
          {cuentas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select aria-label="Tipo de cuenta" value={f.tipo} onChange={(e) => set({ tipo: e.target.value })} className={selectCls}>
          <option value="all">CAM e individuales</option>
          <option value="CAM">Solo CAM</option>
          <option value="Individual">Solo individuales</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          variant="dark"
          size="sm"
          value={f.currency}
          onChange={(currency: Currency) => set({ currency })}
          options={[
            { value: "UYU", label: "Pesos $U" },
            { value: "USD", label: "Dólares US$" },
          ]}
        />
        <Segmented
          variant="dark"
          size="sm"
          value={f.metrica}
          onChange={(metrica: Metrica) => set({ metrica })}
          options={[
            { value: "c", label: "Consumo" },
            { value: "i", label: "Impresiones" },
          ]}
        />
        <button onClick={onReset} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white">
          <RotateCcw className="h-3.5 w-3.5" /> Limpiar filtros
        </button>
      </div>
      <nav className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Secciones del reporte">
        {NAV.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              history.replaceState(null, "", `#${id}`);
            }}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white/55 transition hover:bg-white/10 hover:text-white"
          >
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}

export function PautaDashboard() {
  const { dark, toggle } = useTheme();
  const [data, setData] = useState<PautaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<PautaFilters>(DEFAULT_PAUTA_FILTERS);
  const set = (p: Partial<PautaFilters>) => setF((x) => ({ ...x, ...p }));

  const load = () => {
    setError(null);
    fetch("/api/pauta", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) window.location.href = "/login";
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError("No se pudo cargar el reporte de pauta."));
  };
  useEffect(load, []);

  useEffect(() => {
    if (!data) return;
    const id = location.hash.slice(1);
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView(), 300);
  }, [data]);

  const ctx = useMemo(() => (data ? buildCtx(data, f) : null), [data, f]);

  if (!data && !error) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen">
      <Header subtitle="Meta Ads · Consumo de octubre (1–16 oct 2026)" dark={dark} onToggleTheme={toggle}>
        {ctx && <Filters f={f} set={set} cuentas={ctx.cuentas} onReset={() => setF({ ...DEFAULT_PAUTA_FILTERS, currency: f.currency })} />}
      </Header>

      {error || !ctx || !data ? (
        <main className="px-4">
          <ErrorState message={error ?? "Sin datos"} onRetry={load} />
        </main>
      ) : (
        <main className="mx-auto max-w-[1400px] space-y-12 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <h1 className="mr-2 text-2xl font-bold tracking-tight text-fg">{data.titulo}</h1>
            <span className="rounded-full bg-card px-3 py-1 ring-1 ring-line">Corte de información: 16 de octubre de 2026</span>
            <span className="rounded-full bg-card px-3 py-1 ring-1 ring-line">
              Moneda de los archivos: UYU · 1 USD = {data.tipoCambio.uyu_por_usd} UYU ({data.tipoCambio.referencia})
            </span>
            <span className="rounded-full bg-azar-50 px-3 py-1 text-azar ring-1 ring-azar/20 dark:bg-azar/15">Semana 2 parcial: 12–16 oct</span>
          </div>
          <Resumen c={ctx} />
          <PresupuestoVsConsumo c={ctx} dark={dark} />
          <Semanal c={ctx} dark={dark} />
          <PorPais c={ctx} onPais={(p) => set({ pais: f.pais === p ? "all" : p })} />
          <PorCuenta c={ctx} onCuenta={(x) => set({ cuenta: f.cuenta === x ? "all" : x })} />
          <CuentasCam c={ctx} dark={dark} />
          <Metricas c={ctx} />
          <NoComparables c={ctx} />
          <Consolidado c={ctx} />
          <Auditoria c={ctx} />
          <Actualizar />
        </main>
      )}
    </div>
  );
}
