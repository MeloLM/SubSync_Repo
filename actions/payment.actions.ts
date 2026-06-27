"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

/**
 * Riga pagamento per la UI (timeline). DTO serializzabile: `amount` Decimal →
 * stringa, `paidAt` Date → ISO (Regola 1 + Regola 2), più il nome del servizio.
 */
export interface PaymentRowDTO {
  id: string;
  name: string;
  amount: string;
  paidAt: string;
}

export async function listPayments(): Promise<PaymentRowDTO[]> {
  const userId = await getCurrentUserId();
  const payments = await prisma.paymentLog.findMany({
    where: { subscription: { userId } },
    orderBy: { paidAt: "desc" },
    include: { subscription: { select: { name: true } } },
  });

  return payments.map((p) => ({
    id: p.id,
    name: p.subscription.name,
    amount: p.amount.toFixed(2),
    paidAt: p.paidAt.toISOString(),
  }));
}
