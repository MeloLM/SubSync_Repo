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

/** Un mese della serie "Trend di spesa" (aggregato dai PaymentLog, Regola 4). */
export interface SpendingTrendPoint {
  monthKey: string; // "YYYY-MM" (UTC) — chiave stabile / React key
  monthLabel: string; // etichetta breve asse-x, es. "lug" (it-IT, UTC)
  fullLabel: string; // etichetta estesa tooltip/aria, es. "luglio 2026" (it-IT, UTC)
  total: string; // totale del mese, Prisma.Decimal → stringa a 2 decimali (Regola 1)
}

export interface SpendingTrendDTO {
  currency: string;
  windowMonths: number;
  total: string; // Σ della finestra, Prisma.Decimal → stringa
  points: SpendingTrendPoint[];
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
