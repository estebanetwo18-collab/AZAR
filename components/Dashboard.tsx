"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  applyFilters,
  byCountry,
  byType,
  filterOptions,
  sumOf,
  timeSeries,
  topAccounts,
} from "@/lib/aggregations";
import { todayISO } from "@/lib/dates";
import { DEFAULT_FILTERS, filtersFromParams, filtersToParams } from "@/lib/filters";
import type { Filters } from "@/lib/types";
import { useDashboardData, useTheme } from "@/lib/use-dashboard-data";
import { CountryBreakdown } from "./CountryBreakdown";
import { CountryComparison } from "./CountryComparison";
import { Distribution } from "./Distribution";
import { FilterBar } from "./FilterBar";
import { Header } from "./Header";
import { InvestmentFlow } from "./InvestmentFlow";
import { KpiCards } from "./KpiCards";
import { RecentMovements } from "./RecentMovements";
import { DashboardSkeleton, EmptyState, ErrorState } from "./states";
import { TopAccounts } from "./TopAccounts";

export function Dashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data, error, refreshing, refresh, retry } = useDashboardData();
  const { dark, toggle } = useTheme();

  const filters = useMemo(() => filtersFromParams(new URLSearchParams(params.toString())), [params]);
  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      const qs = filtersToParams({ ...filters, ...patch }).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );
  const clearFilters = useCallback(
    () => setFilters({ ...DEFAULT_FILTERS, currency: filters.currency, groupBy: filters.groupBy }),
    [setFilters, filters.currency, filters.groupBy],
  );
  const toggleIn = (key: "countries" | "accounts", value: string) =>
    setFilters({ [key]: filters[key].includes(value) ? filters[key].filter((x) => x !== value) : [...filters[key], value] });

  const view = useMemo(() => {
    if (!data) return null;
    const today = todayISO();
    const rows = data.rows;
    const filtered = applyFilters(rows, filters, today);
    // Las mini-tarjetas de país ignoran el propio filtro de país para poder sumar más países con un clic.
    const withoutCountry = applyFilters(rows, { ...filters, countries: [] }, today);
    const { currency, groupBy } = filters;
    const countries = byCountry(filtered.current, currency);
    return {
      filtered,
      options: filterOptions(rows),
      total: sumOf(filtered.current, currency),
      countries,
      countryCards: byCountry(withoutCountry.current, currency),
      types: byType(filtered.current, currency),
      accounts: topAccounts(filtered.current, currency, 10),
      series: timeSeries(filtered.current, groupBy, filtered.range, currency),
      names: Object.fromEntries(filterOptions(rows).countries.map((c) => [c.key, c.name])),
    };
  }, [data, filters]);

  if (!data && !error) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen">
      <Header meta={data?.meta} refreshing={refreshing} onRefresh={refresh} dark={dark} onToggleTheme={toggle}>
        {view && (
          <FilterBar filters={filters} options={view.options} range={view.filtered.range} onChange={setFilters} onClear={clearFilters} />
        )}
      </Header>

      {error && !data ? (
        <main className="px-4">
          <ErrorState message={error.error} hint={error.hint} onRetry={retry} />
        </main>
      ) : view ? (
        <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <strong>No se pudo actualizar:</strong> {error.error} {error.hint} Se muestran los últimos datos cargados.
            </div>
          )}

          <KpiCards data={view.filtered} currency={filters.currency} />

          {view.filtered.current.length === 0 && (
            <div className="card">
              <EmptyState onClear={clearFilters} />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
            <CountryBreakdown
              countries={view.countryCards}
              currency={filters.currency}
              selected={filters.countries}
              onToggle={(k) => toggleIn("countries", k)}
            />
            <InvestmentFlow
              series={view.series}
              total={view.total}
              currency={filters.currency}
              groupBy={filters.groupBy}
              onGroupBy={(groupBy) => setFilters({ groupBy })}
              names={view.names}
              dark={dark}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,5fr)]">
            <CountryComparison series={view.series} countries={view.countries} currency={filters.currency} groupBy={filters.groupBy} dark={dark} />
            <Distribution countries={view.countries} types={view.types} total={view.total} currency={filters.currency} dark={dark} />
          </div>

          <TopAccounts
              accounts={view.accounts}
              currency={filters.currency}
              selected={filters.accounts}
            onToggle={(a) => toggleIn("accounts", a)}
          />
          <RecentMovements rows={view.filtered.current} currency={filters.currency} />

          <footer className="pb-4 pt-2 text-center text-xs text-muted">
            {data?.meta.fileName && <span>{data.meta.fileName} · </span>}
            Pestañas leídas: {data?.meta.sheets.join(", ")}
            {!!data?.meta.duplicatesRemoved && <span> · {data.meta.duplicatesRemoved} filas duplicadas entre pestañas omitidas</span>}
            <span className="mt-1 block">
              Solo se muestran países de Centroamérica. CAM = campañas regionales repartidas entre varios países.
            </span>
          </footer>
        </main>
      ) : null}
    </div>
  );
}
