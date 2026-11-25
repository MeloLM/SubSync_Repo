import { z } from "zod";

import { money } from "@/lib/money";
import { dayKeyUTC } from "@/lib/date";
import type { ActionResult } from "@/types";

/**
 * Mattoni comuni della validazione lato server (Sprint 8, intervento 2).
 *
 * Gli schemi **validano**, non convertono: la conversione resta a `money()`
 * (Regola 1) e a `toUtcMidnight()` (Regola 2) nelle Server Action. Qui i numeri
 * restano **stringhe**: nessun `number` attraversa un importo.
 *
 * Tutti i messaggi sono in italiano e finiscono, così come sono, dentro
 * `{ ok: false, error }` (vedi `ActionResult` in `types/index.ts`).
 */

export const INVALID_INPUT_ERROR = "Dati non validi.";

/**
 * Esegue lo schema su un input non fidato. Il primo errore diventa il messaggio
 * per l'utente; l'output (tagliato, normalizzato, senza chiavi sconosciute) è
 * l'unica forma che le action devono usare per scrivere.
 */
export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): ActionResult<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? INVALID_INPUT_ERROR };
}

/** Identificativo (cuid/uuid) ricevuto dal client: non vuoto e di lunghezza sana. */
export function idSchema(message: string) {
  return z
    .string({ error: message })
    .trim()
    .min(1, message)
    .max(64, message);
}

/**
 * Numero decimale grezzo (stringa o number dal form) ridotto a stringa.
 *
 * Un `number` passa per `String()`: valori come `1e21`, `NaN` o `Infinity`
 * producono testo che il formato sotto rifiuta, senza bisogno di casi speciali.
 */
function rawDecimal(requiredMessage: string) {
  return z
    .union([z.string(), z.number()], { error: requiredMessage })
    .transform((value) => (typeof value === "number" ? String(value) : value.trim()));
}

interface DecimalOptions {
  /** Messaggio per un campo mancante o di tipo sbagliato. */
  required: string;
  /** Messaggio per il formato (non numerico, troppe cifre decimali). */
  format: string;
  /** Cifre decimali ammesse. */
  maxDecimals: number;
  /** Il valore deve essere **strettamente** maggiore di zero. */
  positive?: boolean;
  /** Estremo superiore incluso, come stringa decimale (Regola 1). */
  max: string;
  /** Messaggio per un valore ≤ 0 (se `positive`). */
  positiveMessage?: string;
  /** Messaggio per un valore oltre `max`. */
  maxMessage: string;
}

/**
 * Decimale non negativo come stringa, con numero massimo di decimali e limite
 * superiore. Due stadi in cascata: il confronto sul valore gira solo se il
 * formato è già valido, così `money()` non vede mai testo che farebbe lanciare.
 */
export function decimalString(options: DecimalOptions) {
  const format = new RegExp(`^\\d{1,15}(\\.\\d{1,${options.maxDecimals}})?$`);
  const bounded = z
    .string()
    .refine((value) => !options.positive || money(value).gt(0), {
      error: options.positiveMessage ?? options.format,
    })
    .refine((value) => money(value).lte(options.max), { error: options.maxMessage });

  return rawDecimal(options.required)
    .pipe(z.string().regex(format, { error: options.format }))
    .pipe(bounded);
}

/** Percentuale 0–100 come stringa (fino a 4 decimali; il DB arrotonda a 2). */
export function percentageSchema(label: string) {
  return decimalString({
    required: `${label}: valore non valido.`,
    format: `${label} deve essere un numero compreso tra 0 e 100.`,
    maxDecimals: 4,
    max: "100",
    maxMessage: `${label} deve essere compresa tra 0 e 100.`,
  });
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `true` se `value` ("YYYY-MM-DD") è un giorno realmente esistente nel calendario. */
export function isRealCalendarDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  // `setUTCFullYear` evita che anni < 100 siano letti come 19xx (come fa Date.UTC).
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

interface RenewalDateOptions {
  /** "Adesso", iniettabile nei test. Il confine è il giorno UTC corrente. */
  now?: Date;
  /**
   * Data già salvata ("YYYY-MM-DD"): se l'input coincide, il controllo "non nel
   * passato" non si applica. Serve alla modifica, dove il form rimanda sempre la
   * data attuale anche quando l'utente cambia solo il nome.
   */
  unchanged?: string;
}

/**
 * Data di rinnovo "YYYY-MM-DD": formato, giorno reale e non prima di oggi (UTC).
 * Restituisce la stringa, non una `Date`: la normalizzazione a 00:00:00 UTC è
 * `toUtcMidnight()` (Regola 2), applicata dall'action dopo la validazione.
 */
export function renewalDateSchema({ now = new Date(), unchanged }: RenewalDateOptions = {}) {
  const today = dayKeyUTC(now);
  return z
    .string({ error: "La data di rinnovo è obbligatoria." })
    .trim()
    .regex(ISO_DAY, { error: "La data di rinnovo deve avere il formato AAAA-MM-GG." })
    .refine(isRealCalendarDay, { error: "La data di rinnovo non esiste nel calendario." })
    .refine((value) => value === unchanged || value >= today, {
      error: "La data di rinnovo non può essere nel passato.",
    });
}
