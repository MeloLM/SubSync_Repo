import { Flame, CalendarClock, TrendingUp } from "lucide-react";

import { listSubscriptions } from "@/actions/subscription.actions";
import { getMonthlyBurnRate } from "@/actions/burn-rate.actions";
import { getSpendingTrend } from "@/actions/spending-trend.actions";
import { SpendingTrendChart } from "@/components/dashboard/spending-trend-chart";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const dateUTC = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));

export default async function DashboardPage() {
  const [burnRate, subscriptions, spendingTrend] = await Promise.all([
    getMonthlyBurnRate(),
    listSubscriptions(),
    getSpendingTrend(),
  ]);

  // `listSubscriptions` ordina già per nextRenewalDate asc.
  const upcomingRenewals = subscriptions.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-sm text-zinc-400">
          Panoramica della tua spesa in abbonamenti.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card 1 — Main KPI: Monthly Burn Rate */}
        <section className="rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm md:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-subsync-purple to-subsync-cyan text-white">
              <Flame className="h-4 w-4" />
            </span>
            Monthly Burn Rate
          </div>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold tracking-tight tabular-nums text-subsync-cyan">
              {formatMoney(burnRate.monthlyBurnRate, burnRate.currency)}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Costo mensile normalizzato (mensili + annuali/12) su{" "}
            {burnRate.subscriptionCount}{" "}
            {burnRate.subscriptionCount === 1 ? "abbonamento" : "abbonamenti"}.
          </p>
        </section>

        {/* Card 2 — Prossimi Rinnovi */}
        <section className="rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
            <CalendarClock className="h-4 w-4" /> Prossimi rinnovi
          </div>
          {upcomingRenewals.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Nessun rinnovo in programma.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {upcomingRenewals.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {r.name}
                    </p>
                    <p className="text-xs tabular-nums text-zinc-400">
                      {dateUTC(r.nextRenewalDate)} UTC
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-zinc-100">
                    {formatMoney(r.amount, r.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Card 3 — Trend (full width) */}
        <section className="col-span-full rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
            <TrendingUp className="h-4 w-4" /> Trend di spesa
          </div>
          <SpendingTrendChart data={spendingTrend} />
        </section>
      </div>
    </div>
  );
}
