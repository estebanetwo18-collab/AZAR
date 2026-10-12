"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("card", className)}>{children}</section>;
}

export function CardTitle({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** Badge pill de variación: "+3.2% ↑". */
export function DeltaBadge({ value, inverted = false, onDark = false }: { value: number | null; inverted?: boolean; onDark?: boolean }) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
          onDark ? "bg-white/15 text-white/80" : "bg-card-muted text-muted",
        )}
        title="Sin período anterior para comparar"
      >
        <Minus className="h-3 w-3" /> s/c
      </span>
    );
  }
  const up = value >= 0;
  const good = inverted ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        onDark
          ? "bg-white text-azar"
          : good
            ? "bg-azar-50 text-azar dark:bg-azar/15 dark:text-azar-bright"
            : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
      )}
    >
      {up ? "+" : ""}
      {value.toFixed(1)}%
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Toggle tipo pill; la opción activa va en naranja sólido. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  variant = "light",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  variant?: "light" | "dark";
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full p-1",
        variant === "dark" ? "bg-white/10" : "border border-line bg-card",
      )}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-full font-medium transition-colors",
              size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
              active
                ? "text-white"
                : variant === "dark"
                  ? "text-white/70 hover:text-white"
                  : "text-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-azar shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Popover simple con cierre al hacer clic fuera o con Escape. */
export function Popover({
  trigger,
  children,
  align = "left",
  width = "w-72",
}: {
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      {trigger(open, () => setOpen((o) => !o))}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className={cn(
              "absolute z-50 mt-2 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-card p-2 text-fg shadow-xl shadow-black/10",
              width,
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
