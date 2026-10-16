"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Moon, RefreshCw, Sun } from "lucide-react";
import type { DataPayload } from "@/lib/types";
import { useRelativeTime } from "@/lib/use-dashboard-data";
import { cn } from "./ui";

interface Props {
  meta?: DataPayload["meta"];
  refreshing?: boolean;
  /** Sin onRefresh no se muestra el botón "Actualizar ahora" (p. ej. reportes estáticos). */
  onRefresh?: () => void;
  /** Texto bajo el título; por defecto el de la sección de recargas. */
  subtitle?: string;
  dark: boolean;
  onToggleTheme: () => void;
  children?: React.ReactNode;
}

const iconBtn =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 transition hover:bg-white/[0.12] hover:text-white";

const TABS = [
  { href: "/", label: "Recargas" },
  { href: "/pauta", label: "Pauta Octubre" },
];

export function Header({ meta, refreshing = false, onRefresh, subtitle = "Meta Ads · Centroamérica", dark, onToggleTheme, children }: Props) {
  const updated = useRelativeTime(meta?.fetchedAt);
  const pathname = usePathname();
  return (
    <header className="relative z-40 md:sticky md:top-0 border-b border-white/5 bg-ink/95 text-white backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/logo.png" alt="Azar Latino" width={40} height={40} className="h-10 w-10 rounded-xl ring-1 ring-white/10" priority />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-base font-semibold tracking-tight">
                Azar Latino <span className="font-normal text-white/50">· Control de inversión</span>
              </p>
              <p className="truncate text-xs text-white/45">
                {subtitle}
                {meta?.source === "mock" && <span className="ml-2 rounded-full bg-azar/20 px-2 py-0.5 text-[10px] font-medium text-azar-200">Datos de ejemplo</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {meta && (
              <span className="hidden text-xs text-white/50 md:inline" title={new Date(meta.fetchedAt).toLocaleString("es")}>
                Última actualización {updated}
              </span>
            )}
            {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-azar px-4 text-sm font-medium text-white shadow-lg shadow-azar/20 transition hover:bg-azar-bright disabled:opacity-70"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Actualizar ahora</span>
            </button>
            )}
            <button onClick={onToggleTheme} className={iconBtn} aria-label="Cambiar tema" title={dark ? "Modo claro" : "Modo oscuro"}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <form action="/api/logout" method="post">
              <button className={iconBtn} aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
        {meta && <p className="-mt-2 text-xs text-white/50 md:hidden">Última actualización {updated}</p>}
        <nav className="flex gap-1 border-b border-white/10" aria-label="Secciones">
          {TABS.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium transition",
                  active ? "border-azar text-white" : "border-transparent text-white/50 hover:text-white",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </header>
  );
}
