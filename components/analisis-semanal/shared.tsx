"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { countryColor } from "@/lib/countries";
import { cn } from "../ui";
import type { Fmt } from "./format";

export const PAIS_NOMBRE: Record<string, string> = { CR: "Costa Rica", GT: "Guatemala", HN: "Honduras" };

/** Punto de color + código; el color sale del dashboard (mismo color por país en todas las pestañas). */
export function PaisTag({ p, dark, full }: { p: string; dark: boolean; full?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-fg">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: countryColor(p, 0, dark) }} aria-hidden />
      {p}
      {full && <span className="font-normal text-muted">{PAIS_NOMBRE[p] ?? p}</span>}
    </span>
  );
}

/** Estilo fijo por cuenta (no depende del color): P282 sólido, P287 rayado, P321 contorno. */
export function AccSwatch({ id, size = 11 }: { id: string; size?: number }) {
  const s = { width: size, height: size };
  if (id === "P287")
    return (
      <i
        aria-hidden
        className="inline-block shrink-0 rounded-[2px] border border-stone-500"
        style={{ ...s, background: "repeating-linear-gradient(135deg, #8E8E8E 0 2px, transparent 2px 4px)" }}
      />
    );
  if (id === "P321") return <i aria-hidden className="inline-block shrink-0 rounded-full border-2 border-stone-500" style={s} />;
  return <i aria-hidden className="inline-block shrink-0 rounded-[2px] bg-stone-400" style={s} />;
}

export function AccTag({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-xs text-fg">
      <AccSwatch id={id} />
      {id}
    </span>
  );
}

/** Relleno de barra por cuenta (para barras de distribución). */
export function accFill(id: string): React.CSSProperties {
  if (id === "P287") return { background: "repeating-linear-gradient(135deg, #8E8E8E 0 3px, #7a7a7a 3px 6px)" };
  if (id === "P321") return { background: "#6A6A6A", color: "#EDEDED" };
  return { background: "#BDBDBD" };
}

export function NA({ children = "No disponible en el reporte" }: { children?: ReactNode }) {
  return <span className="text-xs italic text-muted">{children}</span>;
}

type TagKind = "good" | "bad" | "warn" | "mut";
export function Tag({ kind, children }: { kind: TagKind; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        kind === "good" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        kind === "bad" && "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
        kind === "warn" && "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
        kind === "mut" && "bg-card-muted text-muted ring-1 ring-line",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Tooltip accesible: aparece con el mouse y también con el foco del teclado (Tab).
 * El contenido queda en aria-describedby para lectores de pantalla.
 */
type TipPos = { x: number; y: number; below: boolean };

/** Posición fija sobre (o bajo, si no hay espacio) el elemento, sin salirse de la pantalla. */
function placeTip(el: HTMLElement | null): TipPos | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const below = r.top < 90;
  return { x: Math.min(Math.max(r.left + r.width / 2, 140), window.innerWidth - 140), y: below ? r.bottom + 8 : r.top - 8, below };
}

export function Hint({ tip, children, className, style, as = "span" }: { tip: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties; as?: "span" | "div" }) {
  const id = useId();
  const ref = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<TipPos | null>(null);
  const open = pos !== null;
  useEffect(() => {
    if (!open) return;
    // Con scroll (incluido el que provoca el foco del teclado) el tooltip sigue al elemento.
    const follow = () => setPos(placeTip(ref.current));
    window.addEventListener("scroll", follow, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", follow, { capture: true });
  }, [open]);
  const Tag = as;
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLSpanElement>}
      tabIndex={0}
      aria-describedby={id}
      className={cn("relative outline-none focus-visible:ring-2 focus-visible:ring-azar", className)}
      style={style}
      onMouseEnter={(e) => setPos(placeTip(e.currentTarget))}
      onMouseLeave={() => setPos(null)}
      onFocus={(e) => setPos(placeTip(e.currentTarget))}
      onBlur={() => setPos(null)}
      onKeyDown={(e) => e.key === "Escape" && setPos(null)}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={
          pos
            ? "pointer-events-none fixed z-[60] w-max max-w-[260px] whitespace-normal rounded-xl bg-ink px-3 py-2 text-left font-sans text-xs font-normal leading-relaxed text-white shadow-xl ring-1 ring-white/10"
            : "sr-only"
        }
        style={pos ? { left: pos.x, top: pos.y, transform: `translate(-50%, ${pos.below ? "0" : "-100%"})` } : undefined}
      >
        {tip}
      </span>
    </Tag>
  );
}

const TOKEN = /\{\{([mipfx]):(-?[\d.eE+-]+)\}\}|\*\*([^*]+)\*\*/g;

/** Texto del JSON con marcas numéricas ({{m:…}} etc.) y **negrita**, formateado según la moneda elegida. */
export function Rich({ text, fmt }: { text: string; fmt: Fmt }) {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    if (m[3] !== undefined) {
      out.push(<b key={k++} className="font-semibold text-fg">{<Rich text={m[3]} fmt={fmt} />}</b>);
    } else {
      const v = Number(m[2]);
      const s = m[1] === "m" ? fmt.money(v) : m[1] === "i" ? fmt.int(v) : m[1] === "p" ? fmt.pct(v) : m[1] === "f" ? fmt.freq(v) : fmt.times(v);
      out.push(
        <span key={k++} className="tabular font-medium text-fg">
          {s}
        </span>,
      );
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
