import type { BillingCycle } from "@/lib/generated/prisma";
import { ZERO, type Money } from "@/lib/money";
import { wasActiveInPeriod } from "@/lib/subscription-status";

/**
 * Trend di spesa normalizzato — helper puro (Regola 1: tutto in Decimal).
 *
 * Coerente per costruzione col Monthly Burn Rate: stessa normalizzazione
 * (annuale / 12), stessa assenza di arrotondamenti intermedi. Il totale del mese
 * corrente coincide quindi con il Burn Rate mostrato nella card KPI.
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
}

/**
 * Costo mensile normalizzato di un singolo abbonamento.
 * Nessun arrotondamento: `div(12)` mantiene la precisione piena di Decimal e si
 * arrotonda una sola volta, sul totale, esattamente come fa il Burn Rate.
 */
export function normalizedMonthlyCost(sub: TrendSubscriptionInput): Money {
  return sub.billingCycle === "YEARLY" ? sub.amount.div(12) : sub.amount;
}

/** Chiave mese "YYYY-MM" dai componenti UTC di una data (Regola 2). */
function monthKeyUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Etichetta it-IT ancorata a UTC: evita lo slittamento di mese ai bordi. */
function formatMonthUTC(
  monthStart: Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("it-IT", {
    ...options,
    timeZone: "UTC",
  }).format(monthStart);
}

/**
 * Finestra degli ultimi `months` mesi, dal più vecchio al mese corrente incluso.
 * Ogni voce porta l'istante di inizio mese (UTC) e quello di inizio del mese
 * successivo, usato come estremo destro esclusivo nel test di attività.
 */
function buildWindow(now: Date, months: number) {
  const window = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const nextStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    );
    window.push({ start, nextStart });
  }
  return window;
}

/**
 * Serie del costo mensile normalizzato sugli ultimi `months` mesi.
 *
 * Un abbonamento contribuisce a un mese se era attivo in un qualsiasi istante di
 * quel mese: creato prima della fine del mese e non ancora cessato al suo inizio.
 *
 * ⚠️ È l'**unico** consumatore che riceve anche gli abbonamenti cessati. Tutti
 * gli altri filtrano con `onlyActive`. Passare qui una lista già filtrata
 * riporterebbe la serie a essere non decrescente, cioè al bug che il soft-delete
 * è servito a risolvere: il grafico tornerebbe a riscrivere il passato invece di
 * mostrare la spesa che scende.
 */
export function computeNormalizedTrend(
  subscriptions: TrendSubscriptionInput[],
  now: Date,
  months: number,
): TrendMonth[] {
  return buildWindow(now, months).map(({ start, nextStart }) => {
    let total = ZERO;
    for (const sub of subscriptions) {
      if (wasActiveInPeriod(sub, start, nextStart)) {
        total = total.add(normalizedMonthlyCost(sub));
      }
    }

    return {
      monthKey: monthKeyUTC(start),
      name: formatMonthUTC(start, { month: "short" }),
      fullLabel: formatMonthUTC(start, { month: "long", year: "numeric" }),
      total,
    };
  });
}
