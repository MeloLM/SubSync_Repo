"use server";

import { ZERO, type Money } from "@/lib/money";
import { getCurrentUserId } from "@/lib/auth";
import { addDaysUTC, buildMonthBuckets } from "@/lib/date";
import { getSubscriptionsByUser } from "@/lib/data/subscriptions";
import { getPaymentsByUserInRange } from "@/lib/data/payments";
import { onlyActive } from "@/lib/subscription-status";
import { computeNormalizedSeries } from "@/lib/spending-trend";
import {
  computeCashFlowSeries,
  computeDailyCashFlow,
  type CashFlowDay,
  type CashFlowMonth,
} from "@/lib/cash-flow";
import type {
  ChartPointDTO,
  ChartSeriesDTO,
  DashboardChartsDTO,
} from "@/types";
import type { TrendMonth } from "@/lib/spending-trend";

/**
 * Regola 4: aggregazione confinata sul server.
 *
 * Produce in un colpo solo **tutte** le serie del grafico di dashboard — due
 * metriche (competenza e cassa) per tre finestre — così i selettori della UI non
 * costano un round-trip e il client non ricalcola nulla: sceglie soltanto quale
 * serie disegnare.
 *
 * Costa una SELECT su `Subscription` (condivisa via `React.cache` con
 * `listSubscriptions` e `getMonthlyBurnRate`) più una su `PaymentLog` limitata
 * alla finestra. L'aritmetica sta tutta in helper puri e testati
 * (`lib/spending-trend.ts`, `lib/cash-flow.ts`) e resta in `Prisma.Decimal` fino
 * al confine DTO, dove diventa stringa a 2 decimali: nessun float attraversa il
 * passaggio server → client (Regola 1).
 *
 * ⚠️ Limite noto: come il Burn Rate, i totali sommano importi di valute diverse
 * senza convertirli, ed `currency` riporta quella del primo abbonamento. È il
 * difetto già a backlog sotto `[[Currency Normalizer]]`, accettato
 * consapevolmente anche qui.
 */

/** Mesi passati mostrati nelle finestre, incluso quello corrente. */
const MONTHS_BACK = 6;
/** Mesi proiettati nella finestra annuale: 6 + 6 = 12 punti a cavallo di oggi. */
const MONTHS_FORWARD = 6;
/** Ampiezza della vista giornaliera. */
const UPCOMING_DAYS = 30;

const sum = (values: Money[]): Money =>
  values.reduce((acc, value) => acc.add(value), ZERO);

/** Serie mensile (competenza o cassa) → DTO, con Decimal → stringa. */
function toMonthlySeries(months: (TrendMonth | CashFlowMonth)[]): ChartSeriesDTO {
  const points: ChartPointDTO[] = months.map((month) => ({
    key: month.monthKey,
    name: month.name,
    fullLabel: month.fullLabel,
    total: month.total.toFixed(2),
    isFuture: month.isFuture,
  }));

  return { points, total: sum(months.map((m) => m.total)).toFixed(2) };
}

/** Serie giornaliera → DTO. Ogni punto è per definizione nel futuro. */
function toDailySeries(days: CashFlowDay[]): ChartSeriesDTO {
  const points: ChartPointDTO[] = days.map((day) => ({
    key: day.dayKey,
    name: day.name,
    fullLabel: day.fullLabel,
    total: day.total.toFixed(2),
    isFuture: true,
  }));

  return { points, total: sum(days.map((d) => d.total)).toFixed(2) };
}

export async function getDashboardCharts(): Promise<DashboardChartsDTO> {
  const userId = await getCurrentUserId();
  const now = new Date();

  const buckets6m = buildMonthBuckets(now, MONTHS_BACK, 0);
  const buckets1y = buildMonthBuckets(now, MONTHS_BACK, MONTHS_FORWARD);

  // Lo storico serve fino a domani: `computeCashFlowSeries` taglia lì il confine
  // fra consolidato e proiettato. Le due finestre iniziano nello stesso mese,
  // quindi una sola lettura le copre entrambe.
  const subscriptions = await getSubscriptionsByUser(userId);
  const payments = await getPaymentsByUserInRange(
    userId,
    buckets1y[0].start.getTime(),
    addDaysUTC(now, 1).getTime(),
  );

  // ⚠️ Le due metriche filtrano in modo OPPOSTO, e non è una svista:
  // la competenza ha bisogno anche dei cessati per sapere in quali mesi
  // contribuivano, la cassa proietta solo gli attivi perché un abbonamento
  // disdetto non ha rinnovi futuri. Lo storico di cassa non filtra affatto:
  // i PaymentLog sono fatti avvenuti, e sopravvivono alla disdetta.
  const active = onlyActive(subscriptions);

  return {
    currency: subscriptions[0]?.currency ?? "EUR",
    accrual6m: toMonthlySeries(computeNormalizedSeries(subscriptions, buckets6m)),
    accrual1y: toMonthlySeries(computeNormalizedSeries(subscriptions, buckets1y)),
    cash6m: toMonthlySeries(
      computeCashFlowSeries(active, payments, buckets6m, now),
    ),
    cash1y: toMonthlySeries(
      computeCashFlowSeries(active, payments, buckets1y, now),
    ),
    cash30d: toDailySeries(computeDailyCashFlow(active, now, UPCOMING_DAYS)),
  };
}
