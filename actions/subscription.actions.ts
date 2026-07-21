"use server";

import { revalidatePath } from "next/cache";
import type {
  BillingCycle,
  ExpenseNature,
  VatRegime,
  FiscalDocumentType,
} from "@/lib/generated/prisma";

import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { toUtcMidnight } from "@/lib/date";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import {
  getSubscriptionsByUser,
  getSubscriptionByIdForUser,
} from "@/lib/data/subscriptions";
import { toSubscriptionDTO, type SubscriptionDTO } from "@/types";

export interface SubscriptionInput {
  name: string;
  /** Importo grezzo dal form, convertito in Decimal (Regola 1). */
  amount: string | number;
  currency?: string;
  billingCycle: BillingCycle;
  /** "YYYY-MM-DD" dal date input, normalizzato a 00:00:00 UTC (Regola 2). */
  nextRenewalDate: string;

  // ─── Fiscalità (Sprint 7) — tutti opzionali: se omessi valgono i default DB ───
  expenseNature?: ExpenseNature;
  categoryId?: string | null;
  amountIsGross?: boolean;
  /** Aliquota IVA grezza dal form, convertita in Decimal (Regola 1). */
  vatRate?: string | number;
  vatRegime?: VatRegime | null;
  /** % deducibilità costo, convertita in Decimal (Regola 1). */
  costDeductiblePct?: string | number;
  /** % detraibilità IVA, convertita in Decimal (Regola 1). */
  vatDeductiblePct?: string | number;
  documentType?: FiscalDocumentType;
  supplierVatId?: string | null;
}

/**
 * Estrae i soli campi fiscali effettivamente presenti nell'input, nella forma
 * attesa da Prisma (Decimal via `money`, Regola 1). I campi assenti (`undefined`)
 * vengono omessi: in `create` scattano i default del DB, in `update` restano
 * invariati.
 */
function fiscalWriteData(input: Partial<SubscriptionInput>) {
  return {
    ...(input.expenseNature !== undefined && { expenseNature: input.expenseNature }),
    ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    ...(input.amountIsGross !== undefined && { amountIsGross: input.amountIsGross }),
    ...(input.vatRate !== undefined && { vatRate: money(input.vatRate) }),
    ...(input.vatRegime !== undefined && { vatRegime: input.vatRegime }),
    ...(input.costDeductiblePct !== undefined && {
      costDeductiblePct: money(input.costDeductiblePct),
    }),
    ...(input.vatDeductiblePct !== undefined && {
      vatDeductiblePct: money(input.vatDeductiblePct),
    }),
    ...(input.documentType !== undefined && { documentType: input.documentType }),
    ...(input.supplierVatId !== undefined && { supplierVatId: input.supplierVatId }),
  };
}

/** Invalida la cache delle viste che dipendono dagli abbonamenti (Regola 3). */
function revalidateSubscriptionViews() {
  revalidatePath("/");
  revalidatePath("/subscriptions");
}

export async function listSubscriptions(): Promise<SubscriptionDTO[]> {
  const userId = await getCurrentUserId();
  // Fetcher memoizzato (React.cache): condiviso con getMonthlyBurnRate → 1 SELECT.
  const subscriptions = await getSubscriptionsByUser(userId);
  return subscriptions.map(toSubscriptionDTO);
}

/** Singolo abbonamento dell'utente corrente (per il form di modifica). */
export async function getSubscription(id: string): Promise<SubscriptionDTO | null> {
  const userId = await getCurrentUserId();
  const subscription = await getSubscriptionByIdForUser(id, userId);
  return subscription ? toSubscriptionDTO(subscription) : null;
}

export async function createSubscription(
  input: SubscriptionInput,
): Promise<SubscriptionDTO> {
  const user = await getCurrentUser();

  // Garantisce il record Prisma `User` (id = UUID Supabase) per la FK userId.
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email ?? `${user.id}@subsync.local` },
    update: {},
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      name: input.name,
      amount: money(input.amount), // Regola 1
      currency: input.currency ?? "EUR",
      billingCycle: input.billingCycle,
      nextRenewalDate: toUtcMidnight(input.nextRenewalDate), // Regola 2
      ...fiscalWriteData(input), // Fiscalità (Sprint 7)
    },
  });

  revalidateSubscriptionViews(); // Regola 3
  return toSubscriptionDTO(subscription);
}

export async function updateSubscription(
  id: string,
  input: Partial<SubscriptionInput>,
): Promise<SubscriptionDTO> {
  const userId = await getCurrentUserId();

  // `where: { id, userId }` garantisce che si modifichi solo un record proprio.
  const subscription = await prisma.subscription.update({
    where: { id, userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.amount !== undefined && { amount: money(input.amount) }), // Regola 1
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.billingCycle !== undefined && {
        billingCycle: input.billingCycle,
      }),
      ...(input.nextRenewalDate !== undefined && {
        nextRenewalDate: toUtcMidnight(input.nextRenewalDate), // Regola 2
      }),
      ...fiscalWriteData(input), // Fiscalità (Sprint 7)
    },
  });

  revalidateSubscriptionViews(); // Regola 3
  return toSubscriptionDTO(subscription);
}

export async function deleteSubscription(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  await prisma.subscription.delete({ where: { id, userId } });
  revalidateSubscriptionViews(); // Regola 3
}
