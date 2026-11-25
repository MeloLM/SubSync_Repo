"use server";

import { revalidatePath } from "next/cache";
import type { BillingCycle, SubscriptionMember } from "@/lib/generated/prisma";

import { prisma } from "@/lib/prisma";
import { ZERO, money } from "@/lib/money";
import { computeShares } from "@/lib/split";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import {
  SESSION_EXPIRED_ERROR,
  getSessionUser,
  isPrismaError,
} from "@/lib/action-result";
import type { ActionResult } from "@/types";
import { getSubscriptionByIdForUser } from "@/lib/data/subscriptions";
import { isActive } from "@/lib/subscription-status";
import {
  getMembersBySubscription,
  getPendingInvitesForEmail,
  getSharedWithUser,
} from "@/lib/data/members";

/**
 * Server Actions Split-Billing (Sprint 5) — condivisione del costo di un
 * abbonamento tra account reali tramite inviti.
 *
 * - Lato proprietario: invita/rimuove membri, regola le quote, segna i saldi.
 * - Lato invitato: vede gli inviti, li accetta/rifiuta, consulta i condivisi.
 *
 * Ogni mutazione invalida le viste interessate (Regola 3). Tutti gli importi
 * sono Decimal e attraversano il confine come stringa via DTO (Regola 1).
 */

type MemberStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface MemberDTO {
  id: string;
  email: string;
  status: MemberStatus;
  shareWeight: string;
  owedAmount: string; // quota dovuta al proprietario (Decimal → stringa)
  settled: boolean;
  settledAt: string | null;
}

export interface SplitOverviewDTO {
  subscriptionId: string;
  subscriptionName: string;
  amount: string;
  currency: string;
  ownerShare: string; // quota a carico del proprietario
  members: MemberDTO[];
}

export interface PendingInviteDTO {
  memberId: string;
  subscriptionId: string;
  subscriptionName: string;
  amount: string;
  currency: string;
  billingCycle: BillingCycle;
  ownerEmail: string;
  proposedOwed: string; // quota che l'invitato si troverebbe a dover saldare
}

export interface SharedSubscriptionDTO {
  memberId: string;
  subscriptionId: string;
  subscriptionName: string;
  amount: string;
  currency: string;
  billingCycle: BillingCycle;
  nextRenewalDate: string; // ISO 8601 (UTC)
  ownerEmail: string;
  myOwed: string;
  settled: boolean;
}

function revalidateSplitViews(subscriptionId?: string) {
  revalidatePath("/shared");
  revalidatePath("/subscriptions");
  if (subscriptionId) revalidatePath(`/subscriptions/${subscriptionId}/split`);
}

const MEMBER_NOT_FOUND_ERROR = "Membro non trovato o non autorizzato.";
const INVALID_WEIGHT_ERROR = "La quota deve essere un numero maggiore di zero.";
const DUPLICATE_INVITE_ERROR =
  "Questa email è già stata invitata a questo abbonamento.";

/**
 * Peso della quota da input grezzo, oppure `null` se non è un numero maggiore di
 * zero. `money()` lancia su una stringa non numerica: per le mutazioni che
 * restituiscono `ActionResult` è un input sbagliato atteso, non un guasto.
 */
function parseWeight(value: string | number) {
  try {
    const weight = money(value);
    return weight.isFinite() && weight.gt(ZERO) ? weight : null;
  } catch {
    return null;
  }
}

/**
 * Risolve un membro appartenente a un abbonamento del proprietario corrente.
 * Errori attesi (sessione scaduta, membro assente o altrui) tornano come valore.
 */
async function resolveOwnedMember(
  memberId: string,
): Promise<ActionResult<SubscriptionMember>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED_ERROR };

  const member = await prisma.subscriptionMember.findFirst({
    where: { id: memberId, subscription: { userId: user.id } },
  });
  if (!member) return { ok: false, error: MEMBER_NOT_FOUND_ERROR };
  return { ok: true, data: member };
}

// ─────────────────────────── Lato proprietario ───────────────────────────

