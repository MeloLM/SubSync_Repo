"use server";

import { ZERO, type Money } from "@/lib/money";
import { getCurrentUserId } from "@/lib/auth";
import { getPaymentsByUser } from "@/lib/data/payments";
import { getSubscriptionsByUser } from "@/lib/data/subscriptions";
import type { SpendingTrendDTO, SpendingTrendPoint } from "@/types";

/**
 * Ampiezza della finestra temporale del trend (in mesi).
 * Non esportata: in un file "use server" gli export a runtime devono essere
 * SOLO funzioni async — costanti e helper restano module-scope.
 */
const WINDOW_MONTHS = 6;

/** Chiave mese "YYYY-MM" dai componenti UTC di una data (Regola 2). */
function monthKeyUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Etichetta mese it-IT ancorata a UTC, a partire da una monthKey "YYYY-MM". */
function formatMonthUTC(
  monthKey: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("it-IT", {
    ...options,
    timeZone: "UTC",
  }).format(date);
}

/**
 * Regola 4 (ARCHITECTURE.md): aggregazione confinata sul server.
 *
 * Somma la spesa reale (PaymentLog) degli ultimi `WINDOW_MONTHS` mesi, un bucket
 * per mese, dal più vecchio al più recente. I mesi senza pagamenti restano nella
 * serie con totale zero (barre vuote), così l'asse resta continuo.
 *
 * Legge dai fetcher memoizzati (React.cache): sulla dashboard la SELECT su
 * Subscription è già eseguita da Burn Rate + lista, quindi qui si deduplica la
 * query e la valuta resta coerente col Burn Rate.
 *
 * Tutte le somme sono in Prisma.Decimal (Regola 1); il DTO espone stringhe a 2
 * decimali: nessun float attraversa il confine server → client.
 */
export async function getSpendingTrend(): Promise<SpendingTrendDTO> {
  const userId = await getCurrentUserId();
  const [payments, subscriptions] = await Promise.all([
    getPaymentsByUser(userId),
    getSubscriptionsByUser(userId),
  ]);

  // Bucket a ZERO dal più vecchio (WINDOW_MONTHS-1 mesi fa) al mese corrente.
  const now = new Date();
  const buckets = new Map<string, Money>();
  const orderedKeys: string[] = [];
  for (let i = WINDOW_MONTHS - 1; i >= 0; i--) {
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    const key = monthKeyUTC(monthStart);
    buckets.set(key, ZERO);
    orderedKeys.push(key);
  }

  // Aggrega ogni pagamento nel bucket del suo mese UTC (Regola 1: Decimal).
  // I pagamenti fuori finestra non hanno bucket → ignorati.
  for (const payment of payments) {
    const key = monthKeyUTC(payment.paidAt);
    const current = buckets.get(key);
    if (current) buckets.set(key, current.add(payment.amount));
  }

  // Punti della serie + totale della finestra, sempre in Decimal.
  let windowTotal = ZERO;
  const points: SpendingTrendPoint[] = orderedKeys.map((key) => {
    const total = buckets.get(key) ?? ZERO;
    windowTotal = windowTotal.add(total);
    return {
      monthKey: key,
      monthLabel: formatMonthUTC(key, { month: "short" }),
      fullLabel: formatMonthUTC(key, { month: "long", year: "numeric" }),
      total: total.toFixed(2), // Decimal → stringa solo al confine DTO
    };
  });

  return {
    currency: subscriptions[0]?.currency ?? "EUR",
    windowMonths: WINDOW_MONTHS,
    total: windowTotal.toFixed(2),
    points,
  };
}
