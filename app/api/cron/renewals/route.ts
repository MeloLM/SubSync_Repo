import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { advanceRenewalDate } from "@/lib/date";
import { Prisma } from "@/lib/generated/prisma";

export const dynamic = "force-dynamic";

/**
 * Cron Job rinnovi (Sprint 4).
 * Job di sistema (nessuna sessione utente): processa gli abbonamenti di TUTTI
 * gli utenti la cui `nextRenewalDate` è scaduta. Per ogni ciclo trascorso crea
 * un `PaymentLog` (importo Decimal, Regola 1; `paidAt` in UTC, Regola 2) e
 * avanza `nextRenewalDate` finché torna nel futuro (idempotente).
 *
 * Protetto da `CRON_SECRET` (header `Authorization: Bearer <secret>`, inviato
 * automaticamente da Vercel Cron). Sotto `app/api`, quindi escluso dal middleware.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // non configurato → nega per sicurezza
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.subscription.findMany({
    where: { nextRenewalDate: { lte: now } },
  });

  let paymentsCreated = 0;

  for (const sub of due) {
    const payments: Prisma.PaymentLogCreateManyInput[] = [];
    let next = sub.nextRenewalDate;

    // Recupera ogni ciclo scaduto (cap di sicurezza contro loop anomali).
    let guard = 0;
    while (next <= now && guard < 600) {
      payments.push({ subscriptionId: sub.id, amount: sub.amount, paidAt: next });
      next = advanceRenewalDate(next, sub.billingCycle);
      guard++;
    }

    await prisma.$transaction([
      prisma.paymentLog.createMany({ data: payments }),
      prisma.subscription.update({
        where: { id: sub.id },
        data: { nextRenewalDate: next },
      }),
    ]);

    paymentsCreated += payments.length;
  }

  // ♻️ Invalida le viste dipendenti (le pagine sono force-dynamic, ma manteniamo
  // la regola di invalidazione su ogni mutazione di stato).
  if (paymentsCreated > 0) {
    revalidatePath("/");
    revalidatePath("/payments");
  }

  return NextResponse.json({
    ok: true,
    processedAt: now.toISOString(),
    subscriptionsProcessed: due.length,
    paymentsCreated,
  });
}
