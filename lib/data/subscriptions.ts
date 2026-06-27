import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Data-access layer abbonamenti — letture memoizzate con `React.cache`.
 *
 * `cache()` deduplica per argomenti all'interno dello stesso render-pass: se
 * più consumer (es. `getMonthlyBurnRate` + `listSubscriptions`) richiedono gli
 * abbonamenti dello stesso `userId`, Prisma esegue UNA sola `SELECT`.
 *
 * Restituisce i record Prisma grezzi (Decimal/Date intatti): la mappatura a DTO
 * avviene nei chiamanti, così la stessa cache serve sia i calcoli (Burn Rate)
 * sia la UI.
 */
export const getSubscriptionsByUser = cache(async (userId: string) => {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { nextRenewalDate: "asc" },
  });
});

/** Singolo abbonamento dell'utente (memoizzato per coppia id+userId). */
export const getSubscriptionByIdForUser = cache(
  async (id: string, userId: string) => {
    return prisma.subscription.findFirst({ where: { id, userId } });
  },
);
