import "server-only";
import { JWT } from "google-auth-library";
import { drive as driveApi } from "@googleapis/drive";
import { sheets as sheetsApi } from "@googleapis/sheets";
import * as XLSX from "xlsx";
import { mockTables } from "./mock";
import { parseTables, type RawTable } from "./parse";
import { todayISO } from "./dates";
import type { DataPayload, DataSourceKind } from "./types";

const DEFAULT_SHEET_ID = "1zsXZiFDlRfBjsJ9TQy3boqJUpBntjI0j";
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const REVALIDATE_MS = 60_000;

export class DataSourceError extends Error {
  constructor(
    message: string,
    public hint?: string,
    public status = 502,
  ) {
    super(message);
  }
}

function credentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  // En Vercel la clave suele pegarse con "\n" literales o entre comillas.
  const key = rawKey.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  return { email, key };
}

export const usingMock = () => credentials() === null;

async function readFromGoogle(): Promise<{ tables: RawTable[]; source: DataSourceKind; fileName?: string }> {
  const creds = credentials()!;
  const fileId = process.env.SHEET_ID?.trim() || DEFAULT_SHEET_ID;
  const auth = new JWT({
    email: creds.email,
    key: creds.key,
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
  const drive = driveApi({ version: "v3", auth });

  const meta = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,shortcutDetails",
    supportsAllDrives: true,
  });
  let { mimeType, id } = meta.data;
  const name = meta.data.name ?? undefined;
  if (mimeType === "application/vnd.google-apps.shortcut") {
    mimeType = meta.data.shortcutDetails?.targetMimeType;
    id = meta.data.shortcutDetails?.targetId;
  }
  if (!id) throw new DataSourceError("No se pudo resolver el archivo en Drive.");

  if (mimeType === GOOGLE_SHEET_MIME) {
    const sheets = sheetsApi({ version: "v4", auth });
    const book = await sheets.spreadsheets.get({ spreadsheetId: id, fields: "sheets.properties.title" });
    const titles = (book.data.sheets ?? []).map((s) => s.properties?.title ?? "").filter(Boolean);
    if (!titles.length) return { tables: [], source: "google-sheet", fileName: name };
    // La API de valores devuelve todas las filas, incluidas las ocultas o filtradas.
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: id,
      ranges: titles.map((t) => `'${t.replace(/'/g, "''")}'`),
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "SERIAL_NUMBER",
    });
    const tables = (res.data.valueRanges ?? []).map((vr, i) => ({
      name: titles[i],
      rows: (vr.values ?? []) as unknown[][],
    }));
    return { tables, source: "google-sheet", fileName: name };
  }

  if (mimeType?.includes("spreadsheetml") || mimeType === "application/vnd.ms-excel" || name?.endsWith(".xlsx")) {
    const res = await drive.files.get(
      { fileId: id, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" },
    );
    const wb = XLSX.read(new Uint8Array(res.data as ArrayBuffer), { type: "array", cellDates: false });
    // sheet_to_json no omite filas ocultas ni filtradas (skipHidden es false por defecto).
    const tables = wb.SheetNames.map((sheetName) => ({
      name: sheetName,
      rows: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
        header: 1,
        raw: true,
        defval: null,
        blankrows: false,
      }),
    }));
    return { tables, source: "drive-xlsx", fileName: name };
  }

  throw new DataSourceError(
    `Formato de archivo no soportado (${mimeType ?? "desconocido"}).`,
    "Usa un Google Sheet nativo o un archivo .xlsx.",
  );
}

function explain(err: unknown): DataSourceError {
  if (err instanceof DataSourceError) return err;
  const e = err as { code?: number | string; status?: number; message?: string };
  const code = Number(e.code ?? e.status);
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "la Service Account";
  if (code === 403 || code === 404) {
    return new DataSourceError(
      "No se pudo acceder a la hoja de cálculo.",
      `Comparte el archivo con ${email} como Lector y verifica que SHEET_ID sea correcto. Si el error persiste, habilita Google Drive API y Google Sheets API en el proyecto de Google Cloud.`,
    );
  }
  if (code === 401 || /invalid_grant|private key|DECODER|PEM/i.test(e.message ?? "")) {
    return new DataSourceError(
      "Las credenciales de la Service Account no son válidas.",
      "Revisa GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY (incluye las líneas BEGIN/END y los saltos de línea).",
    );
  }
  return new DataSourceError("La hoja no responde en este momento.", e.message);
}

let cache: { at: number; payload: DataPayload } | null = null;
let inflight: Promise<DataPayload> | null = null;

async function load(): Promise<DataPayload> {
  let tables: RawTable[];
  let source: DataSourceKind;
  let fileName: string | undefined;

  if (usingMock()) {
    tables = mockTables(todayISO());
    source = "mock";
    fileName = "Datos de ejemplo";
  } else {
    try {
      ({ tables, source, fileName } = await readFromGoogle());
    } catch (err) {
      throw explain(err);
    }
  }

  const parsed = parseTables(tables);
  if (!parsed.sheets.length) {
    throw new DataSourceError(
      "No se encontró la pestaña de datos crudos.",
      "Debe existir una pestaña con los encabezados en la fila 1: Fecha, País, Tipo, Cuenta, ID de la cuenta, CEDULA, FACTURA, Importe UYU, Importe USD.",
      422,
    );
  }
  return {
    rows: parsed.rows,
    meta: {
      source,
      fileName,
      sheets: parsed.sheets,
      fetchedAt: new Date().toISOString(),
      duplicatesRemoved: parsed.duplicatesRemoved,
    },
  };
}

/** Datos normalizados con caché en memoria de 60 s. `force` la salta (botón "Actualizar ahora"). */
export async function getData(force = false): Promise<DataPayload> {
  if (!force && cache && Date.now() - cache.at < REVALIDATE_MS) return cache.payload;
  if (inflight) return inflight;
  inflight = load()
    .then((payload) => {
      cache = { at: Date.now(), payload };
      return payload;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
