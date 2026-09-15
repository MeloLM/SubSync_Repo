import type {
  Subscription,
  PaymentLog,
  BillingCycle,
  ExpenseNature,
  VatRegime,
  FiscalDocumentType,
} from "@/lib/generated/prisma";

/**
 * DTO serializzabili per passare in modo sicuro i dati Prisma ai Client
 * Components.
 *
 * I `Decimal` di Prisma e le `Date` non sono props affidabili attraverso il
 * confine server → client: vengono convertiti in `string`
 * (Decimal → stringa a 2 decimali; Date → ISO 8601 UTC).
 */

export interface SubscriptionDTO {
  id: string;
  name: string;
  amount: string; // Prisma.Decimal → stringa (es. "17.99")
  currency: string;
  billingCycle: BillingCycle;
  nextRenewalDate: string; // ISO 8601 (UTC)
  createdAt: string; // ISO 8601 (UTC)
  canceledAt: string | null; // ISO 8601 (UTC) — null = attivo (soft-delete)

  // ─── Fiscalità (Sprint 7) — Decimal serializzati a stringa (Regola 1) ───
  expenseNature: ExpenseNature;
  categoryId: string | null;
  amountIsGross: boolean;
  vatRate: string; // Prisma.Decimal → stringa (es. "22.00")
  vatRegime: VatRegime | null;
  costDeductiblePct: string; // Prisma.Decimal → stringa
  vatDeductiblePct: string; // Prisma.Decimal → stringa
  documentType: FiscalDocumentType;
  supplierVatId: string | null;
}

export interface PaymentLogDTO {
  id: string;
  subscriptionId: string;
  amount: string; // Prisma.Decimal → stringa
  paidAt: string; // ISO 8601 (UTC)
}

export interface BurnRateDTO {
  monthlyBurnRate: string; // Prisma.Decimal → stringa
  currency: string;
  subscriptionCount: number;
}

/**
 * Un punto del grafico di dashboard: un **mese** ("YYYY-MM") nelle viste a 6
 * mesi e 1 anno, un **giorno** ("YYYY-MM-DD") nella vista a 30 giorni.
 */
export interface ChartPointDTO {
  key: string; // chiave stabile / React key (UTC)
  name: string; // etichetta breve asse-x, es. "lug" o "25 ago" (it-IT, UTC)
  fullLabel: string; // etichetta estesa tooltip/aria (it-IT, UTC)
  total: string; // totale, Prisma.Decimal → stringa a 2 decimali (Regola 1)
  isFuture: boolean; // periodo non ancora iniziato: la UI lo disegna proiettato
}

export interface ChartSeriesDTO {
  points: ChartPointDTO[];
  total: string; // totale cumulato della serie, Decimal → stringa
}

/**
 * Tutte le serie del grafico di dashboard, **già aggregate sul server**
 * (Regola 4). Il client sceglie quale disegnare in base ai due selettori
 * (metrica × finestra): scegliere una serie precalcolata non è ricalcolarla, e
 * cambiare vista non costa un round-trip.
 *
 * Il sovrapprezzo è nullo: tutte le serie nascono dalla stessa SELECT memoizzata
 * su `Subscription`, e l'intero payload sta in poche decine di punti.
 *
 * - `accrual*` — **competenza**: costo normalizzato (annuale/12), la metrica del
 *   Monthly Burn Rate. Nel futuro è una linea piatta al Burn Rate corrente.
 * - `cash*` — **cassa**: importi pieni nel mese in cui escono davvero. Passato
 *   dai `PaymentLog` reali, futuro dalla proiezione dei rinnovi.
 * - `cash30d` — prossimi 30 giorni a granularità giornaliera, solo cassa: un
 *   mese su bucket mensili sarebbe una barra sola. La serie contiene **tutti** i
 *   30 giorni, a zero dove non cade nessun addebito, così l'asse X è un
 *   calendario continuo e la distanza fra un addebito e l'altro resta leggibile.
 */
export interface DashboardChartsDTO {
  currency: string;
  accrual6m: ChartSeriesDTO;
  accrual1y: ChartSeriesDTO;
  cash6m: ChartSeriesDTO;
  cash1y: ChartSeriesDTO;
  cash30d: ChartSeriesDTO;
}

/** Mapper Prisma → DTO. Usare nelle Server Actions prima di passare le props. */
export function toSubscriptionDTO(s: Subscription): SubscriptionDTO {
  return {
    id: s.id,
    name: s.name,
    amount: s.amount.toFixed(2),
    currency: s.currency,
    billingCycle: s.billingCycle,
    nextRenewalDate: s.nextRenewalDate.toISOString(),
    createdAt: s.createdAt.toISOString(),
    canceledAt: s.canceledAt?.toISOString() ?? null,
    expenseNature: s.expenseNature,
    categoryId: s.categoryId,
    amountIsGross: s.amountIsGross,
    vatRate: s.vatRate.toFixed(2),
    vatRegime: s.vatRegime,
    costDeductiblePct: s.costDeductiblePct.toFixed(2),
    vatDeductiblePct: s.vatDeductiblePct.toFixed(2),
    documentType: s.documentType,
    supplierVatId: s.supplierVatId,
  };
}

export function toPaymentLogDTO(p: PaymentLog): PaymentLogDTO {
  return {
    id: p.id,
    subscriptionId: p.subscriptionId,
    amount: p.amount.toFixed(2),
    paidAt: p.paidAt.toISOString(),
  };
}
