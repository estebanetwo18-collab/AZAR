import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SchemaError, validarSemana } from "./schema";
import type { AnalisisPayload, SemanaAnalisis, SemanaIndice } from "./types";

const DIR = path.join(process.cwd(), "data", "analisis-semanal");
const NOMBRE = /^\d{4}-\d{2}-\d{2}\.json$/;

export class AnalisisError extends Error {
  constructor(
    message: string,
    public hint?: string,
    public status = 500,
  ) {
    super(message);
  }
}

async function leer(id: string): Promise<SemanaAnalisis> {
  const file = `${id}.json`;
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path.join(DIR, file), "utf8"));
  } catch (e) {
    throw new AnalisisError(`El archivo ${file} no es un JSON válido.`, (e as Error).message, 422);
  }
  try {
    return validarSemana(raw, file);
  } catch (e) {
    if (e instanceof SchemaError) throw new AnalisisError(`El archivo ${file} está incompleto.`, e.message, 422);
    throw e;
  }
}

/** Semanas disponibles (archivos `aaaa-mm-dd.json`), la más reciente primero. */
async function ids(): Promise<string[]> {
  const files = await readdir(DIR).catch(() => [] as string[]);
  return files.filter((f) => NOMBRE.test(f)).map((f) => f.slice(0, 10)).sort().reverse();
}

const menos7 = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 7)).toISOString().slice(0, 10);
};

/**
 * Índice + semana pedida (o la más reciente válida), con la semana anterior adjunta si su archivo existe.
 * Un archivo dañado no bloquea la pestaña: sin semana pedida se usa la última válida y se avisa.
 */
export async function cargarAnalisis(pedida?: string | null): Promise<AnalisisPayload | null> {
  const lista = await ids();
  if (!lista.length) return null;
  const semanas: SemanaIndice[] = [];
  const validas = new Map<string, SemanaAnalisis>();
  const avisos: string[] = [];
  for (const id of lista) {
    try {
      const s = await leer(id);
      validas.set(id, s);
      semanas.push({ id, inicio: s.meta.semana.inicio, fin: s.meta.semana.fin, etiqueta: s.meta.semana.etiqueta, valida: true });
    } catch (e) {
      const err = e as AnalisisError;
      avisos.push(`${err.message}${err.hint ? ` (${err.hint})` : ""}`);
      semanas.push({ id, inicio: id, fin: id, etiqueta: `${id} (con errores)`, valida: false });
    }
  }
  // Semana pedida explícitamente: si está dañada, se informa el error.
  if (pedida && lista.includes(pedida) && !validas.has(pedida)) await leer(pedida);
  const id = pedida && validas.has(pedida) ? pedida : lista.find((x) => validas.has(x));
  if (!id) throw new AnalisisError("Ningún análisis semanal se pudo leer.", avisos.join(" · "), 422);
  const semana = validas.get(id)!;
  if (!semana.semanaAnterior) {
    const ant = validas.get(menos7(semana.meta.semana.inicio));
    if (ant) semana.semanaAnterior = { etiqueta: ant.meta.semana.etiqueta, anuncios: ant.anuncios };
  }
  return { semanas, semana, avisos };
}
