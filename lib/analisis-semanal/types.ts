/** Esquema del archivo semanal `data/analisis-semanal/<inicio>.json` (análisis de Meta Ads). */

export type PaisCodigo = "CR" | "GT" | "HN";

export interface Anuncio {
  cuenta: string;
  campana: string;
  conjunto: string;
  anuncio: string;
  pais: PaisCodigo;
  estado: string;
  alcance: number;
  impresiones: number;
  frecuencia: number | null;
  tipoResultado: string | null;
  resultados: number | null;
  gasto: number;
  costoPorResultado: number | null;
  clicsEnlace: number | null;
  cpcEnlace: number | null;
  cpm: number | null;
  ctrTodos: number | null;
  /** Proporción (0,24 = 24 %). */
  hookRate: number | null;
  holdRate: number | null;
  cpcTodos: number | null;
  pagina?: string;
  atribucion?: string;
}

export interface CuentaMeta {
  id: string;
  paises: PaisCodigo[];
  tieneClicsEnlace: boolean;
  faltantes: string[];
  extras: string[];
}

export interface ControlCuenta {
  gasto: number;
  registros: number;
  filas: number;
}

export interface SemanaMeta {
  semana: { desde: string; hasta: string; inicio: string; fin: string; etiqueta: string };
  moneda: string;
  monedaCodigo: string;
  tipoCambio: { uyuPorUsd: number; fuente: string; url: string; confirmar: boolean };
  versiones: { fecha: string; nota: string }[];
  objetivo: string;
  kpiRanking: { campo: string; descripcion: string; desempate: string };
  umbral: { gastoMin: number; impresionesMin: number };
  cuentas: CuentaMeta[];
  archivos: { cuenta: string; archivo: string; hoja: string; filas: number }[];
  controlExcel: {
    porCuenta: Record<string, ControlCuenta>;
    total: { gasto: number; registros: number };
    manuales: {
      paisCR: { cpr: number; cpm: number };
      cuentaP287: { cpr: number; cpcEnlace: number };
      anuncio: { costoPorResultadoExcel: number; cpmExcel: number };
    };
    clavesDuplicadas: number;
  };
  limitaciones: string[];
  supuestos: string[];
}

/**
 * Textos de la semana (insights, recomendaciones y puntos del resumen). Son contenido, no código.
 * Marcas: {{m:n}} monto en UYU · {{i:n}} entero · {{p:n}} proporción · {{f:n}} frecuencia · {{x:n}} veces · **negrita**.
 */
export interface Contenido {
  nota?: string;
  puntosSemana: string[];
  recomendacionesPara: string;
  bloques: {
    datos: { titulo: string; items: string[] };
    insights: { titulo: string; items: string[] };
    hipotesis: { titulo: string; items: { texto: string; nota: string }[] };
    recomendaciones: { titulo: string; items: { accion: string; donde: string; porque: string }[] };
  };
}

export interface SemanaAnalisis {
  meta: SemanaMeta;
  anuncios: Anuncio[];
  /** Se deja null en el archivo; el servidor adjunta la semana previa si existe su JSON. */
  semanaAnterior: { etiqueta: string; anuncios: Anuncio[] } | null;
  contenido: Contenido;
}

export interface SemanaIndice {
  id: string;
  inicio: string;
  fin: string;
  etiqueta: string;
  /** false si el archivo no pasó la validación. */
  valida: boolean;
}

export interface AnalisisPayload {
  semanas: SemanaIndice[];
  semana: SemanaAnalisis;
  /** Archivos semanales que no se pudieron leer (se muestran como aviso). */
  avisos: string[];
}
