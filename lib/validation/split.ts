import { z } from "zod";

import { decimalString, idSchema } from "@/lib/validation/common";

/**
 * Schemi di validazione dello split-billing (Sprint 8, intervento 2).
 *
 * Helper puri. Le regole che dipendono dall'utente o dal database (non invitare
 * se stessi, abbonamento proprio e attivo, invito duplicato) restano nell'action.
 */

export const MAX_SHARE_WEIGHT = "100";
const MAX_EMAIL_LENGTH = 254; // limite RFC 5321 per un indirizzo

const EMAIL_REQUIRED = "Email obbligatoria.";

/** Email tagliata, in minuscolo e di forma valida: è la chiave dell'invito. */
export const emailSchema = z
  .string({ error: EMAIL_REQUIRED })
  .trim()
  .toLowerCase()
  .min(1, EMAIL_REQUIRED)
  .max(MAX_EMAIL_LENGTH, "Email troppo lunga.")
  .pipe(z.email({ error: "Email non valida." }));

/** Peso della quota come stringa decimale: maggiore di zero e al massimo 100 (Regola 1). */
export const shareWeightSchema = decimalString({
  required: "La quota deve essere un numero maggiore di zero.",
  format: "La quota deve essere un numero maggiore di zero, con al massimo quattro decimali.",
  maxDecimals: 4,
  positive: true,
  positiveMessage: "La quota deve essere un numero maggiore di zero.",
  max: MAX_SHARE_WEIGHT,
  maxMessage: "La quota non può superare 100.",
});

const subscriptionIdSchema = idSchema("Abbonamento non valido.");
export const memberIdSchema = idSchema("Membro non valido.");

/** Invito: la quota omessa vale 1 (parti uguali). */
export const inviteMemberSchema = z.object({
  subscriptionId: subscriptionIdSchema,
  email: emailSchema,
  shareWeight: shareWeightSchema.default("1"),
});

export const updateMemberShareSchema = z.object({
  memberId: memberIdSchema,
  shareWeight: shareWeightSchema,
});

/** Segna saldato / rimuovi: serve solo il membro. */
export const memberActionSchema = z.object({ memberId: memberIdSchema });

export const respondToInviteSchema = z.object({
  memberId: idSchema("Invito non valido."),
  accept: z.boolean({ error: "Risposta all'invito non valida." }),
});
