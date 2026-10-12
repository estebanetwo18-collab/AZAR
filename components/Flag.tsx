import { Flag as FlagIcon, Globe2 } from "lucide-react";
import { countryInfo } from "@/lib/countries";
import { cn } from "./ui";

/** Banderas simplificadas en SVG (sin dependencias ni imágenes externas). */
const FLAGS: Record<string, React.ReactNode> = {
  CR: (
    <>
      <rect width="30" height="20" fill="#002B7F" />
      <rect y="3.33" width="30" height="13.34" fill="#fff" />
      <rect y="6.67" width="30" height="6.66" fill="#CE1126" />
    </>
  ),
  GT: (
    <>
      <rect width="30" height="20" fill="#4997D0" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <circle cx="15" cy="10" r="2.6" fill="#6C9B3A" opacity="0.85" />
    </>
  ),
  PY: (
    <>
      <rect width="30" height="20" fill="#D52B1E" />
      <rect y="6.67" width="30" height="6.66" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#0038A8" />
      <circle cx="15" cy="10" r="2.2" fill="none" stroke="#0038A8" strokeWidth="0.8" />
    </>
  ),
  ARG: (
    <>
      <rect width="30" height="20" fill="#74ACDF" />
      <rect y="6.67" width="30" height="6.66" fill="#fff" />
      <circle cx="15" cy="10" r="2" fill="#F6B40E" />
    </>
  ),
  HN: (
    <>
      <rect width="30" height="20" fill="#0073CF" />
      <rect y="6.67" width="30" height="6.66" fill="#fff" />
      <g fill="#0073CF">
        <circle cx="15" cy="10" r="0.9" />
        <circle cx="11.5" cy="8.6" r="0.7" />
        <circle cx="11.5" cy="11.4" r="0.7" />
        <circle cx="18.5" cy="8.6" r="0.7" />
        <circle cx="18.5" cy="11.4" r="0.7" />
      </g>
    </>
  ),
};

export function Flag({ country, name, size = 20, className }: { country: string; name?: string; size?: number; className?: string }) {
  const info = countryInfo(country, name);
  const box = cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", className);
  if (info.icon === "flag" && FLAGS[country]) {
    return (
      <span className={cn(box, "ring-1 ring-black/10 dark:ring-white/10")} style={{ width: size, height: size }} title={info.name}>
        <svg viewBox="5 0 20 20" width={size} height={size} aria-hidden>
          {FLAGS[country]}
        </svg>
      </span>
    );
  }
  const Icon = info.icon === "globe" ? Globe2 : FlagIcon;
  return (
    <span
      className={cn(box, info.icon === "globe" ? "bg-azar text-white" : "bg-card-muted text-muted ring-1 ring-line")}
      style={{ width: size, height: size }}
      title={info.name}
    >
      <Icon style={{ width: size * 0.62, height: size * 0.62 }} />
    </span>
  );
}
