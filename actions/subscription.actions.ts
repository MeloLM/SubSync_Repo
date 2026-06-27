"use server";

import { revalidatePath } from "next/cache";
import type { BillingCycle } from "@/lib/generated/prisma";

import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { toUtcMidnight } from "@/lib/date";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import { toSubscriptionDTO, type SubscriptionDTO } from "@/types";

export interface SubscriptionInput {
  name: string;
  /** Importo grezzo dal form, convertito in Decimal (Regola 1). */
  amount: string | number;
  currency?: string;
  billingCycle: BillingCycle;
  /** "YYYY-MM-DD" dal date input, normalizzato a 00:00:00 UTC (Regola 2). */
  nextRenewalDate: string;
}

/** Invalida la cache delle viste che dipendono dagli abbonamenti (Regola 3). */
function revalidateSubscriptionViews() {
  revalidatePath("/");
  revalidatePath("/subscriptions");
}

export async function listSubscriptions(): Promise<SubscriptionDTO[]> {
  const userId = await getCurrentUserId();
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { nextRenewalDate: "asc" },
  });
  return subscriptions.map(toSubscriptionDTO);
}

/** Singolo abbonamento dell'utente corrente (per il form di modifica). */
export async function getSubscription(id: string): Promise<SubscriptionDTO | null> {
  const userId = await getCurrentUserId();
  const subscription = await prisma.subscription.findFirst({
    where: { id, userId }, // scoping all'utente: niente accesso a record altrui
  });
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
