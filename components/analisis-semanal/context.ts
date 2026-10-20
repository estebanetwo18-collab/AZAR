import { compararSemanas, crearCalculo, type Agregado, type Calculo, type Comparacion } from "@/lib/analisis-semanal/calc";
import type { SemanaAnalisis } from "@/lib/analisis-semanal/types";
import type { Fmt } from "./format";

export type AggK = Agregado & { k: string };

export interface Ctx {
  data: SemanaAnalisis;
  calc: Calculo;
  fmt: Fmt;
  dark: boolean;
  TOT: Agregado;
  /** Por país, de mayor a menor gasto. */
  PA: AggK[];
  /** Por cuenta, en orden alfabético. */
  CU: AggK[];
  CMP: Comparacion | null;
  prev: { etiqueta: string; TOT: Agregado; PA: AggK[]; CU: AggK[] } | null;
}

export function buildCtx(data: SemanaAnalisis, fmt: Fmt, dark: boolean): Ctx {
  const calc = crearCalculo(data);
  const TOT = calc.agregar(calc.ADS);
  const PA = calc.aggPor("pais").sort((a, b) => b.gasto - a.gasto);
  const CU = calc.aggPor("cuenta").sort((a, b) => a.k.localeCompare(b.k));
  let prev: Ctx["prev"] = null;
  if (data.semanaAnterior) {
    // Misma regla de clics que la semana actual, sobre los anuncios de la semana previa.
    const pc = crearCalculo({ ...data, anuncios: data.semanaAnterior.anuncios });
    prev = { etiqueta: data.semanaAnterior.etiqueta, TOT: pc.agregar(pc.ADS), PA: pc.aggPor("pais"), CU: pc.aggPor("cuenta") };
  }
  return { data, calc, fmt, dark, TOT, PA, CU, CMP: compararSemanas(TOT, prev?.TOT ?? null), prev };
}