/** Riepilogo della condivisione di un abbonamento (solo per il proprietario). */
export async function getSplitOverview(
  subscriptionId: string,
): Promise<SplitOverviewDTO | null> {
  const userId = await getCurrentUserId();
  const subscription = await getSubscriptionByIdForUser(subscriptionId, userId);
  if (!subscription) return null;

  const members = await getMembersBySubscription(subscriptionId);
  const { ownerShare, owedByMember } = computeShares(subscription.amount, members);

  return {
    subscriptionId: subscription.id,
    subscriptionName: subscription.name,
    amount: subscription.amount.toFixed(2),
    currency: subscription.currency,
    ownerShare: ownerShare.toFixed(2),
    members: members.map((m) => ({
      id: m.id,
      email: m.email,
      status: m.status,
      shareWeight: m.shareWeight.toString(),
      owedAmount: (owedByMember.get(m.id) ?? ZERO).toFixed(2),
      settled: m.settled,
      settledAt: m.settledAt ? m.settledAt.toISOString() : null,
    })),
  };
}

/*
 * Le mutazioni restituiscono `ActionResult` (vedi `types/index.ts`): gli errori
 * attesi (input non valido, non trovato, non autorizzato, duplicato, sessione
 * scaduta) tornano come `{ ok: false, error }`, perché in produzione un `throw`
 * arriverebbe al client redatto. Il `throw` resta solo per i guasti inattesi.
 */
export async function inviteMember(
  subscriptionId: string,
  email: string,
  shareWeight: string | number = 1,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED_ERROR };

  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: false, error: "Email obbligatoria." };
  if (normalized === (user.email ?? "").toLowerCase()) {
    return {
      ok: false,
      error: "Sei già il proprietario: non puoi invitare te stesso.",
    };
  }

  const weight = parseWeight(shareWeight);
  if (!weight) return { ok: false, error: INVALID_WEIGHT_ERROR };

  const subscription = await getSubscriptionByIdForUser(subscriptionId, user.id);
  if (!subscription) {
    return { ok: false, error: "Abbonamento non trovato o non autorizzato." };
  }
  // Soft-delete: non si invita qualcuno su un abbonamento già disdetto.
  if (!isActive(subscription)) {
    return {
      ok: false,
      error: "Abbonamento disattivato: riattivalo per invitare partecipanti.",
    };
  }

  const duplicate = await prisma.subscriptionMember.findUnique({
    where: { subscriptionId_email: { subscriptionId, email: normalized } },
  });
  if (duplicate) return { ok: false, error: DUPLICATE_INVITE_ERROR };

  // Se esiste già un account con quell'email, lo pre-collego (resta PENDING).
  const existing = await prisma.user.findUnique({ where: { email: normalized } });

  try {
    await prisma.subscriptionMember.create({
      data: {
        subscriptionId,
        email: normalized,
        userId: existing?.id ?? null,
        shareWeight: weight,
      },
    });
  } catch (err) {
    // P2002: due inviti concorrenti hanno superato insieme il controllo sopra.
    if (isPrismaError(err, "P2002")) return { ok: false, error: DUPLICATE_INVITE_ERROR };
    throw err;
  }

  revalidateSplitViews(subscriptionId);
  return { ok: true, data: null };
}

export async function updateMemberShare(
  memberId: string,
  shareWeight: string | number,
): Promise<ActionResult<null>> {
  const owned = await resolveOwnedMember(memberId);
  if (!owned.ok) return owned;
  const member = owned.data;

  const weight = parseWeight(shareWeight);
  if (!weight) return { ok: false, error: INVALID_WEIGHT_ERROR };

  try {
    await prisma.subscriptionMember.update({
      where: { id: memberId },
      data: { shareWeight: weight },
    });
  } catch (err) {
    // P2025: il membro è stato rimosso fra la lettura e la scrittura.
    if (isPrismaError(err, "P2025")) return { ok: false, error: MEMBER_NOT_FOUND_ERROR };
    throw err;
  }
  revalidateSplitViews(member.subscriptionId);
  return { ok: true, data: null };
}

