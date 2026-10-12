/** Fila normalizada de inversión. Nunca incluye CEDULA. */
export interface Movement {
  /** Identificador estable de la fila (para keys de React). */
  id: string;
  /** Fecha ISO yyyy-mm-dd (sin hora ni zona horaria). */
  date: string;
  /** Clave de país normalizada (CR, GT, HN, SV, NI, PA, BZ o CAM = campañas regionales). */
  country: string;
  /** Nombre del país para mostrar. */
  countryName: string;
  type: string;
  account: string;
  /** Siempre string: los IDs son números largos. */
  accountId: string;
  invoice: string;
  uyu: number;
  usd: number;
}

export type DataSourceKind = "google-sheet" | "drive-xlsx" | "mock";

export interface DataPayload {
  rows: Movement[];
  meta: {
    source: DataSourceKind;
    fileName?: string;
    /** Pestañas de datos crudos detectadas. */
    sheets: string[];
    fetchedAt: string;
    /** Filas descartadas por duplicadas entre pestañas. */
    duplicatesRemoved: number;
    /** Filas de otros países (fuera de Centroamérica) que se excluyeron. */
    excludedOtherCountries: number;
  };
}

export interface ApiError {
  error: string;
  hint?: string;
}

export type Currency = "USD" | "UYU";
export type GroupBy = "day" | "week" | "month";
export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface Filters {
  preset: DatePreset;
  /** yyyy-mm-dd, inclusivo. Solo se usan con preset custom. */
  from?: string;
  to?: string;
  countries: string[];
  types: string[];
  accounts: string[];
  currency: Currency;
  groupBy: GroupBy;
}
