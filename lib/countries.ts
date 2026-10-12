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
  HN: { key: "HN", name: "Honduras", label: "HN", icon: "flag" },
  SV: { key: "SV", name: "El Salvador", label: "SV", icon: "flag" },
  NI: { key: "NI", name: "Nicaragua", label: "NI", icon: "flag" },
  PA: { key: "PA", name: "Panamá", label: "PA", icon: "flag" },
  BZ: { key: "BZ", name: "Belice", label: "BZ", icon: "flag" },
  // CAM = campañas regionales: una misma campaña repartida entre varios países de Centroamérica.
  CAM: { key: "CAM", name: "CAM (regional)", label: "CAM", icon: "globe" },
};

const ALIASES: Record<string, string> = {
  "costa rica": "CR",
  cr: "CR",
  guatemala: "GT",
  gt: "GT",
  honduras: "HN",
  hondura: "HN",
  hn: "HN",
  cam: "CAM",
  centroamerica: "CAM",
  "centro america": "CAM",
  "el salvador": "SV",
  salvador: "SV",
  sv: "SV",
  nicaragua: "NI",
  ni: "NI",
  panama: "PA",
  pa: "PA",
  belice: "BZ",
  belize: "BZ",
  bz: "BZ",
};

/** El dashboard solo muestra Centroamérica (países + CAM regional). Otros países se excluyen. */
export function isCentralAmerica(key: string): boolean {
  return key in KNOWN;
}

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
  CAM: "#E85A1E",
  CR: "#F59E0B",
  GT: "#A0522D",
  HN: "#0A0A0A",
  SV: "#FDBA74",
  NI: "#78350F",
  PA: "#9CA3AF",
  BZ: "#C2410C",
};
const EXTRA_COLORS = ["#FDBA74", "#78350F", "#57534E", "#C2410C", "#D6D3D1", "#B45309"];

export function countryColor(key: string, index = 0, dark = false): string {
  // El negro de marca no se ve sobre fondo oscuro: se aclara en modo oscuro.
  if (dark && key === "HN") return "#E7E5E4";
  return COUNTRY_COLORS[key] ?? EXTRA_COLORS[index % EXTRA_COLORS.length];
}
