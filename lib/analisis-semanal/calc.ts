/**
 * Cálculos del análisis semanal. Misma lógica que la referencia aprobada
 * (`referencias/analisis-semanal-2026-10-12.html`): todo se agrega desde totales, nunca promediando ratios.
 */
import type { Anuncio, SemanaAnalisis } from "./types";

export const ok = (v: number | null | undefined): v is number => v !== null && v !== undefined && Number.isFinite(v);

/** Identificador único: cuenta + campaña + conjunto + anuncio (hay nombres repetidos entre cuentas). */
export const keyOf = (a: Anuncio) => [a.cuenta, a.campana, a.conjunto, a.anuncio].join(" | ");
export const regs = (a: Anuncio) => a.resultados || 0;
export const tieneResultado = (a: Anuncio) => ok(a.resultados) && a.resultados > 0;
export const share = (v: number, t: number) => (t > 0 ? v / t : null);

export type FormatoTipo = "estatico" | "video" | "desconocido";
export interface Formato {
  tipo: FormatoTipo;
  label: string;
  regla: string;
}

/** Hook 0 + Hold vacío = estático. Hook < 0,1 % con Hold 0 = estático supuesto (dato atípico). */
export function formatoPieza(a: Anuncio): Formato {
  if (a.hookRate === 0 && !ok(a.holdRate)) return { tipo: "estatico", label: "Estático", regla: "Hook 0 y Hold vacío" };
  if (ok(a.hookRate) && a.hookRate < 0.001 && a.holdRate === 0) return { tipo: "estatico", label: "Estático (supuesto)", regla: "Hook < 0,1 % y Hold 0: dato atípico" };
  if (ok(a.hookRate) && ok(a.holdRate)) return { tipo: "video", label: "Video / animado", regla: "Hook y Hold con valor" };
  return { tipo: "desconocido", label: "Sin dato", regla: "Sin Hook/Hold" };
}

export interface Grupo {
  id: string;
  label: string;
  regla: string;
  test: (a: Anuncio) => boolean;
}

/** Grupo creativo inferido del nombre (supuesto). El orden importa. */
export const GRUPOS: Grupo[] = [
  { id: "influencers", label: "Influencers", test: (a) => /\b(KEYLA|ERICKA|DIEGO)\b/i.test(a.anuncio), regla: "Nombre con KEYLA, ERICKA o Diego" },
  { id: "iphone", label: "iPhone", test: (a) => /iphone/i.test(a.conjunto), regla: "Conjunto «Iphone» / «Iphone Promo»" },
  { id: "pack", label: "Pack de bienvenida", test: (a) => /pack ?bienvenida/i.test(a.anuncio), regla: "Nombre del anuncio con «Pack bienvenida»" },
  { id: "placas", label: "Placas", test: (a) => /\b(placa|plca)\b/i.test(a.anuncio), regla: "Nombre con «placa» o «plca»" },
  { id: "promo", label: "Promo de bono", test: (a) => /ganancia|duplica|recompensa/i.test(a.anuncio), regla: "Nombre con «Ganancia», «Duplica» o «Recompensa»" },
  { id: "deportes", label: "Deportes (NFL y ligas)", test: (a) => /nfl|champions|\bcl \d|liga|lespa|premier|deportiva|beisbol/i.test(a.anuncio), regla: "Nombre con NFL, Champions, CL, Liga, Premier o Deportiva" },
  { id: "genericos", label: "Genéricos", test: () => true, regla: "Sin palabra clave de los grupos anteriores" },
];
export const grupoCreativo = (a: Anuncio) => GRUPOS.find((g) => g.test(a))!;

export interface Agregado {
  n: number;
  gasto: number;
  registros: number;
  impresiones: number;
  alcance: number;
  clics: number;
  /** Costo por registro = gasto / registros. */
  cpr: number | null;
  /** CPM = gasto / impresiones × 1.000. */
  cpm: number | null;
  /** CTR (todos) en %, ponderado por impresiones. */
  ctr: number | null;
  /** Impresiones / alcance sumado (puede duplicar personas). */
  frecuencia: number | null;
  /** Solo cuentas con columna de clics en el enlace. */
  cpcEnlace: number | null;
  /** Hook y Hold ponderados por impresiones, solo sobre piezas de video. */
  hook: number | null;
  hold: number | null;
}

