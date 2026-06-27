import type {
  Subscription,
  PaymentLog,
  BillingCycle,
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
