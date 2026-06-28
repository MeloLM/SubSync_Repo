import { Prisma } from "@/lib/generated/prisma";

/**
 * Helper monetari — Regola 1 (ARCHITECTURE.md).
 * Tutti gli importi e i calcoli usano Prisma.Decimal (backed da decimal.js):
 * MAI `number`/`float`, per evitare errori di arrotondamento in virgola mobile.
 */

export type Money = Prisma.Decimal;

/** Zero monetario riutilizzabile come accumulatore iniziale. */
export const ZERO: Prisma.Decimal = new Prisma.Decimal(0);

/** Costruisce un Decimal da una stringa/numero grezzo (es. input di un form). */
export function money(value: Prisma.Decimal.Value): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/**
 * Ripartisce un importo tra più quote secondo dei pesi (Split-Billing, Regola 1).
 *
 * Tutto in Decimal: ogni quota è l'importo proporzionale al proprio peso,
 * arrotondata per difetto al centesimo. I centesimi residui (dovuti
 * all'arrotondamento) vengono distribuiti uno alla volta alle quote con la parte
 * frazionaria più alta (metodo del resto maggiore), così la somma delle quote
 * combacia ESATTAMENTE con il totale — nessun centesimo perso o creato.
 *
 * @returns un array di Decimal allineato a `weights`, con `Σ === total`.
 */
export function splitByWeights(
  total: Prisma.Decimal,
  weights: Prisma.Decimal[],
): Prisma.Decimal[] {
  if (weights.length === 0) return [];

  const totalWeight = weights.reduce((acc, w) => acc.add(w), ZERO);
  if (totalWeight.lte(ZERO)) {
    // Pesi tutti nulli: nessuna ripartizione sensata, restituisci zeri.
    return weights.map(() => ZERO);
  }

  const exact = weights.map((w) => total.mul(w).div(totalWeight));
  const floored = exact.map((e) => e.toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN));

  const distributed = floored.reduce((acc, a) => acc.add(a), ZERO);
  const remainder = total.sub(distributed); // multiplo di 0.01, >= 0
  const centsToSpread = Math.round(remainder.mul(100).toNumber()); // solo un contatore intero

  // Indici ordinati per parte frazionaria decrescente (resto maggiore prima).
  const order = exact
    .map((e, i) => ({ i, frac: e.sub(floored[i]) }))
    .sort((a, b) => b.frac.cmp(a.frac))
    .map((x) => x.i);

  const result = [...floored];
  const ONE_CENT = new Prisma.Decimal("0.01");
  for (let k = 0; k < centsToSpread; k++) {
    const idx = order[k % order.length];
    result[idx] = result[idx].add(ONE_CENT);
  }
  return result;
}

/**
 * Formatta un importo per la UI. La conversione a number avviene SOLO qui,
 * al confine di presentazione: nessun calcolo viene fatto su float.
 */
export function formatMoney(
  value: Prisma.Decimal | string | number,
  currency = "EUR",
): string {
  const decimal =
    value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(decimal.toNumber());
}
