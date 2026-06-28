"use server";

import { revalidatePath } from "next/cache";
import type { BillingCycle } from "@/lib/generated/prisma";

import { prisma } from "@/lib/prisma";
import { ZERO, money } from "@/lib/money";
import { computeShares } from "@/lib/split";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import { getSubscriptionByIdForUser } from "@/lib/data/subscriptions";
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

/** Verifica che un membro appartenga a un abbonamento del proprietario corrente. */
async function requireOwnedMember(memberId: string) {
  const userId = await getCurrentUserId();
  const member = await prisma.subscriptionMember.findFirst({
    where: { id: memberId, subscription: { userId } },
  });
  if (!member) throw new Error("Membro non trovato o non autorizzato.");
  return member;
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

export async function inviteMember(
  subscriptionId: string,
  email: string,
  shareWeight: string | number = 1,
): Promise<void> {
  const user = await getCurrentUser();
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Email obbligatoria.");
  if (normalized === (user.email ?? "").toLowerCase()) {
    throw new Error("Sei già il proprietario: non puoi invitare te stesso.");
  }

  const subscription = await getSubscriptionByIdForUser(subscriptionId, user.id);
  if (!subscription) throw new Error("Abbonamento non trovato o non autorizzato.");

  const weight = money(shareWeight);
  if (weight.lte(ZERO)) throw new Error("La quota deve essere maggiore di zero.");

  const duplicate = await prisma.subscriptionMember.findUnique({
    where: { subscriptionId_email: { subscriptionId, email: normalized } },
  });
  if (duplicate) {
    throw new Error("Questa email è già stata invitata a questo abbonamento.");
  }

  // Se esiste già un account con quell'email, lo pre-collego (resta PENDING).
  const existing = await prisma.user.findUnique({ where: { email: normalized } });

  await prisma.subscriptionMember.create({
    data: {
      subscriptionId,
      email: normalized,
      userId: existing?.id ?? null,
      shareWeight: weight,
    },
  });

  revalidateSplitViews(subscriptionId);
}

export async function updateMemberShare(
  memberId: string,
  shareWeight: string | number,
): Promise<void> {
  const member = await requireOwnedMember(memberId);
  const weight = money(shareWeight);
  if (weight.lte(ZERO)) throw new Error("La quota deve essere maggiore di zero.");

  await prisma.subscriptionMember.update({
    where: { id: memberId },
    data: { shareWeight: weight },
  });
  revalidateSplitViews(member.subscriptionId);
}

export async function toggleMemberSettled(memberId: string): Promise<void> {
  const member = await requireOwnedMember(memberId);
  const settled = !member.settled;
  await prisma.subscriptionMember.update({
    where: { id: memberId },
    data: { settled, settledAt: settled ? new Date() : null },
  });
  revalidateSplitViews(member.subscriptionId);
}

export async function removeMember(memberId: string): Promise<void> {
  const member = await requireOwnedMember(memberId);
  await prisma.subscriptionMember.delete({ where: { id: memberId } });
  revalidateSplitViews(member.subscriptionId);
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
): Promise<void> {
  const user = await getCurrentUser();
  const email = (user.email ?? "").toLowerCase();

  const member = await prisma.subscriptionMember.findUnique({
    where: { id: memberId },
  });
  if (!member || member.email.toLowerCase() !== email) {
    throw new Error("Invito non trovato.");
  }
  if (member.status !== "PENDING") throw new Error("Invito già gestito.");

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
}