export async function toggleMemberSettled(
  memberId: string,
): Promise<ActionResult<null>> {
  const owned = await resolveOwnedMember(memberId);
  if (!owned.ok) return owned;
  const member = owned.data;

  const settled = !member.settled;
  try {
    await prisma.subscriptionMember.update({
      where: { id: memberId },
      data: { settled, settledAt: settled ? new Date() : null },
    });
  } catch (err) {
    if (isPrismaError(err, "P2025")) return { ok: false, error: MEMBER_NOT_FOUND_ERROR };
    throw err;
  }
  revalidateSplitViews(member.subscriptionId);
  return { ok: true, data: null };
}

export async function removeMember(memberId: string): Promise<ActionResult<null>> {
  const owned = await resolveOwnedMember(memberId);
  if (!owned.ok) return owned;
  const member = owned.data;

  try {
    await prisma.subscriptionMember.delete({ where: { id: memberId } });
  } catch (err) {
    if (isPrismaError(err, "P2025")) return { ok: false, error: MEMBER_NOT_FOUND_ERROR };
    throw err;
  }
  revalidateSplitViews(member.subscriptionId);
  return { ok: true, data: null };
}

// ──────────────────────────── Lato invitato ────────────────────────────

export async function listPendingInvites(): Promise<PendingInviteDTO[]> {
  const user = await getCurrentUser();
  const email = (user.email ?? "").toLowerCase();
  if (!email) return [];

  const invites = await getPendingInvitesForEmail(email);
  return invites.map((m) => {
    const { owedByMember } = computeShares(
      m.subscription.amount,
      m.subscription.members,
    );
    return {
      memberId: m.id,
      subscriptionId: m.subscriptionId,
      subscriptionName: m.subscription.name,
      amount: m.subscription.amount.toFixed(2),
      currency: m.subscription.currency,
      billingCycle: m.subscription.billingCycle,
      ownerEmail: m.subscription.user.email,
      proposedOwed: (owedByMember.get(m.id) ?? ZERO).toFixed(2),
    };
  });
}

export async function listSharedWithMe(): Promise<SharedSubscriptionDTO[]> {
  const userId = await getCurrentUserId();
  const shared = await getSharedWithUser(userId);

  return shared.map((m) => {
    const { owedByMember } = computeShares(
      m.subscription.amount,
      m.subscription.members,
    );
    return {
      memberId: m.id,
      subscriptionId: m.subscriptionId,
      subscriptionName: m.subscription.name,
      amount: m.subscription.amount.toFixed(2),
      currency: m.subscription.currency,
      billingCycle: m.subscription.billingCycle,
      nextRenewalDate: m.subscription.nextRenewalDate.toISOString(),
      ownerEmail: m.subscription.user.email,
      myOwed: (owedByMember.get(m.id) ?? ZERO).toFixed(2),
      settled: m.settled,
    };
  });
}

/** Conteggio inviti in sospeso per l'utente corrente (badge in sidebar). */
export async function countPendingInvites(): Promise<number> {
  const user = await getCurrentUser();
  const email = (user.email ?? "").toLowerCase();
  if (!email) return 0;
  return (await getPendingInvitesForEmail(email)).length;
}

export async function respondToInvite(
  memberId: string,
  accept: boolean,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED_ERROR };
  const email = (user.email ?? "").toLowerCase();

  const member = await prisma.subscriptionMember.findUnique({
    where: { id: memberId },
  });
  if (!member || member.email.toLowerCase() !== email) {
    return { ok: false, error: "Invito non trovato." };
  }
  if (member.status !== "PENDING") return { ok: false, error: "Invito già gestito." };

  if (accept) {
    // Garantisce il record Prisma `User` (FK) come in createSubscription.
    await prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email ?? `${user.id}@subsync.local` },
      update: {},
    });
    await prisma.subscriptionMember.update({
      where: { id: memberId },
      data: { status: "ACCEPTED", userId: user.id },
    });
  } else {
    await prisma.subscriptionMember.update({
      where: { id: memberId },
      data: { status: "DECLINED" },
    });
  }

  revalidateSplitViews(member.subscriptionId);
  revalidatePath("/");
  return { ok: true, data: null };
}
