"use server";

import { prisma } from "@/lib/prisma";
import { ZERO } from "@/lib/money";
import { getCurrentUserId } from "@/lib/auth";
import type { BurnRateDTO } from "@/types";

/**
 * Regola 4 (ARCHITECTURE.md): aggregazione confinata sul server.
 *
 *   Monthly Burn Rate = Σ(mensili) + Σ(annuali) / 12
 *
 * Calcolato interamente con Prisma.Decimal (Regola 1) e restituito come stringa
 * via BurnRateDTO: nessun float attraversa il confine server → client.
 */
export async function getMonthlyBurnRate(): Promise<BurnRateDTO> {
  const userId = await getCurrentUserId();
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
  });

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
