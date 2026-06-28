import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Data-access layer Split-Billing — letture memoizzate con `React.cache`.
 * Una sola query per chiave (subscriptionId / email / userId) per render-pass.
 */

/** Membri (inviti) di un abbonamento — vista del proprietario. */
export const getMembersBySubscription = cache(async (subscriptionId: string) => {
  return prisma.subscriptionMember.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: "asc" },
  });
});

/** Inviti in sospeso indirizzati a un'email — vista dell'invitato. */
export const getPendingInvitesForEmail = cache(async (email: string) => {
  return prisma.subscriptionMember.findMany({
    where: { email: email.toLowerCase(), status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      subscription: {
        include: { user: { select: { email: true } }, members: true },
      },
    },
  });
});

/** Abbonamenti condivisi e accettati da un utente — vista dell'invitato. */
export const getSharedWithUser = cache(async (userId: string) => {
  return prisma.subscriptionMember.findMany({
    where: { userId, status: "ACCEPTED" },
    orderBy: { createdAt: "desc" },
    include: {
      subscription: {
        include: { user: { select: { email: true } }, members: true },
      },
    },
  });
});
