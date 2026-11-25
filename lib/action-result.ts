import type { User } from "@supabase/supabase-js";

import { Prisma } from "@/lib/generated/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Helper condivisi dalle Server Action che restituiscono `ActionResult<T>`
 * (vedi `types/index.ts`): trasformano in valore gli errori attesi che altrimenti
 * verrebbero lanciati e redatti da Next.js in produzione.
 */

/** Messaggio per una sessione assente o scaduta. */
export const SESSION_EXPIRED_ERROR = "Sessione scaduta: accedi di nuovo.";

/**
 * Utente corrente, oppure `null` se non c'è una sessione valida.
 *
 * `getCurrentUser()` lancia quando la sessione manca: per una Server Action che
 * restituisce `ActionResult` è un caso atteso (cookie scaduto a form aperto), non
 * un guasto, e deve tornare alla UI come messaggio.
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/** Codici Prisma che rappresentano errori attesi (non guasti). */
type KnownPrismaCode = "P2025" | "P2002";

/** `true` se `err` è un errore noto di Prisma con il codice indicato. */
export function isPrismaError(err: unknown, code: KnownPrismaCode): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}
