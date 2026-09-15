import type { BillingCycle } from "@/lib/generated/prisma";
import { ZERO, type Money } from "@/lib/money";
import { buildMonthBuckets, type MonthBucket } from "@/lib/date";
import { wasActiveInPeriod } from "@/lib/subscription-status";

/**
 * Trend di spesa per **competenza** — helper puro (Regola 1: tutto in Decimal).
 *
 * Coerente per costruzione col Monthly Burn Rate: stessa normalizzazione
 * (annuale / 12), stessa assenza di arrotondamenti intermedi. Il totale del mese
 * corrente coincide quindi con il Burn Rate mostrato nella card KPI.
 *
 * La metrica speculare — la spesa per **cassa**, cioè l'importo pieno nel mese
 * in cui esce davvero dal conto — vive in `lib/cash-flow.ts`. Le due condividono
 * lo scheletro temporale (`buildMonthBuckets` in `lib/date.ts`) ma non la
 * matematica, e non vanno mai sommate fra loro.
 *
 * Nessun accesso al database qui: la funzione riceve gli abbonamenti già letti,
 * così resta testabile in isolamento (Parte VI di AI_law_subsync.md).
 */

/** Forma minima richiesta: disaccoppia l'helper dal model Prisma completo. */
export interface TrendSubscriptionInput {
  amount: Money;
  billingCycle: BillingCycle;
  createdAt: Date;
  canceledAt: Date | null;
}

/** Un mese della serie, con totale ancora in Decimal (serializzato dal chiamante). */
export interface TrendMonth {
  monthKey: string; // "YYYY-MM" (UTC) — chiave stabile
  name: string; // etichetta breve asse X, es. "mar"
  fullLabel: string; // etichetta estesa tooltip, es. "marzo 2026"
  total: Money;
  /** Mese non ancora iniziato: la UI lo disegna attenuato. */
  isFuture: boolean;
}

/**
 * Costo mensile normalizzato di un singolo abbonamento.
 * Nessun arrotondamento: `div(12)` mantiene la precisione piena di Decimal e si
 * arrotonda una sola volta, sul totale, esattamente come fa il Burn Rate.
 */
export function normalizedMonthlyCost(sub: TrendSubscriptionInput): Money {
  return sub.billingCycle === "YEARLY" ? sub.amount.div(12) : sub.amount;
}

/**
 * Serie del costo normalizzato sui mesi dati.
 *
 * Un abbonamento contribuisce a un mese se era attivo in un qualsiasi istante di
 * quel mese: creato prima della fine del mese e non ancora cessato al suo inizio.
 * La stessa condizione si estende naturalmente ai mesi **futuri** — un
 * abbonamento attivo oggi lo è anche in un mese che deve ancora iniziare, un
 * cessato no — quindi la funzione produce la proiezione per competenza senza
 * trattamenti speciali: una linea piatta al Burn Rate corrente.
 *
 * ⚠️ È l'**unico** consumatore che riceve anche gli abbonamenti cessati. Tutti
 * gli altri filtrano con `onlyActive`. Passare qui una lista già filtrata
 * riporterebbe la serie a essere non decrescente, cioè al bug che il soft-delete
 * è servito a risolvere: il grafico tornerebbe a riscrivere il passato invece di
 * mostrare la spesa che scende.
 */
export function computeNormalizedSeries(
  subscriptions: TrendSubscriptionInput[],
  buckets: MonthBucket[],
): TrendMonth[] {
  return buckets.map((bucket) => {
    let total = ZERO;
    for (const sub of subscriptions) {
      if (wasActiveInPeriod(sub, bucket.start, bucket.nextStart)) {
        total = total.add(normalizedMonthlyCost(sub));
      }
    }

    return {
      monthKey: bucket.monthKey,
      name: bucket.name,
      fullLabel: bucket.fullLabel,
      total,
      isFuture: bucket.isFuture,
    };
  });
}

/**
 * Finestra retrospettiva classica: gli ultimi `months` mesi, dal più vecchio al
 * mese corrente incluso. Zucchero su `computeNormalizedSeries`.
 */
export function computeNormalizedTrend(
  subscriptions: TrendSubscriptionInput[],
  now: Date,
  months: number,
): TrendMonth[] {
  return computeNormalizedSeries(subscriptions, buildMonthBuckets(now, months, 0));
}
