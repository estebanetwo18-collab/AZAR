import { isCentralAmerica, resolveCountry, stripAccents } from "./countries";
import type { Correction, Movement } from "./types";

/** Tabla cruda: nombre de la pestaña + matriz de celdas (fila 1 = encabezados). */
export interface RawTable {
  name: string;
  rows: unknown[][];
}

type Field = "date" | "country" | "type" | "account" | "accountId" | "invoice" | "uyu" | "usd";

const norm = (v: unknown) =>
  stripAccents(String(v ?? ""))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Mapea encabezados a campos. CEDULA no se mapea nunca: se descarta por completo.
 * "Cuenta (gologin)" también cuenta como "Cuenta".
 */
function matchHeader(h: string): Field | null {
  if (h === "fecha") return "date";
  if (h === "pais") return "country";
  if (h === "tipo") return "type";
  if (h === "id de la cuenta") return "accountId";
  if (h === "cuenta" || h.startsWith("cuenta ") || h.startsWith("cuenta(")) return "account";
  if (h === "factura") return "invoice";
  if (h === "importe uyu") return "uyu";
  if (h === "importe usd") return "usd";
  return null;
}

const REQUIRED: Field[] = ["date", "country", "type", "account", "accountId", "invoice", "uyu", "usd"];

/** Devuelve el índice de columna de cada campo si la fila 1 es de datos crudos; si no, null. */
export function detectColumns(header: unknown[] | undefined): Record<Field, number> | null {
  if (!header) return null;
  const cols: Partial<Record<Field, number>> = {};
  header.forEach((cell, i) => {
    const f = matchHeader(norm(cell));
    if (f && cols[f] === undefined) cols[f] = i;
  });
  return REQUIRED.every((f) => cols[f] !== undefined) ? (cols as Record<Field, number>) : null;
}

/** "$U25,000" / "$621.89" / 621.89 → número. Devuelve null si no es un importe válido. */
export function parseAmount(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/\$U|U\$S|US\$|\$|,|\s/gi, "").trim();
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Convierte la fecha a yyyy-mm-dd sin pasar por la zona horaria local.
 * Acepta dd/mm/yyyy, yyyy-mm-dd y números seriales de Excel/Sheets.
 */
export function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    // Serial de Excel: días desde 1899-12-30. Se calcula en UTC puro → sin desfase.
    if (v < 1 || v > 2958465) return null;
    const d = new Date(Math.round((Math.floor(v) - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const day = +m[1];
    const month = +m[2];
    let year = +m[3];
    if (year < 100) year += 2000;
    return validDate(year, month, day);
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  return null;
}

function validDate(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Los IDs de cuenta son números largos: siempre se devuelven como string sin notación científica. */
export function parseAccountId(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    if (Number.isInteger(v) || Math.abs(v) >= 1e6) return BigInt(Math.round(v)).toString();
    return String(v);
  }
  const s = String(v).trim();
  // "1.2345E+15" escrito como texto
  if (/^\d+(\.\d+)?e\+\d+$/i.test(s)) return BigInt(Math.round(Number(s))).toString();
  return s;
}

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim().replace(/\s+/g, " "));

const isTotalRow = (row: unknown[]) =>
  row.some((c) => typeof c === "string" && /\btotal(es)?\b/i.test(c));

const isEmptyRow = (row: unknown[]) => row.every((c) => c === null || c === undefined || String(c).trim() === "");

export interface ParseResult {
  rows: Movement[];
  sheets: string[];
  duplicatesRemoved: number;
  /** Filas de países fuera de Centroamérica (no se muestran). */
  excludedOtherCountries: number;
  /** Filas con datos sueltos pero sin fecha, país o importe (no se pueden usar). */
  incompleteRows: number;
  /** Correcciones automáticas aplicadas a los datos. */
  corrections: Correction[];
}

/**
 * Normaliza todas las pestañas de datos crudos.
 * El archivo real tiene varias pestañas con el mismo formato (y algunas se solapan, p. ej. un mes
 * copiado en su propia pestaña), así que se combinan y se deduplica por factura+fecha+importe:
 * una misma combinación aparece en el resultado tantas veces como el máximo de veces que aparece
 * en una sola pestaña.
 */
export function parseTables(tables: RawTable[]): ParseResult {
  const sheets: string[] = [];
  const perKey = new Map<string, { count: number; rows: Movement[] }>();
  let totalCandidates = 0;
  let excluded = 0;
  let incomplete = 0;

  for (const table of tables) {
    const cols = detectColumns(table.rows[0]);
    if (!cols) continue;
    sheets.push(table.name.trim());

    const sheetRows: Movement[] = [];
    for (let i = 1; i < table.rows.length; i++) {
      const row = table.rows[i] ?? [];
      if (isEmptyRow(row) || isTotalRow(row)) continue;

      const date = parseDate(row[cols.date]);
      const countryRaw = text(row[cols.country]);
      const uyu = parseAmount(row[cols.uyu]);
      const usd = parseAmount(row[cols.usd]);
      if (!date || !countryRaw || (uyu === null && usd === null)) {
        // Fila con algo escrito (p. ej. una cuenta o fecha suelta) pero inutilizable.
        incomplete++;
        continue;
      }

      const { key, name } = resolveCountry(countryRaw);
      if (!isCentralAmerica(key)) {
        excluded++;
        continue;
      }
      sheetRows.push({
        id: "",
        date,
        country: key,
        countryName: name,
        type: text(row[cols.type]).toUpperCase() || "SIN TIPO",
        account: text(row[cols.account]) || "—",
        accountId: parseAccountId(row[cols.accountId]),
        invoice: text(row[cols.invoice]),
        uyu: uyu ?? NaN,
        usd: usd ?? NaN,
      });
    }

    const counts = new Map<string, Movement[]>();
    for (const r of sheetRows) {
      const k = r.invoice
        ? `${r.invoice}|${r.date}|${r.uyu}`
        : `${r.date}|${r.country}|${r.account}|${r.uyu}|${r.usd}`;
      const list = counts.get(k) ?? [];
      list.push(r);
      counts.set(k, list);
    }
    for (const [k, list] of counts) {
      totalCandidates += list.length;
      const prev = perKey.get(k);
      if (!prev || list.length > prev.count) perKey.set(k, { count: list.length, rows: list });
    }
  }

  const rows = [...perKey.values()].flatMap((v) => v.rows);
  fillMissingCurrency(rows);
  const corrections = correctAccounts(rows);
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.invoice.localeCompare(b.invoice)));
  rows.forEach((r, i) => (r.id = `${r.invoice || "row"}-${i}`));

  return {
    rows,
    sheets,
    duplicatesRemoved: totalCandidates - rows.length,
    excludedOtherCountries: excluded,
    incompleteRows: incomplete,
    corrections,
  };
}

