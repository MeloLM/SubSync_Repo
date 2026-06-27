"use server";

import { ZERO } from "@/lib/money";
import { getCurrentUserId } from "@/lib/auth";
import { getSubscriptionsByUser } from "@/lib/data/subscriptions";
import type { BurnRateDTO } from "@/types";

/**
 * Regola 4 (ARCHITECTURE.md): aggregazione confinata sul server.
 *
 *   Monthly Burn Rate = Σ(mensili) + Σ(annuali) / 12
 *
 * Legge gli abbonamenti dal fetcher memoizzato (`React.cache`), lo stesso usato
 * da `listSubscriptions`: su una pagina che mostra sia il KPI sia la lista,
 * Prisma esegue UNA sola `SELECT` su Subscription.
 *
 * Calcolato interamente con Prisma.Decimal (Regola 1) e restituito come stringa
 * via BurnRateDTO: nessun float attraversa il confine server → client.
 */
export async function getMonthlyBurnRate(): Promise<BurnRateDTO> {
  const userId = await getCurrentUserId();
  const subscriptions = await getSubscriptionsByUser(userId);

  let total = ZERO;
  for (const sub of subscriptions) {
    total =
      sub.billingCycle === "YEARLY"
        ? total.add(sub.amount.div(12))
        : total.add(sub.amount);
  }

  return {
    monthlyBurnRate: total.toFixed(2),
    currency: subscriptions[0]?.currency ?? "EUR",
    subscriptionCount: subscriptions.length,
  };
}
