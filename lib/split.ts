import { Prisma } from "@/lib/generated/prisma";
import { ZERO, money, splitByWeights } from "@/lib/money";

/**
 * Logica di ripartizione Split-Billing (Sprint 5). Confinata sul server.
 *
 * Il proprietario dell'abbonamento partecipa SEMPRE con peso 1; i membri
 * accettati o in attesa concorrono con il proprio `shareWeight`. I membri
 * DECLINED sono esclusi dalla ripartizione. Le quote sono calcolate in Decimal
 * (Regola 1) e la loro somma combacia esattamente con l'importo totale.
 */

/** Forma minima di un membro necessaria al calcolo delle quote. */
export interface ShareMemberInput {
  id: string;
  shareWeight: Prisma.Decimal | string | number;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
}

export interface ComputedShares {
  /** Quota a carico del proprietario (il suo costo personale). */
  ownerShare: Prisma.Decimal;
  /** memberId → quota dovuta al proprietario (esclude i DECLINED). */
  owedByMember: Map<string, Prisma.Decimal>;
}

export function computeShares(
  amount: Prisma.Decimal,
  members: ShareMemberInput[],
): ComputedShares {
  const active = members.filter((m) => m.status !== "DECLINED");
  const weights = [money(1), ...active.map((m) => money(m.shareWeight))];
  const shares = splitByWeights(amount, weights);

  const owedByMember = new Map<string, Prisma.Decimal>();
  active.forEach((m, i) => owedByMember.set(m.id, shares[i + 1] ?? ZERO));

  return { ownerShare: shares[0] ?? amount, owedByMember };
}
