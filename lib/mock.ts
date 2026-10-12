import type { RawTable } from "./parse";

/** Generador pseudoaleatorio determinístico (mulberry32) para que el mock sea estable. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNTRIES: { name: string; weight: number; accounts: string[] }[] = [
  { name: "Paraguay", weight: 0.4, accounts: ["P70", "P310", "P339", "P354", "P114", "P22", "P265"] },
  { name: "Argentina ", weight: 0.25, accounts: ["P284", "P301", "P318", "P327"] },
  { name: "Costa Rica", weight: 0.12, accounts: ["P344", "P345", "P346", "P349"] },
  { name: "Guatemala", weight: 0.1, accounts: ["P392", "P398", "P287"] },
  { name: "CAM", weight: 0.08, accounts: ["P321", "P287"] },
  { name: "Honduras", weight: 0.05, accounts: ["P410", "P411"] },
];
const TYPES = ["REGISTRO DIRECTO", "REGISTRO DIRECTO", "REGISTRO DIRECTO", "CALLCENTER", "QUION"];
const AMOUNTS = [3000, 5000, 5000, 10000, 10000, 12000, 15000, 20000, 25000, 30000];
const RATE = 0.0248757;

const fmtUYU = (n: number) => "$U" + n.toLocaleString("en-US");
const fmtUSD = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Datos de ejemplo con el mismo formato que la hoja real (fechas dd/mm/yyyy, importes con "$U"
 * y "$", columna CEDULA que el parser debe descartar, filas vacías y de totales).
 * Cubre los últimos ~120 días hasta hoy para que todos los presets muestren datos.
 */
export function mockTables(today: string): RawTable[] {
  const rand = rng(20260712);
  const [y, m, d] = today.split("-").map(Number);
  const end = Date.UTC(y, m - 1, d);
  const header = ["Fecha", "País", "Tipo", "Cuenta", "ID de la cuenta", "CEDULA ", "FACTURA ", "Importe UYU", "Importe USD"];
  const rows: unknown[][] = [header];
  const accountIds = new Map<string, string>();
  let invoice = 30000;

  for (let back = 120; back >= 0; back--) {
    const t = new Date(end - back * 86400000);
    const weekend = t.getUTCDay() === 0 || t.getUTCDay() === 6;
    const n = Math.floor(rand() * (weekend ? 4 : 11)) + (weekend ? 0 : 2);
    for (let i = 0; i < n; i++) {
      let r = rand();
      const c = COUNTRIES.find((x) => (r -= x.weight) < 0) ?? COUNTRIES[0];
      const account = c.accounts[Math.floor(rand() * c.accounts.length)];
      if (!accountIds.has(account)) {
        accountIds.set(account, String(1_000_000_000_000_000 + Math.floor(rand() * 999_999_999_999_999)));
      }
      const uyu = AMOUNTS[Math.floor(rand() * AMOUNTS.length)];
      invoice += 1 + Math.floor(rand() * 40);
      rows.push([
        `${String(t.getUTCDate()).padStart(2, "0")}/${String(t.getUTCMonth() + 1).padStart(2, "0")}/${t.getUTCFullYear()}`,
        c.name,
        TYPES[Math.floor(rand() * TYPES.length)],
        account,
        accountIds.get(account),
        "12345678",
        `1775-${String(2000 + Math.floor(invoice / 1000)).padStart(4, "0")}-${String(invoice % 100000).padStart(5, "0")}`,
        fmtUYU(uyu),
        fmtUSD(Math.round(uyu * RATE * 100) / 100),
      ]);
    }
    if (back % 30 === 0) rows.push([]);
  }
  rows.push(["", "", "", "", "", "", "TOTAL", "", ""]);

  return [
    { name: "Cierres mensuales", rows: [[null, "Mes", "Pais", "Etiqueta", "Importe UYU", "Importe USD"]] },
    { name: "Datos (ejemplo)", rows },
  ];
}
