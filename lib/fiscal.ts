import { Prisma } from "@/lib/generated/prisma";
import type { VatRegime } from "@/lib/generated/prisma";
import { money, ZERO } from "@/lib/money";

/**
 * Motore di calcolo fiscale (Sprint 7).
 *
 * REGOLA FERREA (Regola 1, ARCHITECTURE.md): ogni calcolo qui usa Prisma.Decimal
 * (backed da decimal.js). Nessun `number`/float attraversa i calcoli — la
 * conversione a stringa avviene solo al confine DTO (`toFiscalBreakdownDTO`).
 */

const HUNDRED = new Prisma.Decimal(100);
const ROUND = Prisma.Decimal.ROUND_HALF_UP;

const round2 = (d: Prisma.Decimal): Prisma.Decimal => d.toDecimalPlaces(2, ROUND);
const pctFactor = (pct: Prisma.Decimal.Value): Prisma.Decimal =>
  money(pct).div(HUNDRED); // es. 22 → 0.22

/**
 * Aliquota IVA "effettiva" dato il regime: i regimi senza rivalsa (esente, non
 * imponibile, reverse charge) azzerano l'IVA sul prezzo, a prescindere da vatRate.
 */
export function effectiveVatRate(
  vatRate: Prisma.Decimal,
  regime: VatRegime | null | undefined,
): Prisma.Decimal {
  switch (regime) {
    case "EXEMPT":
    case "NON_TAXABLE":
    case "REVERSE_CHARGE":
      return ZERO;
    default: // STANDARD, REDUCED, null/undefined → aliquota piena
      return vatRate;
  }
}

/** Input grezzi (da un record Subscription o dai valori del form). */
export interface FiscalInput {
  amount: Prisma.Decimal.Value;
  amountIsGross: boolean;
  vatRate: Prisma.Decimal.Value;
  vatRegime?: VatRegime | null;
  costDeductiblePct: Prisma.Decimal.Value;
  vatDeductiblePct: Prisma.Decimal.Value;
}

/** Scomposizione fiscale completa, tutta in Decimal a 2 posizioni decimali. */
export interface FiscalBreakdown {
  gross: Prisma.Decimal; // lordo (IVA inclusa)
  taxableBase: Prisma.Decimal; // imponibile (netto)
  vatAmount: Prisma.Decimal; // IVA
  deductibleVat: Prisma.Decimal; // IVA detraibile
  nonDeductibleVat: Prisma.Decimal; // IVA indetraibile (potenziale costo)
  deductibleCost: Prisma.Decimal; // costo deducibile (sull'imponibile)
}

/**
 * Scompone un importo nelle sue componenti fiscali.
 *
 *  - imponibile: se `amountIsGross` lo si scorpora dal lordo → lordo / (1 + aliquota);
 *    altrimenti `amount` è già netto.
 *  - IVA = lordo − imponibile (garantisce lordo === imponibile + IVA: nessun drift).
 *  - IVA detraibile = IVA × vatDeductiblePct.
 *  - IVA indetraibile = IVA − IVA detraibile → diventa costo (prassi italiana).
 *  - costo deducibile = (imponibile + IVA indetraibile) × costDeductiblePct.
 *
 * L'IVA indetraibile è un costo a tutti gli effetti, quindi confluisce nella base
 * del costo deducibile (`baseCosto`). `nonDeductibleVat` resta esposto a parte per
 * la reportistica.
 */
export function computeFiscalBreakdown(input: FiscalInput): FiscalBreakdown {
  const amount = money(input.amount);
  const rate = effectiveVatRate(money(input.vatRate), input.vatRegime);
  const grossFactor = rate.div(HUNDRED).add(1); // es. 1.22

  let gross: Prisma.Decimal;
  let taxableBase: Prisma.Decimal;
  if (input.amountIsGross) {
    gross = round2(amount);
    taxableBase = round2(amount.div(grossFactor));
  } else {
    taxableBase = round2(amount);
    gross = round2(amount.mul(grossFactor));
  }

  const vatAmount = gross.sub(taxableBase); // differenza di due valori a 2 decimali
  const deductibleVat = round2(vatAmount.mul(pctFactor(input.vatDeductiblePct)));
  const nonDeductibleVat = vatAmount.sub(deductibleVat);

  // Prassi italiana: l'IVA indetraibile diventa costo → entra nella base deducibile.
  const baseCosto = taxableBase.add(nonDeductibleVat);
  const deductibleCost = round2(baseCosto.mul(pctFactor(input.costDeductiblePct)));

  return {
    gross,
    taxableBase,
    vatAmount,
    deductibleVat,
    nonDeductibleVat,
    deductibleCost,
  };
}

/** Versione serializzata (Decimal → stringa a 2 decimali) per il confine DTO. */
export interface FiscalBreakdownDTO {
  gross: string;
  taxableBase: string;
  vatAmount: string;
  deductibleVat: string;
  nonDeductibleVat: string;
  deductibleCost: string;
}

export function toFiscalBreakdownDTO(b: FiscalBreakdown): FiscalBreakdownDTO {
  return {
    gross: b.gross.toFixed(2),
    taxableBase: b.taxableBase.toFixed(2),
    vatAmount: b.vatAmount.toFixed(2),
    deductibleVat: b.deductibleVat.toFixed(2),
    nonDeductibleVat: b.nonDeductibleVat.toFixed(2),
    deductibleCost: b.deductibleCost.toFixed(2),
  };
}
