"use client";

import { AlertTriangle, RefreshCw, SearchX } from "lucide-react";
import { cn } from "./ui";

const Sk = ({ className }: { className?: string }) => <div className={cn("skeleton", className)} />;

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-[132px] bg-ink" />
      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Sk className="h-12 w-12 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Sk className="h-4 w-1/2" />
                  <Sk className="h-3 w-2/3" />
                </div>
              </div>
              <Sk className="h-10 w-3/4" />
              <Sk className="h-4 w-1/3" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
          <div className="card space-y-4 p-6">
            <Sk className="h-5 w-1/3" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Sk key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="card space-y-4 p-6">
            <Sk className="h-5 w-1/4" />
            <Sk className="h-9 w-1/3" />
            <div className="flex h-64 items-end gap-3">
              {[50, 70, 40, 90, 60, 75, 45, 80, 55, 65].map((h, i) => (
                <div key={i} className="skeleton flex-1 rounded-b-none rounded-t-xl" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
        <div className="card space-y-3 p-6">
          <Sk className="h-5 w-1/5" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Sk key={i} className="h-12" />
          ))}
        </div>
      </main>
    </div>
  );
}

export function EmptyState({ onClear, compact = false }: { onClear?: () => void; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-10" : "py-16")}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-azar-50 text-azar dark:bg-azar/15">
        <SearchX className="h-6 w-6" />
      </div>
      <p className="text-base font-semibold text-fg">No hay movimientos para estos filtros</p>
      <p className="mt-1 max-w-sm text-sm text-muted">Prueba con otro rango de fechas o quita algunos filtros.</p>
      {onClear && (
        <button
          onClick={onClear}
          className="mt-4 rounded-full bg-azar px-4 py-2 text-sm font-medium text-white transition hover:bg-azar-bright"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, hint, onRetry }: { message: string; hint?: string; onRetry: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-fg">{message}</h2>
      {hint && <p className="mt-2 text-sm leading-relaxed text-muted">{hint}</p>}
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-azar px-5 py-2.5 text-sm font-medium text-white transition hover:bg-azar-bright"
      >
        <RefreshCw className="h-4 w-4" /> Reintentar
      </button>
    </div>
  );
}
