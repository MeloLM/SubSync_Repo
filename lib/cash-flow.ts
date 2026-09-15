import type { BillingCycle } from "@/lib/generated/prisma";
import { ZERO, type Money } from "@/lib/money";
import {
  addDaysUTC,
  advanceRenewalDate,
  dayKeyUTC,
  formatUTC,
  monthKeyUTC,
  toUtcMidnight,
  type MonthBucket,
} from "@/lib/date";

/**
 * Flusso di cassa — helper puro (Regola 1: tutto in Decimal).
 *
 * ┌─ La differenza rispetto a `lib/spending-trend.ts` ────────────────────────┐
 * │ Il trend misura la spesa per **competenza**: un annuale da 120 € pesa     │
 * │ 10 € su ognuno dei dodici mesi a cui si riferisce. Serve a rispondere a   │
 * │ "quanto mi costa in media al mese", ed è la metrica del Monthly Burn Rate.│
 * │                                                                           │
 * │ Questo file misura la spesa per **cassa**: quei 120 € escono tutti nel    │
 * │ mese del rinnovo. Serve a rispondere a "in quali mesi spenderò di più",   │
 * │ e la normalizzazione nasconderebbe esattamente i picchi che si cercano.   │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Il passato della cassa **non si ricostruisce, si legge**: sono i `PaymentLog`
 * che il cron scrive a ogni rinnovo, importi pieni con la data reale. È un fatto
 * storico, e sopravvive alla disdetta grazie al soft-delete.
 *
 * ⚠️ Filtro degli attivi, all'opposto del trend: la proiezione riceve **solo
 * abbonamenti attivi** (un abbonamento disdetto non ha rinnovi futuri), mentre
 * `lib/spending-trend.ts` è l'unico consumatore che vuole anche i cessati. Le
 * due regole sono speculari e vanno lette insieme, mai per analogia.
 *
 * Nessun accesso al database qui: le funzioni ricevono i dati già letti, così
 * restano testabili in isolamento (Parte VI di AI_law_subsync.md).
 */

/** Forma minima richiesta: disaccoppia l'helper dal model Prisma completo. */
export interface CashFlowSubscriptionInput {
  amount: Money;
  billingCycle: BillingCycle;
  nextRenewalDate: Date;
  canceledAt: Date | null;
}

/** Forma minima di un pagamento già avvenuto. */
export interface CashFlowPaymentInput {
  amount: Money;
  paidAt: Date;
}

/** Un mese della serie di cassa, con totale ancora in Decimal. */
export interface CashFlowMonth {
  monthKey: string;
  name: string;
  fullLabel: string;
  total: Money;
  /** Mese non ancora iniziato: la UI lo disegna attenuato. */
  isFuture: boolean;
}

/** Un giorno della vista "prossimi 30 giorni", addebiti o no. */
export interface CashFlowDay {
  dayKey: string; // "YYYY-MM-DD"
  name: string; // "3 nov"
  fullLabel: string; // "martedì 3 novembre 2026"
  total: Money;
}

/**
 * Cap di sicurezza sul numero di cicli enumerati per abbonamento, allineato a
 * quello del cron dei rinnovi. Protegge da input anomali (una `nextRenewalDate`
 * di dieci anni fa su un mensile) senza mai scattare in condizioni normali.
 */
const MAX_OCCURRENCES = 600;

/**
 * Date di rinnovo di un abbonamento che cadono nell'intervallo `[from, to)`.
 *
 * L'enumerazione avanza iterando `advanceRenewalDate`, cioè **la stessa funzione
 * che userà il cron**. È una scelta deliberata: ricalcolare le occorrenze dal
 * giorno di ancoraggio originale darebbe una previsione più "giusta" sulla carta
 * (31 gen → 28 feb → 31 mar), ma divergerebbe da ciò che il cron farà davvero
 * (31 gen → 28 feb → 28 mar), perché il giorno di ancoraggio non è memorizzato.
 * Fra una previsione elegante e una previsione vera, questa funzione sceglie la
 * seconda: il grafico non può promettere una data che il cron non rispetterà.
 *
 * Un abbonamento cessato non ha rinnovi futuri: restituisce sempre `[]`.
 */
export function renewalOccurrencesInWindow(
  sub: CashFlowSubscriptionInput,
  from: Date,
  to: Date,
): Date[] {
  if (sub.canceledAt !== null) return [];

  const occurrences: Date[] = [];
  let cursor = sub.nextRenewalDate;
  let guard = 0;

  // Rinnovi antecedenti alla finestra: appartengono al passato, che in vista
  // cassa è coperto dai PaymentLog. Qui si scorrono soltanto.
  while (cursor < from && guard < MAX_OCCURRENCES) {
    cursor = advanceRenewalDate(cursor, sub.billingCycle);
    guard++;
  }

  while (cursor < to && guard < MAX_OCCURRENCES) {
    occurrences.push(cursor);
    cursor = advanceRenewalDate(cursor, sub.billingCycle);
    guard++;
  }

  return occurrences;
}

/** Scheletro vuoto: un accumulatore a zero per ogni mese della finestra. */
function emptySeries(buckets: MonthBucket[]): CashFlowMonth[] {
  return buckets.map((bucket) => ({
    monthKey: bucket.monthKey,
    name: bucket.name,
    fullLabel: bucket.fullLabel,
    total: ZERO,
    isFuture: bucket.isFuture,
  }));
}

