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
import { getCurrentUserId } from "@/lib/auth";
import {
  SESSION_EXPIRED_ERROR,
  getSessionUser,
  isPrismaError,
} from "@/lib/action-result";
import {
  getSubscriptionsByUser,
  getSubscriptionByIdForUser,
} from "@/lib/data/subscriptions";
import { onlyActive } from "@/lib/subscription-status";
import {
  toSubscriptionDTO,
  type ActionResult,
  type SubscriptionDTO,
} from "@/types";

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

const NOT_FOUND_ERROR = "Abbonamento non trovato o non autorizzato.";

/** Invalida la cache delle viste che dipendono dagli abbonamenti (Regola 3). */
function revalidateSubscriptionViews() {
  revalidatePath("/");
  revalidatePath("/subscriptions");
}

export async function listSubscriptions(): Promise<SubscriptionDTO[]> {
  const userId = await getCurrentUserId();
  // Fetcher memoizzato (React.cache): condiviso con getMonthlyBurnRate → 1 SELECT.
  // Soft-delete: la lista mostra ciò che l'utente paga adesso.
  const subscriptions = onlyActive(await getSubscriptionsByUser(userId));
  return subscriptions.map(toSubscriptionDTO);
}

/** Singolo abbonamento dell'utente corrente (per il form di modifica). */
export async function getSubscription(id: string): Promise<SubscriptionDTO | null> {
  const userId = await getCurrentUserId();
  const subscription = await getSubscriptionByIdForUser(id, userId);
  return subscription ? toSubscriptionDTO(subscription) : null;
}

/*
 * Le quattro mutazioni restituiscono `ActionResult` (vedi `types/index.ts`): gli
 * errori attesi (sessione scaduta, abbonamento non trovato o non proprio) tornano
 * come `{ ok: false, error }`, perché in produzione un `throw` arriverebbe al
 * client redatto. Il `throw` resta solo per i guasti inattesi.
 */
export async function createSubscription(
  input: SubscriptionInput,
): Promise<ActionResult<SubscriptionDTO>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED_ERROR };

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
  return { ok: true, data: toSubscriptionDTO(subscription) };
}

export async function updateSubscription(
  id: string,
  input: Partial<SubscriptionInput>,
): Promise<ActionResult<SubscriptionDTO>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED_ERROR };

  let subscription;
  try {
    // `where: { id, userId }` garantisce che si modifichi solo un record proprio.
    subscription = await prisma.subscription.update({
      where: { id, userId: user.id },
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
  } catch (err) {
    // P2025: nessun record con quell'id per questo utente (assente o altrui).
    if (isPrismaError(err, "P2025")) return { ok: false, error: NOT_FOUND_ERROR };
    throw err;
  }

  revalidateSubscriptionViews(); // Regola 3
  return { ok: true, data: toSubscriptionDTO(subscription) };
}

/**
 * Soft-delete (Sprint 8): l'abbonamento viene **disattivato**, non cancellato.
 *
 * La cancellazione fisica portava via con sé i PaymentLog collegati (cascade) e
 * riscriveva il passato nel grafico del trend. Qui si valorizza `canceledAt`, così
 * lo storico resta intatto e la serie può finalmente scendere.
 *
 * `where: { id, userId }` garantisce che si tocchi solo un record proprio.
 * La data è normalizzata a 00:00:00 UTC (Regola 2): entra in confronti di
 * appartenenza al mese nel trend.
 */
export async function cancelSubscription(id: string): Promise<ActionResult<null>> {
  return setCanceledAt(id, toUtcMidnight(new Date()));
}

/** Riattiva un abbonamento disdetto: `canceledAt` torna a null. */
export async function reactivateSubscription(
  id: string,
): Promise<ActionResult<null>> {
  return setCanceledAt(id, null);
}

/** Scrittura comune a disdetta e riattivazione: stessa ownership, stessi errori. */
async function setCanceledAt(
  id: string,
  canceledAt: Date | null,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED_ERROR };

  try {
    await prisma.subscription.update({
      where: { id, userId: user.id },
      data: { canceledAt },
    });
  } catch (err) {
    if (isPrismaError(err, "P2025")) return { ok: false, error: NOT_FOUND_ERROR };
    throw err;
  }

  revalidateSubscriptionViews(); // Regola 3
  return { ok: true, data: null };
}
