import { z } from "zod";

import {
  BillingCycle,
  ExpenseNature,
  FiscalDocumentType,
  VatRegime,
} from "@/lib/generated/prisma";
import {
  decimalString,
  idSchema,
  percentageSchema,
  renewalDateSchema,
} from "@/lib/validation/common";

/**
 * Schemi di validazione degli abbonamenti (Sprint 8, intervento 2).
 *
 * Helper puri: nessun accesso a database o sessione. Le regole che richiedono il
 * database (la categoria è dell'utente?) vivono nell'action, non qui.
 *
 * Gli enum derivano dallo schema Prisma: se un valore cambia nel database, la
 * validazione lo segue senza una seconda lista da tenere allineata.
 */

export const MAX_NAME_LENGTH = 100;
export const MAX_AMOUNT = "1000000";
const MAX_SUPPLIER_VAT_ID_LENGTH = 32;

/** Valute ammesse: la UI conosce solo EUR e USD, e `formatMoney` lancia su un codice malformato. */
export const SUPPORTED_CURRENCIES = ["EUR", "USD"] as const;

const nameSchema = z
  .string({ error: "Il nome è obbligatorio." })
  .trim()
  .min(1, "Il nome è obbligatorio.")
  .max(MAX_NAME_LENGTH, `Il nome non può superare ${MAX_NAME_LENGTH} caratteri.`);

const amountSchema = decimalString({
  required: "L'importo è obbligatorio.",
  format: "L'importo deve essere un numero con al massimo due decimali.",
  maxDecimals: 2,
  positive: true,
  positiveMessage: "L'importo deve essere maggiore di zero.",
  max: MAX_AMOUNT,
  maxMessage: "L'importo non può superare 1.000.000.",
});

const currencySchema = z.enum(SUPPORTED_CURRENCIES, {
  error: "Valuta non supportata: sono ammesse EUR e USD.",
});

const billingCycleSchema = z.enum(BillingCycle, { error: "Ciclo di fatturazione non valido." });

/** Identificativo della categoria. L'appartenenza all'utente si verifica nell'action. */
const categoryIdSchema = idSchema("Categoria non valida.");

/** Partita IVA del fornitore: testo libero e breve; la stringa vuota vale "assente". */
const supplierVatIdSchema = z
  .string({ error: "Partita IVA del fornitore non valida." })
  .trim()
  .max(
    MAX_SUPPLIER_VAT_ID_LENGTH,
    `La partita IVA del fornitore non può superare ${MAX_SUPPLIER_VAT_ID_LENGTH} caratteri.`,
  )
  .transform((value) => (value === "" ? null : value));

interface SubscriptionSchemaOptions {
  /** "Adesso", iniettabile nei test (confine del controllo sulla data di rinnovo). */
  now?: Date;
}

/** Tutti i campi, ciascuno obbligatorio: `create` e `update` li rendono opzionali a modo loro. */
function subscriptionFields(renewalDate: ReturnType<typeof renewalDateSchema>) {
  return {
    name: nameSchema,
    amount: amountSchema,
    currency: currencySchema,
    billingCycle: billingCycleSchema,
    nextRenewalDate: renewalDate,

    // Fiscalità (Sprint 7)
    expenseNature: z.enum(ExpenseNature, { error: "Natura della spesa non valida." }),
    categoryId: categoryIdSchema.nullable(),
    amountIsGross: z.boolean({ error: "Indicare se l'importo è lordo o netto." }),
    vatRate: percentageSchema("L'aliquota IVA"),
    vatRegime: z.enum(VatRegime, { error: "Regime IVA non valido." }).nullable(),
    costDeductiblePct: percentageSchema("La percentuale di deducibilità del costo"),
    vatDeductiblePct: percentageSchema("La percentuale di detraibilità dell'IVA"),
    documentType: z.enum(FiscalDocumentType, { error: "Tipo di documento non valido." }),
    supplierVatId: supplierVatIdSchema.nullable(),
  };
}

/**
 * Creazione: nome, importo, ciclo e data di rinnovo sono obbligatori; la valuta
 * vale `EUR` se omessa, i campi fiscali restano assenti (scattano i default DB).
 * La data non può precedere oggi (UTC).
 */
export function createSubscriptionSchema({ now }: SubscriptionSchemaOptions = {}) {
  const fields = subscriptionFields(renewalDateSchema({ now }));
  return z
    .object(fields)
    .partial({
      expenseNature: true,
      categoryId: true,
      amountIsGross: true,
      vatRate: true,
      vatRegime: true,
      costDeductiblePct: true,
      vatDeductiblePct: true,
      documentType: true,
      supplierVatId: true,
    })
    .extend({ currency: fields.currency.default("EUR") });
}

interface UpdateSubscriptionSchemaOptions extends SubscriptionSchemaOptions {
  /**
   * Data di rinnovo già salvata ("YYYY-MM-DD"). Il form di modifica rimanda
   * sempre la data attuale: se è già trascorsa (rinnovo non ancora avanzato dal
   * cron, abbonamento disdetto) non deve bloccare la modifica del solo nome.
   * Una data **diversa** da questa deve invece essere di oggi o futura.
   */
  currentRenewalDate?: string;
}

/**
 * Modifica: ogni campo è opzionale e, se presente, valido quanto in creazione.
 * Nessun default: un campo assente resta invariato (altrimenti la valuta
 * tornerebbe a `EUR` a ogni modifica).
 */
export function updateSubscriptionSchema({
  now,
  currentRenewalDate,
}: UpdateSubscriptionSchemaOptions = {}) {
  return z
    .object(subscriptionFields(renewalDateSchema({ now, unchanged: currentRenewalDate })))
    .partial();
}

/** Identificativo di un abbonamento (modifica, disdetta, riattivazione). */
export const subscriptionIdSchema = idSchema("Abbonamento non valido.");

/** Input validato di `createSubscription`. */
export type ValidSubscriptionCreate = z.output<ReturnType<typeof createSubscriptionSchema>>;
/** Input validato di `updateSubscription`. */
export type ValidSubscriptionUpdate = z.output<ReturnType<typeof updateSubscriptionSchema>>;
