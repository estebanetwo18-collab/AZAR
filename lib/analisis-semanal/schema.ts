import type { SemanaAnalisis } from "./types";

/** Error de esquema con la ruta del campo, para mostrar un mensaje claro en la página. */
export class SchemaError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNumOrNull = (v: unknown) => v === null || isNum(v);

function need(cond: boolean, path: string, msg: string) {
  if (!cond) throw new SchemaError(`${path}: ${msg}`);
}

const NUM_FIELDS = ["alcance", "impresiones", "gasto"] as const;
const NULLABLE_NUM = ["frecuencia", "resultados", "costoPorResultado", "clicsEnlace", "cpcEnlace", "cpm", "ctrTodos", "hookRate", "holdRate", "cpcTodos"] as const;
const STR_FIELDS = ["cuenta", "campana", "conjunto", "anuncio", "pais", "estado"] as const;

function validarAnuncios(list: unknown, path: string) {
  need(Array.isArray(list) && list.length > 0, path, "debe ser una lista con al menos un anuncio");
  (list as unknown[]).forEach((a, i) => {
    const p = `${path}[${i}]`;
    need(isObj(a), p, "debe ser un objeto");
    const o = a as Obj;
    for (const k of STR_FIELDS) need(typeof o[k] === "string" && (o[k] as string).length > 0, `${p}.${k}`, "falta o está vacío");
    need(["CR", "GT", "HN"].includes(o.pais as string), `${p}.pais`, `país desconocido «${String(o.pais)}»`);
    for (const k of NUM_FIELDS) need(isNum(o[k]), `${p}.${k}`, "debe ser un número");
    for (const k of NULLABLE_NUM) need(k in o && isNumOrNull(o[k]), `${p}.${k}`, "debe ser un número o null");
    need(o.tipoResultado === null || typeof o.tipoResultado === "string", `${p}.tipoResultado`, "debe ser texto o null");
  });
}

/** Valida un archivo semanal completo. Lanza SchemaError con la ruta del primer problema. */
export function validarSemana(raw: unknown, origen: string): SemanaAnalisis {
  need(isObj(raw), origen, "el archivo no es un objeto JSON");
  const d = raw as Obj;
  need(isObj(d.meta), `${origen} meta`, "falta");
  const m = d.meta as Obj;
  const sem = m.semana as Obj;
  need(isObj(sem) && typeof sem.inicio === "string" && typeof sem.fin === "string" && typeof sem.etiqueta === "string", `${origen} meta.semana`, "falta inicio, fin o etiqueta");
  need(isObj(m.tipoCambio) && isNum((m.tipoCambio as Obj).uyuPorUsd), `${origen} meta.tipoCambio.uyuPorUsd`, "falta la tasa");
  need(isObj(m.umbral) && isNum((m.umbral as Obj).gastoMin) && isNum((m.umbral as Obj).impresionesMin), `${origen} meta.umbral`, "falta gastoMin o impresionesMin");
  need(isObj(m.kpiRanking), `${origen} meta.kpiRanking`, "falta");
  need(Array.isArray(m.cuentas) && (m.cuentas as unknown[]).length > 0, `${origen} meta.cuentas`, "falta la lista de cuentas");
  const ce = m.controlExcel as Obj;
  need(isObj(ce) && isObj(ce.porCuenta) && isObj(ce.total) && isObj(ce.manuales), `${origen} meta.controlExcel`, "faltan totales de control");
  need(Array.isArray(m.limitaciones) && Array.isArray(m.supuestos), `${origen} meta`, "faltan limitaciones o supuestos");
  validarAnuncios(d.anuncios, `${origen} anuncios`);
  need(d.semanaAnterior === null || d.semanaAnterior === undefined || isObj(d.semanaAnterior), `${origen} semanaAnterior`, "debe ser null u objeto");
  const c = d.contenido as Obj;
  need(isObj(c) && Array.isArray(c.puntosSemana) && isObj(c.bloques), `${origen} contenido`, "faltan los textos de la semana");
  const b = c.bloques as Obj;
  for (const k of ["datos", "insights", "hipotesis", "recomendaciones"]) {
    need(isObj(b[k]) && Array.isArray((b[k] as Obj).items), `${origen} contenido.bloques.${k}`, "falta");
  }
  return raw as SemanaAnalisis;
}
