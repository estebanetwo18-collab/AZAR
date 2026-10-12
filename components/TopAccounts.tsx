"use client";

import { motion } from "framer-motion";
import type { AccountTotal } from "@/lib/aggregations";
import { formatInt, formatMoney, formatPct } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { Flag } from "./Flag";
import { EmptyState } from "./states";
import { Card, CardTitle, cn } from "./ui";

export function TopAccounts({
  accounts,
  currency,
  selected,
  onToggle,
}: {
  accounts: AccountTotal[];
  currency: Currency;
  selected: string[];
  onToggle: (account: string) => void;
}) {
  const max = accounts[0]?.total || 1;
  return (
    <Card className="flex flex-col p-6">
      <CardTitle title="Top cuentas" subtitle="Cuentas con mayor inversión · clic para filtrar" />
      {accounts.length === 0 ? (
        <EmptyState compact />
      ) : (
        <ol className="mt-5 grid gap-x-6 gap-y-1 lg:grid-cols-2">
          {accounts.map((a, i) => (
            <li key={a.account}>
              <button
                onClick={() => onToggle(a.account)}
                className={cn(
                  "w-full rounded-2xl px-3 py-2.5 text-left transition hover:bg-card-muted",
                  selected.includes(a.account) && "bg-azar-50 dark:bg-azar/10",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      i === 0 ? "bg-azar text-white" : i < 3 ? "bg-azar-100 text-azar dark:bg-azar/20" : "bg-card-muted text-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-fg">{a.account}</span>
                        <Flag country={a.country} name={a.countryName} size={14} />
                        <span className="hidden truncate font-mono text-[11px] text-muted sm:inline">{a.accountId}</span>
                      </span>
                      <span className="tabular shrink-0 text-sm font-semibold text-fg">{formatMoney(a.total, currency)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-muted">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-azar to-azar-bright"
                          initial={{ width: 0 }}
                          animate={{ width: `${(a.total / max) * 100}%` }}
                          transition={{ duration: 0.8, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className="tabular w-24 shrink-0 text-right text-[11px] text-muted">
                        {formatPct(a.pct)} · {formatInt(a.count)} rec.
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