/** Crea el agregador de una semana (depende de qué cuentas traen clics en el enlace). */
export function crearCalculo(data: SemanaAnalisis) {
  const ADS = data.anuncios;
  const { umbral } = data.meta;
  const cuentasConClics = new Set(data.meta.cuentas.filter((c) => c.tieneClicsEnlace).map((c) => c.id));

  const enUmbral = (a: Anuncio) => a.gasto >= umbral.gastoMin && a.impresiones >= umbral.impresionesMin;

  function agregar(list: Anuncio[]): Agregado {
    let gasto = 0, registros = 0, impresiones = 0, alcance = 0, ctrW = 0, clics = 0, gastoConClics = 0, hookW = 0, holdW = 0, imprVideo = 0;
    for (const a of list) {
      gasto += a.gasto || 0;
      registros += regs(a);
      impresiones += a.impresiones || 0;
      alcance += a.alcance || 0;
      if (ok(a.ctrTodos)) ctrW += a.ctrTodos * (a.impresiones || 0);
      if (cuentasConClics.has(a.cuenta)) {
        clics += a.clicsEnlace || 0;
        gastoConClics += a.gasto || 0;
      }
      if (formatoPieza(a).tipo === "video") {
        hookW += (a.hookRate as number) * a.impresiones;
        holdW += (a.holdRate as number) * a.impresiones;
        imprVideo += a.impresiones;
      }
    }
    return {
      n: list.length,
      gasto,
      registros,
      impresiones,
      alcance,
      clics,
      cpr: registros > 0 ? gasto / registros : null,
      cpm: impresiones > 0 ? (gasto / impresiones) * 1000 : null,
      ctr: impresiones > 0 ? ctrW / impresiones : null,
      frecuencia: alcance > 0 ? impresiones / alcance : null,
      cpcEnlace: clics > 0 ? gastoConClics / clics : null,
      hook: imprVideo > 0 ? hookW / imprVideo : null,
      hold: imprVideo > 0 ? holdW / imprVideo : null,
    };
  }

  const agruparPor = <K extends string>(list: Anuncio[], fn: (a: Anuncio) => K) => {
    const m = new Map<K, Anuncio[]>();
    for (const a of list) {
      const k = fn(a);
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return m;
  };

  const aggPor = (campo: "pais" | "cuenta", list: Anuncio[] = ADS) =>
    [...agruparPor(list, (a) => a[campo]).entries()].map(([k, l]) => ({ k, ...agregar(l) }));

  const comboList = () =>
    [...agruparPor(ADS, (a) => `${a.cuenta}|${a.pais}`).entries()].map(([k, l]) => {
      const [cuenta, pais] = k.split("|");
      return { cuenta, pais, ...agregar(l) };
    });

  return { ADS, cuentasConClics, enUmbral, agregar, agruparPor, aggPor, comboList };
}

export type Calculo = ReturnType<typeof crearCalculo>;

export interface RankItem {
  a: Anuncio;
  cpr: number | null;
  sinResultado?: boolean;
}

/** Top 3 (menor costo por registro, desempate CTR) y Bottom 3 (sin resultado primero, luego mayor costo). */
export function ranking(c: Calculo, filtro: { pais: string; cuenta: string }) {
  const base = c.ADS.filter((a) => (!filtro.pais || a.pais === filtro.pais) && (!filtro.cuenta || a.cuenta === filtro.cuenta));
  const el = base.filter(c.enUmbral);
  const conReg: RankItem[] = el.filter(tieneResultado).map((a) => ({ a, cpr: a.gasto / (a.resultados as number) }));
  const ord = (x: RankItem, y: RankItem) => (x.cpr as number) - (y.cpr as number) || (y.a.ctrTodos || 0) - (x.a.ctrTodos || 0);
  const top = [...conReg].sort(ord).slice(0, 3);
  const topKeys = new Set(top.map((x) => keyOf(x.a)));
  const sinRes: RankItem[] = el
    .filter((a) => !tieneResultado(a))
    .sort((x, y) => y.gasto - x.gasto)
    .map((a) => ({ a, cpr: null, sinResultado: true }));
  const peores = conReg
    .filter((x) => !topKeys.has(keyOf(x.a)))
    .sort((x, y) => (y.cpr as number) - (x.cpr as number) || (x.a.ctrTodos || 0) - (y.a.ctrTodos || 0));
  const bot = [...sinRes, ...peores].slice(0, 3);
  return { base, elegibles: el, top, bot, agg: c.agregar(base), aggEleg: c.agregar(el) };
}

export type Ranking = ReturnType<typeof ranking>;

/** Explicación del puesto, con marcas numéricas ({{m:…}}) que se formatean según la moneda. */
export function porQue(x: RankItem, rk: Ranking, tipo: "top" | "bot"): string {
  const a = x.a;
  const ref = rk.aggEleg.cpr as number;
  if (x.sinResultado) return `Gastó {{m:${a.gasto}}} con {{i:${a.impresiones}}} impresiones y no generó registros.`;
  const r = (x.cpr as number) / ref;
  if (tipo === "top") return `{{m:${x.cpr}}} por registro: {{x:${1 / r}}} más eficiente que el promedio de los anuncios en ranking ({{m:${ref}}}).`;
  return `{{m:${x.cpr}}} por registro: {{x:${r}}} el promedio de los anuncios en ranking ({{m:${ref}}}), con {{i:${regs(a)}}} registros sobre {{m:${a.gasto}}}.`;
}

export type Comparacion = Record<"gasto" | "registros" | "cpr" | "impresiones" | "alcance" | "cpm" | "ctr", number | null>;

/** Variación contra la semana anterior; null si no hay semana anterior. */
export function compararSemanas(actual: Agregado, anterior: Agregado | null): Comparacion | null {
  if (!anterior) return null;
  const d = (a: number | null, b: number | null) => (ok(a) && ok(b) && b !== 0 ? (a - b) / b : null);
  return {
    gasto: d(actual.gasto, anterior.gasto),
    registros: d(actual.registros, anterior.registros),
    cpr: d(actual.cpr, anterior.cpr),
    impresiones: d(actual.impresiones, anterior.impresiones),
    alcance: d(actual.alcance, anterior.alcance),
    cpm: d(actual.cpm, anterior.cpm),
    ctr: d(actual.ctr, anterior.ctr),
  };
}

/** Variación simple (a − b) / b, o null. */
export const variacion = (a: number | null | undefined, b: number | null | undefined) => (ok(a) && ok(b) && b !== 0 ? (a - b) / b : null);
