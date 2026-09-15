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

/**
 * Pagamenti di una finestra temporale, per il flusso di cassa consolidato.
 *
 * Fetcher distinto da `getPaymentsByUser` e non un filtro in memoria sopra di
 * esso: quello legge **tutto** lo storico per la timeline `/payments`, e farci
 * sopra un grafico significherebbe trasferire ogni pagamento mai avvenuto a ogni
 * render della dashboard. Qui il taglio lo fa il database.
 *
 * Gli estremi sono epoch in millisecondi, non `Date`: `React.cache` memoizza per
 * identità degli argomenti, e due `Date` equivalenti create a ogni chiamata
 * sarebbero due chiavi diverse, mancando la cache a ogni render.
 *
 * Seleziona i soli campi che servono all'aggregazione (Regola 1: `amount` resta
 * `Decimal` fino al confine DTO).
 */
export const getPaymentsByUserInRange = cache(
  async (userId: string, fromMs: number, toMs: number) => {
    return prisma.paymentLog.findMany({
      where: {
        subscription: { userId },
        paidAt: { gte: new Date(fromMs), lt: new Date(toMs) },
      },
      orderBy: { paidAt: "asc" },
      select: { amount: true, paidAt: true },
    });
  },
);
