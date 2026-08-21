"use server";

import { ZERO } from "@/lib/money";
import { getCurrentUserId } from "@/lib/auth";
import { getSubscriptionsByUser } from "@/lib/data/subscriptions";
import { computeNormalizedTrend } from "@/lib/spending-trend";
import type { SpendingTrendDTO, SpendingTrendPoint } from "@/types";

/**
 * Ampiezza della finestra temporale del trend (in mesi).
 * Non esportata: in un file "use server" gli export a runtime devono essere
 * SOLO funzioni async — costanti e helper restano module-scope.
 */
const WINDOW_MONTHS = 6;

/**
 * Regola 4: aggregazione confinata sul server.
 *
 * Serie del **costo mensile normalizzato** degli ultimi WINDOW_MONTHS mesi:
 * gli abbonamenti annuali entrano divisi per 12, esattamente come nel Monthly
 * Burn Rate. Il valore dell'ultimo mese della serie coincide quindi col KPI
 * mostrato nella card in cima alla dashboard.
 *
 * Legge dal fetcher memoizzato (React.cache), lo stesso di `listSubscriptions` e
 * `getMonthlyBurnRate`: sulla dashboard Prisma esegue UNA sola SELECT su
 * Subscription per le tre metriche.
 *
 * L'aritmetica sta tutta in `lib/spending-trend.ts` (helper puro, testato) e
 * resta in Prisma.Decimal fino al confine DTO, dove diventa stringa a 2 decimali:
 * nessun float attraversa il passaggio server → client (Regola 1).
 */
export async function getSpendingTrend(): Promise<SpendingTrendDTO> {
  const userId = await getCurrentUserId();
  const subscriptions = await getSubscriptionsByUser(userId);

  const months = computeNormalizedTrend(subscriptions, new Date(), WINDOW_MONTHS);

  let windowTotal = ZERO;
  const points: SpendingTrendPoint[] = months.map((month) => {
    windowTotal = windowTotal.add(month.total);
    return {
      monthKey: month.monthKey,
      name: month.name,
      fullLabel: month.fullLabel,
      total: month.total.toFixed(2), // Decimal → stringa solo al confine DTO
    };
  });

  return {
    currency: subscriptions[0]?.currency ?? "EUR",
    windowMonths: WINDOW_MONTHS,
    total: windowTotal.toFixed(2),
    points,
  };
}
