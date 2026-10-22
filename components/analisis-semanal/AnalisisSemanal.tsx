"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, FileWarning, RotateCcw } from "lucide-react";
import type { AnalisisPayload } from "@/lib/analisis-semanal/types";
import type { ApiError, Currency } from "@/lib/types";
import { useTheme } from "@/lib/use-dashboard-data";
import { Header } from "../Header";
import { DashboardSkeleton, ErrorState } from "../states";
import { Segmented, cn } from "../ui";
import { buildCtx } from "./context";
import { makeFmt } from "./format";
import { PorCuenta, PorPais, Resumen } from "./sections-a";
import { Anuncios, Creativo, Insights, Verificacion } from "./sections-b";

const NAV = [
  ["resumen", "Resumen"],
  ["pais", "Por país"],
  ["cuenta", "Por cuenta"],
  ["anuncios", "Anuncios"],
  ["creativo", "Creativo"],
  ["insights", "Insights"],
  ["verificacion", "Verificación"],
] as const;

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // Sin almacenamiento (modo privado): la preferencia dura solo esta visita.
  }
};

export function AnalisisSemanal() {
  const { dark, toggle } = useTheme();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const semanaParam = params.get("semana");

  const [payload, setPayload] = useState<AnalisisPayload | null | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [currency, setCurrency] = useState<Currency>("UYU");
  const [rate, setRate] = useState<number | null>(null);
  const [rateInput, setRateInput] = useState("");
  const [active, setActive] = useState<string>("resumen");

  const load = useCallback(() => {
    setError(null);
    fetch(`/api/analisis-semanal${semanaParam ? `?semana=${encodeURIComponent(semanaParam)}` : ""}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return;
        }
        const body = await r.json().catch(() => ({ error: "Respuesta inválida del servidor." }));
        if (!r.ok) setError(body as ApiError);
        else setPayload(body.semana ? (body as AnalisisPayload) : null);
      })
      .catch(() => setError({ error: "No se pudo conectar con el servidor.", hint: "Revisa tu conexión e inténtalo de nuevo." }));
  }, [semanaParam]);
  useEffect(load, [load]);

  // Preferencias de moneda y tasa (por navegador).
  useEffect(() => {
    const c = read("azarCur");
    if (c === "USD" || c === "UYU") setCurrency(c);
  }, []);
  const defaultRate = payload?.semana.meta.tipoCambio.uyuPorUsd ?? null;
  useEffect(() => {
    if (!defaultRate) return;
    const saved = parseFloat(read(`azarRate:${payload?.semana.meta.semana.inicio}`) ?? "");
    const r = saved > 1 ? saved : defaultRate;
    setRate(r);
    setRateInput(String(r));
  }, [defaultRate, payload?.semana.meta.semana.inicio]);

  const commitRate = () => {
    const r = parseFloat(rateInput.replace(",", "."));
    if (r > 1 && payload) {
      setRate(r);
      write(`azarRate:${payload.semana.meta.semana.inicio}`, String(r));
    } else setRateInput(String(rate ?? ""));
  };

  const ctx = useMemo(() => {
    if (!payload || !rate) return null;
    return buildCtx(payload.semana, makeFmt(currency, rate), dark);
  }, [payload, rate, currency, dark]);

  // Sección visible → resalta su enlace en la sub-navegación.
  useEffect(() => {
    if (!ctx) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    NAV.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ctx]);

  if (payload === undefined && !error) return <DashboardSkeleton />;

  const semanas = payload?.semanas ?? [];
  const meta = payload?.semana.meta;

  return (
    <div className="min-h-screen">
      <Header subtitle={`Meta Ads · Reporte Octubre 2026 · semana${meta ? ` ${meta.semana.etiqueta}` : ""}`} dark={dark} onToggleTheme={toggle}>
        {payload && meta && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-1.5 pl-3.5 pr-2 text-sm text-white">
                <CalendarRange className="h-4 w-4 text-white/60" />
                <span className="sr-only">Semana</span>
                <select
                  value={payload.semana.meta.semana.inicio}
                  onChange={(e) => router.replace(`${pathname}?semana=${e.target.value}`, { scroll: false })}
                  className="bg-transparent font-medium outline-none [&>option]:text-ink"
                >
                  {semanas.map((s) => (
                    <option key={s.id} value={s.id} disabled={!s.valida}>
                      Semana {s.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <Segmented
                variant="dark"
                size="sm"
                value={currency}
                onChange={(v: Currency) => {
                  setCurrency(v);
                  write("azarCur", v);
                }}
                options={[
                  { value: "UYU", label: "Pesos $U" },
                  { value: "USD", label: "Dólares US$" },
                ]}
              />
              <label className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
                1 USD =
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  inputMode="decimal"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  onBlur={commitRate}
                  onKeyDown={(e) => e.key === "Enter" && commitRate()}
                  aria-label="Tasa de cambio, pesos uruguayos por dólar"
                  className="w-16 rounded-md border border-white/15 bg-black/30 px-1.5 py-0.5 text-right font-mono text-xs text-white outline-none focus:border-azar"
                />
                UYU
                {meta.tipoCambio.confirmar && (
                  <span className="ml-1 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200" title={meta.tipoCambio.fuente}>
                    CONFIRMAR
                  </span>
                )}
                {rate !== defaultRate && (
                  <button
                    type="button"
                    onClick={() => {
                      setRate(defaultRate);
                      setRateInput(String(defaultRate));
                      write(`azarRate:${meta.semana.inicio}`, String(defaultRate));
                    }}
                    className="ml-1 rounded-full p-0.5 text-white/60 hover:text-white"
                    aria-label="Volver a la tasa de referencia"
                    title="Volver a la tasa de referencia"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>
            </div>
            <nav className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Secciones del análisis">
              {NAV.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={active === id ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.replaceState(null, "", `${location.pathname}${location.search}#${id}`);
                    setActive(id);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azar",
                    active === id ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </Header>

      {error ? (
        <main className="px-4">
          <ErrorState message={error.error} hint={error.hint} onRetry={load} />
        </main>
      ) : payload === null ? (
        <main className="px-4">
          <div className="card mx-auto mt-10 max-w-xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-azar-50 text-azar dark:bg-azar/15">
              <FileWarning className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-fg">Todavía no hay análisis semanales</h2>
            <p className="mt-2 text-sm text-muted">Agrega un archivo en data/analisis-semanal con el nombre del lunes de la semana (por ejemplo 2026-10-19.json) y vuelve a desplegar.</p>
          </div>
        </main>
      ) : ctx ? (
        <main className="mx-auto max-w-[1400px] space-y-12 px-4 py-6 sm:px-6 lg:px-8">
          {payload && payload.avisos.length > 0 && (
            <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <b>Hay archivos semanales con errores</b> y no se muestran: {payload.avisos.join(" · ")}
            </div>
          )}
          <Resumen c={ctx} />
          <PorPais c={ctx} />
          <PorCuenta c={ctx} />
          <Anuncios c={ctx} />
          <Creativo c={ctx} />
          <Insights c={ctx} />
          <Verificacion c={ctx} />
        </main>
      ) : null}
    </div>
  );
}
