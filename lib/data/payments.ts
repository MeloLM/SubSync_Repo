import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Data-access layer pagamenti — lettura memoizzata con `React.cache`.
 * Una sola query per `userId` per render-pass.
 */
export const getPaymentsByUser = cache(async (userId: string) => {
  return prisma.paymentLog.findMany({
    where: { subscription: { userId } },
    orderBy: { paidAt: "desc" },
    include: { subscription: { select: { name: true } } },
  });
});