/**
 * Proiezione: importi **pieni** nei mesi in cui cade il rinnovo.
 *
 * Nessuna divisione per 12 — è il punto della metrica. `from` delimita l'inizio
 * della proiezione ed è pensato per essere il confine col passato consolidato,
 * così un rinnovo già registrato come `PaymentLog` non viene contato due volte.
 */
export function computeProjectedCashFlow(
  subscriptions: CashFlowSubscriptionInput[],
  buckets: MonthBucket[],
  from: Date,
): CashFlowMonth[] {
  const series = emptySeries(buckets);
  if (buckets.length === 0) return series;

  const byMonth = new Map(series.map((month) => [month.monthKey, month]));
  const windowStart = from > buckets[0].start ? from : buckets[0].start;
  const windowEnd = buckets[buckets.length - 1].nextStart;

  for (const sub of subscriptions) {
    for (const date of renewalOccurrencesInWindow(sub, windowStart, windowEnd)) {
      const month = byMonth.get(monthKeyUTC(date));
      if (month) month.total = month.total.add(sub.amount);
    }
  }

  return series;
}

/**
 * Cassa storica: aggregazione dei pagamenti realmente avvenuti.
 * I pagamenti fuori finestra vengono ignorati, così la funzione resta corretta
 * anche se il chiamante passa uno storico più ampio del necessario.
 */
export function computeHistoricalCashFlow(
  payments: CashFlowPaymentInput[],
  buckets: MonthBucket[],
): CashFlowMonth[] {
  const series = emptySeries(buckets);
  const byMonth = new Map(series.map((month) => [month.monthKey, month]));

  for (const payment of payments) {
    const month = byMonth.get(monthKeyUTC(payment.paidAt));
    if (month) month.total = month.total.add(payment.amount);
  }

  return series;
}

/**
 * Serie di cassa completa: consolidato fino a oggi compreso, proiettato da
 * domani in poi.
 *
 * Il confine è la **mezzanotte UTC di domani**, e non è una scelta estetica: il
 * cron gira alle 06:00 UTC e scrive un `PaymentLog` datato al giorno del
 * rinnovo. Mettendo il confine a domani, un rinnovo di oggi è già coperto dallo
 * storico se il cron è passato, e la proiezione — che riparte dalla
 * `nextRenewalDate` ormai avanzata — non lo riconta.
 *
 * Effetto collaterale accettato: se il cron non è ancora passato, l'addebito di
 * oggi non compare in nessuna delle due metà e il mese corrente resta
 * sottostimato per poche ore. Preferibile al doppio conteggio, che darebbe un
 * numero gonfiato senza che nulla lo segnali.
 */
export function computeCashFlowSeries(
  subscriptions: CashFlowSubscriptionInput[],
  payments: CashFlowPaymentInput[],
  buckets: MonthBucket[],
  now: Date,
): CashFlowMonth[] {
  const boundary = addDaysUTC(now, 1);

  const consolidated = computeHistoricalCashFlow(
    payments.filter((payment) => payment.paidAt < boundary),
    buckets,
  );
  const projected = computeProjectedCashFlow(subscriptions, buckets, boundary);

  return consolidated.map((month, i) => ({
    ...month,
    total: month.total.add(projected[i].total),
  }));
}

/**
 * Vista "prossimi `days` giorni": **un punto per ogni giorno**, a zero dove non
 * cade nessun addebito.
 *
 * Una finestra di un mese su bucket mensili sarebbe una barra sola: qui la
 * granularità scende al giorno, perché la domanda a cui la vista risponde è
 * "quando mi addebitano cosa", non "quanto spendo questo mese".
 *
 * ⚠️ I giorni vuoti fanno parte della serie, e non è un dettaglio di
 * implementazione: restituire solo i giorni con un addebito produceva un asse X
 * fatto di tre colonne accostate, dove la distanza fra un addebito e l'altro
 * spariva. Tre spese ravvicinate e tre spese distribuite sul mese disegnavano lo
 * stesso grafico. Lo scheletro si costruisce prima, il riempimento viene dopo —
 * lo stesso ordine di `emptySeries` per i mesi.
 *
 * A differenza di `computeCashFlowSeries` la finestra parte da **oggi incluso**:
 * è una vista puramente prospettica, non si fonde con lo storico e quindi non
 * c'è alcun rischio di doppio conteggio.
 */
export function computeDailyCashFlow(
  subscriptions: CashFlowSubscriptionInput[],
  now: Date,
  days: number,
): CashFlowDay[] {
  const from = toUtcMidnight(now);
  const to = addDaysUTC(from, days);

  const series: CashFlowDay[] = [];
  const byDay = new Map<string, CashFlowDay>();

  for (let offset = 0; offset < days; offset++) {
    const date = addDaysUTC(from, offset);
    const entry: CashFlowDay = {
      dayKey: dayKeyUTC(date),
      name: formatUTC(date, { day: "numeric", month: "short" }),
      fullLabel: formatUTC(date, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      total: ZERO,
    };
    series.push(entry);
    byDay.set(entry.dayKey, entry);
  }

  for (const sub of subscriptions) {
    for (const date of renewalOccurrencesInWindow(sub, from, to)) {
      const day = byDay.get(dayKeyUTC(date));
      if (day) day.total = day.total.add(sub.amount);
    }
  }

  return series;
}
