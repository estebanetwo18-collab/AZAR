export interface CountryInfo {
  key: string;
  name: string;
  /** Etiqueta corta (CR, GT…). */
  label: string;
  /** Tipo de ícono: bandera conocida, globo (región) o genérico. */
  icon: "flag" | "globe" | "generic";
}

const KNOWN: Record<string, CountryInfo> = {
  CR: { key: "CR", name: "Costa Rica", label: "CR", icon: "flag" },
  GT: { key: "GT", name: "Guatemala", label: "GT", icon: "flag" },
  PY: { key: "PY", name: "Paraguay", label: "PY", icon: "flag" },
  ARG: { key: "ARG", name: "Argentina", label: "ARG", icon: "flag" },
  HN: { key: "HN", name: "Honduras", label: "HN", icon: "flag" },
  CAM: { key: "CAM", name: "Centroamérica", label: "CAM", icon: "globe" },
};

const ALIASES: Record<string, string> = {
  "costa rica": "CR",
  cr: "CR",
  guatemala: "GT",
  gt: "GT",
  paraguay: "PY",
  py: "PY",
  argentina: "ARG",
  arg: "ARG",
  ar: "ARG",
  honduras: "HN",
  hondura: "HN",
  hn: "HN",
  cam: "CAM",
  centroamerica: "CAM",
  "centro america": "CAM",
};

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Normaliza el texto de país de la hoja a una clave estable. */
export function resolveCountry(raw: string): { key: string; name: string } {
  const clean = raw.trim().replace(/\s+/g, " ");
  const norm = stripAccents(clean).toLowerCase();
  const key = ALIASES[norm];
  if (key) return { key, name: KNOWN[key].name };
  return { key: stripAccents(clean).toUpperCase(), name: titleCase(clean) };
}

export function countryInfo(key: string, fallbackName?: string): CountryInfo {
  return (
    KNOWN[key] ?? {
      key,
      name: fallbackName ?? titleCase(key),
      label: key.slice(0, 3),
      icon: "generic",
    }
  );
}

/** Colores por país, derivados de la paleta de marca. */
const COUNTRY_COLORS: Record<string, string> = {
  PY: "#E85A1E",
  ARG: "#0A0A0A",
  CR: "#F59E0B",
  GT: "#A0522D",
  CAM: "#FF6A13",
  HN: "#9CA3AF",
};
const EXTRA_COLORS = ["#FDBA74", "#78350F", "#57534E", "#C2410C", "#D6D3D1", "#B45309"];

export function countryColor(key: string, index = 0, dark = false): string {
  // El negro de marca no se ve sobre fondo oscuro: se aclara en modo oscuro.
  if (dark && key === "ARG") return "#E7E5E4";
  return COUNTRY_COLORS[key] ?? EXTRA_COLORS[index % EXTRA_COLORS.length];
}