const isLongNumber = (s: string) => /^\d{12,}$/.test(s);

/**
 * Corrige errores de carga frecuentes en las columnas Cuenta / ID de la cuenta:
 * 1. El ID pegado en la columna Cuenta (y la columna ID vacía): se mueve el ID a su columna y se
 *    pone la cuenta que usa ese ID en el resto de filas.
 * 2. Una cuenta con un ID distinto al que usa en la mayoría de sus filas (ID copiado de la fila de
 *    al lado): se reemplaza por el ID habitual de esa cuenta.
 */
export function correctAccounts(rows: Movement[]): Correction[] {
  const out: Correction[] = [];
  const idToAccounts = new Map<string, Map<string, number>>();
  const accToIds = new Map<string, Map<string, number>>();
  const bump = (m: Map<string, Map<string, number>>, k: string, v: string) => {
    const inner = m.get(k) ?? new Map<string, number>();
    inner.set(v, (inner.get(v) ?? 0) + 1);
    m.set(k, inner);
  };
  for (const r of rows) {
    if (!r.accountId || isLongNumber(r.account)) continue;
    bump(idToAccounts, r.accountId, r.account);
    bump(accToIds, r.account, r.accountId);
  }
  const top = (m?: Map<string, number>) => {
    if (!m) return null;
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    // Solo si hay una mayoría clara.
    return sorted.length && (sorted.length === 1 || sorted[0][1] > sorted[1][1]) ? sorted[0][0] : null;
  };

  for (const r of rows) {
    if (isLongNumber(r.account)) {
      const id = r.account;
      const acc = top(idToAccounts.get(id));
      if (acc) {
        out.push({ invoice: r.invoice, date: r.date, field: "Cuenta", from: r.account, to: acc, applied: true, reason: `En la columna Cuenta estaba el ID ${id}; ese ID corresponde a ${acc}.` });
        r.account = acc;
        if (!r.accountId) r.accountId = id;
      }
    }
  }
  for (const r of rows) {
    const usual = top(accToIds.get(r.account));
    if (!usual || !r.accountId || r.accountId === usual) continue;
    const owner = top(idToAccounts.get(r.accountId));
    const times = accToIds.get(r.account)?.get(r.accountId) ?? 0;
    // Solo se corrige un caso aislado (típico ID copiado de la fila de al lado). Si se repite, puede ser real.
    const applied = times === 1;
    out.push({
      invoice: r.invoice,
      date: r.date,
      field: "ID de la cuenta",
      from: r.accountId,
      to: applied ? usual : r.accountId,
      applied,
      reason: `${r.account} usa el ID ${usual} en sus otras filas${owner && owner !== r.account ? `; ${r.accountId} es el ID de ${owner}` : ""}.${applied ? "" : ` Sin corregir: se repite ${times} veces, revisar.`}`,
    });
    if (applied) r.accountId = usual;
  }
  return out;
}

/** Si una fila solo trae una moneda, se completa con la tasa mediana del resto de filas. */
function fillMissingCurrency(rows: Movement[]) {
  const ratios = rows
    .filter((r) => Number.isFinite(r.uyu) && Number.isFinite(r.usd) && r.uyu > 0 && r.usd > 0)
    .map((r) => r.usd / r.uyu)
    .sort((a, b) => a - b);
  const rate = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0.025;
  for (const r of rows) {
    if (!Number.isFinite(r.usd)) r.usd = round2(r.uyu * rate);
    if (!Number.isFinite(r.uyu)) r.uyu = round2(r.usd / rate);
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
